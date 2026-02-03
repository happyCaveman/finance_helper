FROM python:3.12-slim

WORKDIR /app

# 환경 변수 설정 (파이썬 로그가 즉시 출력되도록 설정)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 시스템 패키지 설치 (ChromaDB나 일부 라이브러리 빌드에 필요한 도구)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 종속성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. 전체 소스 코드 복사
COPY . .

# 7. 서비스 실행 (App Runner 기본 포트인 8080 사용 권장)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]