export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone_number, amount, api_ref } = req.body;

  try {
    const intasendRes = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTASEND_SECRET_KEY}`
      },
      body: JSON.stringify({
        public_key: "ISPubKey_live_5e7af7b1-9b4f-49cc-a6b7-cfe1961e4d77",
        amount: amount,
        currency: "KES",
        phone_number: phone_number,
        api_ref: api_ref
      })
    });

    const data = await intasendRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
