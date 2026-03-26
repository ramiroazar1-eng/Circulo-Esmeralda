# Script de configuracion - ONG Cannabis Medicinal
# Ejecutar con: powershell -ExecutionPolicy Bypass -File crear-archivos.ps1

Write-Host "Creando archivos del proyecto..." -ForegroundColor Cyan

# ── src\lib\supabase\client.ts ──────────────────────────────
Set-Content -Path "src\lib\supabase\client.ts" -Encoding UTF8 -Value @'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
'@

# ── src\lib\supabase\server.ts ──────────────────────────────
Set-Content -Path "src\lib\supabase\server.ts" -Encoding UTF8 -Value @'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createServiceClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
'@

# ── src\lib\supabase\middleware.ts ──────────────────────────
Set-Content -Path "src\lib\supabase\middleware.ts" -Encoding UTF8 -Value @'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isPublicRoute = isAuthRoute || request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
'@

# ── src\middleware.ts ────────────────────────────────────────
Set-Content -Path "src\middleware.ts" -Encoding UTF8 -Value @'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
'@

# ── src\types\index.ts ───────────────────────────────────────
Set-Content -Path "src\types\index.ts" -Encoding UTF8 -Value @'
export type UserRole = 'admin' | 'administrativo' | 'medico' | 'biologo' | 'paciente'
export type PatientStatus = 'activo' | 'pendiente_documental' | 'suspendido' | 'inactivo' | 'baja'
export type ReprocannStatus = 'vigente' | 'proximo_vencimiento' | 'vencido' | 'pendiente_vinculacion'
export type DocumentStatus = 'faltante' | 'pendiente_revision' | 'aprobado' | 'observado' | 'vencido' | 'pendiente_vinculacion'
export type ComplianceStatus = 'ok' | 'atencion' | 'critico'
export type LotStatus = 'en_proceso' | 'finalizado' | 'descartado'
export type StockMovementType = 'ingreso' | 'dispensa' | 'ajuste' | 'merma' | 'descarte'
export type PaymentStatus = 'pendiente' | 'pagado' | 'vencido' | 'exento'
export type OrgDocType = 'estatuto' | 'acta' | 'autoridades' | 'afip_cuit' | 'igj' | 'habilitacion' | 'convenio' | 'inmueble' | 'protocolo' | 'politica' | 'otro'
export type LogCategory = 'operativo' | 'incidencia' | 'trazabilidad' | 'documental' | 'administrativo' | 'otro'
export type AuditAction = 'crear' | 'editar' | 'eliminar' | 'aprobar' | 'observar' | 'subir_documento' | 'dispensar' | 'ajustar_stock' | 'cambiar_estado' | 'exportar'

