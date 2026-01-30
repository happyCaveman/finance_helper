"use client";
import { useState, useRef, useEffect } from "react";

// 메시지 객체의 타입 정의
interface Message {
  role: "user" | "model";
  parts: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새로운 메시지가 추가될 때마다 하단으로 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const askBuffett = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", parts: input };
    const updatedHistory = [...history, userMessage];
    
    // 입력창 비우고 사용자 메시지 추가
    setHistory(updatedHistory);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: updatedHistory }),
      });

      if (!res.ok) throw new Error("서버 응답 에러");
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      // 버핏의 답변을 시작하기 전 로딩 상태 메시지 추가
      setHistory((prev) => [...prev, { role: "model", parts: "⌛ 장부를 펼쳐보고 있네. 잠시만 기다려주게..." }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkValue = decoder.decode(value, { stream: true });

        setHistory((prev) => {
          const newHistory = [...prev];
          const lastIndex = newHistory.length - 1;

          if (newHistory[lastIndex]?.role === "model") {
            // 로딩 문구가 있으면 지우고 새로 시작, 없으면 기존 글자에 추가
            const isInitialChunk = newHistory[lastIndex].parts.includes("⌛");
            const baseContent = isInitialChunk ? "" : newHistory[lastIndex].parts;
            
            // 중복 방지를 위해 마지막 메시지만 교체한 새 배열 반환
            return [
              ...newHistory.slice(0, -1),
              { role: "model", parts: baseContent + chunkValue }
            ];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("스트리밍 실패:", error);
      setHistory((prev) => [...prev, { role: "model", parts: "미안하네. 통신 상태가 좋지 않아 답변을 완성하지 못했구먼." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-[#f4f1ea] text-[#2c2c2c] font-serif">
      {/* 헤더 */}
      <header className="w-full max-w-2xl py-8 text-center border-b border-stone-300">
        <h1 className="text-4xl font-bold text-stone-800">오마하의 현인 투자 상담소</h1>
        <p className="mt-2 text-stone-600 italic">"가격은 당신이 지불하는 것이고, 가치는 당신이 얻는 것이다."</p>
      </header>
      
      {/* 대화창 */}
      <div 
        ref={scrollRef}
        className="w-full max-w-2xl flex-1 overflow-y-auto p-6 flex flex-col gap-6 mb-32"
        style={{ scrollBehavior: 'smooth' }}
      >
        {history.length === 0 && (
          <div className="text-center mt-20 text-stone-400">
            <p>궁금한 기업의 이름이나 티커를 입력하게나.</p>
            <p className="text-sm mt-2">예: 삼성전자, 애플, 테슬라</p>
          </div>
        )}

        {history.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-xs font-bold mb-1 px-2 text-stone-500">
              {msg.role === "user" ? "나의 질문" : "워렌 버핏"}
            </span>
            <div
              className={`max-w-[90%] p-4 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" 
                  ? "bg-[#3d3d3d] text-white rounded-tr-none" 
                  : "bg-white border border-stone-200 text-stone-900 rounded-tl-none border-l-4 border-l-stone-800"
              }`}
            >
              {msg.parts}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 섹션 (하단 고정) */}
      <div className="fixed bottom-0 w-full max-w-2xl bg-white/80 backdrop-blur-md p-6 border-t border-stone-200 shadow-2xl rounded-t-3xl">
        <div className="relative flex items-center">
          <textarea 
            className="w-full border-2 border-stone-200 p-4 pr-16 h-20 rounded-xl focus:border-stone-800 outline-none resize-none transition-all text-lg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return; 
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                askBuffett();
              }
            }}
            placeholder="어떤 기업의 내재 가치를 파헤쳐 볼까?"
          />
          <button 
            onClick={askBuffett} 
            disabled={isLoading || !input.trim()}
            className="absolute right-3 bg-stone-800 text-white p-3 rounded-lg hover:bg-stone-700 disabled:bg-stone-300 transition-colors shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-center mt-3 text-stone-400 font-sans">
          ※ 실제 투자 결정 전에는 반드시 신중하게
        </p>
      </div>
    </main>
  );
}