import { google } from 'googleapis';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { transactionId, status, amount, vendorPhone } = req.body;

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '13lgsQViq8GQr6K5z0LJ-A5nFxmmXpWCaJA59N5q_ns'; // From your Sheet URL

        // Append or update row logic here
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:F',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[new Date().toISOString(), transactionId, vendorPhone || '', amount || '', status]]
            }
        });

        return res.status(200).json({ success: true, message: 'Sheet synced successfully' });
    } catch (error) {
        console.error('Sheets Sync Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
