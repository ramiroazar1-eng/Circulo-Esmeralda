# Setup ONG Cannabis - Parte 3: Paginas faltantes
Write-Host "=== Creando paginas faltantes ===" -ForegroundColor Cyan

# ── src\app\documentacion-ong\page.tsx ──────────────────────
New-Item -ItemType Directory -Force -Path "src\app\documentacion-ong" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Building2, CheckCircle2, AlertTriangle, Clock, Upload } from "lucide-react"
import { PageHeader, Card, DocumentStatusBadge, SectionHeader, EmptyState, Button, StatCard } from "@/components/ui"
import { formatDate } from "@/lib/utils"

const ORG_DOC_TYPE_LABELS: Record<string, string> = {
  estatuto: "Constitucion / Estatuto", acta: "Actas", autoridades: "Autoridades",
  afip_cuit: "AFIP / CUIT", igj: "IGJ / Personeria", habilitacion: "Habilitaciones",
  convenio: "Convenios", inmueble: "Inmueble", protocolo: "Protocolos internos",
  politica: "Politicas internas", otro: "Otros"
}

export default async function DocumentacionONGPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: docs } = await supabase.from("org_documents").select("*").order("is_mandatory", { ascending: false }).order("doc_type").order("name")
  const allDocs = (docs ?? []) as any[]
  const total = allDocs.length
  const aprobados = allDocs.filter(d => d.status === "aprobado").length
  const faltantes = allDocs.filter(d => d.status === "faltante").length
  const pendientes = allDocs.filter(d => d.status === "pendiente_revision").length
  const obligatoriosFaltantes = allDocs.filter(d => d.is_mandatory && d.status === "faltante").length
  const grouped = allDocs.reduce<Record<string, any[]>>((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = []
    acc[doc.doc_type].push(doc)
    return acc
  }, {})
  return (
    <div className="space-y-5">
      <PageHeader title="Documentacion institucional" description="Checklist y repositorio de documentacion legal y regulatoria de la ONG" />
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total documentos" value={total} icon={Building2} />
        <StatCard label="Aprobados" value={aprobados} variant={aprobados === total && total > 0 ? "ok" : "default"} icon={CheckCircle2} />
        <StatCard label="Pendientes de revision" value={pendientes} variant={pendientes > 0 ? "atencion" : "default"} icon={Clock} />
        <StatCard label="Faltantes obligatorios" value={obligatoriosFaltantes} variant={obligatoriosFaltantes > 0 ? "critico" : "ok"} icon={AlertTriangle} />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Completitud documental</p>
          <p className="text-sm font-semibold text-slate-900">{total > 0 ? Math.round((aprobados / total) * 100) : 0}%</p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all ${aprobados === total && total > 0 ? "bg-green-500" : aprobados / total > 0.7 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${total > 0 ? (aprobados / total) * 100 : 0}%` }} />
        </div>
        {obligatoriosFaltantes > 0 && <p className="text-xs text-red-600 mt-2">Atencion: {obligatoriosFaltantes} documento{obligatoriosFaltantes > 1 ? "s" : ""} obligatorio{obligatoriosFaltantes > 1 ? "s" : ""} faltante{obligatoriosFaltantes > 1 ? "s" : ""}</p>}
      </Card>
      {Object.entries(grouped).map(([type, typeDocs]) => (
        <Card key={type} padding={false}>
          <div className="px-5 pt-5 pb-4"><SectionHeader title={ORG_DOC_TYPE_LABELS[type] ?? type} /></div>
          <div className="divide-y divide-slate-100">
            {(typeDocs as any[]).map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${doc.status === "aprobado" ? "bg-green-500" : doc.status === "pendiente_revision" ? "bg-amber-500" : doc.status === "observado" ? "bg-orange-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                    {doc.is_mandatory && <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">Obligatorio</span>}
                  </div>
                  {doc.description && <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>}
                  {doc.observations && <p className="text-xs text-orange-600 mt-0.5">Obs: {doc.observations}</p>}
                  {doc.file_name && <p className="text-xs text-slate-400 mt-0.5">Archivo: {doc.file_name}{doc.uploaded_at ? ` · Subido ${formatDate(doc.uploaded_at)}` : ""}</p>}
                </div>
                <DocumentStatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </Card>
      ))}
      {allDocs.length === 0 && <EmptyState title="Sin documentos cargados" icon={Building2} />}
    </div>
  )
}
'@
Set-Content -Path "src\app\documentacion-ong\page.tsx" -Value $content
Write-Host "[OK] Documentacion ONG" -ForegroundColor Green

# ── src\app\dispensas\page.tsx ───────────────────────────────
New-Item -ItemType Directory -Force -Path "src\app\dispensas" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PageHeader, Card, Table, EmptyState } from "@/components/ui"
import { formatDateTime, formatGrams } from "@/lib/utils"
import NewDispenseModal from "./NewDispenseModal"

export default async function DispensasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: dispenses } = await supabase.from("dispenses").select("id, dispensed_at, grams, product_desc, observations, patient:patients(id, full_name, dni), lot:lots(lot_code), performed_by_profile:profiles(full_name)").order("dispensed_at", { ascending: false }).limit(50)
  const { data: patients } = await supabase.from("patients").select("id, full_name, dni").eq("status", "activo").is("deleted_at", null).order("full_name")
  const { data: lots } = await supabase.from("v_stock_available").select("lot_id, lot_code, available_grams, genetic_name")
  return (
    <div className="space-y-5">
      <PageHeader title="Dispensas" description="Registro de todas las dispensas realizadas" actions={<NewDispenseModal patients={patients ?? []} lots={lots ?? []} />} />
      <Card padding={false}>
        {(!dispenses || dispenses.length === 0) ? <EmptyState title="Sin dispensas registradas" description="Registra la primera dispensa con el boton de arriba." /> : (
          <Table>
            <thead><tr><th>Fecha y hora</th><th>Paciente</th><th>DNI</th><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Registrado por</th></tr></thead>
            <tbody>
              {dispenses.map((d: any) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap">{formatDateTime(d.dispensed_at)}</td>
                  <td><Link href={`/pacientes/${d.patient?.id}`} className="font-medium text-slate-900 hover:underline">{d.patient?.full_name ?? "—"}</Link></td>
                  <td className="font-mono text-xs">{d.patient?.dni ?? "—"}</td>
                  <td>{d.product_desc}</td>
                  <td className="font-mono text-xs">{d.lot?.lot_code ?? "—"}</td>
                  <td className="font-medium tabular-nums">{formatGrams(d.grams)}</td>
                  <td className="text-slate-500">{d.performed_by_profile?.full_name ?? "—"}</td>
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
Set-Content -Path "src\app\dispensas\page.tsx" -Value $content
Write-Host "[OK] Dispensas page" -ForegroundColor Green

$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"
import { formatGrams } from "@/lib/utils"

interface Patient { id: string; full_name: string; dni: string }
interface LotOption { lot_id: string; lot_code: string; available_grams: number; genetic_name: string | null }

export default function NewDispenseModal({ patients, lots }: { patients: Patient[]; lots: LotOption[] }) {
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
    const grams = parseFloat(form.get("grams") as string)
    const lotId = form.get("lot_id") as string
    const lot = lots.find(l => l.lot_id === lotId)
    if (lot && grams > lot.available_grams) { setError(`Stock insuficiente. Disponible: ${formatGrams(lot.available_grams)}`); setLoading(false); return }
    const { error: insertError } = await supabase.from("dispenses").insert({ patient_id: form.get("patient_id"), lot_id: lotId, grams, product_desc: form.get("product_desc") || "flor seca", observations: form.get("observations") || null, dispensed_at: form.get("dispensed_at") || new Date().toISOString(), performed_by: user.id })
    if (insertError) { setError(insertError.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Registrar dispensa</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Registrar dispensa</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Paciente *</label><select name="patient_id" required className="input-ong"><option value="">Selecciona un paciente...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.dni})</option>)}</select></div>
            <div><label className="label-ong">Lote origen *</label><select name="lot_id" required className="input-ong"><option value="">Selecciona un lote...</option>{lots.map(l => <option key={l.lot_id} value={l.lot_id}>{l.lot_code} — {l.genetic_name ?? "Sin genetica"} — Stock: {formatGrams(l.available_grams)}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Cantidad (gramos) *</label><input name="grams" type="number" step="0.1" min="0.1" required className="input-ong font-mono" placeholder="0.0" /></div>
              <div><label className="label-ong">Producto</label><input name="product_desc" className="input-ong" defaultValue="flor seca" /></div>
            </div>
            <div><label className="label-ong">Fecha y hora</label><input name="dispensed_at" type="datetime-local" className="input-ong" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
            <div><label className="label-ong">Observaciones</label><textarea name="observations" rows={2} className="input-ong resize-none" placeholder="Opcional..." /></div>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" loading={loading}>Registrar</Button></div>
          </form>
        </div>
      </div>
    </>
  )
}
'@
Set-Content -Path "src\app\dispensas\NewDispenseModal.tsx" -Value $content
Write-Host "[OK] NewDispenseModal" -ForegroundColor Green

# ── src\app\membresias\page.tsx ──────────────────────────────
New-Item -ItemType Directory -Force -Path "src\app\membresias" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { formatARS, formatDate, MONTH_LABELS } from "@/lib/utils"
import type { CurrentMembership } from "@/types"
import PaymentToggle from "./PaymentToggle"

export default async function MembresiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { data: memberships } = await supabase.from("v_current_memberships").select("*")
  const list = (memberships ?? []) as CurrentMembership[]
  const pagados = list.filter(m => m.payment_status === "pagado").length
  const pendientes = list.filter(m => m.payment_status === "pendiente" || m.payment_status == null).length
  const vencidos = list.filter(m => m.payment_status === "vencido").length
  const totalRecaudado = list.filter(m => m.payment_status === "pagado").reduce((acc, m) => acc + (m.monthly_amount ?? 0), 0)
  return (
    <div className="space-y-5">
      <PageHeader title={`Membresias — ${MONTH_LABELS[month]} ${year}`} description="Estado de pagos del mes en curso" />
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Pagados" value={pagados} variant={pagados > 0 ? "ok" : "default"} />
        <StatCard label="Pendientes" value={pendientes} variant={pendientes > 0 ? "atencion" : "ok"} />
        <StatCard label="Vencidos" value={vencidos} variant={vencidos > 0 ? "critico" : "ok"} />
        <StatCard label="Recaudado" value={formatARS(totalRecaudado)} />
      </div>
      <Card padding={false}>
        {list.length === 0 ? <EmptyState title="Sin pacientes activos" /> : (
          <Table>
            <thead><tr><th>Paciente</th><th>Plan</th><th>Monto</th><th>Estado de pago</th><th>Fecha de pago</th><th>Accion</th></tr></thead>
            <tbody>
              {list.map(m => (
                <tr key={m.patient_id}>
                  <td className="font-medium text-slate-900">{m.full_name}</td>
                  <td>{m.plan_name ?? <span className="text-slate-400">Sin plan</span>}</td>
                  <td className="tabular-nums">{m.monthly_amount ? formatARS(m.monthly_amount) : "—"}</td>
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border font-medium ${m.payment_status === "pagado" ? "bg-green-50 text-green-700 border-green-200" : m.payment_status === "vencido" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{m.payment_status === "pagado" ? "Pagado" : m.payment_status === "vencido" ? "Vencido" : "Pendiente"}</span></td>
                  <td>{m.paid_at ? formatDate(m.paid_at) : <span className="text-slate-400">—</span>}</td>
                  <td>{m.payment_status !== "pagado" && <PaymentToggle patientId={m.patient_id} year={year} month={month} amount={m.monthly_amount} />}</td>
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
Set-Content -Path "src\app\membresias\page.tsx" -Value $content
Write-Host "[OK] Membresias page" -ForegroundColor Green

$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui"
import { CheckCircle2 } from "lucide-react"

export default function PaymentToggle({ patientId, year, month, amount }: { patientId: string; year: number; month: number; amount: number | null }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  async function markPaid() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: patient } = await supabase.from("patients").select("membership_plan_id").eq("id", patientId).single()
    if (!patient?.membership_plan_id) { alert("El paciente no tiene un plan asignado."); setLoading(false); return }
    await supabase.from("membership_periods").upsert({ patient_id: patientId, plan_id: patient.membership_plan_id, period_year: year, period_month: month, amount: amount ?? 0, payment_status: "pagado", paid_at: new Date().toISOString(), registered_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "patient_id,period_year,period_month" })
    setLoading(false)
    router.refresh()
  }
  return <Button variant="secondary" size="sm" loading={loading} onClick={markPaid}>{!loading && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}Marcar pagado</Button>
}
'@
Set-Content -Path "src\app\membresias\PaymentToggle.tsx" -Value $content
Write-Host "[OK] PaymentToggle" -ForegroundColor Green

# ── src\app\trazabilidad\page.tsx ────────────────────────────
New-Item -ItemType Directory -Force -Path "src\app\trazabilidad" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard, Badge } from "@/components/ui"
import { formatDate, formatGrams } from "@/lib/utils"
import { Package, FlaskConical } from "lucide-react"

export default async function TrazabilidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: lots } = await supabase.from("lots").select("*, genetic:genetics(name), room:rooms(name), stock_position:stock_positions(available_grams)").order("created_at", { ascending: false })
  const { data: stockData } = await supabase.from("stock_positions").select("available_grams")
  const totalStock = (stockData ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const lotsList = (lots ?? []) as any[]
  const enProceso = lotsList.filter(l => l.status === "en_proceso").length
  const finalizados = lotsList.filter(l => l.status === "finalizado").length

  return (
    <div className="space-y-5">
      <PageHeader title="Trazabilidad" description="Lotes de produccion y movimientos de stock" />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Lotes en proceso" value={enProceso} icon={FlaskConical} />
        <StatCard label="Lotes finalizados" value={finalizados} icon={Package} />
        <StatCard label="Stock total disponible" value={formatGrams(totalStock)} />
      </div>
      <Card padding={false}>
        {lotsList.length === 0 ? <EmptyState title="Sin lotes registrados" description="Los lotes de produccion apareceran aqui." icon={FlaskConical} /> : (
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
Write-Host "[OK] Trazabilidad" -ForegroundColor Green

# ── Paginas placeholder para rutas faltantes ─────────────────
New-Item -ItemType Directory -Force -Path "src\app\usuarios" | Out-Null
$content = @'
import { PageHeader, Card } from "@/components/ui"
export default function UsuariosPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Usuarios" description="Gestion de usuarios y roles del sistema" />
      <Card><p className="text-sm text-slate-500">Modulo en construccion. Proxima version.</p></Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\usuarios\page.tsx" -Value $content

New-Item -ItemType Directory -Force -Path "src\app\configuracion" | Out-Null
$content = @'
import { PageHeader, Card } from "@/components/ui"
export default function ConfiguracionPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Configuracion" description="Parametros del sistema" />
      <Card><p className="text-sm text-slate-500">Modulo en construccion. Proxima version.</p></Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\configuracion\page.tsx" -Value $content
Write-Host "[OK] Usuarios y Configuracion" -ForegroundColor Green

Write-Host ""
Write-Host "=== Todas las paginas creadas ===" -ForegroundColor Cyan
Write-Host "Ejecuta: npx next dev" -ForegroundColor Yellow
