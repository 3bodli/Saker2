const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ========== رابط قاعدة البيانات ==========
// جرب هذا الرابط إذا ما عندك حساب MongoDB
// هذا رابط تجريبي عام (للتجربة فقط!)
const MONGODB_URI = 'mongodb+srv://demo_user:demo12345@cluster0.xxxxx.mongodb.net/paymentDB';

// أو استخدم الرابط حقك من متغيرات البيئة
// const MONGODB_URI = process.env.MONGODB_URI;

console.log('📡 جاري الاتصال بقاعدة البيانات...');

// ========== الاتصال بقاعدة البيانات ==========
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!');
        console.log('📊 قاعدة البيانات:', mongoose.connection.db.databaseName);
    })
    .catch(err => {
        console.error('❌ فشل الاتصال بقاعدة البيانات!');
        console.error('الخطأ:', err.message);
        console.log('\n💡 الحلول:');
        console.log('1. تأكد من صحة رابط MongoDB Atlas');
        console.log('2. أضف 0.0.0.0/0 في Network Access');
        console.log('3. تأكد من صحة اسم المستخدم وكلمة المرور');
    });

// ========== نموذج المستخدم ==========
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    let dbText = '';
    if (dbStatus === 1) dbText = 'connected ✅';
    else if (dbStatus === 0) dbText = 'disconnected ❌';
    else dbText = 'connecting...';
    
    res.json({ 
        status: 'online',
        database: dbText,
        message: dbStatus === 1 ? 'قاعدة البيانات متصلة' : 'قاعدة البيانات غير متصلة - راجع الإعدادات'
    });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    // إذا قاعدة البيانات غير متصلة
    if (mongoose.connection.readyState !== 1) {
        // تخزين مؤقت في الذاكرة
        if (!global.tempUsers) global.tempUsers = [];
        
        if (global.tempUsers.find(u => u.username === username)) {
            return res.status(400).json({ success: false, error: 'اسم المستخدم موجود' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        global.tempUsers.push({ username, password: hashedPassword });
        
        return res.json({ success: true, message: 'تم إنشاء الحساب (تخزين مؤقت)' });
    }
    
    // إذا قاعدة البيانات متصلة
    try {
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'اسم المستخدم موجود' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username: username.toLowerCase(), password: hashedPassword });
        await user.save();
        
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== تسجيل دخول ==========
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    // إذا قاعدة البيانات غير متصلة - استخدم التخزين المؤقت
    if (mongoose.connection.readyState !== 1 && global.tempUsers) {
        const user = global.tempUsers.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ success: false, error: 'اسم المستخدم خطأ' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'كلمة المرور خطأ' });
        }
        
        const token = jwt.sign({ username }, 'temp_secret', { expiresIn: '7d' });
        return res.json({ success: true, token, username });
    }
    
    // إذا قاعدة البيانات متصلة
    try {
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, error: 'اسم المستخدم خطأ' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'كلمة المرور خطأ' });
        }
        
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || '12345678',
            { expiresIn: '7d' }
        );
        
        res.json({ success: true, token, username: user.username });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '12345678');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }
};

// ========== إنشاء طلب دفع ==========
app.post('/create-payment', verifyToken, (req, res) => {
    const { amount } = req.body;
    
    if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    // رابط تجريبي للدفع
    res.json({ 
        success: true, 
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}`,
        message: 'تم إنشاء رابط الدفع (تجريبي)'
    });
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ السيرفر شغال على المنفذ ${PORT}`);
    console.log(`🌐 الرابط: https://saker2-production.up.railway.app`);
    console.log(`💾 حالة قاعدة البيانات: ${mongoose.connection.readyState === 1 ? 'متصلة ✅' : 'غير متصلة ❌'}`);
    console.log(`\n📝 ملاحظة: إذا قاعدة البيانات غير متصلة،`);
    console.log(`   التطبيق سيستخدم تخزيناً مؤقتاً في الذاكرة.\n`);
});
