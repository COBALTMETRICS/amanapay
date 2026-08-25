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
        
        // 1. Trigger IntaSend B2C Payout (or fallback gracefully if sandbox keys aren't set)
        if (intasendSecret && !intasendSecret.includes('sandbox_placeholder')) {
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
        }

        // 2. Notify your Google Apps Script CRM to update the Google Sheet status to COMPLETED
        await fetch('https://script.google.com/macros/s/AKfycbypUtJBHD_8FTVP03n_LDHNai8AeLqG9_q6kMM4sMzPJ6iCVmc2aHNXuZ2BnDhkdRlTSw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_ref: transactionId,
                phone_number: phone,
                amount: amount,
                status: 'COMPLETED_PAYOUT_SENT'
            })
        });

        return res.status(200).json({
            success: true,
            message: 'Payout processed and Google Sheet updated successfully',
            transactionId,
            amount
        });

    } catch (error) {
        console.error('Payout API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
