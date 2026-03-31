"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Verificando sesion...")

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      
      // Esperar hasta que la sesion este lista
      let attempts = 0
      const maxAttempts = 10
      
      const check = async () => {
        attempts++
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setStatus("Sesion verificada, redirigiendo...")
          
          // Verificar rol
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single()
          
          if (profile?.role === "paciente") {
            window.location.href = "/mi-perfil"
          } else {
            window.location.href = "/dashboard"
          }
        } else if (attempts < maxAttempts) {
          setStatus(`Estableciendo conexion... (${attempts}/${maxAttempts})`)
          setTimeout(check, 800)
        } else {
          // Si no hay sesion despues de varios intentos, ir al login
          window.location.href = "/login"
        }
      }
      
      setTimeout(check, 500)
    }
    
    checkSession()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a1a0c] flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#2d5a27] flex items-center justify-center mx-auto border border-[#4d8a3d]">
          <div className="w-6 h-6 rounded-full border-2 border-[#7dc264]" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-[#7dc264] mx-auto" />
        <p className="text-[13px] text-[#4d7a46]">{status}</p>
      </div>
    </div>
  )
}
