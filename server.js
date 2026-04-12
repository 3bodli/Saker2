const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// تخزين مؤقت
const users = [];

// فحص السيرفر
app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Server is running!' });
});

// تسجيل
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ success: false, error: 'اسم المستخدم موجود' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    
    res.json({ success: true, message: 'تم إنشاء الحساب' });
});

// دخول
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ success: false, error: 'اسم مستخدم خطأ' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ success: false, error: 'كلمة مرور خطأ' });
    }
    
    const token = jwt.sign({ username }, 'secret', { expiresIn: '7d' });
    res.json({ success: true, token, username });
});

// دفع تجريبي (بدون NOWPayments)
app.post('/create-payment', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
    }
    
    res.json({ 
        success: true, 
        paymentUrl: 'https://nowpayments.io/payment-demo?amount=' + req.body.amount
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: saker2-production.up.railway.app`);
});
