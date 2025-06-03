import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://cvsinc.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH } = process.env;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ Properly read raw request body
    const rawBody = await buffer(req);
    const updatedContent = JSON.parse(rawBody.toString());

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const fileData = await getRes.json();
    const currentContent = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

    currentContent.news_events = updatedContent.news_events;

    const updatedBase64 = Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64');

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update events',
        content: updatedBase64,
        sha: fileData.sha
      })
    });

    if (!putRes.ok) {
      const error = await putRes.text();
      console.error('❌ GitHub error:', error);
      return res.status(500).json({ success: false, error: 'GitHub update failed', detail: error });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('❌ Server crash:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
