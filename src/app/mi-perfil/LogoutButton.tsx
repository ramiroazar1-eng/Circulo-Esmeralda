"use client"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
  const router = useRouter()
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }
  return (
    <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
      <LogOut className="w-3.5 h-3.5" />Salir
    </button>
  )
}
