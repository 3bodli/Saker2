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

// ========== التحقق من المتغيرات الأساسية ==========
if (!process.env.MONGODB_URI) {
    console.error('❌ خطأ: MONGODB_URI غير موجود في متغيرات البيئة');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.warn('⚠️ تحذير: JWT_SECERT غير موجود، سيتم استخدام مفتاح افتراضي');
    process.env.JWT_SECRET = 'temp_secret_key_change_me';
}

// ========== الاتصال بقاعدة البيانات ==========
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ متصل بـ MongoDB Atlas بنجاح'))
.catch(err => {
    console.error('❌ فشل الاتصال بـ MongoDB:', err.message);
    console.error('تأكد من:');
    console.error('1. صحة رابط MONGODB_URI');
    console.error('2. إضافة IP 0.0.0.0/0 في Network Access');
    console.error('3. صحة اسم المستخدم وكلمة المرور');
});

// ========== نموذج المستخدم ==========
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ========== Routes ==========
app.get('/', (req, res) => {
    res.json({
        status: '🚀 Server is running',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            createPayment: 'POST /create-payment (requires auth)'
        },
        mongodb: mongoose.connection.readyState === 1 ? 'connected ✅' : 'disconnected ❌'
    });
});

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'الرجاء إدخال جميع البيانات' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ success: false, error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
        }
        
        if (password.length < 4) {
            return res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, error: 'اسم المستخدم موجود مسبقاً' });
        } else {
            console.error('Register error:', error);
            res.status(500).json({ success: false, error: 'خطأ في الخادم' });
        }
    }
});

// تسجيل دخول
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'الرجاء إدخال جميع البيانات' });
        }
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ success: false, error: 'اسم المستخدم غير صحيح' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
        }
        
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            token: token,
            username: user.username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'خطأ في الخادم' });
    }
});

// التحقق من التوكن
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح به - لا يوجد توكن' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: 'غير مصرح به - تنسيق توكن غير صحيح' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'توكن غير صالح أو منتهي الصلاحية' });
    }
};

// إنشاء طلب دفع
app.post('/create-payment', verifyToken, async (req, res) => {
    const { amount, pay_currency } = req.body;
    
    if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    if (!process.env.NOW_API_KEY) {
        console.error('NOW_API_KEY غير موجود');
        return res.status(500).json({ success: false, error: 'مفتاح الدفع غير متوفر' });
    }
    
    try {
        const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
            price_amount: parseFloat(amount),
            price_currency: "usd",
            pay_currency: pay_currency || "btc",
            order_id: `order_${Date.now()}_${req.user.userId}`,
            ipn_callback_url: `${process.env.RAILWAY_PUBLIC_DOMAIN || 'https://saker2-production.up.railway.app'}/payment-callback`,
            success_url: "https://google.com"
        }, {
            headers: {
                'x-api-key': process.env.NOW_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({ success: true, paymentUrl: response.data.invoice_url });
    } catch (error) {
        console.error("NOWPayments Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'فشل إنشاء طلب الدفع' });
    }
});

// Webhook
app.post('/payment-callback', async (req, res) => {
    console.log("📦 Payment callback received:", req.body);
    res.status(200).send('OK');
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API URL: https://saker2-production.up.railway.app`);
    console.log(`💾 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
});
