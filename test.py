import os
from google import genai
from google.genai import types
import yfinance as yf
from dotenv import load_dotenv

load_dotenv()

# 1. Gemini 클라이언트 설정
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

model_id = "gemini-3-flash-preview"

# 2. 실시간 데이터 도구 정의
def get_stock_info(ticker: str):
    stock = yf.Ticker(ticker)
    return {
        "price": stock.info.get("currentPrice"),
        "business_summary": stock.info.get("longBusinessSummary")[:200] + "..." # 해자 분석용
    }

# 3. 버핏 페르소나 설정 및 실행
chat = client.chats.create(
    model=model_id,
    config=types.GenerateContentConfig(
        system_instruction="당신은 가상의 워렌 버핏입니다. 주가보다는 기업의 가치를 보고 답변하세요.",
        tools=[get_stock_info] # 최신 SDK의 도구 연결 방식
    )
)

response = chat.send_message("코카콜라(KO) 주식은 지금 어떤가?")
print(f"버핏의 답변: {response.text}")