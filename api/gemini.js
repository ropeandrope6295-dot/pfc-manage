// api/gemini.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // Vercelに設定した環境変数を取得

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              cal: { type: "NUMBER" },
              p: { type: "NUMBER" },
              f: { type: "NUMBER" },
              c: { type: "NUMBER" }
            },
            required: ["cal", "p", "f", "c"]
          }
        }
      })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Gemini API' });
  }
}
