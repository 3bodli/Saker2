const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ========== رابط SheetDB الصحيح ==========
const SHEETDB_URL = 'https://sheetdb.io/api/v1/8efypb9mcmexn';
const JWT_SECRET = '12345678';

// ========== الشركات (26 شركة) ==========
const companies = [
    { id: 1, name: "البريد السوري", image: "img1", fee: 7 },
    { id: 2, name: "الهرم للحوالات", image: "img2", fee: 7 },
    { id: 3, name: "الفؤاد للحوالات", image: "img3", fee: 7 },
    { id: 4, name: "شركة شخاشيرو", image: "img4", fee: 7 },
    { id: 5, name: "شركة شام للحوالات", image: "img5", fee: 7 },
    { id: 6, name: "زمزم للصرافة", image: "img6", fee: 7 },
    { id: 7, name: "تايغر للصرافة", image: "img7", fee: 7 },
    { id: 8, name: "ياقوت بلس للصرافة", image: "img8", fee: 7 },
    { id: 9, name: "دوفيز للحوالات", image: "img9", fee: 7 },
    { id: 10, name: "الاتحاد للحوالات", image: "img10", fee: 7 },
    { id: 11, name: "روديوم للصرافة", image: "img11", fee: 7 },
    { id: 12, name: "شركة طيف للصرافة", image: "img12", fee: 7 },
    { id: 13, name: "موني اوت للصرافة", image: "img13", fee: 7 },
    { id: 14, name: "مسار للصرافة", image: "img14", fee: 7 },
    { id: 15, name: "تيما للصرافة", image: "img15", fee: 7 },
    { id: 16, name: "قاسيون للصرافة", image: "img16", fee: 7 },
    { id: 17, name: "الميثاق", image: "img17", fee: 7 },
    { id: 18, name: "الحافظ للصرافة", image: "img18", fee: 7 },
    { id: 19, name: "الاندلس", image: "img19", fee: 7 },
    { id: 20, name: "سوريانا", image: "img20", fee: 7 },
    { id: 21, name: "دار الامل للصرافة", image: "img21", fee: 7 },
    { id: 22, name: "صافي للصرافة", image: "img22", fee: 7 },
    { id: 23, name: "الخواجا للصرافة", image: "img23", fee: 7 },
    { id: 24, name: "دهب للصرافة", image: "img24", fee: 7 },
    { id: 25, name: "كابيتال", image: "img25", fee: 7 },
    { id: 26, name: "شركة اتحاد", image: "img26", fee: 7 }
];

// ========== تخزين مؤقت (احتياطي) ==========
let tempUsers = [];
let tempTransfers = [];

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Server running!' });
});

// ========== جلب الشركات ==========
app.get('/api/companies', (req, res) => {
    res.json({ success: true, companies });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    console.log('📝 Register:', username);
    
    if (!username || !password) {
        return res.json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    try {
        // جلب المستخدمين من SheetDB
        const response = await axios.get(`${SHEETDB_URL}/users`);
        const users = response.data;
        const userExists = users.find(u => u.username === username);
        
        if (userExists) {
            return res.json({ success: false, error: 'اسم المستخدم موجود' });
        }
        
        // إضافة مستخدم جديد
        await axios.post(`${SHEETDB_URL}/users`, {
            data: {
                username: username,
                password: password,
                role: 'user',
                createdAt: new Date().toISOString()
            }
        });
        
        console.log('✅ تم إنشاء حساب:', username);
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
        
    } catch (error) {
        console.log('⚠️ SheetDB فشل، استخدام تخزين مؤقت');
        
        // تخزين مؤقت
        if (tempUsers.find(u => u.username === username)) {
            return res.json({ success: false, error: 'اسم المستخدم موجود' });
        }
        tempUsers.push({ username, password, role: 'user' });
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
    
    // مشرف
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, username, role: 'admin' });
    }
    
    try {
        // البحث في SheetDB
        const response = await axios.get(`${SHEETDB_URL}/users`);
        const users = response.data;
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            const token = jwt.sign({ username, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
            console.log('✅ تم تسجيل دخول:', username);
            return res.json({ success: true, token, username, role: user.role || 'user' });
        }
        
        // البحث في التخزين المؤقت
        const tempUser = tempUsers.find(u => u.username === username && u.password === password);
        if (tempUser) {
            const token = jwt.sign({ username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token, username, role: 'user' });
        }
        
        res.json({ success: false, error: 'بيانات غير صحيحة' });
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        res.json({ success: false, error: 'خطأ في الخادم' });
    }
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
    }
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }
};

// ========== إنشاء طلب تحويل لي ==========
app.post('/api/create-transfer', verifyToken, (req, res) => {
    const { senderName, note, amount } = req.body;
    const finalAmount = amount * 0.93;
    
    const transfer = {
        id: Date.now().toString(),
        type: 'to_me',
        senderName,
        note: note || '',
        amount: parseFloat(amount),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: req.user.username
    };
    
    tempTransfers.push(transfer);
    res.json({ success: true, transferId: transfer.id, finalAmount: transfer.finalAmount });
});

// ========== إنشاء طلب تحويل لشركة ==========
app.post('/api/create-company-transfer', verifyToken, (req, res) => {
    const { companyName, receiverName, receiverNumber, amount } = req.body;
    const company = companies.find(c => c.name === companyName);
    const feePercent = company ? company.fee : 5;
    const finalAmount = amount * (1 - feePercent / 100);
    
    const transfer = {
        id: Date.now().toString(),
        type: 'to_company',
        companyName,
        receiverName,
        receiverNumber,
        amount: parseFloat(amount),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: req.user.username
    };
    
    tempTransfers.push(transfer);
    res.json({ success: true, transferId: transfer.id, finalAmount: transfer.finalAmount });
});

// ========== جلب الطلبات للمشرف ==========
app.get('/api/admin/transfers', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    const transfers = [...tempTransfers].reverse();
    res.json({ success: true, transfers });
});

// ========== تحديث حالة الطلب ==========
app.put('/api/admin/update-transfer/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    
    const transfer = tempTransfers.find(t => t.id === req.params.id);
    if (transfer) {
        transfer.status = req.body.status;
        res.json({ success: true, message: `تم ${req.body.status === 'accepted' ? 'قبول' : 'رفض'} الطلب` });
    } else {
        res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
});

// ========== إنشاء رابط دفع ==========
app.post('/api/create-payment', verifyToken, (req, res) => {
    const { amount } = req.body;
    res.json({ 
        success: true, 
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}` 
    });
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 https://saker2-production.up.railway.app`);
    console.log(`👑 Admin: admin / admin123`);
    console.log(`📊 26 شركة صرافة جاهزة!\n`);
});
