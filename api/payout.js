export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { transactionId, vendorPhone, amount } = req.body;

    try {
        let phone = vendorPhone || '';
        if (phone.startsWith('0')) {
            phone = '254' + phone.slice(1);
        }

        const intasendSecret = process.env.INTASEND_SECRET_KEY;
        const intasendPubKey = process.env.INTASEND_PUBLIC_KEY;

        let payoutStatus = 'PENDING';
        let intasendResponseData = null;

        // 1. Execute Real IntaSend B2C Payout API Call
        if (intasendSecret && !intasendSecret.includes('sandbox_placeholder')) {
            const isTestMode = intasendSecret.includes('test') || (intasendPubKey && intasendPubKey.includes('test'));
            const intasendBaseUrl = isTestMode ? 'https://sandbox.intasend.com/api/v1' : 'https://payment.intasend.com/api/v1';

            const intasendRes = await fetch(`${intasendBaseUrl}/payouts/m-pesa/`, {
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

            intasendResponseData = await intasendRes.json();

            if (!intasendRes.ok) {
                payoutStatus = 'FAILED';
                throw new Error(intasendResponseData.message || 'IntaSend Payout API rejection');
            } else {
                payoutStatus = 'SUCCESSFUL';
            }
        } else {
            // Fallback if keys are not yet fully configured in Vercel
            payoutStatus = 'SUCCESSFUL_SIMULATED';
        }

        // 2. Send structured column statuses to Google Apps Script CRM
        try {
            await fetch('https://script.google.com/macros/s/AKfycbypUtJBHD_8FTVP03n_LDHNai8AeLqG9_q6kMM4sMzPJ6iCVmc2aHNXuZ2BnDhkdRlTSw/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_ref: transactionId,
                    phone_number: phone,
                    amount: amount,
                    buyer_status: 'SUCCESSFUL',
                    vendor_payout_status: payoutStatus,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (sheetErr) {
            console.log("Google Apps Script Sync Warning:", sheetErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Payout processed and synced successfully',
            intasend: intasendResponseData,
            transactionId,
            amount
        });

    } catch (error) {
        console.error('Payout API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
