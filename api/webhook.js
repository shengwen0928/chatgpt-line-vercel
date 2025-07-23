import os
from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import openai

app = Flask(__name__)

# 從環境變數讀取金鑰
LINE_CHANNEL_ACCESS_TOKEN = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
LINE_CHANNEL_SECRET = os.getenv('LINE_CHANNEL_SECRET')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# 初始化 API
line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)
openai.api_key = OPENAI_API_KEY

# Vercel 會將所有請求導向這個 Flask app
# 我們建立一個 /api/ 路徑來處理 Webhook
@app.route("/", methods=['POST'])
def callback():
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    
    return 'OK'

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    user_message = event.message.text
    
    try:
        # 呼叫 OpenAI API
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "你是一個在台灣的有用AI助理，請用繁體中文回答。"},
                {"role": "user", "content": user_message}
            ]
        )
        gpt_reply = response.choices[0].message.content.strip()

        # 回覆 LINE 訊息
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=gpt_reply)
        )
    except Exception as e:
        # 印出錯誤日誌，方便在 Vercel 後台排查問題
        print(f"An error occurred: {e}")
        # 傳送錯誤通知給使用者
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="抱歉，系統有點問題，請稍後再試。")
        )

# 這段是為了讓你在本機測試用，Vercel 部署時不會執行
if __name__ == "__main__":
    app.run(port=5001)
