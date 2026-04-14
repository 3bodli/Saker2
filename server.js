const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ========== رابط Google Sheets API ==========
// استبدل هذا الرابط بالرابط اللي حصلت عليه من Google Apps Script
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwHwao4YPg_6JGDhfqemHo-ocSzEQ9fN-fFEAzczWlSqjhOj7vxOzeBIhZbUaAsgvRaVQ/exec';

console.log('🚀 Server starting...');
console.log('📡 Google Sheets API:', SHEETS_API_URL);

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Server is working!',
        sheets_api: SHEETS_API_URL ? 'configured ✅' : 'missing ❌'
    });
});

// ========== اختبار الاتصال بـ Google Sheets ==========
app.get('/test-sheets', async (req, res) => {
    try {
        const response = await axios.get(SHEETS_API_URL, { timeout: 5000 });
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    console.log('📝 Register request:', req.body.username);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' 
        });
    }
    
    try {
        console.log('📡 جاري الاتصال بـ Google Sheets...');
        
        const response = await axios.post(SHEETS_API_URL, {
            type: 'register',
            username: username,
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        console.log('✅ Response from Sheets:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(500).json({ 
                success: false, 
                error: 'لا يمكن الاتصال بـ Google Sheets' 
            });
        } else if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'خطأ في الاتصال: ' + error.message 
            });
        }
    }
});

// ========== تسجيل دخول ==========
app.post('/api/login', async (req, res) => {
    console.log('🔐 Login request:', req.body.username);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'الرجاء إدخال جميع البيانات' 
        });
    }
    
    try {
        console.log('📡 جاري الاتصال بـ Google Sheets...');
        
        const response = await axios.post(SHEETS_API_URL, {
            type: 'login',
            username: username,
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        console.log('✅ Response from Sheets:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(500).json({ 
                success: false, 
                error: 'لا يمكن الاتصال بـ Google Sheets' 
            });
        } else if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'خطأ في الاتصال: ' + error.message 
            });
        }
    }
});

// ========== إنشاء طلب دفع ==========
app.post('/create-payment', (req, res) => {
    const { amount } = req.body;
    
    if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    res.json({ 
        success: true, 
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}` 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 https://saker2-production.up.railway.app`);
    console.log(`📡 Google Sheets API: ${SHEETS_API_URL}\n`);
});
