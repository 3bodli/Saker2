const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ========== رابط Google Sheets API ==========
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzLHRlStDnTY0ODXsJoSLQPYTbX3fSNc_RBmQOWXOwdp4bUcijw5hludkhDHPScMOB5SQ/exec';

// ========== تخزين مؤقت في الذاكرة (حتى لو ما اشتغلت Google Sheets) ==========
const tempUsers = [];

console.log('🚀 Server starting...');

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Server is working!',
        tempUsers: tempUsers.length
    });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    console.log('📝 Register request:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ 
            success: false, 
            error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' 
        });
    }
    
    // محاولة 1: التخزين المؤقت
    const userExists = tempUsers.find(u => u.username === username);
    if (userExists) {
        return res.json({ 
            success: false, 
            error: 'اسم المستخدم موجود مسبقاً' 
        });
    }
    
    tempUsers.push({ username, password });
    console.log('✅ تم حفظ المستخدم في التخزين المؤقت:', username);
    
    return res.json({ 
        success: true, 
        message: 'تم إنشاء الحساب بنجاح (تخزين مؤقت)' 
    });
});

// ========== تسجيل دخول ==========
app.post('/api/login', async (req, res) => {
    console.log('🔐 Login request:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ 
            success: false, 
            error: 'الرجاء إدخال جميع البيانات' 
        });
    }
    
    // البحث في التخزين المؤقت
    const user = tempUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
        const token = username + '_' + Date.now();
        console.log('✅ تم تسجيل دخول:', username);
        
        return res.json({ 
            success: true, 
            token: token,
            username: username,
            message: 'تم تسجيل الدخول بنجاح' 
        });
    } else {
        return res.json({ 
            success: false, 
            error: 'اسم المستخدم أو كلمة المرور غير صحيحة' 
        });
    }
});

// ========== إنشاء طلب دفع ==========
app.post('/create-payment', (req, res) => {
    const { amount } = req.body;
    const authHeader = req.headers.authorization;
    
    console.log('💰 Payment request:', amount);
    
    if (!amount || amount < 1) {
        return res.json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    if (!authHeader) {
        return res.json({ success: false, error: 'غير مصرح به' });
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
    console.log(`📝 التخزين المؤقت يعمل! يمكنك تسجيل الدخول الآن.\n`);
});
