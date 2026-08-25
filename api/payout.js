export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { transactionId, vendorPhone, amount } = req.body;

    try {
        let phone = vendorPhone;
        if (phone.startsWith('0')) {
            phone = '254' + phone.slice(1);
        }

        const intasendSecret = process.env.INTASEND_SECRET_KEY;
        
        // If test mode or sandbox keys are used without live credentials, fallback gracefully for testing
        if (!intasendSecret || intasendSecret.includes('sandbox_placeholder')) {
            return res.status(200).json({
                success: true,
                simulated: true,
                message: 'Payout simulated successfully (Add live IntaSend keys to enable live B2C pushes)',
                transactionId,
                amount
            });
        }

        // Live IntaSend B2C Payout Request
        const intasendRes = await fetch('https://payment.intasend.com/api/v1/payouts/m-pesa/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${intasendSecret}`
            },
            body: JSON.stringify({
                provider: 'MPESA',
                currency: 'KES',
                transactions: [
                    {
                        name: 'Vendor Escrow Payout',
                        account: phone,
                        amount: amount,
                        narrative: `Amanapay Payout ${transactionId}`
                    }
                ]
            })
        });

        const intasendData = await intasendRes.json();

        if (!intasendRes.ok) {
            throw new Error(intasendData.message || 'IntaSend Payout API rejection');
        }

        return res.status(200).json({
            success: true,
            data: intasendData,
            message: 'IntaSend payout triggered successfully'
        });

    } catch (error) {
        console.error('Payout API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
