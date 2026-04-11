const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ========== 1. الاتصال بقاعدة البيانات (MongoDB Atlas مجاني) ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://obadavr_db_user:4vjEBDyXgrotjmMF@saker.skyadeo.mongodb.net/paymentDB';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ متصل بـ MongoDB Atlas'))
  .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// ========== 2. نموذج المستخدم ==========
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ========== 3. Route اختبار ==========
app.get('/', (req, res) => {
  res.send('Server is running 🚀 with authentication');
});

// ========== 4. تسجيل مستخدم جديد ==========
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
  }

  try {
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    
    res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: 'اسم المستخدم موجود مسبقاً' });
    } else {
      res.status(500).json({ success: false, error: 'خطأ في الخادم' });
    }
  }
});

// ========== 5. تسجيل دخول ==========
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'الرجاء إدخال جميع البيانات' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, error: 'اسم المستخدم غير صحيح' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
    }

    // إنشاء JWT token (صلاحية 7 أيام)
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || '12345678',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token: token,
      username: user.username
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في الخادم' });
  }
});

// ========== 6. التحقق من صحة التوكن (لحماية المسارات) ==========
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'غير مصرح به' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '12345678');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'توكن غير صالح' });
  }
};

// ========== 7. إنشاء طلب دفع (محمي، يحتاج تسجيل دخول) ==========
app.post('/create-payment', verifyToken, async (req, res) => {
  const { amount } = req.body;

  try {
    const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
      price_amount: amount,
      price_currency: "usd",
      pay_currency: "btc",
      order_id: `order_${Date.now()}_${req.user.userId}`,
      ipn_callback_url: "https://saker2-production.up.railway.app/payment-callback",
      success_url: "https://your-site.com/success.html"
    }, {
      headers: {
        'x-api-key': process.env.NOW_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, paymentUrl: response.data.invoice_url });

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Payment creation failed' });
  }
});

// ========== 8. Webhook لتأكيد الدفع ==========
app.post('/payment-callback', async (req, res) => {
  const payment = req.body;
  console.log("Payment callback received:", payment);

  if (payment.payment_status === "finished") {
    console.log('✅ Payment successfully received:', payment);
    // هون فيك تحفظ بيانات الدفع في قاعدة البيانات
  }

  res.status(200).send('OK');
});

// ========== 9. تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
