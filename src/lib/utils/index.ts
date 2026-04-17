import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ComplianceStatus, ReprocannStatus, DocumentStatus, PatientStatus, PaymentStatus, LotStatus, LogCategory, UserRole } from '@/types'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatDate(date: string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '"”'
  try { return format(parseISO(date), fmt, { locale: es }) } catch { return '"”' }
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
export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = { ok: 'En regla', atencion: 'Atención', critico: 'critico' }
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
  admin: 'Administrador', administrativo: 'Administrativo', medico: 'Médico', biologo: 'Director de Cultivo', director_de_cultivo: 'Director de Cultivo', paciente: 'Paciente', delivery: 'Delivery'
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
  if (amount == null) return '"”'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}
export function formatGrams(grams: number | null | undefined): string { if (grams == null) return '"”'; return `${grams.toFixed(1)}g` }
export function formatPeriod(year: number, month: number): string { return `${MONTH_LABELS[month]} ${year}` }
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '"”'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}





