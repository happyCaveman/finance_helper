from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from app.services import get_buffett_response_stream
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str    # "user" 또는 "model"
    parts: str   # 메시지 내용

class ChatRequest(BaseModel):
    history: list[Message] # 지금까지 주고받은 메시지 리스트

@app.post("/ask")
async def ask_buffett(chat_data: ChatRequest):
    # 프론트엔드에서 보낸 JSON 바디 읽기
    return StreamingResponse(
        get_buffett_response_stream(chat_data.history), 
        media_type="text/plain"
    )
