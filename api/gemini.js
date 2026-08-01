// api/gemini.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel.' });
  }

  const { prompt, image } = req.body;

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Prompt or image is required.' });
  }

  try {
    const parts = [];

    // プロンプトテキストの準備
    const textPrompt = `以下の食事（テキスト説明または写真、もしくはその両方）の概算栄養素（カロリーcal、タンパク質p、脂質f、炭水化物c）および推測される料理名nameを推定し、指定のJSONフォーマットのみで返してください。
食事説明: "${prompt || ''}"`;

    parts.push({ text: textPrompt });

    // 画像データが添付されている場合はマルチモーダル要素として追加
    if (image && image.data && image.mimeType) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "料理名または食事の簡単な説明" },
              cal: { type: "NUMBER" },
              p: { type: "NUMBER" },
              f: { type: "NUMBER" },
              c: { type: "NUMBER" }
            },
            required: ["name", "cal", "p", "f", "c"]
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error Full Details:\n' + JSON.stringify(errorData, null, 2));
      return res.status(response.status).json({ error: 'Failed to fetch from Gemini API', details: errorData });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
