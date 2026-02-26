import axios from "axios";
import express from 'express';

const app = express();
const PORT = 3303

/**
 * 
 * @param {object} httpConfig 
 * @param {'get' | 'post' | 'put' | 'delete'} httpConfig.url
 * @param {string} httpConfig.method 
 * @param {object} httpConfig.body 
 * @param {object} httpConfig.headers 
 * @param {object} httpConfig.params 
 * @param {*} maxRetry 
 * @param {*} delay 
 * @returns 
 */
async function apiRequestWithRetry(httpConfig, maxRetry = 13, delay = 1000) {
    let attempt = 0;
    while (attempt < maxRetry) {
        try {
            //call api 
            const response = await axios(httpConfig);
            return response.data;
        } catch (error) {
            attempt++;

            if (attempt === maxRetry) throw new Error('Max retry limit reached', attempt);

            console.log(attempt, 'Attempt failed', error.message);
            console.log(`delaying request by ${delay}`);

            await new Promise((res) => setTimeout(res, delay))
            delay *= 2; // exponentialy increase the dalay or randomly try delay
        }
    }
}


// IT DONT HOLD THE SERVER. RESPONSIBLE FOR OTHER REQUEST   
app.get('/fetch-data', async (req, res) => {
    const config = {
        url: 'https://example.comm/api/resource',
        method: "get",
    };
    try {
        const data = await apiRequestWithRetry(config);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/', async (req, res) => {
    try {
        res.json({ success: true, message: "sucess" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});