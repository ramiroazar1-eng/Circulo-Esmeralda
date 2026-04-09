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
          <p className={cn('text-3xl font-bold mt-1 tabular-nums tracking-tight', valueClasses[variant])}>{value}</p>
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
  const variantClasses = { primary: 'bg-[#14532d] text-white hover:bg-[#166534] border-transparent', secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300', ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent', danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent' }
  const sizeClasses = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2 text-sm gap-2' }
  return <button {...props} disabled={disabled || loading} className={cn('inline-flex items-center justify-center rounded-md border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', variantClasses[variant], sizeClasses[size], className)}>{loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{children}</button>
}
export function Alert({ variant, title, children }: { variant: 'info' | 'warning' | 'error' | 'success'; title?: string; children: React.ReactNode }) {
  const classes = { info: 'bg-blue-50 border-blue-200 text-blue-800', warning: 'bg-amber-50 border-amber-200 text-amber-800', error: 'bg-red-50 border-red-200 text-red-800', success: 'bg-green-50 border-green-200 text-green-800' }
  return <div className={cn('rounded-md border px-4 py-3 text-sm', classes[variant])}>{title && <p className="font-medium mb-0.5">{title}</p>}<div className="opacity-90">{children}</div></div>
}
export function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-slate-900">{title}</h2>{actions}</div>
}

