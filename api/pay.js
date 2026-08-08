import IntaSend from 'intasend-node';

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
        const intasend = new IntaSend(
            process.env.INTASEND_PUBLIC_KEY,
            process.env.INTASEND_SECRET_KEY,
            false
        );

        let response = await intasend.collection().STKPush({
            first_name: "Amanapay",
            last_name: "Buyer",
            email: "buyer@amanapay.co",
            amount: Number(amount),
            phone_number: phoneNumber,
            api_ref: "trx_" + Math.random().toString(36).substring(2, 8)
        });

        return res.status(200).json({ success: true, response });
    } catch (error) {
        console.error("IntaSend Error:", error);
        return res.status(500).json({ success: false, error: error.message || 'Payment failed' });
    }
}
