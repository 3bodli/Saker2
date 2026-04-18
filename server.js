const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const NOW_API_KEY = process.env.NOW_API_KEY;
const SHEETDB_URL = process.env.SHEETDB_URL;

// إنشاء دليل فعلي
app.post('/create-payment', async (req, res) => {
    const { amount, pay_currency } = req.body;
    
    if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });
    }
    
    try {
        const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
            price_amount: parseFloat(amount),
            price_currency: "usd",
            pay_currency: pay_currency || "btc",
            order_id: `order_${Date.now()}`,
            ipn_callback_url: "https://saker2-production.up.railway.app/payment-callback",
            success_url: "https://your-website.com/success",
            cancel_url: "https://your-website.com/cancel"
        }, {
            headers: {
                'x-api-key': NOW_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        // رابط الدفع الفعلي
        const paymentUrl = response.data.invoice_url;
        
        res.json({ 
            success: true, 
            paymentUrl: paymentUrl,
            message: 'تم إنشاء رابط الدفع بنجاح'
        });
        
    } catch (error) {
        console.error('NOWPayments Error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: 'فشل إنشاء طلب الدفع' 
        });
    }
});

// استقبال إشعارات الدفع
app.post('/payment-callback', async (req, res) => {
    console.log('📦 إشعار دفع:', req.body);
    
    const payment = req.body;
    
    if (payment.payment_status === 'finished') {
        console.log(`✅ تم استلام الدفع بنجاح!`);
        console.log(`💰 المبلغ: ${payment.pay_amount} ${payment.pay_currency}`);
        console.log(`🆔 رقم العملية: ${payment.payment_id}`);
        
        // هنا تقدر تحديث حالة الطلب عندك
        // وحفظ العملية في SheetDB
    }
    
    res.status(200).send('OK');
});

app.listen(3000, () => console.log('✅ Server running'));
