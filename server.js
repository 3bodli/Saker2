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

// ========== طباعة جميع المتغيرات للتصحيح ==========
console.log('🚀 Starting server...');
console.log('PORT:', process.env.PORT || 3000);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('NOW_API_KEY exists:', !!process.env.NOW_API_KEY);

// ========== الاتصال بقاعدة البيانات ==========
if (!process.env.MONGODB_URI) {
    console.error('❌ FATAL: MONGODB_URI is not set in environment variables');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
})
.then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
    console.error('❌ MongoDB Connection Failed!');
    console.error('Error:', err.message);
    console.error('Please check:');
    console.error('1. MONGODB_URI is correct');
    console.error('2. IP address is whitelisted in MongoDB Atlas');
    console.error('3. Username and password are correct');
});

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
        time: new Date().toISOString(),
        endpoints: ['POST /api/register', 'POST /api/login', 'POST /create-payment']
    });
});

// ✅ تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    console.log('📝 [/api/register] Request received');
    console.log('Body:', req.body);
    
    try {
        const { username, password } = req.body;
        
        // التحقق من وجود البيانات
        if (!username || !password) {
            console.log('❌ Missing fields');
            return res.status(400).json({ 
                success: false, 
                error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' 
            });
        }
        
        // التحقق من طول البيانات
        if (username.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' 
            });
        }
        
        if (password.length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' 
            });
        }
        
        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            console.log('❌ Username already exists:', username);
            return res.status(400).json({ 
                success: false, 
                error: 'اسم المستخدم موجود مسبقاً' 
            });
        }
        
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // إنشاء المستخدم
        const newUser = new User({ 
            username: username.toLowerCase(), 
            password: hashedPassword 
        });
        
        await newUser.save();
        console.log('✅ User created successfully:', username);
        
        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح' 
        });
        
    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في الخادم: ' + error.message 
        });
    }
});

// ✅ تسجيل دخول
app.post('/api/login', async (req, res) => {
    console.log('🔐 [/api/login] Request received');
    console.log('Body:', req.body);
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'الرجاء إدخال جميع البيانات' 
            });
        }
        
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ 
                success: false, 
                error: 'اسم المستخدم غير صحيح' 
            });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.log('❌ Invalid password for:', username);
            return res.status(401).json({ 
                success: false, 
                error: 'كلمة المرور غير صحيحة' 
            });
        }
        
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'temp_secret',
            { expiresIn: '7d' }
        );
        
        console.log('✅ Login successful:', username);
        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            token: token,
            username: user.username
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في الخادم' 
        });
    }
});

// ✅ التحقق من التوكن
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح به' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'temp_secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }
};

// ✅ إنشاء طلب دفع
app.post('/create-payment', verifyToken, async (req, res) => {
    console.log('💰 [/create-payment] Request received');
    const { amount, pay_currency } = req.body;
    
    if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    try {
        const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
            price_amount: parseFloat(amount),
            price_currency: "usd",
            pay_currency: pay_currency || "btc",
            order_id: `order_${Date.now()}_${req.user.userId}`,
            success_url: "https://google.com"
        }, {
            headers: {
                'x-api-key': process.env.NOW_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Payment created successfully');
        res.json({ success: true, paymentUrl: response.data.invoice_url });
        
    } catch (error) {
        console.error('❌ Payment error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'فشل إنشاء طلب الدفع' });
    }
});

// ✅ Webhook
app.post('/payment-callback', async (req, res) => {
    console.log('📦 Webhook received:', req.body);
    res.status(200).send('OK');
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: https://saker2-production.up.railway.app`);
    console.log(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}\n`);
});
