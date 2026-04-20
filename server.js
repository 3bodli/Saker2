const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

// ========== إعداد قاعدة البيانات ==========
const db = new Database('database.sqlite');

// إنشاء الجداول
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        created_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        sender_name TEXT,
        note TEXT,
        amount REAL,
        final_amount REAL,
        company_name TEXT,
        receiver_name TEXT,
        status TEXT,
        created_at TEXT,
        user_id TEXT
    );
`);

// إضافة مستخدم admin إذا لم يكن موجود
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
    db.prepare("INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)").run(
        'admin', bcrypt.hashSync('admin123', 10), 'admin', new Date().toISOString()
    );
    console.log('✅ تم إنشاء حساب admin');
}

console.log('✅ قاعدة البيانات SQLite جاهزة');

const JWT_SECRET = 'my_secret_key_2024';
const PORT = process.env.PORT || 3000;

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
    { id: 25, name: "كابيتال", image: "img25", fee: 8 },
    { id: 26, name: "شركة اتحاد", image: "img26", fee: 7 }
];

// ========== فحص السيرفر ==========
app.get('/', (req, res) => {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    const transferCount = db.prepare("SELECT COUNT(*) as count FROM transfers").get();
    res.json({ 
        status: 'online', 
        message: 'نظام التحويلات مع SQLite!',
        users: userCount.count,
        transfers: transferCount.count,
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
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'أدخل جميع البيانات' });
    }
    
    try {
        const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
        if (existing) {
            return res.status(400).json({ success: false, error: 'اسم المستخدم موجود' });
        }
        
        db.prepare("INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)").run(
            username, bcrypt.hashSync(password, 10), 'user', new Date().toISOString()
        );
        
        res.json({ success: true, message: 'تم إنشاء الحساب' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== تسجيل دخول ==========
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, username, role: 'admin' });
    }
    
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, username, role: user.role });
    }
    
    res.status(401).json({ success: false, error: 'بيانات غير صحيحة' });
});

// ========== التحقق من التوكن ==========
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'غير مصرح' });
    
    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }
};

// ========== إنشاء تحويل لي ==========
app.post('/api/create-transfer', verifyToken, (req, res) => {
    const { senderName, note, amount } = req.body;
    const finalAmount = amount * 0.93;
    
    const result = db.prepare(`
        INSERT INTO transfers (type, sender_name, note, amount, final_amount, status, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('to_me', senderName, note || '', amount, finalAmount, 'pending', new Date().toISOString(), req.user.username);
    
    res.json({ success: true, transferId: result.lastInsertRowid, finalAmount });
});

// ========== إنشاء تحويل لشركة ==========
app.post('/api/create-company-transfer', verifyToken, (req, res) => {
    const { companyName, receiverName, receiverNumber, amount } = req.body;
    const company = companies.find(c => c.name === companyName);
    const feePercent = company ? company.fee : 5;
    const finalAmount = amount * (1 - feePercent / 100);
    
    const result = db.prepare(`
        INSERT INTO transfers (type, company_name, receiver_name, amount, final_amount, status, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('to_company', companyName, receiverName, amount, finalAmount, 'pending', new Date().toISOString(), req.user.username);
    
    res.json({ success: true, transferId: result.lastInsertRowid, finalAmount });
});

// ========== جلب الطلبات للمشرف ==========
app.get('/api/admin/transfers', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false });
    }
    const transfers = db.prepare("SELECT * FROM transfers ORDER BY id DESC").all();
    res.json({ success: true, transfers });
});

// ========== تحديث حالة الطلب ==========
app.put('/api/admin/update-transfer/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    
    db.prepare("UPDATE transfers SET status = ? WHERE id = ?").run(req.body.status, req.params.id);
    res.json({ success: true });
});

// ========== إنشاء رابط دفع ==========
app.post('/api/create-payment', verifyToken, (req, res) => {
    res.json({ success: true, paymentUrl: `https://nowpayments.io/payment-demo?amount=${req.body.amount}` });
});

// ========== إحصائيات ==========
app.get('/api/admin/stats', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    
    const total = db.prepare("SELECT COUNT(*) as count FROM transfers").get();
    const pending = db.prepare("SELECT COUNT(*) as count FROM transfers WHERE status = 'pending'").get();
    const totalAmount = db.prepare("SELECT SUM(amount) as total FROM transfers").get();
    
    res.json({ 
        success: true, 
        stats: { 
            total: total.count, 
            pending: pending.count,
            totalAmount: totalAmount.total || 0
        } 
    });
});

// ========== عرض جميع المستخدمين (للمشرف) ==========
app.get('/api/admin/users', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    
    const users = db.prepare("SELECT id, username, role, created_at FROM users").all();
    res.json({ success: true, users });
});

app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 https://saker2-production.up.railway.app`);
    console.log(`💾 قاعدة البيانات: SQLite (ملف database.sqlite)`);
    console.log(`👑 المشرف: admin / admin123\n`);
});
