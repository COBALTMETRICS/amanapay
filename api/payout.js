export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { transactionId, vendorPhone, amount } = req.body;

    try {
        // Formatted phone validation for Kenya
        let phone = vendorPhone;
        if (phone.startsWith('0')) {
            phone = '254' + phone.slice(1);
        }

        // TODO: Integrate your IntaSend B2C Transfer API call here using your API keys
        // const intasendResponse = await fetch('https://sandbox.intasend.com/api/v1/payouts/m-pesa/', { ... });

        // For now, returning a successful simulation response so your flow completes smoothly:
        return res.status(200).json({
            success: true,
            message: 'Payout processed successfully',
            transactionId: transactionId,
            payoutAmount: amount,
            recipient: phone
        });

    } catch (error) {
        console.error('Payout API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
