import { Client, middleware } from '@line/bot-sdk';
import axios from 'axios';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 瀏覽器訪問時回覆 OK
    res.status(200).send('OK');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // 驗證 LINE webhook 簽章
  const signature = req.headers['x-line-signature'];
  if (!middleware.validateSignature(req.body, config.channelSecret, signature)) {
    res.status(401).send('Unauthorized');
    return;
  }

  const events = req.body.events;

  try {
    await Promise.all(
      events.map(async (event) => {
        if (event.type === 'message' && event.message.type === 'text') {
          const userText = event.message.text;

          // 呼叫 OpenAI ChatGPT API
          const openaiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: userText }],
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const replyText = openaiResponse.data.choices[0].message.content;

          // 回覆 LINE 用戶
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: replyText,
          });
        }
      })
    );

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook handler error:', error.response?.data || error.message);
    res.status(500).send('Internal Server Error');
  }
}
