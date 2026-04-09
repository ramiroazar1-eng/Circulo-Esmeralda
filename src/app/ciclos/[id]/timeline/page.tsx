import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import TimelineRoom from "./TimelineRoom"

export default async function CycleTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = profile?.role ?? ""
  const canPlan = ["admin","biologo"].includes(role)

  const [cycleRes, roomsRes, eventsRes, plannedRes, lotsRes] = await Promise.all([
    supabase.from("production_cycles").select("id, name, status, start_date").eq("id", id).single(),
    supabase.from("rooms").select("id, name, square_meters").eq("is_active", true).order("name"),
    supabase.from("cycle_events")
      .select("id, event_type, event_date, notes, is_locked, lot:lots(id, lot_code), room:rooms(id, name), created_by_profile:profiles!cycle_events_created_by_fkey(full_name)")
      .eq("cycle_id", id)
      .order("event_date", { ascending: true }),
    supabase.from("planned_events")
      .select("id, event_type, planned_date, notes, status, lot:lots(id, lot_code), room:rooms(id, name)")
      .eq("cycle_id", id)
      .neq("status", "cancelado")
      .order("planned_date", { ascending: true }),
    supabase.from("lots")
      .select("id, lot_code, status, seedling_date, veg_date, flower_date, harvest_date, genetic:genetics(name), room:rooms(id, name)")
      .eq("cycle_id", id),
  ])

  if (!cycleRes.data) notFound()
  const cycle = cycleRes.data
  const rooms = (roomsRes.data ?? []) as any[]
  const events = (eventsRes.data ?? []) as any[]
  const planned = (plannedRes.data ?? []) as any[]
  const lots = (lotsRes.data ?? []) as any[]

  const roomsWithData = rooms.map((room: any) => {
    const roomLots = lots.filter((l: any) => l.room?.id === room.id)
    const roomEvents = events.filter((e: any) => e.room?.id === room.id)
    const roomPlanned = planned.filter((p: any) => p.room?.id === room.id)
    const lotIds = roomLots.map((l: any) => l.id)
    const lotEvents = events.filter((e: any) => !e.room && lotIds.includes(e.lot?.id))
    return {
      ...room,
      lots: roomLots,
      events: [...roomEvents, ...lotEvents].sort((a: any, b: any) => a.event_date.localeCompare(b.event_date)),
      planned: roomPlanned,
    }
  }).filter((r: any) => r.lots.length > 0 || r.events.length > 0 || r.planned.length > 0)

  return (
    <div className="space-y-5">
      <BackButton label={`Volver a ${cycle.name}`} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a2e1a]">Linea de tiempo</h1>
          <p className="text-sm text-[#6b8c65]">{cycle.name} - desde {formatDate(cycle.start_date)}</p>
        </div>
        <Link href={`/ciclos/${id}`} className="text-xs text-[#6b8c65] hover:text-[#1a2e1a] underline">
          Ver detalle del ciclo
        </Link>
      </div>

      {roomsWithData.length === 0 ? (
        <div className="bg-white border border-[#ddecd8] rounded-xl p-8 text-center">
          <p className="text-sm text-[#9ab894]">No hay lotes ni eventos registrados en este ciclo todavia.</p>
          <p className="text-xs text-[#9ab894] mt-1">Crea lotes en trazabilidad y asignalos a las salas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {roomsWithData.map((room: any) => (
            <TimelineRoom
              key={room.id}
              room={room}
              cycleId={id}
              canPlan={canPlan}
              lots={lots.map((l: any) => ({ id: l.id, lot_code: l.lot_code }))}
              rooms={rooms}
            />
          ))}
        </div>
      )}
    </div>
  )
}