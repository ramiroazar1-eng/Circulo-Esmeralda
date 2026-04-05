# Rediseno completo - Verde oscuro profesional
Write-Host "=== Aplicando rediseno ===" -ForegroundColor Green

# ── globals.css ──────────────────────────────────────────────
$content = @'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --green-950: #0a1a0c;
    --green-900: #0f1f12;
    --green-800: #1a3318;
    --green-700: #2d5a27;
    --green-600: #3b6d30;
    --green-500: #4d8a3d;
    --green-400: #7dc264;
    --green-300: #a8e095;
    --green-200: #c8f0b8;
    --green-100: #e8f8e0;
    --green-50:  #f0fce8;
  }
  * { box-sizing: border-box; }
  body { @apply bg-[#f0f4f0] text-[#1a2e1a]; font-feature-settings: "rlig" 1, "calt" 1; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #b8d4b0; border-radius: 99px; }
}

@layer components {
  /* Sidebar */
  .sidebar-base { @apply bg-[#0f1f12] flex flex-col; }
  .nav-item {
    @apply flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
           text-[#7a9e74] hover:bg-white/5 hover:text-[#a8e095] transition-colors duration-150 cursor-pointer;
  }
  .nav-item.active { @apply bg-[#2d5a27] text-[#a8e095]; }

  /* Cards */
  .card-ong {
    @apply bg-white border border-[#ddecd8] rounded-xl shadow-sm;
  }
  .card-ong-dark {
    @apply bg-[#0f1f12] border border-[#1a3318] rounded-xl;
  }

  /* Tablas */
  .table-ong thead th {
    @apply bg-[#f5faf3] text-[#5a8a52] text-[10px] font-bold uppercase tracking-widest
           px-4 py-3 text-left border-b border-[#eef5ea];
  }
  .table-ong tbody td {
    @apply px-4 py-3 text-[13px] text-[#2a3e2a] border-b border-[#f5faf3];
  }
  .table-ong tbody tr:hover { @apply bg-[#f5faf3]; }
  .table-ong tbody tr:last-child td { @apply border-b-0; }

  /* Inputs */
  .input-ong {
    @apply w-full rounded-lg border border-[#c8dcc4] bg-white px-3 py-2
           text-[13px] text-[#1a2e1a] placeholder:text-[#9ab894]
           focus:outline-none focus:ring-2 focus:ring-[#4d8a3d] focus:border-transparent
           disabled:cursor-not-allowed disabled:opacity-50 transition-colors;
  }
  .label-ong { @apply block text-[12px] font-semibold text-[#3d6637] mb-1.5 uppercase tracking-wide; }

  /* Badges */
  .badge-ok     { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8]; }
  .badge-warn   { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fdf8ec] text-[#8a6010] border border-[#e8d48a]; }
  .badge-crit   { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fdf0f0] text-[#8a1f1f] border border-[#e8aaaa]; }
  .badge-muted  { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f0f4f0] text-[#5a8a52] border border-[#c8dcc4]; }
  .badge-blue   { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#e8f0fc] text-[#1a3a8a] border border-[#a8c0e8]; }

  /* Stat cards */
  .stat-card-base  { @apply bg-white border border-[#ddecd8] rounded-xl p-4; }
  .stat-card-green { @apply bg-[#edf7e8] border border-[#b8daa8] rounded-xl p-4; }
  .stat-card-amber { @apply bg-[#fdf8ec] border border-[#e8d48a] rounded-xl p-4; }
  .stat-card-red   { @apply bg-[#fdf0f0] border border-[#e8aaaa] rounded-xl p-4; }
}
'@
Set-Content -Path "src\app\globals.css" -Value $content
Write-Host "[OK] globals.css" -ForegroundColor Green

# ── tailwind.config.ts ───────────────────────────────────────
$content = @'
import type { Config } from "tailwindcss"
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
'@
Set-Content -Path "tailwind.config.ts" -Value $content
Write-Host "[OK] tailwind.config.ts" -ForegroundColor Green

# ── Sidebar rediseñado ───────────────────────────────────────
$content = @'
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"
import {
  LayoutDashboard, Users, Building2, FlaskConical,
  Pill, CreditCard, BookOpen, Shield, Settings,
  LogOut, UserCog, ChevronRight, FileDown, QrCode
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/dashboard",         label: "Dashboard",         icon: LayoutDashboard, roles: ["admin","administrativo"] },
  { href: "/pacientes",         label: "Pacientes",         icon: Users,           roles: ["admin","administrativo","medico"] },
  { href: "/documentacion-ong", label: "Documentacion ONG", icon: Building2,       roles: ["admin","administrativo"] },
  { href: "/trazabilidad",      label: "Trazabilidad",      icon: FlaskConical,    roles: ["admin","administrativo","biologo"] },
  { href: "/dispensas",         label: "Dispensas",         icon: Pill,            roles: ["admin","administrativo"] },
  { href: "/dispensas/qr",      label: "Dispensa por QR",   icon: QrCode,          roles: ["admin","administrativo"] },
  { href: "/membresias",        label: "Membresias",        icon: CreditCard,      roles: ["admin","administrativo"] },
  { href: "/bitacora",          label: "Bitacora",          icon: BookOpen,        roles: ["admin","administrativo","medico","biologo"] },
  { href: "/exportar",          label: "Exportar",          icon: FileDown,        roles: ["admin","administrativo"] },
]

const ADMIN_ITEMS = [
  { href: "/auditoria",     label: "Auditoria",     icon: Shield,   roles: ["admin"] },
  { href: "/usuarios",      label: "Usuarios",      icon: UserCog,  roles: ["admin"] },
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

  const visibleNav   = NAV_ITEMS.filter(item => item.roles.includes(role))
  const visibleAdmin = ADMIN_ITEMS.filter(item => item.roles.includes(role))

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-[#0f1f12] flex flex-col z-10 border-r border-[#1a3318]">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1a3318]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2d5a27] flex items-center justify-center shrink-0">
            <div className="w-4 h-4 rounded-full border-2 border-[#7dc264]" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[#e8f5e3] truncate tracking-tight">Cannabis Medicinal</p>
            <p className="text-[10px] text-[#4d7a46] truncate">Sistema interno</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== "/dispensas" && item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors duration-150",
                isActive
                  ? "bg-[#2d5a27] text-[#a8e095]"
                  : "text-[#7a9e74] hover:bg-white/5 hover:text-[#c8f0b8]"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-50" />}
            </Link>
          )
        })}

        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-bold text-[#3d5e38] uppercase tracking-widest">Administracion</p>
            </div>
            {visibleAdmin.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors duration-150",
                    isActive
                      ? "bg-[#2d5a27] text-[#a8e095]"
                      : "text-[#7a9e74] hover:bg-white/5 hover:text-[#c8f0b8]"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div className="px-2 py-3 border-t border-[#1a3318] space-y-0.5">
        <div className="px-3 py-2">
          <p className="text-[12px] font-semibold text-[#c8e8c0] truncate">{userName}</p>
          <p className="text-[11px] text-[#4d7a46] capitalize">{role}</p>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg w-full text-left text-[12.5px] font-medium text-[#7a9e74] hover:bg-red-950/40 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  )
}
'@
Set-Content -Path "src\components\layout\Sidebar.tsx" -Value $content
Write-Host "[OK] Sidebar" -ForegroundColor Green

# ── Componentes UI rediseñados ───────────────────────────────
$content = @'
import { cn } from "@/lib/utils"
import { getComplianceClasses, getReprocannClasses, getDocumentStatusClasses, getPaymentStatusClasses, getPatientStatusClasses, COMPLIANCE_STATUS_LABELS, REPROCANN_STATUS_LABELS, DOCUMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS, PATIENT_STATUS_LABELS } from "@/lib/utils"
import type { ComplianceStatus, ReprocannStatus, DocumentStatus, PaymentStatus, PatientStatus } from "@/types"
import { Loader2 } from "lucide-react"

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border", className)}>
      {children}
    </span>
  )
}

function StatusDot({ color }: { color: string }) {
  return <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
}

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const config = {
    ok:       { cls: "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]", dot: "bg-[#4caf35]" },
    atencion: { cls: "bg-[#fdf8ec] text-[#8a6010] border-[#e8d48a]", dot: "bg-[#e8a820]" },
    critico:  { cls: "bg-[#fdf0f0] text-[#8a1f1f] border-[#e8aaaa]", dot: "bg-[#e83030]" },
  }[status]
  return <Badge className={config.cls}><StatusDot color={config.dot} />{COMPLIANCE_STATUS_LABELS[status]}</Badge>
}

export function ReprocannBadge({ status }: { status: ReprocannStatus }) {
  const cls = {
    vigente:              "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]",
    proximo_vencimiento:  "bg-[#fdf8ec] text-[#8a6010] border-[#e8d48a]",
    vencido:              "bg-[#fdf0f0] text-[#8a1f1f] border-[#e8aaaa]",
    pendiente_vinculacion:"bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]",
  }[status]
  return <Badge className={cls}>{REPROCANN_STATUS_LABELS[status]}</Badge>
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const cls = {
    faltante:             "bg-[#fdf0f0] text-[#8a1f1f] border-[#e8aaaa]",
    pendiente_revision:   "bg-[#fdf8ec] text-[#8a6010] border-[#e8d48a]",
    aprobado:             "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]",
    observado:            "bg-[#fff5ec] text-[#8a4010] border-[#e8c48a]",
    vencido:              "bg-[#fdf0f0] text-[#8a1f1f] border-[#e8aaaa]",
    pendiente_vinculacion:"bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]",
  }[status]
  return <Badge className={cls}>{DOCUMENT_STATUS_LABELS[status]}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cls = {
    pendiente: "bg-[#fdf8ec] text-[#8a6010] border-[#e8d48a]",
    pagado:    "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]",
    vencido:   "bg-[#fdf0f0] text-[#8a1f1f] border-[#e8aaaa]",
    exento:    "bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]",
  }[status]
  return <Badge className={cls}>{PAYMENT_STATUS_LABELS[status]}</Badge>
}

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const cls = {
    activo:               "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]",
    pendiente_documental: "bg-[#fdf8ec] text-[#8a6010] border-[#e8d48a]",
    suspendido:           "bg-[#fdf0f0] text-[#8a1f1f] border-[#e8aaaa]",
    inactivo:             "bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]",
    baja:                 "bg-[#f5f5f5] text-[#888] border-[#ddd]",
  }[status]
  return <Badge className={cls}>{PATIENT_STATUS_LABELS[status]}</Badge>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-[#1a2e1a] tracking-tight">{title}</h1>
        {description && <p className="text-[13px] text-[#6b8c65] mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, padding = true }: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return (
    <div className={cn("bg-white border border-[#ddecd8] rounded-xl shadow-sm", padding && "p-5", className)}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, description, variant = "default", icon: Icon }: { label: string; value: number | string; description?: string; variant?: "default" | "ok" | "atencion" | "critico"; icon?: React.ComponentType<{ className?: string }> }) {
  const styles = {
    default:  { wrap: "bg-white border-[#ddecd8]",   val: "text-[#1a2e1a]", icon: "bg-[#f0f4f0] text-[#5a8a52]", label: "text-[#7a9e74]" },
    ok:       { wrap: "bg-[#edf7e8] border-[#b8daa8]", val: "text-[#1a5c10]", icon: "bg-[#d4f0c8] text-[#2d6a1f]", label: "text-[#4d8a3d]" },
    atencion: { wrap: "bg-[#fdf8ec] border-[#e8d48a]", val: "text-[#7a4a08]", icon: "bg-[#faedc0] text-[#8a6010]", label: "text-[#aa8020]" },
    critico:  { wrap: "bg-[#fdf0f0] border-[#e8aaaa]", val: "text-[#7a1010]", icon: "bg-[#f8d0d0] text-[#8a1f1f]", label: "text-[#aa3030]" },
  }[variant]

  return (
    <div className={cn("rounded-xl border p-4", styles.wrap)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[10px] font-bold uppercase tracking-widest", styles.label)}>{label}</p>
          <p className={cn("text-[28px] font-black mt-1 tabular-nums leading-none", styles.val)}>{value}</p>
          {description && <p className="text-[11px] text-[#9ab894] mt-1">{description}</p>}
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-lg shrink-0", styles.icon)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon, action }: { title: string; description?: string; icon?: React.ComponentType<{ className?: string }>; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#f0f4f0] flex items-center justify-center mb-3 border border-[#ddecd8]">
          <Icon className="w-5 h-5 text-[#9ab894]" />
        </div>
      )}
      <p className="text-[13px] font-semibold text-[#3d6637]">{title}</p>
      {description && <p className="text-[12px] text-[#9ab894] mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("w-4 h-4 animate-spin text-[#7dc264]", className)} />
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="table-ong w-full">{children}</table>
    </div>
  )
}

export function Button({ children, variant = "primary", size = "md", loading, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; loading?: boolean }) {
  const variantCls = {
    primary:   "bg-[#2d5a27] text-white hover:bg-[#3b6d30] border-transparent",
    secondary: "bg-white text-[#3d6637] hover:bg-[#f5faf3] border-[#c8dcc4]",
    ghost:     "bg-transparent text-[#5a8a52] hover:bg-[#f0f4f0] border-transparent",
    danger:    "bg-red-600 text-white hover:bg-red-700 border-transparent",
  }[variant]
  const sizeCls = { sm: "px-3 py-1.5 text-[12px] gap-1.5", md: "px-4 py-2 text-[13px] gap-2" }[size]
  return (
    <button {...props} disabled={disabled || loading}
      className={cn("inline-flex items-center justify-center rounded-lg border font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed", variantCls, sizeCls, className)}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
}

export function Alert({ variant, title, children }: { variant: "info" | "warning" | "error" | "success"; title?: string; children: React.ReactNode }) {
  const cls = {
    info:    "bg-[#e8f0fc] border-[#a8c0e8] text-[#1a3a8a]",
    warning: "bg-[#fdf8ec] border-[#e8d48a] text-[#8a6010]",
    error:   "bg-[#fdf0f0] border-[#e8aaaa] text-[#8a1f1f]",
    success: "bg-[#edf7e8] border-[#b8daa8] text-[#2d6a1f]",
  }[variant]
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-[13px]", cls)}>
      {title && <p className="font-bold mb-0.5">{title}</p>}
      <div className="opacity-90">{children}</div>
    </div>
  )
}

export function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[11px] font-bold text-[#5a8a52] uppercase tracking-widest">{title}</h2>
      {actions}
    </div>
  )
}
'@
Set-Content -Path "src\components\ui\index.tsx" -Value $content
Write-Host "[OK] Componentes UI" -ForegroundColor Green

# ── Login page rediseñada ─────────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Credenciales incorrectas. Verificá tu email y contraseña."); setLoading(false); return }
    router.push("/dashboard"); router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0a1a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2d5a27] flex items-center justify-center mx-auto mb-4 border border-[#4d8a3d]">
            <div className="w-6 h-6 rounded-full border-2 border-[#7dc264]" />
          </div>
          <h1 className="text-xl font-bold text-[#e8f5e3]">Sistema interno</h1>
          <p className="text-[13px] text-[#4d7a46] mt-1">Cannabis Medicinal · ONG</p>
        </div>

        <div className="bg-[#0f1f12] border border-[#1a3318] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#5a8a52] uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#162418] border border-[#2d4a28] rounded-lg px-3 py-2.5 text-[13px] text-[#e8f5e3] placeholder:text-[#3d6637] focus:outline-none focus:border-[#4d8a3d] focus:ring-1 focus:ring-[#4d8a3d] transition-colors"
                placeholder="usuario@ong.org.ar" disabled={loading}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5a8a52] uppercase tracking-widest mb-1.5">Contrasena</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#162418] border border-[#2d4a28] rounded-lg px-3 py-2.5 text-[13px] text-[#e8f5e3] placeholder:text-[#3d6637] focus:outline-none focus:border-[#4d8a3d] focus:ring-1 focus:ring-[#4d8a3d] transition-colors"
                placeholder="••••••••" disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-800 px-3 py-2 text-[12px] text-red-400">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#2d5a27] px-4 py-2.5 text-[13px] font-bold text-[#a8e095] hover:bg-[#3b6d30] disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</> : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#2d4a28] mt-6">
          Acceso exclusivo para el equipo de la ONG
        </p>
      </div>
    </div>
  )
}
'@
Set-Content -Path "src\app\login\page.tsx" -Value $content
Write-Host "[OK] Login" -ForegroundColor Green

Write-Host ""
Write-Host "=== Rediseno aplicado ===" -ForegroundColor Green
Write-Host "Ejecuta: npx next dev" -ForegroundColor Yellow
