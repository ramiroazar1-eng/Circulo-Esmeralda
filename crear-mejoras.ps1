# Setup ONG Cannabis - Parte 4: Mejoras UI
Write-Host "=== Aplicando mejoras ===" -ForegroundColor Cyan

# ── Componente BackButton reutilizable ───────────────────────
New-Item -ItemType Directory -Force -Path "src\components\ui" | Out-Null
$content = @'
"use client"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export function BackButton({ label = "Volver" }: { label?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-4 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
'@
Set-Content -Path "src\components\ui\BackButton.tsx" -Value $content
Write-Host "[OK] BackButton" -ForegroundColor Green

# ── Pagina de administracion de usuarios ─────────────────────
New-Item -ItemType Directory -Force -Path "src\app\usuarios" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import { Users } from "lucide-react"
import NewUserModal from "./NewUserModal"

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name")

  const list = (users ?? []) as any[]
  const activos = list.filter(u => u.is_active).length

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador", administrativo: "Administrativo",
    medico: "Medico", biologo: "Biologo", paciente: "Paciente"
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        description="Gestion de usuarios y roles del sistema"
        actions={<NewUserModal />}
      />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Usuarios totales" value={list.length} icon={Users} />
        <StatCard label="Activos" value={activos} variant="ok" />
      </div>
      <Card padding={false}>
        {list.length === 0 ? <EmptyState title="Sin usuarios" icon={Users} /> : (
          <Table>
            <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Creado</th></tr></thead>
            <tbody>
              {list.map((u: any) => (
                <tr key={u.id}>
                  <td className="font-medium text-slate-900">{u.full_name}</td>
                  <td>
                    <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`text-xs rounded px-1.5 py-0.5 border ${u.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="text-slate-500">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\usuarios\page.tsx" -Value $content
Write-Host "[OK] Usuarios page" -ForegroundColor Green

# ── Modal para crear usuario ─────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewUserModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()

    const email = form.get("email") as string
    const password = form.get("password") as string
    const full_name = form.get("full_name") as string
    const role = form.get("role") as string

    // Crear usuario en Supabase Auth via API admin
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name, role })
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Error al crear usuario"); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => { setOpen(false); setSuccess(false); router.refresh() }, 1500)
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo usuario</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nuevo usuario</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">Usuario creado correctamente.</Alert>}
            <div>
              <label className="label-ong">Nombre completo *</label>
              <input name="full_name" required className="input-ong" placeholder="Apellido, Nombre" />
            </div>
            <div>
              <label className="label-ong">Email *</label>
              <input name="email" type="email" required className="input-ong" placeholder="usuario@ong.org.ar" />
            </div>
            <div>
              <label className="label-ong">Contrasena inicial *</label>
              <input name="password" type="password" required minLength={8} className="input-ong" placeholder="Minimo 8 caracteres" />
            </div>
            <div>
              <label className="label-ong">Rol *</label>
              <select name="role" required className="input-ong">
                <option value="">Selecciona un rol...</option>
                <option value="administrativo">Administrativo</option>
                <option value="medico">Medico</option>
                <option value="biologo">Biologo</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">El usuario debera cambiar su contrasena al primer ingreso.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear usuario</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
'@
Set-Content -Path "src\app\usuarios\NewUserModal.tsx" -Value $content
Write-Host "[OK] NewUserModal" -ForegroundColor Green

# ── API Route para crear usuario (usa service role) ──────────
New-Item -ItemType Directory -Force -Path "src\app\api\admin\create-user" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { email, password, full_name, role } = await request.json()
  if (!email || !password || !full_name || !role) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const serviceSupabase = await createServiceClient()

  const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
    email, password, email_confirm: true
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await serviceSupabase.from("profiles").insert({
    id: authData.user.id, full_name, role
  })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
'@
Set-Content -Path "src\app\api\admin\create-user\route.ts" -Value $content
Write-Host "[OK] API create-user" -ForegroundColor Green

# ── Pagina de configuracion de membresias ────────────────────
New-Item -ItemType Directory -Force -Path "src\app\configuracion" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { formatARS, formatGrams } from "@/lib/utils"
import { CreditCard } from "lucide-react"
import NewPlanModal from "./NewPlanModal"
import EditPlanButton from "./EditPlanButton"

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: plans } = await supabase.from("membership_plans").select("*").order("monthly_amount")

  return (
    <div className="space-y-5">
      <PageHeader title="Configuracion" description="Planes de membresia y parametros del sistema" />

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader
            title="Planes de membresia"
            actions={<NewPlanModal />}
          />
        </div>
        {(!plans || plans.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin planes definidos" icon={CreditCard} /></div>
        ) : (
          <Table>
            <thead><tr><th>Nombre</th><th>Descripcion</th><th>Gramos mensuales</th><th>Monto mensual</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {plans.map((plan: any) => (
                <tr key={plan.id}>
                  <td className="font-medium text-slate-900">{plan.name}</td>
                  <td className="text-slate-500">{plan.description ?? "—"}</td>
                  <td className="tabular-nums">{plan.monthly_grams ? formatGrams(plan.monthly_grams) : "—"}</td>
                  <td className="tabular-nums font-medium">{formatARS(plan.monthly_amount)}</td>
                  <td>
                    <span className={`text-xs rounded px-1.5 py-0.5 border ${plan.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {plan.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td><EditPlanButton plan={plan} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\configuracion\page.tsx" -Value $content
Write-Host "[OK] Configuracion page" -ForegroundColor Green

# ── Modal nuevo plan ─────────────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewPlanModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("membership_plans").insert({
      name: form.get("name"),
      description: form.get("description") || null,
      monthly_grams: parseFloat(form.get("monthly_grams") as string) || null,
      monthly_amount: parseFloat(form.get("monthly_amount") as string),
      is_active: true
    })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo plan</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nuevo plan de membresia</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre del plan *</label><input name="name" required className="input-ong" placeholder="Plan Basico" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" className="input-ong" placeholder="Hasta 15g mensuales" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Gramos mensuales</label><input name="monthly_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="15" /></div>
              <div><label className="label-ong">Monto mensual (ARS) *</label><input name="monthly_amount" type="number" required min="0" className="input-ong" placeholder="15000" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar plan</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
'@
Set-Content -Path "src\app\configuracion\NewPlanModal.tsx" -Value $content
Write-Host "[OK] NewPlanModal" -ForegroundColor Green

# ── Boton editar plan ────────────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function EditPlanButton({ plan }: { plan: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("membership_plans").update({
      name: form.get("name"),
      description: form.get("description") || null,
      monthly_grams: parseFloat(form.get("monthly_grams") as string) || null,
      monthly_amount: parseFloat(form.get("monthly_amount") as string),
      is_active: form.get("is_active") === "true"
    }).eq("id", plan.id)
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil className="w-3 h-3" />Editar</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Editar plan</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre *</label><input name="name" required defaultValue={plan.name} className="input-ong" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" defaultValue={plan.description ?? ""} className="input-ong" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Gramos mensuales</label><input name="monthly_grams" type="number" step="0.1" defaultValue={plan.monthly_grams ?? ""} className="input-ong" /></div>
              <div><label className="label-ong">Monto mensual (ARS) *</label><input name="monthly_amount" type="number" required defaultValue={plan.monthly_amount} className="input-ong" /></div>
            </div>
            <div><label className="label-ong">Estado</label><select name="is_active" defaultValue={plan.is_active ? "true" : "false"} className="input-ong"><option value="true">Activo</option><option value="false">Inactivo</option></select></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar cambios</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
'@
Set-Content -Path "src\app\configuracion\EditPlanButton.tsx" -Value $content
Write-Host "[OK] EditPlanButton" -ForegroundColor Green

# ── Trazabilidad mejorada con creacion de lotes ──────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { formatDate, formatGrams } from "@/lib/utils"
import { Package, FlaskConical } from "lucide-react"
import NewLotModal from "./NewLotModal"

export default async function TrazabilidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canCreate = ["admin","biologo"].includes(profile?.role ?? "")

  const { data: lots } = await supabase.from("lots").select("*, genetic:genetics(name), room:rooms(name), stock_position:stock_positions(available_grams)").order("created_at", { ascending: false })
  const { data: genetics } = await supabase.from("genetics").select("id, name").eq("is_active", true)
  const { data: rooms } = await supabase.from("rooms").select("id, name").eq("is_active", true)
  const { data: stockData } = await supabase.from("stock_positions").select("available_grams")

  const totalStock = (stockData ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const lotsList = (lots ?? []) as any[]
  const enProceso = lotsList.filter(l => l.status === "en_proceso").length
  const finalizados = lotsList.filter(l => l.status === "finalizado").length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trazabilidad"
        description="Lotes de produccion y movimientos de stock"
        actions={canCreate ? <NewLotModal genetics={genetics ?? []} rooms={rooms ?? []} /> : undefined}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Lotes en proceso" value={enProceso} icon={FlaskConical} />
        <StatCard label="Lotes finalizados" value={finalizados} icon={Package} />
        <StatCard label="Stock total disponible" value={formatGrams(totalStock)} />
      </div>
      <Card padding={false}>
        {lotsList.length === 0 ? <EmptyState title="Sin lotes registrados" description="Crea el primer lote con el boton de arriba." icon={FlaskConical} /> : (
          <Table>
            <thead><tr><th>Codigo</th><th>Genetica</th><th>Sala</th><th>Inicio</th><th>Cosecha</th><th>Estado</th><th>Stock disponible</th></tr></thead>
            <tbody>
              {lotsList.map((lot: any) => (
                <tr key={lot.id}>
                  <td className="font-mono font-medium">{lot.lot_code}</td>
                  <td>{lot.genetic?.name ?? "—"}</td>
                  <td>{lot.room?.name ?? "—"}</td>
                  <td>{formatDate(lot.start_date)}</td>
                  <td>{lot.harvest_date ? formatDate(lot.harvest_date) : <span className="text-slate-400">—</span>}</td>
                  <td>
                    <span className={`text-xs rounded px-1.5 py-0.5 border ${lot.status === "finalizado" ? "bg-green-50 text-green-700 border-green-200" : lot.status === "en_proceso" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {lot.status === "en_proceso" ? "En proceso" : lot.status === "finalizado" ? "Finalizado" : "Descartado"}
                    </span>
                  </td>
                  <td className="tabular-nums font-medium">{lot.stock_position ? formatGrams(lot.stock_position.available_grams) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\trazabilidad\page.tsx" -Value $content
Write-Host "[OK] Trazabilidad mejorada" -ForegroundColor Green

# ── Modal nuevo lote ─────────────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

interface Option { id: string; name: string }

export default function NewLotModal({ genetics, rooms }: { genetics: Option[]; rooms: Option[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Generar codigo de lote
    const year = new Date().getFullYear()
    const { data: existingLots } = await supabase.from("lots").select("lot_code").like("lot_code", `L-${year}-%`)
    const nextSeq = String((existingLots?.length ?? 0) + 1).padStart(3, "0")
    const lotCode = `L-${year}-${nextSeq}`

    const { error: err } = await supabase.from("lots").insert({
      lot_code: lotCode,
      genetic_id: form.get("genetic_id") || null,
      room_id: form.get("room_id") || null,
      start_date: form.get("start_date"),
      harvest_date: form.get("harvest_date") || null,
      status: form.get("status"),
      gross_grams: parseFloat(form.get("gross_grams") as string) || null,
      net_grams: parseFloat(form.get("net_grams") as string) || null,
      waste_grams: parseFloat(form.get("waste_grams") as string) || null,
      notes: form.get("notes") || null,
      created_by: user.id
    })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo lote</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nuevo lote de produccion</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-2">El codigo de lote se genera automaticamente (L-AAAA-NNN)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Genetica</label>
                <select name="genetic_id" className="input-ong">
                  <option value="">Sin especificar</option>
                  {genetics.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Sala</label>
                <select name="room_id" className="input-ong">
                  <option value="">Sin especificar</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Fecha de inicio *</label><input name="start_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="input-ong" /></div>
              <div><label className="label-ong">Fecha de cosecha</label><input name="harvest_date" type="date" className="input-ong" /></div>
            </div>
            <div>
              <label className="label-ong">Estado *</label>
              <select name="status" required className="input-ong">
                <option value="en_proceso">En proceso</option>
                <option value="finalizado">Finalizado</option>
                <option value="descartado">Descartado</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label-ong">Gramos brutos</label><input name="gross_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="0.0" /></div>
              <div><label className="label-ong">Gramos netos</label><input name="net_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="0.0" /></div>
              <div><label className="label-ong">Merma</label><input name="waste_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="0.0" /></div>
            </div>
            <div><label className="label-ong">Notas</label><textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Observaciones del lote..." /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear lote</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
'@
Set-Content -Path "src\app\trazabilidad\NewLotModal.tsx" -Value $content
Write-Host "[OK] NewLotModal" -ForegroundColor Green

# ── Nuevo paciente con carga de archivos ─────────────────────
$content = @'
"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, X, FileText } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PageHeader, Card, Button, Alert } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"

interface FileItem { file: File; docType: string; preview: string }

const DOC_TYPES = [
  { value: "dni_frente", label: "DNI frente" },
  { value: "dni_dorso", label: "DNI dorso" },
  { value: "reprocann", label: "REPROCANN" },
  { value: "orden_medica", label: "Orden medica" },
  { value: "consentimiento", label: "Consentimiento informado" },
  { value: "ddjj", label: "Declaracion jurada (DDJJ)" },
]

export default function NuevoPacientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFiles(prev => [...prev, { file, docType: "", preview: file.name }])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function updateDocType(idx: number, docType: string) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, docType } : f))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("No autenticado"); setLoading(false); return }

    // Crear paciente
    const payload = {
      full_name: form.get("full_name") as string,
      dni: form.get("dni") as string,
      birth_date: form.get("birth_date") || null,
      phone: form.get("phone") || null,
      email: form.get("email") || null,
      address: form.get("address") || null,
      reprocann_ref: form.get("reprocann_ref") || null,
      reprocann_expiry: form.get("reprocann_expiry") || null,
      internal_notes: form.get("internal_notes") || null,
      created_by: user.id,
    }

    const { data: patient, error: insertError } = await supabase.from("patients").insert(payload).select("id").single()
    if (insertError) {
      setError(insertError.code === "23505" ? "Ya existe un paciente con ese DNI." : insertError.message)
      setLoading(false)
      return
    }

    // Subir archivos si hay
    for (const item of files) {
      if (!item.docType) continue
      const ext = item.file.name.split(".").pop()
      const path = `${patient.id}/${item.docType}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("patient-documents").upload(path, item.file)
      if (uploadError) continue

      // Obtener doc_type_id
      const { data: docType } = await supabase.from("patient_document_types").select("id").eq("slug", item.docType).single()
      if (!docType) continue

      await supabase.from("patient_documents").update({
        file_path: path,
        file_name: item.file.name,
        file_size_bytes: item.file.size,
        status: "pendiente_revision",
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      }).eq("patient_id", patient.id).eq("doc_type_id", docType.id)
    }

    router.push(`/pacientes/${patient.id}`)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <BackButton label="Volver a pacientes" />
        <PageHeader title="Nuevo paciente" description="Completa los datos basicos. El legajo documental se crea automaticamente." />
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos personales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label-ong">Nombre y apellido *</label><input name="full_name" required className="input-ong" placeholder="Apellido, Nombre" /></div>
              <div><label className="label-ong">DNI *</label><input name="dni" required className="input-ong font-mono" placeholder="00000000" /></div>
              <div><label className="label-ong">Fecha de nacimiento</label><input name="birth_date" type="date" className="input-ong" /></div>
              <div><label className="label-ong">Telefono</label><input name="phone" type="tel" className="input-ong" /></div>
              <div><label className="label-ong">Email</label><input name="email" type="email" className="input-ong" /></div>
              <div className="col-span-2"><label className="label-ong">Direccion</label><input name="address" className="input-ong" /></div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">REPROCANN</h2>
            <p className="text-xs text-slate-500 mb-3">Si el paciente aun no tiene REPROCANN, deja estos campos vacios.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-ong">Numero / referencia</label><input name="reprocann_ref" className="input-ong font-mono" /></div>
              <div><label className="label-ong">Fecha de vencimiento</label><input name="reprocann_expiry" type="date" className="input-ong" /></div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Documentacion (opcional)</h2>
            <p className="text-xs text-slate-500 mb-3">Podes subir documentos ahora o hacerlo despues desde la ficha del paciente.</p>
            <div className="space-y-2">
              {files.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 truncate flex-1">{item.preview}</span>
                  <select
                    value={item.docType}
                    onChange={e => updateDocType(idx, e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="">Tipo de documento...</option>
                    {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                  </select>
                  <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={addFile} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-md px-4 py-3 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Agregar archivo (PDF, JPG, PNG)
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notas internas</h2>
            <textarea name="internal_notes" rows={3} className="input-ong resize-none" placeholder="Observaciones internas..." />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Link href="/pacientes"><Button variant="secondary" type="button">Cancelar</Button></Link>
            <Button type="submit" loading={loading}>Crear paciente</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\pacientes\nuevo\page.tsx" -Value $content
Write-Host "[OK] Nuevo paciente con archivos" -ForegroundColor Green

Write-Host ""
Write-Host "=== Mejoras aplicadas correctamente ===" -ForegroundColor Cyan
Write-Host "Ejecuta: npx next dev" -ForegroundColor Yellow
