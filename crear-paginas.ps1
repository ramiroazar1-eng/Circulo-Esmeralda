# Setup ONG Cannabis - Parte 2: Paginas
Write-Host "=== Creando paginas del sistema ===" -ForegroundColor Cyan

# ── src\components\layout\Sidebar.tsx ───────────────────────
Set-Content -Path "src\components\layout\Sidebar.tsx" -Encoding UTF8 -Value @'
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"
import { LayoutDashboard, Users, FileText, Building2, FlaskConical, Package, Pill, CreditCard, BookOpen, Shield, Settings, LogOut, UserCog, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","administrativo"] },
  { href: "/pacientes", label: "Pacientes", icon: Users, roles: ["admin","administrativo","medico"] },
  { href: "/documentacion-ong", label: "Documentacion ONG", icon: Building2, roles: ["admin","administrativo"] },
  { href: "/trazabilidad", label: "Trazabilidad", icon: FlaskConical, roles: ["admin","administrativo","biologo"] },
  { href: "/dispensas", label: "Dispensas", icon: Pill, roles: ["admin","administrativo"] },
  { href: "/membresias", label: "Membresias", icon: CreditCard, roles: ["admin","administrativo"] },
  { href: "/bitacora", label: "Bitacora", icon: BookOpen, roles: ["admin","administrativo","medico","biologo"] },
]
const ADMIN_ITEMS = [
  { href: "/auditoria", label: "Auditoria", icon: Shield, roles: ["admin"] },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, roles: ["admin"] },
  { href: "/configuracion", label: "Configuracion", icon: Settings, roles: ["admin"] },
]

export function Sidebar({ role, userName }: { role: UserRole; userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(role))
  const visibleAdmin = ADMIN_ITEMS.filter(item => item.roles.includes(role))
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-slate-200 flex flex-col z-10">
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Cannabis Medicinal</p>
            <p className="text-xs text-slate-400 truncate">Sistema interno</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href} className={cn("nav-item", isActive && "active")}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-60" />}
            </Link>
          )
        })}
        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3"><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Administracion</p></div>
            {visibleAdmin.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className={cn("nav-item", isActive && "active")}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>
      <div className="px-2 py-3 border-t border-slate-200 space-y-0.5">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-slate-900 truncate">{userName}</p>
          <p className="text-xs text-slate-400 capitalize">{role}</p>
        </div>
        <button onClick={handleLogout} className="nav-item w-full text-left text-slate-500 hover:text-red-600 hover:bg-red-50">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  )
}
'@
Write-Host "[OK] Sidebar" -ForegroundColor Green

# ── src\app\login\page.tsx ───────────────────────────────────
Set-Content -Path "src\app\login\page.tsx" -Encoding UTF8 -Value @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Lock, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Credenciales incorrectas. Verificá tu email y contraseña."); setLoading(false); return }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-4">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Sistema interno</h1>
          <p className="text-sm text-slate-500 mt-1">Acceso exclusivo para el equipo</p>
        </div>
        <div className="card-ong p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label-ong">Email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-ong" placeholder="usuario@ong.org.ar" disabled={loading} />
            </div>
            <div>
              <label htmlFor="password" className="label-ong">Contrasena</label>
              <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-ong" placeholder="••••••••" disabled={loading} />
            </div>
            {error && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : "Ingresar"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">Si no podés ingresar, contactá al administrador.</p>
      </div>
    </div>
  )
}
'@
Write-Host "[OK] Login" -ForegroundColor Green

# ── src\app\dashboard\layout.tsx ────────────────────────────
Set-Content -Path "src\app\dashboard\layout.tsx" -Encoding UTF8 -Value @'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/Sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || !profile.is_active) redirect("/login")
  return (
    <div className="min-h-screen flex">
      <Sidebar role={profile.role} userName={profile.full_name} />
      <main className="flex-1 ml-56 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  )
}
'@
Write-Host "[OK] Dashboard layout" -ForegroundColor Green

