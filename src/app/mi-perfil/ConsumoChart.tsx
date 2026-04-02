"use client"
import { useEffect, useRef } from "react"

interface Props {
  data: { month: string; grams: number }[]
}

export default function ConsumoChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = { top: 20, right: 16, bottom: 40, left: 40 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    const maxGrams = Math.max(...data.map(d => d.grams), 1)
    const barWidth = chartWidth / data.length
    const barPadding = barWidth * 0.2

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)"
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()
      const val = Math.round(maxGrams - (maxGrams / 4) * i)
      ctx.fillStyle = "rgba(255,255,255,0.3)"
      ctx.font = "10px system-ui"
      ctx.textAlign = "right"
      ctx.fillText(`${val}g`, padding.left - 4, y + 4)
    }

    // Bars
    data.forEach((d, i) => {
      const barHeight = (d.grams / maxGrams) * chartHeight
      const x = padding.left + i * barWidth + barPadding / 2
      const y = padding.top + chartHeight - barHeight
      const w = barWidth - barPadding

      // Bar
      ctx.fillStyle = d.grams > 0 ? "#2d5a27" : "rgba(255,255,255,0.05)"
      ctx.beginPath()
      ctx.roundRect(x, y, w, barHeight, [4, 4, 0, 0])
      ctx.fill()

      // Highlight top
      if (d.grams > 0) {
        ctx.fillStyle = "#4d8a3d"
        ctx.beginPath()
        ctx.roundRect(x, y, w, 3, [4, 4, 0, 0])
        ctx.fill()
      }

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.font = "9px system-ui"
      ctx.textAlign = "center"
      ctx.fillText(d.month, x + w / 2, height - 8)

      // Value on top
      if (d.grams > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.6)"
        ctx.font = "9px system-ui"
        ctx.fillText(`${d.grams}g`, x + w / 2, y - 4)
      }
    })
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={200}
      style={{ width: "100%", height: "200px" }}
    />
  )
}