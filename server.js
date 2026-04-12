const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// سجل بسيط
app.get('/', (req, res) => {
    res.send('Server is running! 🚀');
});

app.post('/api/register', (req, res) => {
    res.json({ success: true, message: 'Account created' });
});

app.post('/api/login', (req, res) => {
    res.json({ success: true, token: 'demo-token', username: req.body.username });
});

app.post('/create-payment', (req, res) => {
    res.json({ success: true, paymentUrl: 'https://nowpayments.io/demo' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on ${PORT}`);
});
