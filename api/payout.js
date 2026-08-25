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
        const isTestMode = !intasendSecret || intasendSecret.includes('test') || process.env.NODE_ENV !== 'production';
        const intasendBaseUrl = 'https://sandbox.intasend.com/api/v1'; // Change to live URL if using live keys: https://payment.intasend.com/api/v1

        let payoutStatus = 'PENDING';
        let intasendErrorMsg = null;

        if (intasendSecret) {
            const payoutPayload = {
                currency: 'KES',
                transactions: [
                    {
                        name: 'Vendor Escrow Payout',
                        account: phone,
                        amount: parseFloat(amount),
                        narrative: `Amanapay Payout ${transactionId}`
                    }
                ]
            };

            const intasendRes = await fetch(`${intasendBaseUrl}/payouts/m-pesa/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${intasendSecret}`
                },
                body: JSON.stringify(payoutPayload)
            });

            const intasendData = await intasendRes.json();

            if (!intasendRes.ok) {
                payoutStatus = 'FAILED';
                intasendErrorMsg = JSON.stringify(intasendData);
                console.error("IntaSend Payout Rejection:", intasendErrorMsg);
            } else {
                payoutStatus = 'SUCCESSFUL';
            }
        } else {
            payoutStatus = 'FAILED_NO_SECRET';
            intasendErrorMsg = 'Missing INTASEND_SECRET_KEY environment variable';
        }

        // Sync dual status to Google Sheet via Apps Script
        await fetch('https://script.google.com/macros/s/AKfycbypUtJBHD_8FTVP03n_LDHNai8AeLqG9_q6kMM4sMzPJ6iCVmc2aHNXuZ2BnDhkdRlTSw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_ref: transactionId,
                phone_number: phone,
                amount: amount,
                buyer_status: 'SUCCESSFUL',
                vendor_payout_status: payoutStatus
            })
        });

        if (payoutStatus === 'FAILED') {
            return res.status(400).json({ 
                success: false, 
                error: `IntaSend rejected payout: ${intasendErrorMsg}` 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Payout processed successfully',
            transactionId,
            amount
        });

    } catch (error) {
        console.error('Payout API Critical Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
