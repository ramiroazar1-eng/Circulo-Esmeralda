"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, CheckCircle2 } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Las contrasenas no coinciden."); return }
    if (password.length < 8) { setError("La contrasena debe tener al menos 8 caracteres."); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push("/mi-perfil"), 2500)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0a1a0c] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto border border-green-700">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-[#e8f5e3]">Contrasena configurada</h2>
          <p className="text-[#4d7a46] text-sm">Redirigiendo a tu perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a1a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2d5a27] flex items-center justify-center mx-auto mb-4 border border-[#4d8a3d]">
            <div className="w-6 h-6 rounded-full border-2 border-[#7dc264]" />
          </div>
          <h1 className="text-xl font-bold text-[#e8f5e3]">Crear contrasena</h1>
          <p className="text-[13px] text-[#4d7a46] mt-1">Circulo Esmeralda</p>
        </div>
        <div className="bg-[#0f1f12] border border-[#1a3318] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#5a8a52] uppercase tracking-widest mb-1.5">Nueva contrasena</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={8}
                className="w-full bg-[#162418] border border-[#2d4a28] rounded-lg px-3 py-2.5 text-[13px] text-[#e8f5e3] placeholder:text-[#3d6637] focus:outline-none focus:border-[#4d8a3d] transition-colors"
                placeholder="Minimo 8 caracteres" disabled={loading} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5a8a52] uppercase tracking-widest mb-1.5">Confirmar contrasena</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full bg-[#162418] border border-[#2d4a28] rounded-lg px-3 py-2.5 text-[13px] text-[#e8f5e3] placeholder:text-[#3d6637] focus:outline-none focus:border-[#4d8a3d] transition-colors"
                placeholder="Repetir contrasena" disabled={loading} />
            </div>
            {error && <div className="rounded-lg bg-red-950/50 border border-red-800 px-3 py-2 text-[12px] text-red-400">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#2d5a27] px-4 py-2.5 text-[13px] font-bold text-[#a8e095] hover:bg-[#3b6d30] disabled:opacity-60 transition-colors mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : "Guardar contrasena"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
