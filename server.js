const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// ========== إعدادات ==========
const JWT_SECRET = '12345678';
const PORT = process.env.PORT || 3000;

// ========== التخزين المؤقت (كل البيانات هنا) ==========
let users = [
    { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin', createdAt: new Date().toISOString() }
];
let transfers = [];
let nextUserId = 2;
let nextTransferId = 1;

// ========== الشركات (26 شركة) ==========
const companies = [
    { id: 1, name: "البريد السوري", image: "img1", fee: 5 },
    { id: 2, name: "الهرم للحوالات", image: "img2", fee: 6 },
    { id: 3, name: "الفؤاد للحوالات", image: "img3", fee: 5 },
    { id: 4, name: "شركة شخاشيرو", image: "img4", fee: 7 },
    { id: 5, name: "شركة شام للحوالات", image: "img5", fee: 5 },
    { id: 6, name: "زمزم للصرافة", image: "img6", fee: 6 },
    { id: 7, name: "تايغر للصرافة", image: "img7", fee: 7 },
    { id: 8, name: "ياقوت بلس للصرافة", image: "img8", fee: 6 },
    { id: 9, name: "دوفيز للحوالات", image: "img9", fee: 5 },
    { id: 10, name: "الاتحاد للحوالات", image: "img10", fee: 6 },
    { id: 11, name: "روديوم للصرافة", image: "img11", fee: 7 },
    { id: 12, name: "شركة طيف للصرافة", image: "img12", fee: 5 },
    { id: 13, name: "موني اوت للصرافة", image: "img13", fee: 6 },
    { id: 14, name: "مسار للصرافة", image: "img14", fee: 5 },
    { id: 15, name: "تيما للصرافة", image: "img15", fee: 6 },
    { id: 16, name: "قاسيون للصرافة", image: "img16", fee: 5 },
    { id: 17, name: "الميثاق", image: "img17", fee: 6 },
    { id: 18, name: "الحافظ للصرافة", image: "img18", fee: 5 },
    { id: 19, name: "الاندلس", image: "img19", fee: 6 },
    { id: 20, name: "سوريانا", image: "img20", fee: 5 },
    { id: 21, name: "دار الامل للصرافة", image: "img21", fee: 6 },
    { id: 22, name: "صافي للصرافة", image: "img22", fee: 5 },
    { id: 23, name: "الخواجا للصرافة", image: "img23", fee: 7 },
    { id: 24, name: "دهب للصرافة", image: "img24", fee: 6 },
    { id: 25, name: "كابيتال", image: "img25", fee: 5 },
    { id: 26, name: "شركة اتحاد", image: "img26", fee: 6 }
];

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'نظام التحويلات شغال بدون قاعدة بيانات!',
        users: users.length,
        transfers: transfers.length,
        companies: companies.length
    });
});

// ========== جلب الشركات ==========
app.get('/api/companies', (req, res) => {
    res.json({ success: true, companies });
});

// ========== تسجيل مستخدم جديد ==========
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    console.log('📝 محاولة تسجيل:', username);
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ success: false, error: 'اسم المستخدم قصير جداً' });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ success: false, error: 'كلمة المرور قصيرة جداً' });
    }
    
    // التحقق من وجود المستخدم
    const userExists = users.find(u => u.username === username);
    if (userExists) {
        return res.status(400).json({ success: false, error: 'اسم المستخدم موجود مسبقاً' });
    }
    
    // إضافة مستخدم جديد
    const newUser = {
        id: nextUserId++,
        username: username,
        password: bcrypt.hashSync(password, 10),
        role: 'user',
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    
    console.log('✅ تم إنشاء حساب:', username);
    res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
});

// ========== تسجيل دخول ==========
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log('🔐 محاولة دخول:', username);
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'الرجاء إدخال جميع البيانات' });
    }
    
    // البحث عن المستخدم
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(401).json({ success: false, error: 'اسم المستخدم غير صحيح' });
    }
    
    // التحقق من كلمة المرور
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
        return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
    }
    
    // إنشاء توكن
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    console.log('✅ تم تسجيل دخول:', username);
    res.json({
        success: true,
        token: token,
        username: user.username,
        role: user.role,
        message: 'تم تسجيل الدخول بنجاح'
    });
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'غير مصرح به - لا يوجد توكن' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'توكن غير صالح أو منتهي الصلاحية' });
    }
};

