const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzLHRlStDnTY0ODXsJoSLQPYTbX3fSNc_RBmQOWXOwdp4bUcijw5hludkhDHPScMOB5SQ/exec';

// تسجيل
app.post('/api/register', async (req, res) => {
    try {
        const response = await axios.post(SHEETS_API_URL, {
            type: 'register',
            username: req.body.username,
            password: req.body.password
        });
        res.json(response.data);
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// دخول
app.post('/api/login', async (req, res) => {
    try {
        const response = await axios.post(SHEETS_API_URL, {
            type: 'login',
            username: req.body.username,
            password: req.body.password
        });
        res.json(response.data);
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/create-payment', (req, res) => {
    res.json({ success: true, paymentUrl: 'https://nowpayments.io/demo' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
