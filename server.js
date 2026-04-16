const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// تخزين مؤقت في الذاكرة
const users = [];

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Server is working!',
        usersCount: users.length 
    });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', (req, res) => {
    console.log('📝 Register:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(200).json({ 
            success: false, 
            error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' 
        });
    }
    
    // التحقق من وجود المستخدم
    const userExists = users.find(u => u.username === username);
    if (userExists) {
        return res.status(200).json({ 
            success: false, 
            error: 'اسم المستخدم موجود مسبقاً' 
        });
    }
    
    // حفظ المستخدم
    users.push({ username, password });
    console.log('✅ تم إنشاء حساب:', username);
    
    res.status(200).json({ 
        success: true, 
        message: 'تم إنشاء الحساب بنجاح' 
    });
});

// ========== تسجيل دخول ==========
app.post('/api/login', (req, res) => {
    console.log('🔐 Login:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(200).json({ 
            success: false, 
            error: 'الرجاء إدخال جميع البيانات' 
        });
    }
    
    // البحث عن المستخدم
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(200).json({ 
            success: false, 
            error: 'اسم المستخدم أو كلمة المرور غير صحيحة' 
        });
    }
    
    // إنشاء توكن بسيط
    const token = Buffer.from(username + ':' + Date.now()).toString('base64');
    
    console.log('✅ تم تسجيل دخول:', username);
    
    res.status(200).json({ 
        success: true, 
        token: token,
        username: username,
        message: 'تم تسجيل الدخول بنجاح' 
    });
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
    }
    
    // التحقق بسيط - فقط نتأكد أن التوكن موجود
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }
    
    next();
};

// ========== إنشاء طلب دفع ==========
app.post('/create-payment', verifyToken, (req, res) => {
    const { amount } = req.body;
    
    if (!amount || amount < 1) {
        return res.status(200).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    res.status(200).json({ 
        success: true, 
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}` 
    });
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: https://saker2-production.up.railway.app`);
    console.log(`📝 السيرفر جاهز للتسجيل والدخول!\n`);
});