export interface Profile {
  id: string; full_name: string; role: UserRole; is_active: boolean; created_at: string; updated_at: string
}
export interface MembershipPlan {
  id: string; name: string; description: string | null; monthly_grams: number | null; monthly_amount: number; is_active: boolean; created_at: string
}
export interface Patient {
  id: string; full_name: string; dni: string; birth_date: string | null; phone: string | null; email: string | null
  address: string | null; reprocann_ref: string | null; reprocann_expiry: string | null; reprocann_status: ReprocannStatus
  status: PatientStatus; compliance_status: ComplianceStatus; treating_physician_id: string | null
  membership_plan_id: string | null; internal_notes: string | null; created_by: string; created_at: string; updated_at: string; deleted_at: string | null
  treating_physician?: Profile; membership_plan?: MembershipPlan
}
export interface PatientDocumentType {
  id: string; name: string; slug: string; description: string | null; is_mandatory: boolean; has_expiry: boolean; is_active: boolean; sort_order: number; created_at: string
}
export interface PatientDocument {
  id: string; patient_id: string; doc_type_id: string; status: DocumentStatus; file_path: string | null
  file_name: string | null; file_size_bytes: number | null; expires_at: string | null; observations: string | null
  uploaded_by: string | null; uploaded_at: string | null; reviewed_by: string | null; reviewed_at: string | null
  created_at: string; updated_at: string; doc_type?: PatientDocumentType; uploaded_by_profile?: Profile; reviewed_by_profile?: Profile
}
export interface OrgDocument {
  id: string; name: string; doc_type: OrgDocType; description: string | null; status: DocumentStatus
  file_path: string | null; file_name: string | null; file_size_bytes: number | null; expires_at: string | null
  observations: string | null; is_mandatory: boolean; uploaded_by: string | null; uploaded_at: string | null
  reviewed_by: string | null; reviewed_at: string | null; created_at: string; updated_at: string
}
export interface Lot {
  id: string; lot_code: string; cycle_id: string | null; room_id: string | null; genetic_id: string | null
  start_date: string; harvest_date: string | null; status: LotStatus; gross_grams: number | null
  net_grams: number | null; waste_grams: number | null; waste_reason: string | null; notes: string | null
  created_by: string; created_at: string; updated_at: string
}
export interface StockPosition {
  id: string; lot_id: string; available_grams: number; reserved_grams: number; updated_at: string
}
export interface Dispense {
  id: string; patient_id: string; lot_id: string; dispensed_at: string; grams: number
  product_desc: string; observations: string | null; performed_by: string; created_at: string
  patient?: Patient; lot?: Lot; performed_by_profile?: Profile
}
export interface MembershipPeriod {
  id: string; patient_id: string; plan_id: string; period_year: number; period_month: number
  amount: number; payment_status: PaymentStatus; paid_at: string | null; payment_method: string | null
  notes: string | null; registered_by: string; created_at: string; updated_at: string
  patient?: Patient; plan?: MembershipPlan
}
export interface DailyLogEntry {
  id: string; entry_date: string; category: LogCategory; title: string; body: string
  is_incident: boolean; patient_id: string | null; lot_id: string | null; created_by: string; created_at: string; updated_at: string
  created_by_profile?: Profile; patient?: Patient
}
export interface AuditLog {
  id: string; performed_by: string; action: AuditAction; entity_type: string; entity_id: string | null
  entity_label: string | null; previous_state: Record<string, unknown> | null; new_state: Record<string, unknown> | null
  ip_address: string | null; performed_at: string; performed_by_profile?: Profile
}
export interface ComplianceSummary {
  total_activos: number; criticos: number; en_atencion: number; en_regla: number; reprocann_vencido: number; reprocann_proximo: number
}
export interface PatientAlert {
  id: string; full_name: string; dni: string; status: PatientStatus; compliance_status: ComplianceStatus
  reprocann_status: ReprocannStatus; reprocann_expiry: string | null; docs_criticos: number; docs_pendientes: number
}
export interface CurrentMembership {
  patient_id: string; full_name: string; patient_status: PatientStatus; plan_name: string | null
  monthly_amount: number | null; payment_status: PaymentStatus | null; paid_at: string | null
  period_year: number | null; period_month: number | null
}
'@

# ── src\lib\utils\index.ts ───────────────────────────────────
Set-Content -Path "src\lib\utils\index.ts" -Encoding UTF8 -Value @'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ComplianceStatus, ReprocannStatus, DocumentStatus, PatientStatus, PaymentStatus, LotStatus, LogCategory, UserRole } from '@/types'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatDate(date: string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  try { return format(parseISO(date), fmt, { locale: es }) } catch { return '—' }
}
export function formatDateTime(date: string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy 'a las' HH:mm")
}
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  try { return differenceInDays(parseISO(date), new Date()) } catch { return null }
}

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  activo: 'Activo', pendiente_documental: 'Pendiente documental', suspendido: 'Suspendido', inactivo: 'Inactivo', baja: 'Baja'
}
export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = { ok: 'En regla', atencion: 'Atención', critico: 'Crítico' }
export const REPROCANN_STATUS_LABELS: Record<ReprocannStatus, string> = {
  vigente: 'Vigente', proximo_vencimiento: 'Próximo a vencer', vencido: 'Vencido', pendiente_vinculacion: 'Pendiente de vinculación'
}
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  faltante: 'Faltante', pendiente_revision: 'Pendiente de revisión', aprobado: 'Aprobado',
  observado: 'Observado', vencido: 'Vencido', pendiente_vinculacion: 'Pendiente de vinculación'
}
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = { pendiente: 'Pendiente', pagado: 'Pagado', vencido: 'Vencido', exento: 'Exento' }
export const LOT_STATUS_LABELS: Record<LotStatus, string> = { en_proceso: 'En proceso', finalizado: 'Finalizado', descartado: 'Descartado' }
export const LOG_CATEGORY_LABELS: Record<LogCategory, string> = {
  operativo: 'Operativo', incidencia: 'Incidencia', trazabilidad: 'Trazabilidad',
  documental: 'Documental', administrativo: 'Administrativo', otro: 'Otro'
}
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador', administrativo: 'Administrativo', medico: 'Médico', biologo: 'Biólogo', paciente: 'Paciente'
}
export const MONTH_LABELS: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
}

