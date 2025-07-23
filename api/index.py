import json
import os
import hmac
import hashlib
import openai
import urllib.request

from linebot import LineBotApi, WebhookParser
from linebot.models import MessageEvent, TextMessage, TextSendMessage
from linebot.exceptions import InvalidSignatureError

# 環境變數
CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# 驗證
if not all([CHANNEL_ACCESS_TOKEN, CHANNEL_SECRET, OPENAI_API_KEY]):
    raise Exception("必要環境變數未設定")

line_bot_api = LineBotApi(CHANNEL_ACCESS_TOKEN)
parser = WebhookParser(CHANNEL_SECRET)
openai.api_key = OPENAI_API_KEY

# Vercel handler
def handler(request, response):
    if request.method == "GET":
        response.status_code = 200
        response.body = b"OK"
        return

    if request.method != "POST":
        response.status_code = 405
        response.body = b"Method Not Allowed"
        return

    signature = request.headers.get("x-line-signature", "")
    body = request.body.decode("utf-8")

    try:
        events = parser.parse(body, signature)
    except InvalidSignatureError:
        response.status_code = 400
        response.body = b"Invalid signature"
        return

    for event in events:
        if isinstance(event, MessageEvent) and isinstance(event.message, TextMessage):
            user_msg = event.message.text
            try:
                ai_response = openai.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "你是一個在台灣的有用AI助理，請用繁體中文回答。"},
                        {"role": "user", "content": user_msg}
                    ]
                )
                reply_text = ai_response.choices[0].message.content.strip()
            except Exception as e:
                reply_text = "抱歉，我現在有點問題，請稍後再試。"

            line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text=reply_text)
            )

    response.status_code = 200
    response.body = b"OK"
