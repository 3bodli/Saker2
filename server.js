const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Route اختبار (مهم لحتى ما يعطي error)
app.get('/', (req, res) => {
  res.send('Server is running 🚀');
});

// إنشاء طلب دفع عبر NOWPayments
app.post('/create-payment', async (req, res) => {
  const { amount } = req.body;

  try {
    const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
      price_amount: amount,
      price_currency: "usd",
      pay_currency: "btc",
      order_id: `order_${Date.now()}`,
      ipn_callback_url: "https://saker2-production.up.railway.app/payment-callback",
      success_url: "https://google.com"
    }, {
      headers: {
        'x-api-key': process.env.NOW_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({ paymentUrl: response.data.invoice_url });

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// Webhook لتأكيد الدفع
app.post('/payment-callback', async (req, res) => {
  const payment = req.body;

  console.log("Payment callback received:", payment);

  if (payment.payment_status === "finished") {
    console.log('Payment successfully received:', payment);
    // هون لاحقًا فيك تضيف تحديث رصيد المستخدم
  }

  res.status(200).send('OK');
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
