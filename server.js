const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// تخزين مؤقت في الذاكرة (بدون MongoDB)
const users = [];

app.get('/', (req, res) => {
    res.json({ status: 'online', users: users.length });
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

app.listen(3000, () => console.log('Server running on port 3000'));
