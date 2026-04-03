"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Credenciales incorrectas. Verifica tu email y contrasena."); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      if (profile?.role === "paciente") {
        window.location.href = "/mi-perfil"
      } else {
        window.location.href = "/dashboard"
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2d5a27] flex items-center justify-center mx-auto mb-4 border border-[#4d8a3d]">
            <div className="w-6 h-6 rounded-full border-2 border-[#7dc264]" />
          </div>
          <h1 className="text-xl font-bold text-[#e8f5e3]">Sistema interno</h1>
          <p className="text-[13px] text-[#4d7a46] mt-1">Circulo Esmeralda · ONG</p>
        </div>
        <div className="bg-[#0f1f12] border border-[#1a3318] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#5a8a52] uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#162418] border border-[#2d4a28] rounded-lg px-3 py-2.5 text-[13px] text-[#e8f5e3] placeholder:text-[#3d6637] focus:outline-none focus:border-[#4d8a3d] transition-colors"
                placeholder="usuario@ong.org.ar" disabled={loading} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5a8a52] uppercase tracking-widest mb-1.5">Contrasena</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#162418] border border-[#2d4a28] rounded-lg px-3 py-2.5 text-[13px] text-[#e8f5e3] placeholder:text-[#3d6637] focus:outline-none focus:border-[#4d8a3d] transition-colors"
                placeholder="••••••••" disabled={loading} />
            </div>
            {error && <div className="rounded-lg bg-red-950/50 border border-red-800 px-3 py-2 text-[12px] text-red-400">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#2d5a27] px-4 py-2.5 text-[13px] font-bold text-[#a8e095] hover:bg-[#3b6d30] disabled:opacity-60 transition-colors mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</> : "Ingresar"}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-[#2d4a28] mt-6">Acceso exclusivo para el equipo de la ONG</p>
      </div>
    </div>
  )
}
