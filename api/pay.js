export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { phoneNumber, amount } = req.body;

    try {
        const response = await fetch('https://sandbox.intasend.com/api/v1/payment/mpesa-stk-push/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.INTASEND_SECRET_KEY}`
            },
            body: JSON.stringify({
                amount: Number(amount),
                phone_number: phoneNumber,
                email: "buyer@amanapay.co",
                first_name: "Amanapay",
                last_name: "Buyer",
                api_ref: "trx_" + Math.random().toString(36).substring(2, 8)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(data));
        }

        return res.status(200).json({ success: true, response: data });
    } catch (error) {
        console.error("IntaSend API Error:", error);
        return res.status(500).json({ success: false, error: error.message || 'Payment failed' });
    }
}
