export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const eventData = req.body;

        // 1. Validate the challenge token sent by IntaSend matches your secret
        const incomingChallenge = req.headers['x-intasend-challenge'] || eventData.challenge;
        if (incomingChallenge && incomingChallenge !== process.env.INTASEND_WEBHOOK_SECRET) {
            return res.status(403).json({ error: 'Invalid challenge signature' });
        }

        // 2. Extract transaction details from the payload
        const apiRef = eventData.api_ref || eventData.invoice_id || "N/A";
        const status = eventData.state || eventData.status || "PENDING";
        const phone = eventData.phone_number || eventData.account || "";
        const amount = eventData.value || eventData.amount || 0;

        // 3. Forward the update to your Google Apps Script CRM
        await fetch('https://script.google.com/macros/s/AKfycbypUtJBHD_8FTVP03n_LDHNai8AeLqG9_q6kMM4sMzPJ6iCVmc2aHNXuZ2BnDhkdRlTSw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_ref: apiRef,
                phone_number: phone,
                amount: amount,
                status: status.toUpperCase()
            })
        });

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
