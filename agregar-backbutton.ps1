# Agregar BackButton a todas las paginas
Write-Host "=== Agregando boton Atras a todas las paginas ===" -ForegroundColor Cyan

# ── Pacientes list ───────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { UserPlus, Search } from "lucide-react"
import { PageHeader, Table, ComplianceBadge, ReprocannBadge, PatientStatusBadge, EmptyState, Button, Card } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate, daysUntil } from "@/lib/utils"

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ estado?: string; compliance?: string; q?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const params = await searchParams
  const { estado, compliance, q } = params
  let query = supabase.from("patients").select("id, full_name, dni, status, compliance_status, reprocann_status, reprocann_expiry, created_at, treating_physician:profiles!patients_treating_physician_id_fkey(full_name), membership_plan:membership_plans(name)").is("deleted_at", null).order("full_name")
  if (q) query = query.or(`full_name.ilike.%${q}%,dni.ilike.%${q}%`)
  if (estado) query = query.eq("status", estado)
  if (compliance) query = query.eq("compliance_status", compliance)
  const { data: patients } = await query
  const list = (patients ?? []) as any[]

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Pacientes" description={`${list.length} paciente${list.length !== 1 ? "s" : ""} encontrado${list.length !== 1 ? "s" : ""}`} actions={<Link href="/pacientes/nuevo"><Button size="sm"><UserPlus className="w-3.5 h-3.5" />Nuevo paciente</Button></Link>} />
      <div className="flex items-center gap-3 flex-wrap">
        <form className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Buscar por nombre o DNI..." className="input-ong pl-9 py-1.5 text-xs" />
          </div>
          <select name="estado" defaultValue={estado ?? ""} className="input-ong w-auto py-1.5 text-xs">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="pendiente_documental">Pendiente documental</option>
            <option value="suspendido">Suspendido</option>
            <option value="inactivo">Inactivo</option>
            <option value="baja">Baja</option>
          </select>
          <select name="compliance" defaultValue={compliance ?? ""} className="input-ong w-auto py-1.5 text-xs">
            <option value="">Todo compliance</option>
            <option value="critico">Critico</option>
            <option value="atencion">Atencion</option>
            <option value="ok">En regla</option>
          </select>
          <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
        </form>
      </div>
      <Card padding={false}>
        {list.length === 0 ? (
          <EmptyState title="Sin pacientes" description="No hay pacientes que coincidan con los filtros." icon={UserPlus} action={<Link href="/pacientes/nuevo"><Button size="sm">Agregar primer paciente</Button></Link>} />
        ) : (
          <Table>
            <thead><tr><th>Paciente</th><th>DNI</th><th>Estado</th><th>Compliance</th><th>REPROCANN</th><th>Vencimiento</th><th>Alta</th></tr></thead>
            <tbody>
              {list.map((p: any) => {
                const days = daysUntil(p.reprocann_expiry)
                return (
                  <tr key={p.id}>
                    <td><Link href={`/pacientes/${p.id}`} className="font-medium text-slate-900 hover:text-slate-700 hover:underline">{p.full_name}</Link>{p.treating_physician?.full_name && <p className="text-xs text-slate-400">{p.treating_physician.full_name}</p>}</td>
                    <td className="font-mono text-xs">{p.dni}</td>
                    <td><PatientStatusBadge status={p.status} /></td>
                    <td><ComplianceBadge status={p.compliance_status} /></td>
                    <td><ReprocannBadge status={p.reprocann_status} /></td>
                    <td>{p.reprocann_expiry ? <span className={days !== null && days < 0 ? "text-red-600 font-medium" : days !== null && days <= 30 ? "text-amber-600" : "text-slate-600"}>{formatDate(p.reprocann_expiry)}{days !== null && days >= 0 && days <= 30 && <span className="text-xs ml-1 text-amber-500">({days}d)</span>}</span> : <span className="text-slate-400">—</span>}</td>
                    <td className="text-slate-500">{formatDate(p.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\pacientes\page.tsx" -Value $content
Write-Host "[OK] Pacientes list con BackButton" -ForegroundColor Green

# ── Documentacion ONG ────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Building2, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { PageHeader, Card, DocumentStatusBadge, SectionHeader, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
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
  const pendientes = allDocs.filter(d => d.status === "pendiente_revision").length
  const obligatoriosFaltantes = allDocs.filter(d => d.is_mandatory && d.status === "faltante").length
  const grouped = allDocs.reduce<Record<string, any[]>>((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = []
    acc[doc.doc_type].push(doc)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
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
Write-Host "[OK] Documentacion ONG con BackButton" -ForegroundColor Green

# ── Trazabilidad ─────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
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
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Trazabilidad" description="Lotes de produccion y movimientos de stock" actions={canCreate ? <NewLotModal genetics={genetics ?? []} rooms={rooms ?? []} /> : undefined} />
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
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border ${lot.status === "finalizado" ? "bg-green-50 text-green-700 border-green-200" : lot.status === "en_proceso" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{lot.status === "en_proceso" ? "En proceso" : lot.status === "finalizado" ? "Finalizado" : "Descartado"}</span></td>
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
Write-Host "[OK] Trazabilidad con BackButton" -ForegroundColor Green

# ── Dispensas ────────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PageHeader, Card, Table, EmptyState } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
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
      <BackButton label="Volver al dashboard" />
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
Write-Host "[OK] Dispensas con BackButton" -ForegroundColor Green

# ── Membresias ───────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
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
      <BackButton label="Volver al dashboard" />
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
Write-Host "[OK] Membresias con BackButton" -ForegroundColor Green

# ── Bitacora ─────────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, EmptyState } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate } from "@/lib/utils"
import type { LogCategory } from "@/types"
import NewLogEntry from "./NewLogEntry"

const CAT_LABELS: Record<LogCategory, string> = { operativo: "Operativo", incidencia: "Incidencia", trazabilidad: "Trazabilidad", documental: "Documental", administrativo: "Administrativo", otro: "Otro" }

export default async function BitacoraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: entries } = await supabase.from("daily_log_entries").select("id, entry_date, title, body, category, is_incident, created_at, created_by_profile:profiles(full_name), patient:patients(id, full_name), lot:lots(lot_code)").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(60)

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Bitacora" description="Registro diario de actividad y novedades" actions={<NewLogEntry />} />
      <Card padding={false}>
        {(!entries || entries.length === 0) ? <EmptyState title="Sin entradas en la bitacora" /> : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry: any) => (
              <div key={entry.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.is_incident ? "bg-red-500" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-slate-900">{entry.title}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">{CAT_LABELS[entry.category as LogCategory]}</span>
                      {entry.is_incident && <span className="text-xs bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">Incidencia</span>}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{entry.body}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-slate-400">{formatDate(entry.entry_date)}</span>
                      <span className="text-xs text-slate-400">por {entry.created_by_profile?.full_name ?? "—"}</span>
                      {entry.patient && <span className="text-xs text-slate-400">Paciente: {entry.patient.full_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\bitacora\page.tsx" -Value $content
Write-Host "[OK] Bitacora con BackButton" -ForegroundColor Green

# ── Auditoria ────────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDateTime } from "@/lib/utils"

export default async function AuditoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")
  const { data: logs } = await supabase.from("audit_logs").select("*, performed_by_profile:profiles(full_name)").order("performed_at", { ascending: false }).limit(100)

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Auditoria" description="Historial completo de acciones registradas en el sistema" />
      <Card padding={false}>
        {(!logs || logs.length === 0) ? <EmptyState title="Sin registros de auditoria" /> : (
          <Table>
            <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Accion</th><th>Entidad</th><th>Registro</th></tr></thead>
            <tbody>{logs.map((log: any) => (
              <tr key={log.id}>
                <td className="text-slate-500 whitespace-nowrap">{formatDateTime(log.performed_at)}</td>
                <td className="font-medium">{log.performed_by_profile?.full_name ?? "—"}</td>
                <td><span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">{log.action}</span></td>
                <td className="text-slate-500">{log.entity_type}</td>
                <td className="text-slate-700">{log.entity_label ?? "—"}</td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\auditoria\page.tsx" -Value $content
Write-Host "[OK] Auditoria con BackButton" -ForegroundColor Green

# ── Usuarios ─────────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate } from "@/lib/utils"
import { Users } from "lucide-react"
import NewUserModal from "./NewUserModal"

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")
  const { data: users } = await supabase.from("profiles").select("*").order("full_name")
  const list = (users ?? []) as any[]
  const activos = list.filter(u => u.is_active).length
  const ROLE_LABELS: Record<string, string> = { admin: "Administrador", administrativo: "Administrativo", medico: "Medico", biologo: "Biologo", paciente: "Paciente" }

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Usuarios" description="Gestion de usuarios y roles del sistema" actions={<NewUserModal />} />
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
                  <td><span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border ${u.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{u.is_active ? "Activo" : "Inactivo"}</span></td>
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
Write-Host "[OK] Usuarios con BackButton" -ForegroundColor Green

# ── Configuracion ────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
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
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Configuracion" description="Planes de membresia y parametros del sistema" />
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Planes de membresia" actions={<NewPlanModal />} /></div>
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
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border ${plan.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{plan.is_active ? "Activo" : "Inactivo"}</span></td>
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
Write-Host "[OK] Configuracion con BackButton" -ForegroundColor Green

Write-Host ""
Write-Host "=== BackButton agregado a todas las paginas ===" -ForegroundColor Cyan
Write-Host "Ejecuta: npx next dev" -ForegroundColor Yellow
