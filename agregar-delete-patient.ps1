# Boton eliminar paciente
Write-Host "=== Agregando eliminar paciente ===" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "src\app\api\admin\delete-patient" | Out-Null

# ── API eliminar paciente ────────────────────────────────────
$content = @'
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { patientId } = await request.json()
  if (!patientId) return NextResponse.json({ error: "Falta el ID" }, { status: 400 })

  const service = await createServiceClient()

  // Soft delete
  const { error } = await service
    .from("patients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", patientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
'@
Set-Content -Path "src\app\api\admin\delete-patient\route.ts" -Value $content
Write-Host "[OK] API delete-patient" -ForegroundColor Green

# ── Boton eliminar paciente ──────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"

export default function DeletePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Dar de baja a "${patientName}"? El registro quedara archivado y no aparecera en el listado activo.`)) return
    setLoading(true)
    const res = await fetch("/api/admin/delete-patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setLoading(false); return }
    router.push("/pacientes")
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      Dar de baja
    </button>
  )
}
'@
Set-Content -Path "src\app\pacientes\[id]\DeletePatientButton.tsx" -Value $content
Write-Host "[OK] DeletePatientButton" -ForegroundColor Green

Write-Host ""
Write-Host "=== Listo ===" -ForegroundColor Cyan
Write-Host "Ahora actualiza src\app\pacientes\[id]\page.tsx manualmente" -ForegroundColor Yellow