# ── src\app\dashboard\page.tsx ───────────────────────────────
Set-Content -Path "src\app\dashboard\page.tsx" -Encoding UTF8 -Value @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, AlertTriangle, CheckCircle2, Clock, FileX, Building2, Pill, CreditCard, ArrowRight } from "lucide-react"
import { StatCard, Card, SectionHeader, ComplianceBadge, ReprocannBadge, PaymentStatusBadge, EmptyState } from "@/components/ui"
import { formatDate, formatGrams, daysUntil } from "@/lib/utils"
import type { PatientAlert, ComplianceSummary, CurrentMembership } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: complianceRaw } = await supabase.from("v_compliance_summary").select("*").single()
  const compliance = complianceRaw as ComplianceSummary | null
  const { data: alertsRaw } = await supabase.from("v_patient_alerts").select("*").limit(10)
  const alerts = (alertsRaw ?? []) as PatientAlert[]
  const { data: orgDocs } = await supabase.from("org_documents").select("id, name, status, is_mandatory").in("status", ["faltante","pendiente_revision","observado"]).order("is_mandatory", { ascending: false }).limit(8)
  const { data: membershipsRaw } = await supabase.from("v_current_memberships").select("*").in("payment_status", ["pendiente","vencido"]).limit(8)
  const memberships = (membershipsRaw ?? []) as CurrentMembership[]
  const { data: recentDispenses } = await supabase.from("dispenses").select("id, dispensed_at, grams, patient:patients(full_name), lot:lots(lot_code)").order("dispensed_at", { ascending: false }).limit(5)
  const { data: stockData } = await supabase.from("stock_positions").select("available_grams")
  const totalStock = (stockData ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const { data: recentLog } = await supabase.from("daily_log_entries").select("id, entry_date, title, category, is_incident, created_by_profile:profiles(full_name)").order("created_at", { ascending: false }).limit(4)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Panel de control</h1>
        <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pacientes activos" value={compliance?.total_activos ?? 0} icon={Users} />
        <StatCard label="En regla" value={compliance?.en_regla ?? 0} variant="ok" icon={CheckCircle2} />
        <StatCard label="Requieren atencion" value={compliance?.en_atencion ?? 0} variant="atencion" icon={Clock} />
        <StatCard label="Estado critico" value={compliance?.criticos ?? 0} variant="critico" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="REPROCANN vencido" value={compliance?.reprocann_vencido ?? 0} variant={(compliance?.reprocann_vencido ?? 0) > 0 ? "critico" : "ok"} icon={FileX} />
        <StatCard label="REPROCANN proximo" value={compliance?.reprocann_proximo ?? 0} variant={(compliance?.reprocann_proximo ?? 0) > 0 ? "atencion" : "ok"} icon={Clock} />
        <StatCard label="Stock disponible" value={formatGrams(totalStock)} icon={Pill} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Alertas de pacientes" actions={<Link href="/pacientes" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          {alerts.length === 0 ? (
            <div className="px-5 pb-5"><EmptyState title="Sin alertas activas" description="Todos los pacientes estan en regla" icon={CheckCircle2} /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map(alert => {
                const days = daysUntil(alert.reprocann_expiry)
                return (
                  <Link key={alert.id} href={`/pacientes/${alert.id}`} className="flex items-start justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium text-slate-900 truncate">{alert.full_name}</p>
                      <p className="text-xs text-slate-500">DNI {alert.dni}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {alert.docs_criticos > 0 && <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">{alert.docs_criticos} doc. faltante{alert.docs_criticos > 1 ? "s" : ""}</span>}
                        {days !== null && days <= 30 && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">REPROCANN {days < 0 ? "VENCIDO" : `vence en ${days}d`}</span>}
                      </div>
                    </div>
                    <ComplianceBadge status={alert.compliance_status} />
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Documentacion ONG" actions={<Link href="/documentacion-ong" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver checklist <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          {(!orgDocs || orgDocs.length === 0) ? (
            <div className="px-5 pb-5"><EmptyState title="Documentacion institucional completa" icon={Building2} /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orgDocs.map((doc: any) => (
                <Link key={doc.id} href="/documentacion-ong" className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm text-slate-800 truncate">{doc.name}</p>
                    {doc.is_mandatory && <p className="text-xs text-slate-400">Obligatorio</p>}
                  </div>
                  <span className={`text-xs rounded px-1.5 py-0.5 border whitespace-nowrap ${doc.status === "faltante" ? "bg-red-50 text-red-700 border-red-200" : doc.status === "pendiente_revision" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                    {doc.status === "faltante" ? "Faltante" : doc.status === "pendiente_revision" ? "Pendiente" : "Observado"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title={`Membresias ${new Date().toLocaleDateString("es-AR", { month: "long" })}`} actions={<Link href="/membresias" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todas <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          {memberships.length === 0 ? <div className="px-5 pb-5"><EmptyState title="Sin pagos pendientes" icon={CreditCard} /></div> : (
            <div className="divide-y divide-slate-100">
              {memberships.map(m => (
                <Link key={m.patient_id} href={`/pacientes/${m.patient_id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.full_name}</p>
                    <p className="text-xs text-slate-500">{m.plan_name ?? "Sin plan asignado"}</p>
                  </div>
                  <PaymentStatusBadge status={m.payment_status ?? "pendiente"} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Dispensas recientes" actions={<Link href="/dispensas" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todas <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          {(!recentDispenses || recentDispenses.length === 0) ? <div className="px-5 pb-5"><EmptyState title="Sin dispensas registradas" icon={Pill} /></div> : (
            <div className="divide-y divide-slate-100">
              {recentDispenses.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.patient?.full_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">Lote {d.lot?.lot_code ?? "—"} · {formatDate(d.dispensed_at)}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700 tabular-nums">{formatGrams(d.grams)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {recentLog && recentLog.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Bitacora reciente" actions={<Link href="/bitacora" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver bitacora <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          <div className="divide-y divide-slate-100">
            {recentLog.map((entry: any) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.is_incident ? "bg-red-500" : "bg-slate-300"}`} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{entry.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(entry.entry_date)} · {(entry as any).created_by_profile?.full_name ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
'@
Write-Host "[OK] Dashboard page" -ForegroundColor Green

# ── src\app\pacientes\page.tsx ───────────────────────────────
Set-Content -Path "src\app\pacientes\page.tsx" -Encoding UTF8 -Value @'
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { UserPlus, Search } from "lucide-react"
import { PageHeader, Table, ComplianceBadge, ReprocannBadge, PatientStatusBadge, EmptyState, Button, Card } from "@/components/ui"
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
Write-Host "[OK] Pacientes list" -ForegroundColor Green

# ── src\app\pacientes\nuevo\page.tsx ─────────────────────────
Set-Content -Path "src\app\pacientes\nuevo\page.tsx" -Encoding UTF8 -Value @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader, Card, Button, Alert } from "@/components/ui"

export default function NuevoPacientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("No autenticado"); setLoading(false); return }
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
    const { data, error: insertError } = await supabase.from("patients").insert(payload).select("id").single()
    if (insertError) {
      setError(insertError.code === "23505" ? "Ya existe un paciente con ese DNI." : insertError.message)
      setLoading(false)
      return
    }
    router.push(`/pacientes/${data.id}`)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link href="/pacientes" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"><ArrowLeft className="w-3 h-3" /> Volver a pacientes</Link>
        <PageHeader title="Nuevo paciente" description="Completá los datos basicos. El legajo documental se crea automaticamente." />
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
            <p className="text-xs text-slate-500 mb-3">Si el paciente aun no tiene REPROCANN, dejá estos campos vacios.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-ong">Numero / referencia</label><input name="reprocann_ref" className="input-ong font-mono" /></div>
              <div><label className="label-ong">Fecha de vencimiento</label><input name="reprocann_expiry" type="date" className="input-ong" /></div>
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
Write-Host "[OK] Nuevo paciente" -ForegroundColor Green

# ── src\app\pacientes\[id]\page.tsx ──────────────────────────
Set-Content -Path "src\app\pacientes\[id]\page.tsx" -Encoding UTF8 -Value @'
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { PageHeader, Card, ComplianceBadge, ReprocannBadge, PatientStatusBadge, DocumentStatusBadge, SectionHeader, Button, Badge } from "@/components/ui"
import { formatDate, formatDateTime, formatGrams, daysUntil } from "@/lib/utils"

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: patient } = await supabase.from("patients").select("*, treating_physician:profiles!patients_treating_physician_id_fkey(id, full_name), membership_plan:membership_plans(id, name, monthly_grams, monthly_amount)").eq("id", id).is("deleted_at", null).single()
  if (!patient) notFound()
  const { data: documents } = await supabase.from("patient_documents").select("*, doc_type:patient_document_types(id, name, slug, is_mandatory, has_expiry, sort_order), uploaded_by_profile:profiles!patient_documents_uploaded_by_fkey(full_name), reviewed_by_profile:profiles!patient_documents_reviewed_by_fkey(full_name)").eq("patient_id", id).order("doc_type(sort_order)")
  const { data: dispenses } = await supabase.from("dispenses").select("id, dispensed_at, grams, product_desc, observations, lot:lots(lot_code), performed_by_profile:profiles(full_name)").eq("patient_id", id).order("dispensed_at", { ascending: false }).limit(20)
  const now = new Date()
  const { data: currentPeriod } = await supabase.from("membership_periods").select("*, plan:membership_plans(name)").eq("patient_id", id).eq("period_year", now.getFullYear()).eq("period_month", now.getMonth() + 1).single()
  const days = daysUntil(patient.reprocann_expiry)
  const totalDispensed = (dispenses ?? []).reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const totalDocs = (documents ?? []).length
  const approvedDocs = (documents ?? []).filter((d: any) => d.status === "aprobado").length
  const missingDocs = (documents ?? []).filter((d: any) => ["faltante","vencido"].includes(d.status)).length

  return (
    <div className="space-y-5">
      <div>
        <Link href="/pacientes" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"><ArrowLeft className="w-3 h-3" /> Volver a pacientes</Link>
        <PageHeader title={patient.full_name} description={`DNI ${patient.dni} · Alta: ${formatDate(patient.created_at)}`} actions={<Link href={`/pacientes/${id}/editar`}><Button variant="secondary" size="sm"><Edit className="w-3.5 h-3.5" />Editar</Button></Link>} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <PatientStatusBadge status={patient.status} />
        <ComplianceBadge status={patient.compliance_status} />
        <ReprocannBadge status={patient.reprocann_status} />
        {patient.membership_plan && <Badge>{patient.membership_plan.name}</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <SectionHeader title="Datos del paciente" />
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Nombre completo</dt><dd className="font-medium text-slate-900">{patient.full_name}</dd></div>
            <div><dt className="text-xs text-slate-500">DNI</dt><dd className="font-mono">{patient.dni}</dd></div>
            {patient.birth_date && <div><dt className="text-xs text-slate-500">Fecha de nacimiento</dt><dd>{formatDate(patient.birth_date)}</dd></div>}
            {patient.phone && <div><dt className="text-xs text-slate-500">Telefono</dt><dd>{patient.phone}</dd></div>}
            {patient.email && <div><dt className="text-xs text-slate-500">Email</dt><dd className="truncate">{patient.email}</dd></div>}
            {patient.address && <div><dt className="text-xs text-slate-500">Direccion</dt><dd>{patient.address}</dd></div>}
            {patient.treating_physician && <div><dt className="text-xs text-slate-500">Medico tratante</dt><dd>{patient.treating_physician.full_name}</dd></div>}
          </dl>
        </Card>
        <Card className="col-span-1">
          <SectionHeader title="REPROCANN" />
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Estado</dt><dd><ReprocannBadge status={patient.reprocann_status} /></dd></div>
            {patient.reprocann_ref && <div><dt className="text-xs text-slate-500">Numero / referencia</dt><dd className="font-mono">{patient.reprocann_ref}</dd></div>}
            {patient.reprocann_expiry && <div><dt className="text-xs text-slate-500">Vencimiento</dt><dd className={days !== null && days < 0 ? "text-red-600 font-medium" : days !== null && days <= 30 ? "text-amber-600" : ""}>{formatDate(patient.reprocann_expiry)}{days !== null && <span className="text-xs ml-1 text-slate-400">({days < 0 ? `vencido hace ${Math.abs(days)}d` : `${days}d restantes`})</span>}</dd></div>}
            {!patient.reprocann_expiry && <div className="text-xs text-slate-400 italic">Sin vinculacion registrada</div>}
          </dl>
          {patient.membership_plan && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <SectionHeader title="Membresia" />
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-500">Plan</dt><dd>{patient.membership_plan.name}</dd></div>
                {patient.membership_plan.monthly_grams && <div><dt className="text-xs text-slate-500">Gramos mensuales</dt><dd>{formatGrams(patient.membership_plan.monthly_grams)}</dd></div>}
                <div><dt className="text-xs text-slate-500">Total dispensado</dt><dd>{formatGrams(totalDispensed)}</dd></div>
              </dl>
            </div>
          )}
        </Card>
        <Card className="col-span-1">
          <SectionHeader title="Estado documental" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-xs text-slate-500">Documentos totales</span><span className="font-medium">{totalDocs}</span></div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-xs text-slate-500">Aprobados</span><span className="font-medium text-green-700">{approvedDocs}</span></div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-xs text-slate-500">Faltantes / vencidos</span><span className={`font-medium ${missingDocs > 0 ? "text-red-600" : "text-slate-700"}`}>{missingDocs}</span></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Completitud</span><span>{totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-2"><div className={`h-2 rounded-full transition-all ${approvedDocs === totalDocs && totalDocs > 0 ? "bg-green-500" : approvedDocs / totalDocs > 0.5 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0}%` }} /></div>
          </div>
          {patient.internal_notes && <div className="mt-5 pt-5 border-t border-slate-100"><p className="text-xs font-medium text-slate-500 mb-1">Notas internas</p><p className="text-sm text-slate-700 whitespace-pre-line">{patient.internal_notes}</p></div>}
        </Card>
      </div>
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Legajo documental" /></div>
        <div className="divide-y divide-slate-100">
          {(documents ?? []).map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${doc.status === "aprobado" ? "bg-green-500" : doc.status === "pendiente_revision" ? "bg-amber-500" : doc.status === "pendiente_vinculacion" ? "bg-slate-300" : doc.status === "observado" ? "bg-orange-500" : "bg-red-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">{doc.doc_type?.name}{doc.doc_type?.is_mandatory && <span className="text-xs text-slate-400 ml-1">· Obligatorio</span>}</p>
                {doc.observations && <p className="text-xs text-orange-600 mt-0.5">{doc.observations}</p>}
              </div>
              {doc.expires_at && <p className="text-xs text-slate-500 shrink-0">Vence: {formatDate(doc.expires_at)}</p>}
              <DocumentStatusBadge status={doc.status} />
            </div>
          ))}
        </div>
      </Card>
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Historial de dispensas" actions={<Link href="/dispensas"><Button size="sm">Registrar dispensa</Button></Link>} /></div>
        {(!dispenses || dispenses.length === 0) ? <div className="pb-5 text-center py-8 text-sm text-slate-400">Sin dispensas registradas</div> : (
          <div className="overflow-x-auto"><table className="table-ong w-full">
            <thead><tr><th>Fecha</th><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Registrado por</th></tr></thead>
            <tbody>{dispenses.map((d: any) => <tr key={d.id}><td>{formatDateTime(d.dispensed_at)}</td><td>{d.product_desc}</td><td className="font-mono text-xs">{d.lot?.lot_code ?? "—"}</td><td className="font-medium tabular-nums">{formatGrams(d.grams)}</td><td className="text-slate-500">{d.performed_by_profile?.full_name ?? "—"}</td></tr>)}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}
'@
Write-Host "[OK] Paciente detalle" -ForegroundColor Green

# ── src\app\bitacora\page.tsx ────────────────────────────────
Set-Content -Path "src\app\bitacora\page.tsx" -Encoding UTF8 -Value @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, EmptyState } from "@/components/ui"
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

Set-Content -Path "src\app\bitacora\NewLogEntry.tsx" -Encoding UTF8 -Value @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

const CATS = [["operativo","Operativo"],["incidencia","Incidencia"],["trazabilidad","Trazabilidad"],["documental","Documental"],["administrativo","Administrativo"],["otro","Otro"]]

export default function NewLogEntry() {
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
    const { error: err } = await supabase.from("daily_log_entries").insert({ entry_date: form.get("entry_date"), category: form.get("category"), title: form.get("title"), body: form.get("body"), is_incident: form.get("is_incident") === "on", created_by: user.id })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nueva entrada</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nueva entrada de bitacora</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Fecha *</label><input name="entry_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="input-ong" /></div>
              <div><label className="label-ong">Categoria *</label><select name="category" required className="input-ong">{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <div><label className="label-ong">Titulo *</label><input name="title" required className="input-ong" placeholder="Resumen breve" /></div>
            <div><label className="label-ong">Detalle *</label><textarea name="body" required rows={4} className="input-ong resize-none" placeholder="Descripcion completa..." /></div>
            <div className="flex items-center gap-2"><input type="checkbox" name="is_incident" id="is_incident" className="w-4 h-4 rounded border-slate-300" /><label htmlFor="is_incident" className="text-sm text-slate-700">Marcar como incidencia</label></div>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" loading={loading}>Guardar</Button></div>
          </form>
        </div>
      </div>
    </>
  )
}
'@
Write-Host "[OK] Bitacora" -ForegroundColor Green

# ── src\app\auditoria\page.tsx ───────────────────────────────
Set-Content -Path "src\app\auditoria\page.tsx" -Encoding UTF8 -Value @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState } from "@/components/ui"
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
Write-Host "[OK] Auditoria" -ForegroundColor Green

Write-Host ""
Write-Host "=== Todas las paginas creadas correctamente ===" -ForegroundColor Cyan
Write-Host "Ahora ejecuta: npm run dev" -ForegroundColor Yellow
