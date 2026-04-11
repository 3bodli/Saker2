const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// تفعيل CORS بشكل كامل
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// تخزين مؤقت
const users = [];

// اختبار السيرفر
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Server is working!',
        usersCount: users.length 
    });
});

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    console.log('📝 Register request:', req.body);
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' 
            });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'اسم المستخدم قصير جداً' 
            });
        }
        
        if (password.length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: 'كلمة المرور قصيرة جداً' 
            });
        }
        
        // التحقق من وجود المستخدم
        const userExists = users.find(u => u.username === username);
        if (userExists) {
            return res.status(400).json({ 
                success: false, 
                error: 'اسم المستخدم موجود مسبقاً' 
            });
        }
        
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // حفظ المستخدم
        users.push({ 
            username: username, 
            password: hashedPassword,
            createdAt: new Date()
        });
        
        console.log('✅ User created:', username);
        console.log('📊 Total users:', users.length);
        
        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح' 
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
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
        
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'اسم المستخدم غير صحيح' 
            });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                error: 'كلمة المرور غير صحيحة' 
            });
        }
        
        const token = jwt.sign(
            { username: user.username }, 
            'my_secret_key_123',
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

// عرض جميع المستخدمين (للتجربة فقط)
app.get('/api/users', (req, res) => {
    const safeUsers = users.map(u => ({ username: u.username, createdAt: u.createdAt }));
    res.json({ users: safeUsers });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: https://saker2-production.up.railway.app`);
    console.log(`📝 Test endpoints:`);
    console.log(`   GET  / - Check server status`);
    console.log(`   POST /api/register - Create account`);
    console.log(`   POST /api/login - Login`);
    console.log(`   GET  /api/users - List all users\n`);
});
