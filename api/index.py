import os
from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import openai

# 初始化 Flask 應用
app = Flask(__name__)

# 從環境變數讀取你的憑證
LINE_CHANNEL_ACCESS_TOKEN = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
LINE_CHANNEL_SECRET = os.getenv('LINE_CHANNEL_SECRET')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# 初始化 LINE Bot API 和 Webhook Handler
line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# 設定 OpenAI API 金鑰
openai.api_key = OPENAI_API_KEY

@app.route("/", methods=['POST'])
def callback():
    # 獲取 X-Line-Signature 標頭值
    signature = request.headers['X-Line-Signature']
    
    # 獲取請求主體為文字
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)

    # 處理 webhook 主體
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    
    return 'OK'

# 處理文字訊息事件
@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    user_message = event.message.text
    
    try:
        # 呼叫 OpenAI Chat Completion API
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "你是一個在台灣的有用AI助理，請用繁體中文回答。"},
                {"role": "user", "content": user_message}
            ]
        )
        
        gpt_reply = response.choices[0].message.content.strip()

        # 使用 LINE Bot API 回覆訊息
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=gpt_reply)
        )

    except Exception as e:
        app.logger.error(f"Error: {e}")
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="抱歉，我現在有點問題，請稍後再試。")
        )
