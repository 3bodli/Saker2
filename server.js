const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// رابط Google Sheets API حقك
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwpxvslSoznxQHfSV3_57c-Vmfg9s2pCKKBw9TeV13t3cNR3TxI6Uc-JATP5iqxcYmhDA/exec';

app.get('/', (req, res) => {
    res.json({ status: 'online', database: 'Google Sheets ✅' });
});

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const response = await axios.post(SHEETS_API_URL, {
            type: 'register',
            username: username,
            password: password
        });
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: 'خطأ في الاتصال بقاعدة البيانات' });
    }
});

// تسجيل دخول
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const response = await axios.post(SHEETS_API_URL, {
            type: 'login',
            username: username,
            password: password
        });
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: 'خطأ في الاتصال بقاعدة البيانات' });
    }
});

// إنشاء طلب دفع
app.post('/create-payment', (req, res) => {
    const { amount } = req.body;
    
    res.json({
        success: true,
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}`
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
