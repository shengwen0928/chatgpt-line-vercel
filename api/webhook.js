const line = require('@line/bot-sdk');
const axios = require('axios');

// LINE config
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// 主 webhook handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const events = req.body.events;

  // 處理多個事件（通常只會一個）
  const results = await Promise.all(events.map(async (event) => {
    if (event.type === 'message' && event.message.type === 'text') {
      const userText = event.message.text;

      try {
        // 呼叫 OpenAI ChatGPT
        const aiRes = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4',
            messages: [{ role: 'user', content: userText }],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const aiReply = aiRes.data.choices[0].message.content;

        // 回傳訊息到 LINE
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: aiReply,
        });
      } catch (err) {
        console.error('OpenAI API Error:', err.response?.data || err.message);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '抱歉，我的大腦打結了 請稍後再試！',
        });
      }
    }
  }));

  res.status(200).json({ status: 'ok' });
}
