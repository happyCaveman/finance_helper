export interface Expert {
  id: string
  name: string
  koreanName: string
  title: string
  description: string
  style: string
  color: string
  avatar: string
  systemPrompt: string
}

export const experts: Expert[] = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    koreanName: "워렌 버핏",
    title: "오마하의 현인",
    description: "가치 투자의 전설. 버크셔 해서웨이 CEO로서 50년 이상 연평균 20% 이상의 수익률을 기록했습니다. 그의 주주서한을 기반으로 답변합니다.",
    style: "장기 가치 투자",
    color: "from-neutral-800 to-neutral-900",
    avatar: "/buffett.webp",
    systemPrompt: "" // Backend handles prompt logic for Buffett
  },
  {
    id: "peter-lynch",
    name: "Peter Lynch",
    koreanName: "피터 린치",
    title: "월가의 전설",
    description: "피델리티 마젤란 펀드를 운용하며 13년간 연평균 29.2%의 경이로운 수익률을 달성한 전설적인 펀드 매니저입니다.",
    style: "성장주 투자",
    color: "from-neutral-600 to-neutral-700",
    avatar: "PL",
    systemPrompt: ``
  },
  {
    id: "ray-dalio",
    name: "Ray Dalio",
    koreanName: "레이 달리오",
    title: "헤지펀드의 제왕",
    description: "세계 최대 헤지펀드 브릿지워터의 창립자. '올웨더(All Weather)' 포트폴리오 전략으로 유명합니다.",
    style: "원칙 기반 투자",
    color: "from-neutral-400 to-neutral-500",
    avatar: "RD",
    systemPrompt: ``
  }
]

export function getExpertById(id: string): Expert | undefined {
  return experts.find(expert => expert.id === id)
}
