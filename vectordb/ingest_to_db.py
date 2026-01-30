import os
import chromadb
from chromadb.utils import embedding_functions

# 1. 경로 설정
# 현재 스크립트 위치 기준이 아니라, 프로젝트 루트를 기준으로 경로를 잡습니다.
current_file_path = os.path.abspath(__file__)
VECTORDB_DIR = os.path.dirname(current_file_path) 
BASE_DIR = os.path.dirname(VECTORDB_DIR)
DATA_DIR = os.path.join(VECTORDB_DIR, "data")
DB_DIR = os.path.join(BASE_DIR, "backend", "buffett_db")
# 2. ChromaDB 설정 (backend/buffett_db 폴더에 저장)
client = chromadb.PersistentClient(path=DB_DIR)

# 3. 임베딩 모델 설정
emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# 4. 컬렉션 생성
collection = client.get_or_create_collection(name="shareholder_letters", embedding_function=emb_fn)

def ingest_data():
    if not os.path.exists(DATA_DIR):
        print(f"❌ 데이터 폴더를 찾을 수 없습니다: {DATA_DIR}")
        return

    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".txt"):
            file_path = os.path.join(DATA_DIR, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 섹션 단위로 쪼개기
            chunks = content.split("[SECTION:")
            
            for i, chunk in enumerate(chunks):
                if not chunk.strip(): continue
                
                # 조각 고유 ID 및 메타데이터
                chunk_id = f"{filename}_{i}"
                metadata = {"source": filename}
                
                # DB에 추가 (이미 있는 ID면 덮어쓰거나 무시함)
                collection.add(
                    documents=[chunk.strip()],
                    ids=[chunk_id],
                    metadatas=[metadata]
                )
            print(f"✅ 완료: {filename}")

    print(f"\n✨ 모든 데이터가 '{DB_DIR}'에 성공적으로 저장되었습니다.")

if __name__ == "__main__":
    ingest_data()