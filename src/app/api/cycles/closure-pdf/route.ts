import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
  if (!["admin","administrativo","biologo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const closure_id = searchParams.get("id")
  if (!closure_id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const service = await createServiceClient()

  const { data: closure } = await service
    .from("daily_closures")
    .select("*, cycle:production_cycles(name), closed_by_profile:profiles!daily_closures_closed_by_fkey(full_name)")
    .eq("id", closure_id)
    .single()
  if (!closure) return NextResponse.json({ error: "Cierre no encontrado" }, { status: 404 })

  const { data: events } = await service
    .from("cycle_events")
    .select("id, event_type, event_date, notes, lot:lots(lot_code), room:rooms(name), created_by_profile:profiles!cycle_events_created_by_fkey(full_name)")
    .eq("closure_id", closure_id)
    .order("created_at", { ascending: true })

  function esc(s: string | null | undefined): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  const EVENT_LABELS: Record<string, string> = {
    poda: "Poda", nutrientes: "Nutrientes", tratamiento: "Tratamiento / preventivo",
    transplante: "Transplante", riego: "Riego", defoliacion: "Defoliacion",
    traslado: "Traslado", incidente: "Incidente", descarte: "Descarte parcial", otro: "Otro"
  }

  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const closureDate = new Date(closure.closure_date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cierre de jornada - ${esc(closure.closure_date)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 24px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 8px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .hash { font-family: monospace; font-size: 9px; color: #94a3b8; word-break: break-all; margin-top: 16px; padding: 8px; background: #f8fafc; border-radius: 4px; }
  .footer { margin-top: 32px; border-top: 2px solid #1e293b; padding-top: 16px; }
  .firma { margin-top: 40px; border-top: 1px solid #1e293b; width: 200px; padding-top: 4px; font-size: 10px; color: #64748b; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>Cierre de jornada - ${esc((closure as any).cycle?.name ?? "Ciclo")}</h1>
<div class="meta">
  ${closureDate} - ${(events ?? []).length} eventos registrados<br>
  Cerrado por: ${esc((closure as any).closed_by_profile?.full_name ?? "-")} - Generado: ${now}
</div>

<table>
<thead>
  <tr>
    <th>#</th>
    <th>Evento</th>
    <th>Lote</th>
    <th>Sala</th>
    <th>Notas</th>
    <th>Operario</th>
  </tr>
</thead>
<tbody>
${(events ?? []).map((e: any, i: number) => `
<tr>
  <td>${i + 1}</td>
  <td><strong>${esc(EVENT_LABELS[e.event_type] ?? e.event_type)}</strong></td>
  <td>${e.lot ? `<span class="badge">${esc(e.lot.lot_code)}</span>` : "-"}</td>
  <td>${esc(e.room?.name)}</td>
  <td>${esc(e.notes)}</td>
  <td>${esc(e.created_by_profile?.full_name)}</td>
</tr>`).join("")}
</tbody>
</table>

<div class="hash">
  Hash de integridad: ${esc(closure.events_hash)}
</div>

<div class="footer">
  <div style="display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <p style="font-size: 10px; color: #64748b;">Circulo Esmeralda - ONG Cannabis Medicinal</p>
      <p style="font-size: 10px; color: #64748b;">Documento de trazabilidad operativa - ${now}</p>
    </div>
    <div>
      <div class="firma">Firma responsable</div>
      <div class="firma" style="margin-top: 24px;">Firma director tecnico</div>
    </div>
  </div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="cierre-${closure.closure_date}.html"`
    }
  })
}