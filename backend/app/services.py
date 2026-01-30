import os
import chromadb
from google import genai
from google.genai import types
from dotenv import load_dotenv
import yfinance as yf
import pandas as pd
import numpy as np
import datetime
from chromadb.utils import embedding_functions

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
# 프로젝트 구조에 맞게 DB 경로 설정 (backend/buffett_db)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "buffett_db")
db_client = chromadb.PersistentClient(path=DB_DIR)
emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
collection = db_client.get_or_create_collection(name="shareholder_letters", embedding_function=emb_fn)

# RAG 검색 함수: 질문과 관련된 버핏의 지혜 찾기
def get_buffett_wisdom(query: str, n_results: float = 3):
    """
    질문과 가장 유사한 주주서한 섹션을 찾아 텍스트로 반환합니다.
    """
    try:
        results = collection.query(
            query_texts=[query],
            n_results=int(n_results)
        )
        # 검색된 조각들을 하나의 문자열로 합침
        wisdom_context = "\n\n".join(results['documents'][0])
        return wisdom_context
    except Exception as e:
        return f"지혜를 찾는 중 오류 발생: {str(e)}"

# 야후 파이낸스 정보검색 함수
def get_integrated_financial_statements(ticker: str):
    """
    야후 파이낸스에서 해당 종목의 3대 재무제표(financials, balance_sheet, cashflow)를 
    가져와 최근 5년치 데이터를 통합하여 반환합니다.
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        info_cal = stock.calendar
        earnings_dates = info_cal.get("Earnings Date", [])
        formatted_earnings_dates = []
        
        # 리스트 내의 datetime.date 객체를 문자열로 변환
        if isinstance(earnings_dates, list):
            formatted_earnings_dates = [d.strftime('%Y-%m-%d') for d in earnings_dates if hasattr(d, 'strftime')]
            
        # 1. 데이터 정제 보조 함수
        def clean_data(df):
            if df is None or df.empty:
                return {}
            # NaN 값을 0으로 채우고, 딕셔너리로 변환 (Key는 항목명, Value는 날짜별 값)
            # 날짜를 문자열(YYYY-MM-DD)로 변환하여 처리
            cleaned_df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
            result = {}
            for index, row in cleaned_df.iterrows():
                result[index] = {
                    date.strftime('%Y-%m-%d'): float(val) 
                    for date, val in row.items()
                }
            return result

        # 2. 3대 재무제표 가져오기
        # .financials (손익계산서), .balance_sheet (재무상태표), .cashflow (현금흐름표)
        combined_data = {
            "metadata": {
                "ticker": ticker,
                "company_name": info.get("shortName"),
                "currency": info.get("currency", "USD"),
                "current_price": info.get("regularMarketPrice"), 
                "eps_ttm": info.get("epsTrailingTwelveMonths"),  
                "earnings_dates": formatted_earnings_dates,
                "expected_earnings_avg": info_cal.get("Earnings Average"),
                "retrieved_at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
            },
            "income_statement": clean_data(stock.financials),
            "balance_sheet": clean_data(stock.balance_sheet),
            "cash_flow": clean_data(stock.cashflow)
        }

        # 3. 데이터가 모두 비어있는지 확인
        if not combined_data["income_statement"] and not combined_data["balance_sheet"]:
            return {"error": "재무 데이터를 찾을 수 없습니다. 티커를 확인해 주세요."}

        return combined_data

    except Exception as e:
        return {"error": f"재무제표 통합 추출 중 오류 발생: {str(e)}"}
    
# 스트리밍 함수
async def get_buffett_response_stream(history_data: list):
    try:
        # 메시지 변환
        current_question = history_data[-1].parts
        # RAG로 버핏의 지혜 먼저 검색
        wisdom_context = get_buffett_wisdom(current_question)
        
        config = types.GenerateContentConfig(
            system_instruction="""당신은 전설적인 투자자 워렌 버핏(Warren Buffett)입니다. 당신의 목표는 제공된 재무제표 데이터와 과거 주주서한의 지혜를 결합하여, 질문자에게 깊이 있는 투자 조언을 건네는 것입니다.

                다음의 지침을 반드시 준수하세요:

                1. 데이터 해석의 원칙:
                - 'market_data'의 현재가와 'eps_ttm'을 보고 밸류에이션을 판단하세요.
                - 'income_statement'의 5개년 추이를 통해 매출과 이익이 '예측 가능한 수준'으로 성장하고 있는지 확인하세요.
                - 'balance_sheet'을 통해 부채비율이 낮고 자기자본이 탄탄한지, 'cash_flow'를 통해 이익이 실제 현금으로 들어오는지(잉여현금흐름) 분석하세요.
                - 'earnings_date'를 통해 실적발표일이 얼마남지 않았다면 발표될 실적을 확인해보라고 조언하세요.
                
                [과거 주주서한의 지혜]
                {wisdom_context}
                # 2. RAG 지식 활용 :
                # - 검색된 주주서한의 내용(wisdom_context)이 있다면, 그것을 답변의 핵심 철학적 근거로 삼으세요. 
                # - 예: "내가 1988년 서한에서 언급했듯이, 우리는 코카콜라처럼 영구히 보유할 수 있는 '해자'를 가진 기업을 선호하네."

                3. 답변 스타일 및 어조:
                - 말투는 인자한 친구가 옆에서 조언하듯 하세요. (~하네, ~인가? 등 구어체 사용)
                - 절대로 숫자를 표로 나열하지 마세요. 수치는 "자네, 이 회사의 ROE가 5년째 20%를 넘고 있구먼. 이건 정말 대단한 일일세."와 같이 문장 속에 녹여내세요.

                4. 도구 및 지식 활용 규칙:
                - 특정 종목의 '정확한 수치(재무제표)'가 필요할 때만 도구(get_integrated_financial_statements)를 사용하세요.
                - 업종별 리스트, 기업의 역사, 일반적인 산업 동향 등은 당신(Gemini)이 이미 알고 있는 방대한 지식을 바탕으로 즉시 답변하세요.
                - "나는 리스트를 뽑는 기능이 없다"거나 "도구가 없어서 모른다"는 식으로 답변하지 마세요. 당신은 세상의 모든 비즈니스를 꿰뚫고 있는 현인입니다.
                - 단기적인 주가 등락에 일희일비하지 말고, '비즈니스의 본질'에 집중하세요.
                - "나는 종목 추천을 하지 않는다"거나 "순위를 매기지 않는다"는 식의 거절을 하지 마세요. 
                - 대신, 워렌 버핏의 관점에서 "내가 만약 투자를 한다면, 지표상 이 기업이 좋아 보이네"라는 식으로 분석 결과에 따른 우선순위를 명확히 제시하세요.
                - 여러 기업을 비교할 때는 도구(get_integrated_financial_statements)를 사용하여 각 기업을 분석하고 어떤 기업이 가장 버핏의 철학에 부합하는지 논리적으로 서열을 매겨 조언하세요.
                5. 결론:
                - 항상 마지막에는 해당 기업이 '적정한 가격'에 있는지, 그리고 '안전마진'이 확보되었는지에 대한 당신의 사견을 조언으로 마무리하세요.
                - 사용자가 '가장 살 만한 기업'을 물으면, 당신의 지식과 도구로 가져온 데이터를 결합하여 '최고의 선택지'를 하나 꼽고 그 이유를 강력한 근거(예: 압도적인 현금흐름, 낮은 PER 등)와 함께 설명하세요.""",
            tools=[get_integrated_financial_statements],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=False)
        )
        
        
        gemini_history = [{"role": m.role, "parts": [{"text": m.parts}]} for m in history_data[:-1]]
        
        chat = client.chats.create(model="gemini-2.5-flash", config=config, history=gemini_history)
        
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