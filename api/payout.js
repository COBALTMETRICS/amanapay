// api/payout.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { transactionId, vendorPhone, amount } = req.body;

    if (!vendorPhone || !amount) {
        return res.status(400).json({ success: false, message: 'Missing vendor phone number or amount' });
    }

    // Determine if we are using sandbox or live based on environment variables
    const isSandbox = process.env.INTASEND_SANDBOX !== 'false';
    const baseUrl = isSandbox 
        ? 'https://sandbox.intasend.com/api/v1' 
        : 'https://payment.intasend.com/api/v1';

    try {
        // Format phone number to international format if necessary (e.g. 254...)
        let formattedPhone = vendorPhone.trim();
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        }

        // Call IntaSend Payouts/Send Money API (B2C)
        const intasendResponse = await fetch(`${baseUrl}/payout/send-money/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.INTASEND_SECRET_KEY}`
            },
            body: JSON.stringify({
                provider: "MPESA",
                currency: "KES",
                transactions: [
                    {
                        name: "Amanapay Vendor Payout",
                        account: formattedPhone,
                        amount: Number(amount),
                        narrance: `Escrow Payout for ${transactionId || 'Order'}`
                    }
                ]
            })
        });

        const data = await intasendResponse.json();

        if (!intasendResponse.ok) {
            return res.status(intasendResponse.status).json({ success: false, error: data });
        }

        return res.status(200).json({
            success: true,
            message: 'Automated payout successfully dispatched to vendor',
            data
        });

    } catch (error) {
        console.error('IntaSend Payout Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process automated vendor payout',
            error: error.message
        });
    }
}
