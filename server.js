const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ========== رابط SheetDB (استبدله برابطك) ==========
const SHEETDB_URL = 'https://sheetdb.io/api/v1/mzqjpb6r5e2af';

// ========== تخزين مؤقت احتياطي ==========
const tempUsers = [];

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        database: 'SheetDB',
        message: 'Server is ready!'
    });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    console.log('📝 Register:', username);
    
    if (!username || !password) {
        return res.json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    try {
        // جلب جميع المستخدمين من SheetDB
        const getResponse = await axios.get(SHEETDB_URL);
        const users = getResponse.data;
        
        // التحقق من وجود المستخدم
        const userExists = users.some(user => user.username === username);
        
        if (userExists) {
            return res.json({ success: false, error: 'اسم المستخدم موجود مسبقاً' });
        }
        
        // إضافة مستخدم جديد
        await axios.post(SHEETDB_URL, {
            data: {
                username: username,
                password: password,
                createdAt: new Date().toISOString()
            }
        });
        
        console.log('✅ تم إنشاء حساب في SheetDB:', username);
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
        
    } catch (error) {
        console.log('⚠️ SheetDB فشل، استخدام التخزين المؤقت');
        
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
    const { username, password } = req.body;
    console.log('🔐 Login:', username);
    
    if (!username || !password) {
        return res.json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    try {
        // البحث عن المستخدم في SheetDB
        const response = await axios.get(`${SHEETDB_URL}/search?username=${username}`);
        const users = response.data;
        
        if (users.length > 0 && users[0].password === password) {
            const token = Buffer.from(username + ':' + Date.now()).toString('base64');
            console.log('✅ تم تسجيل دخول من SheetDB:', username);
            
            return res.json({
                success: true,
                token: token,
                username: username,
                message: 'تم تسجيل الدخول بنجاح'
            });
        }
        
        // البحث في التخزين المؤقت
        const tempUser = tempUsers.find(u => u.username === username && u.password === password);
        if (tempUser) {
            const token = Buffer.from(username + ':' + Date.now()).toString('base64');
            console.log('✅ تم تسجيل دخول من التخزين المؤقت:', username);
            
            return res.json({
                success: true,
                token: token,
                username: username,
                message: 'تم تسجيل الدخول بنجاح (تخزين مؤقت)'
            });
        }
        
        res.json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        
    } catch (error) {
        console.log('⚠️ SheetDB فشل، البحث في التخزين المؤقت');
        
        const tempUser = tempUsers.find(u => u.username === username && u.password === password);
        if (tempUser) {
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

// ========== عرض جميع المستخدمين (للاختبار) ==========
app.get('/api/users', async (req, res) => {
    try {
        const response = await axios.get(SHEETDB_URL);
        res.json({ users: response.data });
    } catch (error) {
        res.json({ users: tempUsers });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 https://saker2-production.up.railway.app`);
    console.log(`📡 SheetDB: ${SHEETDB_URL}\n`);
});
