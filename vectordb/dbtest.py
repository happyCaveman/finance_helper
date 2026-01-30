# 검색 테스트 코드
results = collection.query(
    query_texts=["버핏은 철강 산업의 경쟁력을 어떻게 분석하나요?"],
    n_results=2 # 가장 관련 있는 조각 2개 가져오기
)

print(results['documents'])