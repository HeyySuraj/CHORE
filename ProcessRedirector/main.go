package main

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Config flags
var (
	addr     = flag.String("addr", ":8080", "listen address")
	privPath = flag.String("priv", "private_key.pem", "path to RSA private key PEM")
	serverA  = flag.String("serverA", "http://127.0.0.1:4000", "backend server A (flow_token==1)")
	serverB  = flag.String("serverB", "http://127.0.0.1:4000", "backend server B (other)")
)

// incomingPayload matches the JSON shape expected from client
type incomingPayload struct {
	EncryptedAESKey   string `json:"encrypted_aes_key"`
	EncryptedFlowData string `json:"encrypted_flow_data"`
	InitialVector     string `json:"initial_vector"`
	// allow additional passthrough keys in body (ignored here)
}

// readPrivateKey loads RSA private key (PKCS1 or PKCS8) from PEM file
func readPrivateKey(path string) (*rsa.PrivateKey, error) {
	b, err := ioutil.ReadFile(path)
	if err != nil {
	return nil, fmt.Errorf("reading private key: %w", err)
	}
	block, _ := pem.Decode(b)
	if block == nil {
	return nil, errors.New("failed to decode PEM block containing private key")
	}
	// Try PKCS1
	if pkcs1, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
	return pkcs1, nil
	}
	// Try PKCS8
	if pkcs8, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
	if k, ok := pkcs8.(*rsa.PrivateKey); ok {
	return k, nil
	}
	return nil, errors.New("pkcs8 key is not RSA")
	}
	// Try parsing as generic private key (best effort)
	if key, err := x509.ParseECPrivateKey(block.Bytes); err == nil && key != nil {
	return nil, errors.New("found EC private key, expected RSA")
	}
	return nil, errors.New("failed to parse RSA private key (not PKCS1/PKCS8)")
}

// tryRsaDecrypt attempts OAEP-SHA256, OAEP-SHA1, PKCS1v15 (in that order)
func tryRsaDecrypt(priv *rsa.PrivateKey, cipherText []byte) ([]byte, error) {
	// OAEP SHA-256
	if p, err := rsa.DecryptOAEP(sha256.New(), rand.Reader, priv, cipherText, nil); err == nil {
	log.Printf("[Success] RSA decrypt OAEP-SHA256, key len=%d", len(p))
	return p, nil
	} else {
	log.Printf("[Warn] OAEP-SHA256 failed: %v", err)
	}
	// OAEP SHA-1
	if p, err := rsa.DecryptOAEP(sha1.New(), rand.Reader, priv, cipherText, nil); err == nil {
	log.Printf("[Success] RSA decrypt OAEP-SHA1, key len=%d", len(p))
	return p, nil
	} else {
	log.Printf("[Warn] OAEP-SHA1 failed: %v", err)
	}
	// PKCS1v15
	if p, err := rsa.DecryptPKCS1v15(rand.Reader, priv, cipherText); err == nil {
	log.Printf("[Success] RSA decrypt PKCS1v15, key len=%d", len(p))
	return p, nil
	} else {
	log.Printf("[Warn] PKCS1v15 failed: %v", err)
	}
	return nil, errors.New("all RSA decrypt attempts failed")
}

// decryptFlow does base64 decoding, RSA decrypt of AES key, AES-GCM decrypt of payload.
// Returns decrypted JSON as map[string]interface{} (parsed) and the plaintext bytes as well (for optional forwarding).
func decryptFlow(body incomingPayload, priv *rsa.PrivateKey) (map[string]interface{}, []byte, error) {
	// decode base64 inputs
	encAESKey, err := base64.StdEncoding.DecodeString(body.EncryptedAESKey)
	if err != nil {
	return nil, nil, fmt.Errorf("decode encrypted_aes_key: %w", err)
	}
	encFlowData, err := base64.StdEncoding.DecodeString(body.EncryptedFlowData)
	if err != nil {
	return nil, nil, fmt.Errorf("decode encrypted_flow_data: %w", err)
	}
	iv, err := base64.StdEncoding.DecodeString(body.InitialVector)
	if err != nil {
	return nil, nil, fmt.Errorf("decode initial_vector: %w", err)
	}

	log.Printf("[Info] enc AES key len=%d, enc flow len=%d, iv len=%d", len(encAESKey), len(encFlowData), len(iv))

	// RSA decrypt AES key
	aesKey, err := tryRsaDecrypt(priv, encAESKey)
	if err != nil {
	return nil, nil, fmt.Errorf("rsa decrypt AES key: %w", err)
	}
	log.Printf("[Info] Decrypted AES key length: %d", len(aesKey))

	// AES-GCM decrypt using compatibility with arbitrary IV sizes
	block, err := aes.NewCipher(aesKey)
	if err != nil {
	return nil, nil, fmt.Errorf("new cipher: %w", err)
	}

	// Use NewGCMWithNonceSize to accept non-12-byte IVs (e.g., 16 bytes)
	aead, err := cipher.NewGCMWithNonceSize(block, len(iv))
	if err != nil {
	return nil, nil, fmt.Errorf("new gcm with nonce size %d: %w", len(iv), err)
	}

	// Attempt decryption. We assume encFlowData == ciphertext || tag (i.e., tag appended at end).
	plaintext, err := aead.Open(nil, iv, encFlowData, nil)
	if err != nil {
	return nil, nil, fmt.Errorf("aes-gcm open failed: %w", err)
	}
	log.Printf("[Success] AES-GCM decrypt success, plaintext len=%d", len(plaintext))

	// parse JSON from plaintext
	var parsed map[string]interface{}
	if err := json.Unmarshal(plaintext, &parsed); err != nil {
	return nil, plaintext, fmt.Errorf("json unmarshal decrypted plaintext: %w", err)
	}

	return parsed, plaintext, nil
}

