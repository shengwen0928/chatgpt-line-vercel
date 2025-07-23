import os
import sys
from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import openai

# ——— 健壯的防呆檢查機制 ———
# 1. 從環境中讀取所有需要的變數
LINE_CHANNEL_ACCESS_TOKEN = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
LINE_CHANNEL_SECRET = os.getenv('LINE_CHANNEL_SECRET')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# 2. 建立一個列表來存放遺失的變數名稱
missing_vars = []
if not LINE_CHANNEL_ACCESS_TOKEN:
    missing_vars.append("LINE_CHANNEL_ACCESS_TOKEN")
if not LINE_CHANNEL_SECRET:
    missing_vars.append("LINE_CHANNEL_SECRET")
if not OPENAI_API_KEY:
    missing_vars.append("OPENAI_API_KEY")

# 3. 如果有任何變數遺失，就拋出一個清晰的錯誤並停止程式
if missing_vars:
    # 這個錯誤會清楚地顯示在 Vercel 的日誌中
    raise ValueError(f"FATAL ERROR: 以下環境變數遺失或為空: {', '.join(missing_vars)}")
# ——— 檢查結束 ———

# --- 如果程式能跑到這裡，代表所有變數都已正確讀取 ---
# 初始化 Flask 應用
app = Flask(__name__)

# 初始化 LINE Bot API 和 Webhook Handler
line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# 設定 OpenAI API 金鑰
openai.api_key = OPENAI_API_KEY

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
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "你是一個在台灣的有用AI助理，請用繁體中文回答。"},
                {"role": "user", "content": user_message}
            ]
        )
        gpt_reply = response.choices[0].message.content.strip()
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
