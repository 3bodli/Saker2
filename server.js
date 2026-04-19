const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// ========== إعدادات ==========
const SHEETDB_URL = 'https://sheetdb.io/api/v1/mzqjpb6r5e2af'; // غيرها
const JWT_SECRET = '12345678';

// ========== بيانات المشرف ==========
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

// ========== التخزين المؤقت ==========
let tempUsers = [];
let tempTransfers = [];

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Payment System Running' });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const response = await axios.get(SHEETDB_URL + '/users');
        const users = response.data;
        const userExists = users.find(u => u.username === username);
        
        if (userExists) {
            return res.json({ success: false, error: 'اسم المستخدم موجود' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        await axios.post(SHEETDB_URL + '/users', {
            data: { username, password: hashedPassword, role: 'user', createdAt: new Date().toISOString() }
        });
        
        res.json({ success: true, message: 'تم إنشاء الحساب' });
    } catch (error) {
        // تخزين مؤقت
        if (tempUsers.find(u => u.username === username)) {
            return res.json({ success: false, error: 'اسم المستخدم موجود' });
        }
        tempUsers.push({ username, password: bcrypt.hashSync(password, 10), role: 'user' });
        res.json({ success: true, message: 'تم إنشاء الحساب (تخزين مؤقت)' });
    }
});

// ========== تسجيل دخول ==========
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // دخول المشرف
    if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, username, role: 'admin' });
    }
    
    try {
        const response = await axios.get(SHEETDB_URL + '/users');
        const users = response.data;
        const user = users.find(u => u.username === username);
        
        if (user && bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign({ username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token, username, role: 'user' });
        }
        
        // تخزين مؤقت
        const tempUser = tempUsers.find(u => u.username === username);
        if (tempUser && bcrypt.compareSync(password, tempUser.password)) {
            const token = jwt.sign({ username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token, username, role: 'user' });
        }
        
        res.json({ success: false, error: 'بيانات غير صحيحة' });
    } catch (error) {
        res.json({ success: false, error: 'خطأ في الخادم' });
    }
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'غير مصرح' });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }
};

// ========== إنشاء طلب تحويل (تحويل لي) ==========
app.post('/api/create-transfer', verifyToken, async (req, res) => {
    const { senderName, note, amount } = req.body;
    const feePercent = 7; // 7% رسوم
    const finalAmount = amount * (1 - feePercent / 100);
    
    const transfer = {
        id: Date.now().toString(),
        type: 'to_me',
        senderName,
        note,
        amount: parseFloat(amount),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: req.user.username
    };
    
    try {
        await axios.post(SHEETDB_URL + '/transfers', { data: transfer });
        res.json({ success: true, transferId: transfer.id, finalAmount: transfer.finalAmount });
    } catch (error) {
        tempTransfers.push(transfer);
        res.json({ success: true, transferId: transfer.id, finalAmount: transfer.finalAmount });
    }
});

// ========== إنشاء طلب تحويل لشركة صرافة ==========
app.post('/api/create-company-transfer', verifyToken, async (req, res) => {
    const { companyName, receiverName, receiverNumber, amount } = req.body;
    
    // جلب معلومات الشركة
    let companyFee = 5; // رسوم افتراضية
    let finalAmount = amount * (1 - companyFee / 100);
    
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
    
    try {
        await axios.post(SHEETDB_URL + '/transfers', { data: transfer });
        res.json({ success: true, transferId: transfer.id, finalAmount: transfer.finalAmount });
    } catch (error) {
        tempTransfers.push(transfer);
        res.json({ success: true, transferId: transfer.id, finalAmount: transfer.finalAmount });
    }
});

// ========== جلب طلبات المشرف ==========
app.get('/api/admin/transfers', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    
    try {
        const response = await axios.get(SHEETDB_URL + '/transfers');
        res.json({ success: true, transfers: response.data });
    } catch (error) {
        res.json({ success: true, transfers: tempTransfers });
    }
});

// ========== تحديث حالة الطلب (قبول/رفض) ==========
app.put('/api/admin/update-transfer/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'
    
    try {
        await axios.patch(`${SHEETDB_URL}/transfers/id/${id}`, { data: { status } });
        res.json({ success: true, message: `تم ${status === 'accepted' ? 'قبول' : 'رفض'} الطلب` });
    } catch (error) {
        const transfer = tempTransfers.find(t => t.id === id);
        if (transfer) transfer.status = status;
        res.json({ success: true, message: `تم ${status === 'accepted' ? 'قبول' : 'رفض'} الطلب` });
    }
});

// ========== إنشاء رابط دفع ==========
app.post('/api/create-payment', verifyToken, async (req, res) => {
    const { amount } = req.body;
    
    res.json({
        success: true,
        paymentUrl: `https://nowpayments.io/payment-demo?amount=${amount}`
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
