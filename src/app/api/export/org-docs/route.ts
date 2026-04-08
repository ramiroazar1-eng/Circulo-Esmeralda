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
  const { data: docs } = await service.from("org_documents").select("*").order("is_mandatory", { ascending: false }).order("doc_type").order("name")

  function esc(s: string | null | undefined): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const total = (docs ?? []).length
  const aprobados = (docs ?? []).filter((d: any) => d.status === "aprobado").length
  const pct = total > 0 ? Math.round((aprobados/total)*100) : 0
  const barColor = aprobados === total ? "#16a34a" : aprobados/total > 0.7 ? "#d97706" : "#dc2626"
  const statusLabel = (s: string) => ({ faltante: "FALTANTE", pendiente_revision: "Pendiente revision", aprobado: "Aprobado", observado: "Observado", vencido: "VENCIDO" }[s] ?? s)
  const typeLabel = (t: string) => ({ estatuto: "Estatuto", acta: "Actas", autoridades: "Autoridades", afip_cuit: "AFIP/CUIT", igj: "IGJ", habilitacion: "Habilitacion", convenio: "Convenio", inmueble: "Inmueble", protocolo: "Protocolo", politica: "Politica", otro: "Otro" }[t] ?? t)

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Documentacion ONG - ${now}</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;margin:24px}h1{font-size:16px;margin-bottom:4px}.meta{color:#64748b;margin-bottom:8px}.progress{background:#f1f5f9;border-radius:4px;height:8px;margin-bottom:20px}.progress-bar{background:${barColor};height:8px;border-radius:4px;width:${pct}%}table{width:100%;border-collapse:collapse}th{background:#f8fafc;padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0}td{padding:5px 8px;border-bottom:1px solid #f8fafc}.ok{color:#166534;font-weight:600}.warn{color:#92400e;font-weight:600}.danger{color:#991b1b;font-weight:600}.footer{margin-top:24px;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:8px}</style>
</head><body>
<h1>Documentacion institucional ONG</h1>
<div class="meta">Generado el ${now} - ${aprobados}/${total} documentos aprobados (${pct}%)</div>
<div class="progress"><div class="progress-bar"></div></div>
<table><thead><tr><th>Documento</th><th>Tipo</th><th>Obligatorio</th><th>Estado</th><th>Archivo</th></tr></thead><tbody>
${(docs ?? []).map((d: any) => `<tr><td>${esc(d.name)}</td><td>${typeLabel(d.doc_type)}</td><td>${d.is_mandatory ? "Si" : "No"}</td><td class="${d.status === "aprobado" ? "ok" : d.status === "faltante" ? "danger" : "warn"}">${statusLabel(d.status)}</td><td>${esc(d.file_name)}</td></tr>`).join("")}
</tbody></table>
<div class="footer">Sistema interno ONG Cannabis Medicinal - Documento confidencial - ${now}</div>
</body></html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="documentacion-ong-${now.replace(/\//g, "-")}.html"`
    }
  })
}