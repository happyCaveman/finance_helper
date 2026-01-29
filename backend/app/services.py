import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import yfinance as yf
import pandas as pd
import numpy as np
import datetime

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# app/services.py 수정본

async def get_buffett_response_stream(history_data: list):
    try:
        config = types.GenerateContentConfig(
            system_instruction="당신은 통찰력 넘치는 워렌 버핏입니다. 말투는 '~하네', '~구먼'같은 인자한 말투를 사용하세요. "
                "1. 도구 활용 규칙: 주가나 재무제표처럼 정확한 최신 수치가 필요한 경우에만 도구를 호출하세요. "
                "그 수치가 의미하는 바를 투자 철학에 빗대어 설명하세요. 그리고 옆에 그 수치를 같이 적어주세요 "
                "예를 들어 매출이 꾸준이 상승하고 있다고 이야기를 하면 옆에 5년간 매출변화 수치도 같이 보여주세요"
                "매출액이나 현금 등 숫자를 보여줄떄 예를들어 20000000000달러 이것처럼 그대로 보여주지말고 200억달러 이런식으로 보여주세요"
                "2. 기본 지식 활용: 기업의 CEO 이름, 창립 역사, 일반적인 비즈니스 모델 등 당신(Gemini)이 이미 알고 있는 상식은 도구 호출 없이 즉시 답변하세요. "
                "3. 도구 사용 중 오류: 만약 도구에서 에러가 나거나 정보를 가져오지 못하더라도, 당신이 알고 있는 지식을 바탕으로 최대한 버핏의 관점에서 조언을 건네세요. "
                "절대로 '도구가 없어서 모른다'고 하지 마세요. 당신은 세상만사에 해박한 현인임을 잊지 마세요. "
                "4. 분석 스타일: 데이터를 나열하지 말고, 상대에게 이야기하듯 투자 철학을 섞어서 설명하세요."
                "5. 사용자가 기업을 물어보면 먼저 'get_current_stock_summary'를 호출하여 현재 상태를 보고하세요. "
                "6. 사용자가 '과거 추이는?', '5년치 성적은?' 처럼 과거 데이터를 요구할 때만 'get_historical_financial_trends'를 호출하세요. "
                "7. 답변할 때는 항상 현재 주가와 시황을 우선적으로 언급하고, 과거 데이터는 현재를 설명하기 위한 보조 수단으로만 활용하세요. ",
            tools=[get_current_stock_summary, get_historical_financial_trends],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=False)
        )
        
        # 메시지 변환
        current_question = history_data[-1].parts
        gemini_history = [{"role": m.role, "parts": [{"text": m.parts}]} for m in history_data[:-1]]
        
        chat = client.chats.create(model="gemini-2.0-flash", config=config, history=gemini_history)
        
        # 스트리밍 시작
        response_stream = chat.send_message_stream(current_question)
        
        for chunk in response_stream:
            # 텍스트가 있으면 즉시 내보냄
            if chunk.text:
                yield chunk.text
            # 텍스트가 없더라도 내부적으로 도구 호출(function_call)이 일어나는 중임
            else:
                print("버핏이 데이터를 분석 중입니다...") # 터미널 로그

    except Exception as e:
        yield f"에러가 발생했네: {str(e)}"


# 보조 함수: 데이터 정제
def clean_val(val):
    if val is None or (isinstance(val, (float, int)) and (np.isnan(val) or np.isinf(val))):
        return 0
    return val

# 도구 1: 현재 시점의 핵심 정보만 빠르게 가져오기
def get_current_stock_summary(ticker: str):
    """주식의 현재가, 시가총액, 주요 밸류에이션(PER/PBR) 등 최신 요약 정보를 가져옵니다."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        return {
            "조회시점": datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
            "이름": info.get("shortName"),
            "현재가": f"{clean_val(info.get('currentPrice'))} {info.get('currency', 'USD')}",
            "시가총액": clean_val(info.get("marketCap")),
            "PER": clean_val(info.get("trailingPE")),
            "PBR": clean_val(info.get("priceToBook")),
            "배당수익률": f"{clean_val(info.get('dividendYield', 0)) * 100:.2f}%",
            "비즈니스요약": info.get("longBusinessSummary", "")[:150] + "..."
        }
    except Exception as e:
        return {"error": str(e)}

# 도구 2: 요청 시에만 실행할 심층 재무 추이 분석
def get_historical_financial_trends(ticker: str, years: int = 5):
    """지정된 연도(기본 5년) 동안의 순이익, 매출, ROE 등 재무 제표 추이를 가져옵니다."""
    try:
        stock = yf.Ticker(ticker)
        current_year = datetime.datetime.now().year
        target_years = [str(current_year - i) for i in range(years)]
        
        f = stock.financials
        
        trends = {}
        # 주요 항목 추출 (매출, 순이익, 영업이익 등)
        for label in ['Total Revenue', 'Net Income', 'Operating Income']:
            if label in f.index:
                trends[label] = {
                    str(date.year): clean_val(val) 
                    for date, val in f.loc[label].items() 
                    if str(date.year) in target_years
                }
        
        return {
            "대상기간": f"최근 {years}개년",
            "재무추이": trends
        }
    except Exception as e:
        return {"error": str(e)}