import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const service = await createServiceClient()
  const { data: patients } = await service
    .from("patients")
    .select("full_name, dni, status, compliance_status, reprocann_status, reprocann_expiry, created_at, membership_plan:membership_plans(name), treating_physician:profiles!patients_treating_physician_id_fkey(full_name)")
    .is("deleted_at", null)
    .order("full_name")

  function esc(s: string | null | undefined): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const statusLabel = (s: string) => ({ activo: "Activo", pendiente_documental: "Pendiente", suspendido: "Suspendido", inactivo: "Inactivo", baja: "Baja" }[s] ?? s)
  const complianceLabel = (s: string) => ({ ok: "En regla", atencion: "Atencion", critico: "Critico" }[s] ?? s)
  const reprocannLabel = (s: string) => ({ vigente: "Vigente", proximo_vencimiento: "Proximo a vencer", vencido: "VENCIDO", pendiente_vinculacion: "Sin vincular" }[s] ?? s)

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Listado de pacientes - ${now}</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;margin:20px}h1{font-size:16px;margin-bottom:4px}.subtitle{color:#64748b;font-size:11px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1px solid #e2e8f0}td{padding:6px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}.badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600}.ok{background:#f0fdf4;color:#166534}.atencion{background:#fffbeb;color:#92400e}.critico{background:#fef2f2;color:#991b1b}.footer{margin-top:20px;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:8px}</style>
</head><body>
<h1>Listado de pacientes activos</h1>
<div class="subtitle">Generado el ${now} - ${patients?.length ?? 0} pacientes</div>
<table><thead><tr><th>Nombre</th><th>DNI</th><th>Estado</th><th>Compliance</th><th>REPROCANN</th><th>Plan</th></tr></thead><tbody>
${(patients ?? []).map((p: any) => `<tr><td>${esc(p.full_name)}</td><td style="font-family:monospace">${esc(p.dni)}</td><td>${statusLabel(p.status)}</td><td><span class="badge ${p.compliance_status}">${complianceLabel(p.compliance_status)}</span></td><td>${reprocannLabel(p.reprocann_status)}</td><td>${esc(p.membership_plan?.name)}</td></tr>`).join("")}
</tbody></table>
<div class="footer">Sistema interno ONG Cannabis Medicinal - Documento confidencial</div>
</body></html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="pacientes-${now.replace(/\//g, "-")}.html"`
    }
  })
}