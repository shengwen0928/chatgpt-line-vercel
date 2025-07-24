// 引用必要的模組
const express = require('express');
const line = require('@line/bot-sdk');
const { OpenAI } = require('openai');

// 從環境變數讀取金鑰
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 建立 Express 應用程式
const app = express();

// 建立一個主路由，用來處理 LINE 的 Webhook 請求
// 注意：路徑是 /api/index
app.post('/api/index', line.middleware(config), (req, res) => {
  // 檢查請求主體和事件是否存在
  if (!req.body || !req.body.events) {
    return res.status(400).send('Invalid request body.');
  }

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing events: ', err);
      res.status(500).end();
    });
});

// 事件處理函式
async function handleEvent(event) {
  // 只處理文字訊息
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  try {
    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一個有用的AI助理，請用繁體中文回答。' },
        { role: 'user', content: userMessage },
      ],
    });

    const gptReply = completion.choices[0].message.content.trim();

    // 建立回覆訊息物件
    const echo = { type: 'text', text: gptReply };

    // 使用 LINE SDK 回覆訊息
    return client.replyMessage(event.replyToken, echo);

  } catch (error) {
    console.error('OpenAI or LINE API Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '抱歉，系統發生錯誤，請稍後再試。',
    });
  }
}

// 建立 LINE SDK client
const client = new line.Client(config);

// 將 app 匯出給 Vercel 使用
module.exports = app;
