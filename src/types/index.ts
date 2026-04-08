export type UserRole = 'admin' | 'administrativo' | 'medico' | 'biologo' | 'paciente' | 'delivery'
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

export type SupplyCategory = 'fertilizante' | 'sustrato' | 'packaging' | 'limpieza' | 'herramienta' | 'preventivo' | 'otro'
export type SupplyMovementType = 'compra' | 'consumo' | 'ajuste' | 'merma'

export interface SupplyProduct {
  id: string; name: string; category: SupplyCategory; unit: string
  stock_alert_threshold: number; is_active: boolean; notes: string | null
  created_by: string | null; created_at: string; updated_at: string
}

export interface SupplyMovement {
  id: string; supply_product_id: string; movement_type: SupplyMovementType
  quantity: number; unit_cost: number | null; total_cost: number | null
  cycle_id: string | null; lot_id: string | null; room_id: string | null
  notes: string | null; movement_date: string; created_by: string | null; created_at: string
  supply_product?: SupplyProduct
}

export interface SupplyStock {
  id: string; name: string; category: SupplyCategory; unit: string
  stock_alert_threshold: number; is_active: boolean; stock_actual: number
}

export interface LotCost {
  lot_id: string; lot_code: string; net_grams: number | null
  total_cost: number; cost_per_gram: number | null
}
