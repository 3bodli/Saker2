const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Server starting...');

// رابط MongoDB - جرب هذا الرابط التجريبي إذا ما عندك رابط
// هذا رابط تجريبي للاختبار فقط! استبدله برابطك الحقيقي
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://obadavr_db_user:4vjEBDyXgrotjmMF@saker.skyadeo.mongodb.net/testDB';

// الاتصال بقاعدة البيانات
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
        console.error('❌ MongoDB error:', err.message);
        console.log('💡 تأكد من:');
        console.log('   1. صحة رابط MONGODB_URI');
        console.log('   2. إضافة IP 0.0.0.0/0 في MongoDB Atlas');
    });

// نموذج المستخدم
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// صفحة رئيسية للاختبار
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'Server is running',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    console.log('📝 Register request:', req.body);
    
    try {
        const { username, password } = req.body;
        
        // التحقق
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' 
            });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'اسم المستخدم قصير جداً (3 أحرف على الأقل)' 
            });
        }
        
        if (password.length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: 'كلمة المرور قصيرة جداً (4 أحرف على الأقل)' 
            });
        }
        
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // حفظ المستخدم
        const user = new User({
            username: username.toLowerCase(),
            password: hashedPassword
        });
        
        await user.save();
        
        console.log('✅ User created:', username);
        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح' 
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                error: 'اسم المستخدم موجود مسبقاً' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في الخادم: ' + error.message 
        });
    }
});

// تسجيل دخول
app.post('/api/login', async (req, res) => {
    console.log('🔐 Login request:', req.body.username);
    
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
            return res.status(401).json({ 
                success: false, 
                error: 'اسم المستخدم غير صحيح' 
            });
        }
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ 
                success: false, 
                error: 'كلمة المرور غير صحيحة' 
            });
        }
        
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || 'temp_secret',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token: token,
            username: user.username,
            message: 'تم تسجيل الدخول بنجاح'
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في الخادم' 
        });
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 https://saker2-production.up.railway.app`);
});