// chooseUpstream returns serverA if flow_token == 1 else serverB
func chooseUpstream(parsed map[string]interface{}) string {
	if v, ok := parsed["flow_token"]; ok {
	switch t := v.(type) {
	case float64:
	if int64(t) == 1 {
	return *serverA
	}
	case string:
	if t == "1" {
	return *serverA
	}
	case json.Number:
	if n, _ := t.Int64(); n == 1 {
	return *serverA
	}
	default:
	// fallback: marshal and compare
	b, _ := json.Marshal(v)
	if string(b) == "1" || string(b) == "\"1\"" {
	return *serverA
	}
	}
	}
	return *serverB
}

// forwardRequest sends the original request body (bodyBytes) to the chosen upstream and proxies response back.
func forwardRequest(rw http.ResponseWriter, orig *http.Request, upstream string, bodyBytes []byte) {
	up, err := url.Parse(upstream)
	if err != nil {
	http.Error(rw, "invalid upstream", http.StatusInternalServerError)
	return
	}
	target := up.ResolveReference(&url.URL{Path: orig.URL.Path, RawQuery: orig.URL.RawQuery})

	// Create new request with same method and headers, using bodyBytes as body
	req, err := http.NewRequestWithContext(context.Background(), orig.Method, target.String(), bytes.NewReader(bodyBytes))
	if err != nil {
	http.Error(rw, "failed create request", http.StatusInternalServerError)
	return
	}

	// Copy headers except Host (set by URL)
	req.Header = orig.Header.Clone()
	req.Host = up.Host

	client := &http.Client{
	Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
	http.Error(rw, "failed to contact upstream: "+err.Error(), http.StatusBadGateway)
	return
	}
	defer resp.Body.Close()

	// copy headers and status
	for k, vs := range resp.Header {
	for _, v := range vs {
	rw.Header().Add(k, v)
	}
	}
	rw.WriteHeader(resp.StatusCode)
	io.Copy(rw, resp.Body)
}

// handler builds the main HTTP handler with decrypt & route logic
func handler(priv *rsa.PrivateKey) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
	log.Printf("%s incoming %s %s from %s", time.Now().Format("2006/01/02 15:04:05"), r.Method, r.URL.Path, r.RemoteAddr)

	// read entire body so we can both decrypt and forward unchanged
	bodyBytes, err := ioutil.ReadAll(r.Body)
	if err != nil {
	http.Error(w, "read body failed", http.StatusBadRequest)
	return
	}
	// restore Body if needed later
	// r.Body = ioutil.NopCloser(bytes.NewReader(bodyBytes))
	r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	// parse incoming JSON into incomingPayload
	var incoming incomingPayload
	if err := json.Unmarshal(bodyBytes, &incoming); err != nil {
	log.Printf("[Error] invalid JSON in request body: %v", err)
	http.Error(w, "invalid JSON", http.StatusBadRequest)
	return
	}

	parsed, plaintext, err := decryptFlow(incoming, priv)
	if err != nil {
	log.Printf("[Error] decryptFlow failed: %v", err)
	http.Error(w, "decrypt failed: "+err.Error(), http.StatusInternalServerError)
	return
	}

	// 2. Extract flow_token
	rawFlowToken, ok := parsed["flow_token"].(string)
	if !ok {
	log.Printf("flow_token : %v", rawFlowToken)
	return
	}

	// 3. Split on |
	parts := strings.Split(rawFlowToken, "|")
	if len(parts) == 0 {
	log.Printf("invalid flow_token format: %s", rawFlowToken)
	return
	// fmt.Errorf("invalid flow_token format: %s", rawToken)
	}

	first := strings.TrimSpace(parts[0]) // WABA

	log.Printf("[DEBUG] flow_token=%s, first element=%s", rawFlowToken, first)

	// 4. Decide backend
	var baseURL string
	switch first {
	// case "919421200000":
	// 	baseURL = "http://103.23.150.246:83/process/pf2/execute"
	case "917888133333":
	baseURL = "http://103.23.150.246:83/process/pf2/execute"
	default:
	baseURL = "https://process-automation.1spoc.ai/process/pf2/execute"
	return
	}

	// 5. Rebuild query string from original request
	query := r.URL.RawQuery // preserves everything ?a=1&b=2
	forwardURL := baseURL + r.URL.Path
	if query != "" {
	forwardURL = forwardURL + "?" + query
	}

	preview, _ := json.Marshal(parsed)
	log.Printf("[Debug] decrypted body preview: %s", preview)

	upstream := chooseUpstream(parsed)
	log.Printf("[Info] forwarding to upstream: %s", upstream)

	log.Printf("[Info] Plaintext: %s", plaintext)

	// If you want to forward decrypted plaintext instead of original encrypted payload,
	// replace 'bodyBytes' with 'plaintext' and set Content-Type accordingly:
	// forwardRequestWithBody(w, r, upstream, plaintext, "application/json")
	forwardRequest(w, r, forwardURL, bodyBytes)
	}
}

func main() {
	flag.Parse() // It is used for to reads command line arguments.

	// ensure private key exists
	if _, err := os.Stat(*privPath); os.IsNotExist(err) {
	log.Fatalf("private key file does not exist: %s", *privPath)
	}

	priv, err := readPrivateKey(*privPath)
	if err != nil {
	log.Fatalf("unable to load private key: %v", err)
	}

	http.HandleFunc("/", handler(priv))
		log.Printf("listening on %s ...", *addr)
		if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
 