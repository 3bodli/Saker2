const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ========== رابط Google Sheets API ==========
// استبدل هذا الرابط بالرابط اللي حصلت عليه
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyoD1LC-eSr-SsFC6DVhZIrz8ZP_6eT-qpJNY-dn-cGkshlucCf9ofoDLyMbCd9WRySvg/exec';

// تخزين مؤقت احتياطي (لو ما اشتغلت Google Sheets)
const tempUsers = [];

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Server is working!',
        database: 'Google Sheets',
        sheets_url: SHEETS_API_URL ? 'configured ✅' : 'missing ❌'
    });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    console.log('📝 Register:', req.body.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    try {
        // محاولة الاتصال بـ Google Sheets
        const response = await axios.post(SHEETS_API_URL, {
            type: 'register',
            username: username,
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        console.log('✅ Google Sheets response:', response.data);
        res.json(response.data);
        
    } catch (error) {
        console.log('⚠️ Google Sheets failed, using temp storage');
        
        // استخدام التخزين المؤقت كبديل
        const userExists = tempUsers.find(u => u.username === username);
        if (userExists) {
            return res.json({ success: false, error: 'اسم المستخدم موجود' });
        }
        
        tempUsers.push({ username, password });
        res.json({ success: true, message: 'تم إنشاء الحساب (تخزين مؤقت)' });
    }
});

// ========== تسجيل دخول ==========
app.post('/api/login', async (req, res) => {
    console.log('🔐 Login:', req.body.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    try {
        // محاولة الاتصال بـ Google Sheets
        const response = await axios.post(SHEETS_API_URL, {
            type: 'login',
            username: username,
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        console.log('✅ Google Sheets response:', response.data);
        
        if (response.data.success) {
            res.json(response.data);
        } else {
            // البحث في التخزين المؤقت
            const user = tempUsers.find(u => u.username === username && u.password === password);
            if (user) {
                const token = Buffer.from(username + ':' + Date.now()).toString('base64');
                res.json({ success: true, token, username });
            } else {
                res.json({ success: false, error: 'بيانات غير صحيحة' });
            }
        }
        
    } catch (error) {
        console.log('⚠️ Google Sheets failed, using temp storage');
        
        // استخدام التخزين المؤقت
        const user = tempUsers.find(u => u.username === username && u.password === password);
        if (user) {
            const token = Buffer.from(username + ':' + Date.now()).toString('base64');
            res.json({ success: true, token, username });
        } else {
            res.json({ success: false, error: 'بيانات غير صحيحة' });
        }
    }
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
    }
    next();
};

// ========== إنشاء طلب دفع ==========
app.post('/create-payment', verifyToken, (req, res) => {
    const { amount } = req.body;
    
    if (!amount || amount < 1) {
        return res.json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    res.json({ 
        success: true, 
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}` 
    });
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 https://saker2-production.up.railway.app`);
    console.log(`📡 Google Sheets API: ${SHEETS_API_URL}\n`);
});
