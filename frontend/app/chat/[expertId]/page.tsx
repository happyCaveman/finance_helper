import { notFound } from "next/navigation"
import { getExpertById } from "@/lib/experts"
import { ChatInterface } from "@/components/chat-interface"
import type { Metadata } from "next"

interface ChatPageProps {
  params: Promise<{ expertId: string }>
}

export async function generateMetadata({ params }: ChatPageProps): Promise<Metadata> {
  const { expertId } = await params
  const expert = getExpertById(expertId)
  
  if (!expert) {
    return {
      title: "전문가를 찾을 수 없습니다",
    }
  }
  
  return {
    title: `${expert.koreanName}와 대화하기 | 주식 고수`,
    description: `${expert.koreanName}의 투자 철학을 배워보세요. ${expert.description}`,
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { expertId } = await params
  const expert = getExpertById(expertId)
  
  if (!expert) {
    notFound()
  }
  
  return <ChatInterface expert={expert} />
}
