export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel.' });
  }

  const { prompt } = req.body;
  let imageData = null;
  let mimeType = 'image/jpeg';

  // 送信元が image オブジェクトでも imageBase64 単体文字列でも対応できるように柔軟に抽出
  if (req.body.image) {
    if (typeof req.body.image === 'object') {
      imageData = req.body.image.data;
      mimeType = req.body.image.mimeType || req.body.image.mime_type || 'image/jpeg';
    } else if (typeof req.body.image === 'string') {
      imageData = req.body.image;
    }
  } else if (req.body.imageBase64) {
    imageData = req.body.imageBase64;
  }

  // テキストも画像も存在しない場合のみ 400 エラー
  if (!prompt && !imageData) {
    return res.status(400).json({ error: 'Prompt or image is required.' });
  }

  try {
    const parts = [];

    const textPrompt = `以下の食事（テキスト説明または写真、もしくはその両方）の概算栄養素（カロリーcal、タンパク質p、脂質f、炭水化物c）および推測される料理名nameを推定し、指定のJSONフォーマットのみで返してください。
食事説明: "${prompt || ''}"`;

    parts.push({ text: textPrompt });

    // 画像データが存在する場合、"data:image/jpeg;base64," のような余分な接頭辞を自動クレンジング
    if (imageData) {
      if (imageData.includes(',')) {
        const partsData = imageData.split(',');
        const match = partsData[0].match(/:(.*?);/);
        if (match) mimeType = match[1];
        imageData = partsData[1];
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageData
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
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
