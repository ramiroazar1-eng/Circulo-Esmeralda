import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
  if (!["admin","administrativo","biologo","director_de_cultivo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const cycle_id = searchParams.get("cycle_id")
  if (!cycle_id) return NextResponse.json({ error: "cycle_id requerido" }, { status: 400 })

  const service = await createServiceClient()

  const [cycleRes, eventsRes, lotsRes, expensesRes] = await Promise.all([
    service.from("production_cycles").select("id, name, start_date, end_date, cycle_type, notes").eq("id", cycle_id).single(),
    service.from("cycle_events").select("id, event_type, event_date, notes, lot:lots(lot_code), room:rooms(name), created_by_profile:profiles!cycle_events_created_by_fkey(full_name)").eq("cycle_id", cycle_id).order("event_date", { ascending: true }),
    service.from("lots").select("id, lot_code, status, plant_count, net_grams, gross_grams, genetic:genetics(name), room:rooms(name)").eq("cycle_id", cycle_id),
    service.from("cycle_expense_allocations").select("allocated_amount, expense:cycle_expenses(category, description, purchase_date)").eq("cycle_id", cycle_id),
  ])

  const cycle = cycleRes.data
  if (!cycle) return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 })

  const events = (eventsRes.data ?? []) as any[]
  const lots = (lotsRes.data ?? []) as any[]
  const expenses = (expensesRes.data ?? []) as any[]

  const totalNet = lots.reduce((acc: number, l: any) => acc + (l.net_grams ?? 0), 0)
  const totalGross = lots.reduce((acc: number, l: any) => acc + (l.gross_grams ?? 0), 0)
  const totalExpenses = expenses.reduce((acc: number, e: any) => acc + parseFloat(e.allocated_amount ?? 0), 0)

  function esc(s: string | null | undefined): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  const EVENT_LABELS: Record<string, string> = {
    poda: "Poda", nutrientes: "Nutrientes", tratamiento: "Tratamiento",
    transplante: "Transplante", riego: "Riego", defoliacion: "Defoliacion",
    traslado: "Traslado", incidente: "Incidente", descarte: "Descarte", otro: "Otro"
  }

  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Historial ${esc(cycle.name)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 24px; }
  h1 { font-size: 18px; margin-bottom: 4px; color: #14532d; }
  h2 { font-size: 13px; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e293b; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  .stats { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; }
  .stat-val { font-size: 18px; font-weight: 700; color: #14532d; }
  .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 11px; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .footer { margin-top: 32px; border-top: 2px solid #1e293b; padding-top: 16px; font-size: 10px; color: #64748b; }
  .firma { margin-top: 40px; border-top: 1px solid #1e293b; width: 200px; padding-top: 4px; font-size: 10px; color: #64748b; display: inline-block; margin-right: 40px; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>Historial completo — ${esc(cycle.name)}</h1>
<div class="meta">
  ${cycle.cycle_type === "reproductivo" ? "Ciclo reproductivo (madres)" : "Ciclo productivo"} · 
  Inicio: ${cycle.start_date} ${cycle.end_date ? `· Cierre: ${cycle.end_date}` : "· En curso"}<br>
  Generado por: ${esc(profile?.full_name ?? "-")} · ${now}
</div>

<div class="stats">
  <div class="stat"><div class="stat-val">${lots.length}</div><div class="stat-label">Lotes</div></div>
  <div class="stat"><div class="stat-val">${totalNet}g</div><div class="stat-label">Produccion neta</div></div>
  <div class="stat"><div class="stat-val">${events.length}</div><div class="stat-label">Eventos</div></div>
  <div class="stat"><div class="stat-val">$${totalExpenses.toLocaleString("es-AR")}</div><div class="stat-label">Gastos</div></div>
</div>

<h2>Lotes del ciclo</h2>
<table>
<thead><tr><th>Codigo</th><th>Genetica</th><th>Sala</th><th>Plantas</th><th>Neto</th><th>Estado</th></tr></thead>
<tbody>
${lots.map((l: any) => `<tr>
  <td><span class="badge">${esc(l.lot_code)}</span></td>
  <td>${esc(l.genetic?.name)}</td>
  <td>${esc(l.room?.name)}</td>
  <td>${l.plant_count ?? "-"}</td>
  <td>${l.net_grams ? `${l.net_grams}g` : "-"}</td>
  <td>${esc(l.status)}</td>
</tr>`).join("")}
</tbody>
</table>

<h2>Eventos registrados (${events.length})</h2>
<table>
<thead><tr><th>#</th><th>Fecha</th><th>Evento</th><th>Lote</th><th>Sala</th><th>Notas</th><th>Operario</th></tr></thead>
<tbody>
${events.map((e: any, i: number) => `<tr>
  <td>${i + 1}</td>
  <td>${esc(e.event_date)}</td>
  <td><strong>${esc(EVENT_LABELS[e.event_type] ?? e.event_type)}</strong></td>
  <td>${e.lot ? `<span class="badge">${esc(e.lot.lot_code)}</span>` : "-"}</td>
  <td>${esc(e.room?.name)}</td>
  <td>${esc(e.notes)}</td>
  <td>${esc(e.created_by_profile?.full_name)}</td>
</tr>`).join("")}
</tbody>
</table>

${expenses.length > 0 ? `
<h2>Gastos del ciclo</h2>
<table>
<thead><tr><th>Descripcion</th><th>Categoria</th><th>Fecha</th><th>Monto</th></tr></thead>
<tbody>
${expenses.map((e: any) => `<tr>
  <td>${esc(e.expense?.description)}</td>
  <td>${esc(e.expense?.category)}</td>
  <td>${esc(e.expense?.purchase_date)}</td>
  <td>$${parseFloat(e.allocated_amount).toLocaleString("es-AR")}</td>
</tr>`).join("")}
</tbody>
</table>` : ""}

<div class="footer">
  <p>AEF Simple Asociacion — Documento de trazabilidad operativa</p>
  <div style="margin-top: 24px;">
    <span class="firma">Firma responsable</span>
    <span class="firma">Firma director de cultivo</span>
  </div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="historial-${esc(cycle.name).replace(/\s+/g, "-")}.html"`
    }
  })
}