export function getComplianceClasses(status: ComplianceStatus) {
  return { ok: 'bg-green-50 text-green-800 border-green-200', atencion: 'bg-amber-50 text-amber-800 border-amber-200', critico: 'bg-red-50 text-red-800 border-red-200' }[status]
}
export function getReprocannClasses(status: ReprocannStatus) {
  return { vigente: 'bg-green-50 text-green-800 border-green-200', proximo_vencimiento: 'bg-amber-50 text-amber-800 border-amber-200', vencido: 'bg-red-50 text-red-800 border-red-200', pendiente_vinculacion: 'bg-slate-50 text-slate-600 border-slate-200' }[status]
}
export function getDocumentStatusClasses(status: DocumentStatus) {
  return { faltante: 'bg-red-50 text-red-700 border-red-200', pendiente_revision: 'bg-amber-50 text-amber-700 border-amber-200', aprobado: 'bg-green-50 text-green-700 border-green-200', observado: 'bg-orange-50 text-orange-700 border-orange-200', vencido: 'bg-red-50 text-red-700 border-red-200', pendiente_vinculacion: 'bg-slate-50 text-slate-600 border-slate-200' }[status]
}
export function getPaymentStatusClasses(status: PaymentStatus) {
  return { pendiente: 'bg-amber-50 text-amber-700 border-amber-200', pagado: 'bg-green-50 text-green-700 border-green-200', vencido: 'bg-red-50 text-red-700 border-red-200', exento: 'bg-slate-50 text-slate-600 border-slate-200' }[status]
}
export function getPatientStatusClasses(status: PatientStatus) {
  return { activo: 'bg-green-50 text-green-700 border-green-200', pendiente_documental: 'bg-amber-50 text-amber-700 border-amber-200', suspendido: 'bg-red-50 text-red-700 border-red-200', inactivo: 'bg-slate-50 text-slate-500 border-slate-200', baja: 'bg-slate-100 text-slate-400 border-slate-200' }[status]
}
export function formatARS(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}
export function formatGrams(grams: number | null | undefined): string { if (grams == null) return '—'; return `${grams.toFixed(1)}g` }
export function formatPeriod(year: number, month: number): string { return `${MONTH_LABELS[month]} ${year}` }
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
'@

Write-Host "Archivos de libreria creados OK" -ForegroundColor Green

# ── src\app\globals.css ──────────────────────────────────────
Set-Content -Path "src\app\globals.css" -Encoding UTF8 -Value @'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 20% 98%;
    --foreground: 222 47% 11%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 215 25% 27%;
    --primary: 215 25% 27%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 94%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 72% 51%;
    --radius: 0.5rem;
  }
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { @apply bg-transparent; }
  ::-webkit-scrollbar-thumb { @apply bg-slate-300 rounded-full; }
}

@layer components {
  .table-ong thead th { @apply bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide px-4 py-3 text-left border-b border-slate-200; }
  .table-ong tbody td { @apply px-4 py-3 text-sm text-slate-700 border-b border-slate-100; }
  .table-ong tbody tr:hover { @apply bg-slate-50/60; }
  .table-ong tbody tr:last-child td { @apply border-b-0; }
  .card-ong { @apply bg-white border border-slate-200 rounded-lg shadow-sm; }
  .input-ong { @apply w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50; }
  .label-ong { @apply block text-sm font-medium text-slate-700 mb-1; }
  .nav-item { @apply flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150; }
  .nav-item.active { @apply bg-slate-900 text-white hover:bg-slate-800 hover:text-white; }
}
'@

# ── src\app\layout.tsx ───────────────────────────────────────
Set-Content -Path "src\app\layout.tsx" -Encoding UTF8 -Value @'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'ONG Cannabis Medicinal - Sistema Interno',
  description: 'Sistema de gestion interna',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  )
}
'@

# ── src\app\page.tsx ─────────────────────────────────────────
Set-Content -Path "src\app\page.tsx" -Encoding UTF8 -Value @'
import { redirect } from 'next/navigation'
export default function Home() { redirect('/dashboard') }
'@

Write-Host "Archivos app base creados OK" -ForegroundColor Green

# ── src\components\ui\index.tsx ──────────────────────────────
Set-Content -Path "src\components\ui\index.tsx" -Encoding UTF8 -Value @'
import { cn } from '@/lib/utils'
import { getComplianceClasses, getReprocannClasses, getDocumentStatusClasses, getPaymentStatusClasses, getPatientStatusClasses, COMPLIANCE_STATUS_LABELS, REPROCANN_STATUS_LABELS, DOCUMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS, PATIENT_STATUS_LABELS } from '@/lib/utils'
import type { ComplianceStatus, ReprocannStatus, DocumentStatus, PaymentStatus, PatientStatus } from '@/types'
import { Loader2 } from 'lucide-react'

