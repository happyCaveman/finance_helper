import { ExpertSelection } from "@/components/expert-selection"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <header className="text-center mb-20">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-4">
            AI Investment Mentor
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold text-foreground mb-6 tracking-tight text-balance">
            주식 고수와 대화하기
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto text-pretty leading-relaxed">
            전설적인 투자자들의 투자 철학과 전략을<br className="hidden md:block" />
            AI 채팅으로 배워보세요.
          </p>
        </header>
        
        <ExpertSelection />
      </div>
    </main>
  )
}
