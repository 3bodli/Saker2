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
// استبدل هذا الرابط برابط MongoDB Atlas حقيقي
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://obadavr_db_user:4vjEBDyXgrotjmMF@saker.skyadeo.mongodb.net/paymentDB';

// ========== الاتصال بقاعدة البيانات ==========
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ متصل بقاعدة البيانات بنجاح'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message));

// ========== نموذج المستخدم ==========
const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

const User = mongoose.model('User', UserSchema);

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Server is working!',
        database: mongoose.connection.readyState === 1 ? 'connected ✅' : 'disconnected ❌'
    });
});

// ========== التحقق من صحة التوكن ==========
app.post('/api/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.json({ valid: false, error: 'لا يوجد توكن' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '12345678');
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.json({ valid: false, error: error.message });
    }
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    console.log('📝 محاولة تسجيل:', req.body.username);
    
    try {
        const { username, password } = req.body;
        
        // التحقق من البيانات
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' 
            });
        }
        
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
            return res.status(400).json({ 
                success: false, 
                error: 'اسم المستخدم موجود مسبقاً' 
            });
        }
        
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // إنشاء المستخدم
        const user = new User({
            username: username.toLowerCase(),
            password: hashedPassword
        });
        
        await user.save();
        
        console.log('✅ تم إنشاء حساب:', username);
        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح' 
        });
        
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في الخادم: ' + error.message 
        });
    }
});

// ========== تسجيل دخول ==========
app.post('/api/login', async (req, res) => {
    console.log('🔐 محاولة دخول:', req.body.username);
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'الرجاء إدخال جميع البيانات' 
            });
        }
        
        // البحث عن المستخدم
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'اسم المستخدم غير صحيح' 
            });
        }
        
        // التحقق من كلمة المرور
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                error: 'كلمة المرور غير صحيحة' 
            });
        }
        
        // إنشاء توكن
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || '12345678',
            { expiresIn: '7d' }
        );
        
        console.log('✅ تم تسجيل دخول:', username);
        res.json({ 
            success: true, 
            token: token,
            username: user.username,
            message: 'تم تسجيل الدخول بنجاح'
        });
        
    } catch (error) {
        console.error('❌ خطأ في الدخول:', error);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في الخادم' 
        });
    }
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ 
            success: false, 
            error: 'غير مصرح به - لا يوجد توكن' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '12345678');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            error: 'توكن غير صالح أو منتهي الصلاحية' 
        });
    }
};

// ========== إنشاء طلب دفع (محمي) ==========
app.post('/create-payment', verifyToken, async (req, res) => {
    const { amount, pay_currency } = req.body;
    
    console.log('💰 طلب دفع من:', req.user.username, 'المبلغ:', amount);
    
    if (!amount || amount < 1) {
        return res.status(400).json({ 
            success: false, 
            error: 'المبلغ غير صحيح' 
        });
    }
    
    // رابط تجريبي للدفع
    res.json({ 
        success: true, 
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}&currency=${pay_currency || 'btc'}`,
        message: 'تم إنشاء رابط الدفع (تجريبي)'
    });
});

// ========== عرض جميع المستخدمين (للمشرف فقط) ==========
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username createdAt');
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: https://saker2-production.up.railway.app`);
    console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}\n`);
});
