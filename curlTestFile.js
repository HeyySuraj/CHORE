const curls = [
    // this should give url validation and after not a valid body
    `curl --location --globoff 'https://api.example.com/upload?param1={{param}}' \
--header 'Content-Type: application/xml' \
--header 'Authorisation: {{header}}' \
--data '{
 "name": "{{param}}",ADAD
 "id" :" 23232",
 }'`,

    `curl --location --request PATCH 'https://api.example.com/profile/update' \
--form 'bio="Loves coding and coffee"' \
--form 'cover=@"/path/to/cover.jpg"'curl --location --request PATCH 'https://api.example.com/profile/update' \
--form 'bio="Loves coding and coffee"' \
--form 'cover=@"/path/to/cover.jpg"'`,

    `curl -X POST "https://api.example.com/profile/update" -H "Content-Type: multipart/form-data" -F "bio="Loves coding and coffee"" -F "cover=@"/path/to/cover.jpg""curl --location --request PATCH 'https://api.example.com/profile/update' \
--form 'bio="Loves coding and coffee"' \
--form 'cover=@"/path/to/cover.jpg"'curl --location --request PATCH 'https://api.example.com/profile/update' \
--form 'bio="Loves coding and coffee"' \
--form 'cover=@"/path/to/cover.jpg"'`,

    `curl --location --globoff 'https://api.example.com/upload?param1={{param}}' \
--header 'Content-Type: application/xml' \
--header 'Authorisation: {{header}}'`,

    `curl --location --globoff 'https://api.example.com/upload?param1={{param}}' \
--header 'Content-Type: application/xml' \
--header 'Authorisation: {{header}}'`,

    `curl -X DELETE "{{BASEURL}}/token?city=delhi&pincode={{BASEURL}}" -H "Content-Type: application/json" -H "Authorization: Bearer {{TOKEN}}" -H "Secret Key: {{SECRETKEY}}" --data '{
  "key": "value"
}'`,

]

const curlExamples = [
    {
        id: "knfjalnf",
        title: "Login (URL Encoded POST)",
        description: "generate from builder but thorwing not a valid command",
        type: "urlencoded",
        method: "POST",
        curl: `curl -X POST "https://api.example.com/profile/update?param1={{str}}&danj=nkjfna" -H "Content-Type: multipart/form-data" -H "token: {{context.username}}" -F "cover=Suraj" -F "capital=mumbai"`
    },
    {
        id: 1,
        title: "Login (URL Encoded POST)",
        description: "Sends form data using application/x-www-form-urlencoded to log in a user.",
        type: "urlencoded",
        method: "POST",
        curl: `curl --location 'https://api.example.com/login' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'username=john' \
--data-urlencode 'password=123456'`
    },
    {
        id: 2,
        title: "Update User (URL Encoded PUT)",
        description: "Updates user information using URL-encoded body.",
        type: "urlencoded",
        method: "PUT",
        curl: `curl --location --request PUT 'https://api.example.com/user/123' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'email=john@example.com' \
--data-urlencode 'active=true'`
    },
    {
        id: 3,
        title: "Verify User (URL Encoded PATCH)",
        description: "Verifies user using PATCH with form data.",
        type: "urlencoded",
        method: "PATCH",
        curl: `curl --location --request PATCH 'https://api.example.com/user/123' \
--header 'Authorization: Bearer xyz456' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'status=verified'`
    },
    {
        id: 4,
        title: "Delete User (DELETE no body)",
        description: "Deletes a user by ID without request body.",
        type: "none",
        method: "DELETE",
        curl: `curl --location --request DELETE 'https://api.example.com/user/123' \
--header 'Authorization: Bearer xyz456'`
    },
    {
        id: 5,
        title: "Search (GET)",
        description: "Searches for a term using query params.",
        type: "none",
        method: "GET",
        curl: `curl --location 'https://api.example.com/search?query=nodejs' \
--header 'Accept: application/json'`
    },
    {
        id: 6,
        title: "File Upload (Multipart Form POST)",
        description: "Uploads an image file using multipart/form-data.",
        type: "formdata",
        method: "POST",
        curl: `curl --location 'https://api.example.com/upload' \
--header 'Authorization: Bearer xyz456' \
--form 'file=@"/path/to/image.png"' \
--form 'description="Profile Picture"'`
    },
    {
        id: 7,
        title: "Replace File (Multipart Form PUT)",
        description: "Replaces an existing file using PUT and multipart form data.",
        type: "formdata",
        method: "PUT",
        curl: `curl --location --request PUT 'https://api.example.com/upload/45' \
--form 'avatar=@"/path/to/avatar.jpg"' \
--form 'userId="123"'`
    },
    {
        id: 8,
        title: "Update Profile (Multipart Form PATCH)",
        description: "Updates bio and uploads cover photo using PATCH.",
        type: "formdata",
        method: "PATCH",
        curl: `curl --location --request PATCH 'https://api.example.com/profile/update' \
--form 'bio="Loves coding and coffee"' \
--form 'cover=@"/path/to/cover.jpg"'`
    },
    {
        id: 9,
        title: "Delete File (DELETE no body)",
        description: "Deletes a file by ID using DELETE.",
        type: "none",
        method: "DELETE",
        curl: `curl --location --request DELETE 'https://api.example.com/files/45' \
--header 'Authorization: Bearer xyz456'`
    },
    {
        id: 10,
        title: "List Files (GET)",
        description: "Fetches list of files for user authentication.",
        type: "none",
        method: "GET",
        curl: `curl --location 'https://api.example.com/files/list' \
--header 'Authorization: Bearer xyz456'`
    },
    {
        id: 11,
        title: "Create User (Raw JSON POST)",
        description: "Creates a new user using JSON body.",
        type: "raw-json",
        method: "POST",
        curl: `curl --location 'https://api.example.com/users' \
--header 'Content-Type: application/json' \
--data '{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin"
}'`
    },
    {
        id: 12,
        title: "Update User (Raw JSON PUT)",
        description: "Updates an existing user using JSON data.",
        type: "raw-json",
        method: "PUT",
        curl: `curl --location --request PUT 'https://api.example.com/users/123' \
--header 'Content-Type: application/json' \
--data '{
  "name": "John Updated",
  "active": true
}'`
    },
    {
        id: 13,
        title: "Patch Role (Raw JSON PATCH)",
        description: "Updates a user's role via PATCH with JSON body.",
        type: "raw-json",
        method: "PATCH",
        curl: `curl --location --request PATCH 'https://api.example.com/users/123' \
--header 'Authorization: Bearer xyz456' \
--header 'Content-Type: application/json' \
--data '{
  "role": "superadmin"
}'`
    },
    {
        id: 14,
        title: "Delete User (DELETE)",
        description: "Removes a user from the system by ID.",
        type: "none",
        method: "DELETE",
        curl: `curl --location --request DELETE 'https://api.example.com/users/123' \
--header 'Authorization: Bearer xyz456'`
    },
    {
        id: 15,
        title: "Fetch All Users (GET)",
        description: "Fetches all users with Accept header for JSON.",
        type: "none",
        method: "GET",
        curl: `curl --location 'https://api.example.com/users' \
--header 'Accept: application/json'`
    }
];