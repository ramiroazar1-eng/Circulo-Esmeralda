"use client"
import { useEffect, useRef } from "react"

export default function TerpenosChart({ terpenos }: { terpenos: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const items = terpenos.split(",").map(t => t.trim()).filter(Boolean)
  const colors = ["#4ade80","#a78bfa","#fbbf24","#60a5fa","#f87171","#34d399","#e879f9"]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const total = items.length
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = Math.min(cx, cy) - 10
    let startAngle = -Math.PI / 2
    const slice = (2 * Math.PI) / total
    items.forEach((item, i) => {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, startAngle + slice)
      ctx.closePath()
      ctx.fillStyle = colors[i % colors.length]
      ctx.fill()
      ctx.strokeStyle = "#080f09"
      ctx.lineWidth = 2
      ctx.stroke()
      startAngle += slice
    })
  }, [terpenos])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <canvas ref={canvasRef} width={160} height={160} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}