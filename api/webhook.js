export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const eventData = req.body;
        
        // Extract fields sent by IntaSend webhook payload
        // (Adjust keys depending on IntaSend's exact webhook JSON structure)
        const apiRef = eventData.api_ref || eventData.invoice_id;
        const status = eventData.state || eventData.status; // e.g., FAILED, COMPLETE, DISPUTED
        const phone = eventData.phone_number || "";
        const amount = eventData.value || eventData.amount || 0;

        // Forward this status update to your Google Apps Script
        await fetch('https://script.google.com/macros/s/AKfycbypUtJBHD_8FTVP03n_LDHNai8AeLqG9_q6kMM4sMzPJ6iCVmc2aHNXuZ2BnDhkdRlTSw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_ref: apiRef,
                phone_number: phone,
                amount: amount,
                status: status ? status.toUpperCase() : "UNKNOWN"
            })
        });

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
