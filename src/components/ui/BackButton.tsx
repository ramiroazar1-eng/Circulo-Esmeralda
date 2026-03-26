"use client"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export function BackButton({ label = "Volver" }: { label?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-4 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
