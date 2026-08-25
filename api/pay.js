export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { phoneNumber, amount, transactionId } = req.body;

    if (!phoneNumber || !amount) {
        return res.status(400).json({ success: false, message: 'Missing phone number or amount' });
    }

    const apiRef = transactionId || "trx_" + Math.random().toString(36).substring(2, 8);
    const isSandbox = process.env.INTASEND_SANDBOX !== 'false';
    const baseUrl = isSandbox 
        ? 'https://sandbox.intasend.com/api/v1' 
        : 'https://payment.intasend.com/api/v1';

    try {
        const intasendResponse = await fetch(`${baseUrl}/payment/mpesa-stk-push/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.INTASEND_SECRET_KEY}`
            },
            body: JSON.stringify({
                public_key: process.env.INTASEND_PUBLIC_KEY,
                amount: Number(amount),
                phone_number: phoneNumber,
                api_ref: apiRef,
                email: "buyer@amanapay.co"
            })
        });

        const data = await intasendResponse.json();

        if (!intasendResponse.ok) {
            return res.status(intasendResponse.status).json({ success: false, error: data });
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
