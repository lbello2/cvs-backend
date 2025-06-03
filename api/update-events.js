import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // ✅ CORS headers (must be at top of function)
  res.setHeader('Access-Control-Allow-Origin', 'https://cvsinc.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Preflight request okay
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH } = process.env;

  try {
    const rawBody = await buffer(req);
    const updatedContent = JSON.parse(rawBody.toString());

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const fileData = await getRes.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf8')
    );

    currentContent.news_events = updatedContent.news_events;

    const updatedBase64 = Buffer.from(
      JSON.stringify(currentContent, null, 2)
    ).toString('base64');

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update news_events from editor',
        content: updatedBase64,
        sha: fileData.sha,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error('❌ GitHub update failed:', errText);
      return res.status(500).json({ error: 'GitHub PUT failed' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Server error:', err);
    return res.status(500).json({ error: 'Server crash', detail: err.message });
  }
}
