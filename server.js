const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// إنشاء طلب دفع عبر NOWPayments
app.post('/create-payment', async (req, res) => {
  const { amount } = req.body;

  try {
    const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
      price_amount: amount,
      price_currency: "usd",
      pay_currency: "usdt",
      order_id: `order_${Date.now()}`,
      ipn_callback_url: "https://YOUR_RENDER_BACKEND_URL/payment-callback",
      success_url: "https://YOUR_FRONTEND_URL/success"
    }, {
      headers: { 'x-api-key': process.env.NOW_API_KEY }
    });

    res.json({ paymentUrl: response.data.invoice_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// Webhook لتأكيد الدفع
app.post('/payment-callback', async (req, res) => {
  const payment = req.body;
  console.log("Payment callback received:", payment);

  // هنا تحدث قاعدة بياناتك أو رصيد المستخدم
  // payment.status يمكن أن يكون "finished" للدفع المكتمل

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));