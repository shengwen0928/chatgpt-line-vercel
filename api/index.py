import os
from flask import Flask, Response

app = Flask(__name__)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    # 讀取三個環境變數
    token = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
    secret = os.getenv('LINE_CHANNEL_SECRET')
    openai_key = os.getenv('OPENAI_API_KEY')

    # 準備要顯示在網頁上的文字
    html = """
    <h1>Vercel 環境變數檢查</h1>
    <p>這個頁面會顯示您的程式實際讀取到的環境變數是什麼。</p>
    <hr>
    """

    # 檢查 LINE_CHANNEL_ACCESS_TOKEN
    if token:
        # 為了安全，只顯示前 5 個字和後 5 個字
        html += f"<p><b>LINE_CHANNEL_ACCESS_TOKEN:</b> ✅ 找到了！ (開頭: {token[:5]}...{token[-5:]})</p>"
    else:
        html += "<p><b>LINE_CHANNEL_ACCESS_TOKEN:</b> ❌ 找不到 (None)</p>"

    # 檢查 LINE_CHANNEL_SECRET
    if secret:
        html += f"<p><b>LINE_CHANNEL_SECRET:</b> ✅ 找到了！ (長度: {len(secret)})</p>"
    else:
        html += "<p><b>LINE_CHANNEL_SECRET:</b> ❌ 找不到 (None)</p>"
    
    # 檢查 OPENAI_API_KEY
    if openai_key:
        html += f"<p><b>OPENAI_API_KEY:</b> ✅ 找到了！ (開頭: {openai_key[:5]}...)</p>"
    else:
        html += "<p><b>OPENAI_API_KEY:</b> ❌ 找不到 (None)</p>"

    html += "<hr><p>如果顯示「找不到」，請回到 Vercel 的 Settings -> Environment Variables 再次確認變數的<b>名稱拼寫</b>和<b>值</b>是否正確，然後<b>重新部署 (Redeploy)</b>。</p>"

    return Response(html, mimetype='text/html')
