"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import type { Expert } from "@/lib/experts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Send, Loader2, Trash2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function ChatInterface({ expert }: { expert: Expert }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_history_${expert.id}`);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("기록을 불러오지 못했네:", e);
      }
    }
  }, [expert.id]);

  // 2) 저장하기: messages 상태가 변할 때마다 실행
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${expert.id}`, JSON.stringify(messages));
    }
  }, [messages, expert.id]);

  // 3) 초기화 함수
  const clearChat = () => {
    if (window.confirm("대화 내역을 모두 지우시겠습니까?")) {
      setMessages([]);
      localStorage.removeItem(`chat_history_${expert.id}`);
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    // 어시스턴트 메시지 자리 미리 만들기
    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }])

    try {
      const response = await fetch(`/api/chat/${expert.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: [...messages, userMsg] }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) return

      let accumulatedContent = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        // route.ts에서 보낸 '0:"텍스트"\n' 형식에서 텍스트만 추출
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const content = JSON.parse(line.slice(2))
              accumulatedContent += content
              // 실시간으로 해당 ID의 메시지 내용만 업데이트
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId ? { ...msg, content: accumulatedContent } : msg
              ))
            } catch (e) {
              console.error("파싱 에러:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("전송 에러:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header (기존 디자인 유지) */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${expert.color} flex items-center justify-center text-white font-medium`}>
            {expert.avatar.startsWith('/') ? <img src={expert.avatar} className="w-full h-full object-cover" alt="" /> : expert.avatar}
          </div>
          <div className="flex-1">
            <h1 className="font-semibold">{expert.koreanName}</h1>
            <p className="text-xs text-muted-foreground">{expert.title}</p>
          </div>

          {/* --- 버튼 그룹 --- */}
          <div className="flex items-center gap-2">
            {/* 초기화 버튼 추가 */}
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="대화 초기화"
              >
                <Trash2 className="w-5 h-5" />
                <span className="sr-only">대화 초기화</span>
              </Button>
            )}
          <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Messages (기존 디자인 유지) */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
          {messages.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <h2 className="text-2xl font-semibold mb-3">{expert.koreanName}에게 질문하세요</h2>
                <p className="text-muted-foreground mb-8">{expert.description}</p>
             </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <Card className={`max-w-[80%] p-4 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                </Card>
              </div>
            ))
          )}
          {isLoading && messages[messages.length-1]?.role === 'user' && (
            <div className="flex justify-start items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> 버핏이 장부를 분석 중입니다...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input (기존 디자인 유지) */}
      <footer className="border-t bg-background/80 backdrop-blur-md sticky bottom-0 p-4">
        <form onSubmit={onFormSubmit} className="container mx-auto max-w-3xl flex gap-3">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요..." disabled={isLoading} />
          <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />}</Button>
        </form>
      </footer>
    </div>
  )
}