const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const events = req.body.events;

    const results = await Promise.all(events.map(async (event) => {
      try {
        if (event.type !== 'message' || event.message.type !== 'text') {
          // 非文字訊息，不處理
          return;
        }

        const userText = event.message.text;

        // 呼叫 OpenAI
        const openaiRes = await axios.post(
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

        const reply = openaiRes.data.choices[0].message.content;

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: reply,
        });

      } catch (err) {
        console.error('💥 單一事件處理錯誤：', err.response?.data || err.message);

        // 回傳錯誤訊息到 LINE
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '⚠️ 機器人故障了，請稍後再試',
        });
      }
    }));

    res.status(200).json({ status: 'ok' });

  } catch (err) {
    console.error('💥 總 webhook 錯誤：', err.response?.data || err.message);
    res.status(200).json({ status: 'fail, but LINE needs 200' }); // 為了避免 LINE 重送
  }
}
