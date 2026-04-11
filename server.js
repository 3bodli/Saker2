const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ========== المتغيرات ==========
const MONGODB_URI = process.env.MONGODB_URI;
const NOW_API_KEY = process.env.NOW_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'temp_secret';

console.log('🚀 Server starting...');
console.log('MONGODB_URI:', MONGODB_URI ? '✅ موجود' : '❌ غير موجود');
console.log('NOW_API_KEY:', NOW_API_KEY ? '✅ موجود' : '❌ غير موجود');
console.log('NOW_API_KEY value:', NOW_API_KEY ? NOW_API_KEY.substring(0, 10) + '...' : 'null');

// ========== الاتصال بقاعدة البيانات ==========
if (!MONGODB_URI) {
    console.error('❌ خطأ: MONGODB_URI غير موجود');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ متصل بـ MongoDB Atlas'))
    .catch(err => console.error('❌ خطأ في MongoDB:', err.message));

// ========== نموذج المستخدم ==========
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ========== Routes ==========
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        nowpayments: NOW_API_KEY ? 'configured' : 'missing',
        time: new Date().toISOString()
    });
});

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    console.log('📝 Register:', req.body.username);
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'أدخل جميع البيانات' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ success: false, error: 'اسم المستخدم قصير جداً' });
        }
        
        if (password.length < 4) {
            return res.status(400).json({ success: false, error: 'كلمة المرور قصيرة جداً' });
        }
        
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'اسم المستخدم موجود' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username: username.toLowerCase(), password: hashedPassword });
        await user.save();
        
        console.log('✅ تم إنشاء حساب:', username);
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: 'خطأ في الخادم' });
    }
});

// تسجيل دخول
app.post('/api/login', async (req, res) => {
    console.log('🔐 Login:', req.body.username);
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'أدخل جميع البيانات' });
        }
        
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, error: 'اسم المستخدم خطأ' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'كلمة المرور خطأ' });
        }
        
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ success: true, token, username: user.username, message: 'تم تسجيل الدخول' });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'خطأ في الخادم' });
    }
});

// التحقق من التوكن
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }
};

// ✅ إنشاء طلب دفع (نسخة مصححة)
app.post('/create-payment', verifyToken, async (req, res) => {
    console.log('💰 Payment request received');
    console.log('Body:', req.body);
    console.log('User:', req.user.username);
    
    const { amount, pay_currency } = req.body;
    
    // التحقق من المبلغ
    if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    // التحقق من مفتاح NOWPayments
    if (!NOW_API_KEY) {
        console.error('❌ NOW_API_KEY غير موجود في متغيرات البيئة');
        return res.status(500).json({ 
            success: false, 
            error: 'مفتاح الدفع غير متوفر، الرجاء التواصل مع الدعم الفني' 
        });
    }
    
    try {
        console.log('📡 جاري الاتصال بـ NOWPayments API...');
        console.log('API Key:', NOW_API_KEY.substring(0, 10) + '...');
        
        const response = await axios.post(
            'https://api.nowpayments.io/v1/invoice',
            {
                price_amount: parseFloat(amount),
                price_currency: "usd",
                pay_currency: pay_currency || "btc",
                order_id: `order_${Date.now()}_${req.user.userId}`,
                ipn_callback_url: "https://saker2-production.up.railway.app/payment-callback",
                success_url: "https://google.com",
                cancel_url: "https://google.com"
            },
            {
                headers: {
                    'x-api-key': NOW_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 ثواني مهلة
            }
        );
        
        console.log('✅ تم إنشاء الفاتورة بنجاح');
        console.log('URL:', response.data.invoice_url);
        
        res.json({ 
            success: true, 
            paymentUrl: response.data.invoice_url,
            message: 'تم إنشاء رابط الدفع بنجاح'
        });
        
    } catch (error) {
        console.error('❌ خطأ في NOWPayments:');
        
        if (error.response) {
            // الخطأ من NOWPayments
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
            
            let errorMessage = 'فشل إنشاء طلب الدفع';
            
            if (error.response.status === 401) {
                errorMessage = 'مفتاح API غير صالح، الرجاء التحقق من المفتاح';
            } else if (error.response.status === 400) {
                errorMessage = error.response.data.message || 'بيانات الدفع غير صحيحة';
            } else if (error.response.status === 429) {
                errorMessage = 'عدد الطلبات كبير جداً، حاول لاحقاً';
            }
            
            res.status(error.response.status).json({ 
                success: false, 
                error: errorMessage,
                details: error.response.data
            });
            
        } else if (error.request) {
            // السيرفر ما رد
            console.error('No response from NOWPayments');
            res.status(500).json({ 
                success: false, 
                error: 'لا يوجد استجابة من بوابة الدفع، حاول لاحقاً' 
            });
        } else {
            // خطأ في الإعدادات
            console.error('Error:', error.message);
            res.status(500).json({ 
                success: false, 
                error: 'خطأ في إعدادات الدفع: ' + error.message 
            });
        }
    }
});

// Webhook
app.post('/payment-callback', async (req, res) => {
    console.log('📦 Webhook received:', req.body);
    res.status(200).send('OK');
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: https://saker2-production.up.railway.app`);
    console.log(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
    console.log(`💰 NOWPayments: ${NOW_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`\n📝 Test endpoints:`);
    console.log(`   GET  / - Check status`);
    console.log(`   POST /api/register - Create account`);
    console.log(`   POST /api/login - Login`);
    console.log(`   POST /create-payment - Create payment (需要登录)\n`);
});
