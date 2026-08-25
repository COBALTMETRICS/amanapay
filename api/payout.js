export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { transactionId, vendorPhone, amount } = req.body || {};
        
        let phone = vendorPhone || '';
        if (phone.startsWith('0')) {
            phone = '254' + phone.slice(1);
        }

        let payoutStatus = 'PENDING_CLEARING';
        const intasendSecret = process.env.INTASEND_SECRET_KEY;

        if (intasendSecret && !intasendSecret.includes('sandbox_placeholder')) {
            try {
                const isTestMode = intasendSecret.includes('test');
                const baseUrl = isTestMode ? 'https://sandbox.intasend.com/api/v1' : 'https://payment.intasend.com/api/v1';

                const intasendRes = await fetch(`${baseUrl}/payouts/m-pesa/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${intasendSecret}`
                    },
                    body: JSON.stringify({
                        currency: 'KES',
                        transactions: [
                            {
                                name: 'Vendor Escrow Payout',
                                account: phone,
                                amount: Number(amount) || 0,
                                narrative: `Amanapay Payout ${transactionId || 'N/A'}`
                            }
                        ]
                    })
                });

                const intasendData = await intasendRes.json();
                if (intasendRes.ok) {
                    payoutStatus = 'SUCCESSFUL';
                } else {
                    console.log("IntaSend holding due to clearing/balance:", intasendData);
                    payoutStatus = 'PENDING_CLEARING';
                }
            } catch (apiErr) {
                console.error("IntaSend Payout Notice:", apiErr.message);
                payoutStatus = 'PENDING_CLEARING';
            }
        }

        // Sync to Google Sheet
        await fetch('https://script.google.com/macros/s/AKfycbypUtJBHD_8FTVP03n_LDHNai8AeLqG9_q6kMM4sMzPJ6iCVmc2aHNXuZ2BnDhkdRlTSw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_ref: transactionId || 'N/A',
                phone_number: phone,
                amount: amount || 0,
                buyer_status: 'SUCCESSFUL',
                vendor_payout_status: payoutStatus
            })
        });

        return res.status(200).json({
            success: true,
            message: `Payout status updated: ${payoutStatus}`,
            transactionId,
            amount
        });

    } catch (error) {
        console.error('Critical Handler Exception:', error);
        return res.status(200).json({
            success: true,
            message: 'Processed via fallback handler',
            error: error.message
        });
    }
}
