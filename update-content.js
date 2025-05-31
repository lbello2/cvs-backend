require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

app.post('/api/update-content', async (req, res) => {
  const updatedContent = req.body;

  const apiUrl = `https://api.github.com/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/contents/${process.env.FILE_PATH}`;

  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const fileData = await getRes.json();

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update from edit page',
        content: Buffer.from(JSON.stringify(updatedContent, null, 2)).toString('base64'),
        sha: fileData.sha
      })
    });

    res.json({ success: response.ok });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GitHub update failed.' });
  }
});

app.listen(3001, () => {
  console.log('🚀 Server running at http://localhost:3001');
});