// ========== إنشاء طلب تحويل (تحويل لي) ==========
app.post('/api/create-transfer', verifyToken, (req, res) => {
    const { senderName, note, amount } = req.body;
    const feePercent = 7;
    const finalAmount = amount * (1 - feePercent / 100);
    
    console.log('💰 طلب تحويل لي من:', req.user.username, 'المبلغ:', amount);
    
    if (!senderName || !amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'الرجاء إدخال جميع البيانات بشكل صحيح' });
    }
    
    const transfer = {
        id: nextTransferId++,
        type: 'to_me',
        senderName,
        note: note || '',
        amount: parseFloat(amount),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: req.user.username
    };
    
    transfers.push(transfer);
    console.log('✅ تم إنشاء طلب تحويل:', transfer.id);
    
    res.json({
        success: true,
        transferId: transfer.id,
        finalAmount: transfer.finalAmount,
        message: 'تم إنشاء طلب التحويل بنجاح'
    });
});

// ========== إنشاء طلب تحويل لشركة ==========
app.post('/api/create-company-transfer', verifyToken, (req, res) => {
    const { companyName, receiverName, receiverNumber, amount } = req.body;
    
    console.log('💰 طلب تحويل لشركة من:', req.user.username, 'الشركة:', companyName, 'المبلغ:', amount);
    
    if (!companyName || !receiverName || !receiverNumber || !amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'الرجاء إدخال جميع البيانات بشكل صحيح' });
    }
    
    // البحث عن نسبة رسوم الشركة
    const company = companies.find(c => c.name === companyName);
    const feePercent = company ? company.fee : 5;
    const finalAmount = amount * (1 - feePercent / 100);
    
    const transfer = {
        id: nextTransferId++,
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
    
    transfers.push(transfer);
    console.log('✅ تم إنشاء طلب تحويل شركة:', transfer.id);
    
    res.json({
        success: true,
        transferId: transfer.id,
        finalAmount: transfer.finalAmount,
        message: 'تم إنشاء طلب التحويل بنجاح'
    });
});

// ========== جلب جميع الطلبات (للمشرف فقط) ==========
app.get('/api/admin/transfers', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح به - هذه الصفحة للمشرف فقط' });
    }
    
    // ترتيب الطلبات من الأحدث إلى الأقدم
    const sortedTransfers = [...transfers].reverse();
    res.json({ success: true, transfers: sortedTransfers });
});

// ========== تحديث حالة الطلب (قبول/رفض) ==========
app.put('/api/admin/update-transfer/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح به' });
    }
    
    const transferId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'حالة غير صالحة' });
    }
    
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    
    transfer.status = status;
    console.log('✅ تم تحديث حالة الطلب:', transferId, '->', status);
    
    res.json({
        success: true,
        message: `تم ${status === 'accepted' ? 'قبول' : 'رفض'} الطلب بنجاح`
    });
});

// ========== إحصائيات سريعة (للمشرف) ==========
app.get('/api/admin/stats', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    
    const stats = {
        total: transfers.length,
        pending: transfers.filter(t => t.status === 'pending').length,
        accepted: transfers.filter(t => t.status === 'accepted').length,
        rejected: transfers.filter(t => t.status === 'rejected').length,
        totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0),
        totalFinalAmount: transfers.reduce((sum, t) => sum + t.finalAmount, 0)
    };
    
    res.json({ success: true, stats });
});

// ========== إنشاء رابط دفع (بوابة NOWPayments) ==========
app.post('/api/create-payment', verifyToken, (req, res) => {
    const { amount } = req.body;
    
    console.log('💳 طلب إنشاء رابط دفع للمستخدم:', req.user.username, 'المبلغ:', amount);
    
    if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    // رابط تجريبي للدفع (يمكن استبداله بـ NOWPayments الحقيقي لاحقاً)
    const paymentUrl = `https://nowpayments.io/payment-demo?amount=${amount}&currency=USD`;
    
    res.json({
        success: true,
        paymentUrl: paymentUrl,
        message: 'تم إنشاء رابط الدفع بنجاح'
    });
});

// ========== عرض جميع المستخدمين (للمشرف) ==========
app.get('/api/admin/users', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    
    const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt
    }));
    
    res.json({ success: true, users: safeUsers });
});

// ========== بدء تشغيل السيرفر ==========
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 نظام التحويلات المالية شغال!');
    console.log('========================================');
    console.log(`📡 السيرفر على المنفذ: ${PORT}`);
    console.log(`🌐 الرابط: https://saker2-production.up.railway.app`);
    console.log(`💾 قاعدة البيانات: تخزين مؤقت في الذاكرة ✅`);
    console.log(`👑 المشرف: admin / admin123`);
    console.log(`📊 عدد الشركات: ${companies.length} شركة`);
    console.log('========================================\n');
});
