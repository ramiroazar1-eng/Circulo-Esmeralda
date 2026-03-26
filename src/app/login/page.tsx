"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Lock, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Credenciales incorrectas. VerificÃ¡ tu email y contraseÃ±a."); setLoading(false); return }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-4">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Sistema interno</h1>
          <p className="text-sm text-slate-500 mt-1">Acceso exclusivo para el equipo</p>
        </div>
        <div className="card-ong p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label-ong">Email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-ong" placeholder="usuario@ong.org.ar" disabled={loading} />
            </div>
            <div>
              <label htmlFor="password" className="label-ong">Contrasena</label>
              <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-ong" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" disabled={loading} />
            </div>
            {error && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : "Ingresar"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">Si no podÃ©s ingresar, contactÃ¡ al administrador.</p>
      </div>
    </div>
  )
}
