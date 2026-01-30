"use client"

import Link from "next/link"
import { experts } from "@/lib/experts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"

export function ExpertSelection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {experts.map((expert) => (
        <Link 
          key={expert.id} 
          href={`/chat/${expert.id}`}
          className="group"
        >
          <Card className="h-full bg-card border border-border hover:border-foreground/20 transition-all duration-300 hover:shadow-xl cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden bg-gradient-to-br ${expert.color} flex items-center justify-center text-xl font-medium text-white`}>
                {expert.avatar.startsWith('/') ? (
                  <img src={expert.avatar} alt={expert.name} className="w-full h-full object-cover" />
                ) : (
                  expert.avatar
                )}
              </div>
              <CardTitle className="text-xl font-semibold text-card-foreground">
                {expert.koreanName}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                {expert.name}
              </CardDescription>
              <Badge variant="outline" className="w-fit mx-auto mt-3 border-border text-muted-foreground font-normal">
                {expert.title}
              </Badge>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {expert.description}
              </p>
              <div className="inline-block px-3 py-1.5 bg-secondary rounded-full">
                <span className="text-xs font-medium text-secondary-foreground">{expert.style}</span>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                <span className="text-sm font-medium">대화 시작하기</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