export function Badge({ children, className, variant = 'outline' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'outline' }) {
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border', variant === 'outline' ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-100 text-slate-700 border-transparent', className)}>{children}</span>
}
export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  return <Badge className={getComplianceClasses(status)}><span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', { 'bg-green-500': status === 'ok', 'bg-amber-500': status === 'atencion', 'bg-red-500': status === 'critico' })} />{COMPLIANCE_STATUS_LABELS[status]}</Badge>
}
export function ReprocannBadge({ status }: { status: ReprocannStatus }) {
  return <Badge className={getReprocannClasses(status)}>{REPROCANN_STATUS_LABELS[status]}</Badge>
}
export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge className={getDocumentStatusClasses(status)}>{DOCUMENT_STATUS_LABELS[status]}</Badge>
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={getPaymentStatusClasses(status)}>{PAYMENT_STATUS_LABELS[status]}</Badge>
}
export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return <Badge className={getPatientStatusClasses(status)}>{PATIENT_STATUS_LABELS[status]}</Badge>
}
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div><h1 className="text-xl font-semibold text-slate-900">{title}</h1>{description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
export function Card({ children, className, padding = true }: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return <div className={cn('card-ong', padding && 'p-5', className)}>{children}</div>
}
export function StatCard({ label, value, description, variant = 'default', icon: Icon }: { label: string; value: number | string; description?: string; variant?: 'default' | 'ok' | 'atencion' | 'critico'; icon?: React.ComponentType<{ className?: string }> }) {
  const variantClasses = { default: 'border-slate-200 bg-white', ok: 'border-green-200 bg-green-50', atencion: 'border-amber-200 bg-amber-50', critico: 'border-red-200 bg-red-50' }
  const valueClasses = { default: 'text-slate-900', ok: 'text-green-800', atencion: 'text-amber-800', critico: 'text-red-800' }
  return (
    <div className={cn('rounded-lg border p-4', variantClasses[variant])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={cn('text-2xl font-semibold mt-1 tabular-nums', valueClasses[variant])}>{value}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {Icon && <div className={cn('p-2 rounded-md', { 'bg-slate-100': variant === 'default', 'bg-green-100': variant === 'ok', 'bg-amber-100': variant === 'atencion', 'bg-red-100': variant === 'critico' })}><Icon className={cn('w-4 h-4', { 'text-slate-500': variant === 'default', 'text-green-700': variant === 'ok', 'text-amber-700': variant === 'atencion', 'text-red-700': variant === 'critico' })} /></div>}
      </div>
    </div>
  )
}
export function EmptyState({ title, description, icon: Icon, action }: { title: string; description?: string; icon?: React.ComponentType<{ className?: string }>; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-slate-400" /></div>}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function Spinner({ className }: { className?: string }) { return <Loader2 className={cn('w-4 h-4 animate-spin text-slate-400', className)} /> }
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('overflow-x-auto', className)}><table className="table-ong w-full">{children}</table></div>
}
export function Button({ children, variant = 'primary', size = 'md', loading, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; loading?: boolean }) {
  const variantClasses = { primary: 'bg-slate-900 text-white hover:bg-slate-800 border-transparent', secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300', ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent', danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent' }
  const sizeClasses = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2 text-sm gap-2' }
  return <button {...props} disabled={disabled || loading} className={cn('inline-flex items-center justify-center rounded-md border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', variantClasses[variant], sizeClasses[size], className)}>{loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{children}</button>
}
export function Alert({ variant, title, children }: { variant: 'info' | 'warning' | 'error' | 'success'; title?: string; children: React.ReactNode }) {
  const classes = { info: 'bg-blue-50 border-blue-200 text-blue-800', warning: 'bg-amber-50 border-amber-200 text-amber-800', error: 'bg-red-50 border-red-200 text-red-800', success: 'bg-green-50 border-green-200 text-green-800' }
  return <div className={cn('rounded-md border px-4 py-3 text-sm', classes[variant])}>{title && <p className="font-medium mb-0.5">{title}</p>}<div className="opacity-90">{children}</div></div>
}
export function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>{actions}</div>
}
'@

Write-Host "Componentes UI creados OK" -ForegroundColor Green
Write-Host ""
Write-Host "Listo! Ahora ejecuta los siguientes archivos de paginas." -ForegroundColor Cyan
