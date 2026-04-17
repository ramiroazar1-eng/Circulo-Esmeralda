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
  const date_from = searchParams.get("from")
  const date_to = searchParams.get("to")
  if (!cycle_id || !date_from || !date_to)
    return NextResponse.json({ error: "Faltan parametros" }, { status: 400 })

  const service = await createServiceClient()

  const { data: cycle } = await service
    .from("production_cycles")
    .select("name")
    .eq("id", cycle_id)
    .single()

  const { data: rooms } = await service
    .from("rooms")
    .select("id, name, square_meters")
    .eq("is_active", true)
    .order("name")

  const { data: events } = await service
    .from("cycle_events")
    .select("id, event_type, event_date, notes, is_locked, lot:lots(lot_code), room:rooms(id, name), created_by_profile:profiles!cycle_events_created_by_fkey(full_name)")
    .eq("cycle_id", cycle_id)
    .gte("event_date", date_from)
    .lte("event_date", date_to)
    .order("event_date", { ascending: true })

  const { data: movements } = await service
    .from("supply_movements")
    .select("id, quantity, unit_cost, total_cost, movement_date, notes, supply_product:supply_products(name, unit), room:rooms(id, name), lot:lots(lot_code), created_by_profile:profiles!supply_movements_created_by_fkey(full_name)")
    .eq("cycle_id", cycle_id)
    .eq("movement_type", "consumo")
    .gte("movement_date", date_from)
    .lte("movement_date", date_to)
    .order("movement_date", { ascending: true })

  function esc(s: string | null | undefined): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  const EVENT_LABELS: Record<string, string> = {
    poda: "Poda", nutrientes: "Nutrientes", tratamiento: "Tratamiento / preventivo",
    transplante: "Transplante", riego: "Riego", defoliacion: "Defoliacion",
    traslado: "Traslado", incidente: "Incidente", descarte: "Descarte parcial", otro: "Otro"
  }

  const fromDate = new Date(date_from + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const toDate = new Date(date_to + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

  // Agrupar eventos por sala
  const eventsByRoom: Record<string, any[]> = {}
  const movementsByRoom: Record<string, any[]> = {}

  // Sala "sin sala asignada"
  const NO_ROOM = "sin-sala"

  for (const ev of (events ?? [])) {
    const roomId = (ev as any).room?.id ?? NO_ROOM
    if (!eventsByRoom[roomId]) eventsByRoom[roomId] = []
    eventsByRoom[roomId].push(ev)
  }

  for (const mv of (movements ?? [])) {
    const roomId = (mv as any).room?.id ?? NO_ROOM
    if (!movementsByRoom[roomId]) movementsByRoom[roomId] = []
    movementsByRoom[roomId].push(mv)
  }

  // Obtener todas las salas que tienen actividad
  const activeRoomIds = [...new Set([...Object.keys(eventsByRoom), ...Object.keys(movementsByRoom)])]
  const roomList = (rooms ?? []).filter((r: any) => activeRoomIds.includes(r.id))
  if (activeRoomIds.includes(NO_ROOM)) {
    roomList.push({ id: NO_ROOM, name: "Sin sala asignada", square_meters: null })
  }

  function formatEventDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })
  }

  function renderRoomSection(room: any): string {
    const roomEvents = eventsByRoom[room.id] ?? []
    const roomMovements = movementsByRoom[room.id] ?? []
    if (roomEvents.length === 0 && roomMovements.length === 0) return ""

    // Agrupar por fecha
    const dateMap: Record<string, { events: any[], movements: any[] }> = {}
    for (const ev of roomEvents) {
      const d = ev.event_date
      if (!dateMap[d]) dateMap[d] = { events: [], movements: [] }
      dateMap[d].events.push(ev)
    }
    for (const mv of roomMovements) {
      const d = mv.movement_date
      if (!dateMap[d]) dateMap[d] = { events: [], movements: [] }
      dateMap[d].movements.push(mv)
    }

    const sortedDates = Object.keys(dateMap).sort()

    return `
<div class="room-section">
  <div class="room-header">
    <span class="room-name">${esc(room.name)}</span>
    ${room.square_meters ? `<span class="room-sqm">${room.square_meters} mÂ²</span>` : ""}
  </div>

  ${sortedDates.map(date => {
    const dayData = dateMap[date]
    return `
  <div class="day-block">
    <div class="day-header">${formatEventDate(date)}</div>
    ${dayData.events.length > 0 ? `
    <table>
      <thead><tr><th>Evento</th><th>Lote</th><th>Operario</th><th>Notas</th><th class="lock-col">C</th></tr></thead>
      <tbody>
        ${dayData.events.map((ev: any) => `
        <tr>
          <td><strong>${esc(EVENT_LABELS[ev.event_type] ?? ev.event_type)}</strong></td>
          <td class="mono">${esc(ev.lot?.lot_code)}</td>
          <td>${esc(ev.created_by_profile?.full_name)}</td>
          <td>${esc(ev.notes)}</td>
          <td class="lock-col">${ev.is_locked ? "âœ“" : ""}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
    ${dayData.movements.length > 0 ? `
    <table class="movements-table">
      <thead><tr><th>Insumo</th><th>Cantidad</th><th>Lote</th><th>Operario</th><th>Notas</th></tr></thead>
      <tbody>
        ${dayData.movements.map((mv: any) => `
        <tr>
          <td>${esc(mv.supply_product?.name)}</td>
          <td class="mono">${mv.quantity} ${esc(mv.supply_product?.unit)}${mv.total_cost ? ` ($${parseFloat(mv.total_cost).toLocaleString("es-AR")})` : ""}</td>
          <td class="mono">${esc(mv.lot?.lot_code)}</td>
          <td>${esc(mv.created_by_profile?.full_name)}</td>
          <td>${esc(mv.notes)}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
  </div>`
  }).join("")}

  <div class="firma-block">
    <div class="firma-line">Firma operario: ___________________________</div>
    <div class="firma-line">Firma director tecnico: ___________________________</div>
  </div>
</div>`
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Trazabilidad ${esc(cycle?.name)} - ${fromDate} al ${toDate}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 20px; }
  h1 { font-size: 14px; margin-bottom: 2px; }
  .meta { color: #64748b; font-size: 10px; margin-bottom: 16px; }
  .room-section { margin-bottom: 24px; page-break-inside: avoid; }
  .room-header { background: #1e293b; color: white; padding: 6px 10px; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
  .room-name { font-size: 12px; font-weight: bold; }
  .room-sqm { font-size: 10px; opacity: 0.7; }
  .day-block { border: 1px solid #e2e8f0; border-top: none; padding: 6px 8px; }
  .day-header { font-weight: bold; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 1px solid #f1f5f9; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { background: #f8fafc; padding: 3px 6px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 3px 6px; border-bottom: 1px solid #f8fafc; vertical-align: top; }
  .movements-table { margin-top: 4px; }
  .movements-table th { background: #f0fdf4; color: #166534; }
  .mono { font-family: monospace; }
  .lock-col { width: 20px; text-align: center; }
  .firma-block { border: 1px solid #e2e8f0; border-top: 2px solid #1e293b; padding: 12px 8px 8px; display: flex; gap: 40px; }
  .firma-line { font-size: 10px; color: #475569; margin-top: 20px; }
  @media print {
    body { margin: 10px; }
    .room-section { page-break-after: always; }
    .room-section:last-child { page-break-after: avoid; }
  }
</style>
</head>
<body>
<h1>Trazabilidad operativa - ${esc(cycle?.name ?? "")}</h1>
<div class="meta">Periodo: ${fromDate} al ${toDate} - Generado: ${now} - C = evento cerrado</div>

${roomList.map((room: any) => renderRoomSection(room)).join("")}

</body>
</html>`

  const filename = `trazabilidad-${cycle?.name?.replace(/\s+/g, "-")}-${date_from}-${date_to}.html`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  })
}
