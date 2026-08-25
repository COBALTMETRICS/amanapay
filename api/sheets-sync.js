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
        const spreadsheetId = '13lgsQViq8GQr6K5z0LJ-A5nFxmmXpWCaJA59N5q_ns';

        // Read existing rows to see if transaction already exists, or append/update
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:E',
        });

        const rows = response.data.values;
        let rowIndex = -1;

        if (rows) {
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][1] === transactionId) {
                    rowIndex = i + 1; // 1-indexed for Google Sheets
                    break;
                }
            }
        }

        if (rowIndex > -1) {
            // Update existing row status column (Column E)
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Sheet1!E${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[status]]
                }
            });
        } else {
            // Append new row if not found
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Sheet1!A:E',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[new Date().toLocaleString(), transactionId, vendorPhone || '', amount || '', status]]
                }
            });
        }

        return res.status(200).json({ success: true, message: 'Google Sheet synced successfully' });
    } catch (error) {
        console.error('Sheets Sync Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
