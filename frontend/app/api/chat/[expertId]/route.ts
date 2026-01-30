import { getExpertById } from "@/lib/experts"

export const maxDuration = 30

export async function POST(
  req: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const { expertId } = await params
  const expert = getExpertById(expertId)
  
  if (!expert) {
    return new Response("Expert not found", { status: 404 })
  }

  // [수정 포인트]: 프론트에서 보낸 'history'라는 이름으로 데이터를 받습니다.
  const body = await req.json()
  const chatHistory = body.history || []

  if (expertId === "warren-buffett") {
    try {
      const response = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 프론트의 role(assistant/user)을 파이썬 백엔드용(model/user)으로 변환
          history: chatHistory.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: m.content || ""
          })),
        }),
      })

      if (!response.ok) throw new Error(`Backend returned ${response.status}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader!.read()
              if (done) break
              
              const text = decoder.decode(value)
              // 프론트엔드에서 수동으로 파싱할 '0:"텍스트"\n' 규격 생성
              const payload = `0:${JSON.stringify(text)}\n`
              controller.enqueue(encoder.encode(payload))
            }
          } catch (e) {
            controller.error(e)
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      })
    } catch (error) {
      console.error("Error connecting to Python backend:", error)
      return new Response("Backend connection error", { status: 500 })
    }
  }

  return new Response("Other experts logic here", { status: 501 })
}