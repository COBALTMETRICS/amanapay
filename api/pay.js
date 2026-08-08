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
    const apiRef = "trx_" + Math.random().toString(36).substring(2, 8);

    try {
        // 1. Trigger IntaSend M-Pesa STK Push Sandbox Request
        const intasendResponse = await fetch('https://sandbox.intasend.com/api/v1/payment/mpesa-stk-push/', {
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
                api_ref: apiRef
            })
        });

        const data = await intasendResponse.json();

        if (!intasendResponse.ok) {
            throw new Error(JSON.stringify(data));
        }

        // 2. Automatically log the successful transaction to your Google Sheet CRM
        try {
            await fetch('https://script.google.com/macros/s/AKfycbypUtJBHD_8FTVP03n_LDHNai8AeLqG9_q6kMM4sMzPJ6iCVmc2aHNXuZ2BnDhkdRlTSw/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_ref: apiRef,
                    phone_number: phoneNumber,
                    amount: amount,
                    status: "SUCCESS"
                })
            });
        } catch (sheetError) {
            console.error("Google Sheet Logging Error:", sheetError);
            // Non-blocking error so the payment flow still succeeds even if logging fails
        }

        return res.status(200).json({ success: true, response: data });
    } catch (error) {
        console.error("IntaSend API Error:", error);
        return res.status(500).json({ success: false, error: error.message || 'Payment failed' });
    }
}
