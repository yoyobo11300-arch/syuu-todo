const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.DATABASE_ID;
const NOTION_VERSION = '2022-06-28';

const notionHeaders = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': NOTION_VERSION,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({ error: '請先設定 NOTION_TOKEN 和 DATABASE_ID 環境變數' });
  }

  try {
    if (req.method === 'GET') {
      const r = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({
          sorts: [
            { property: 'Done', direction: 'ascending' },
            { timestamp: 'created_time', direction: 'descending' },
          ],
        }),
      });
      const data = await r.json();
      const todos = data.results.map(page => ({
        id: page.id,
        text: page.properties.Name.title[0]?.plain_text || '',
        done: page.properties.Done.checkbox,
      }));
      return res.status(200).json(todos);
    }

    if (req.method === 'POST') {
      const { text } = req.body;
      const r = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            Name: { title: [{ text: { content: text } }] },
            Done: { checkbox: false },
          },
        }),
      });
      const page = await r.json();
      return res.status(200).json({ id: page.id, text, done: false });
    }

    if (req.method === 'PATCH') {
      const { id, done } = req.body;
      await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers: notionHeaders,
        body: JSON.stringify({ properties: { Done: { checkbox: done } } }),
      });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers: notionHeaders,
        body: JSON.stringify({ archived: true }),
      });
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
