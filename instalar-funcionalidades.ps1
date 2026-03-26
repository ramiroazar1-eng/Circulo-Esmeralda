# Funcionalidad: Camara QR + Exportables
Write-Host "=== Instalando funcionalidades ===" -ForegroundColor Cyan

# Instalar librerias
Write-Host "Instalando librerias..." -ForegroundColor Yellow
npm install html5-qrcode --save
npm install @react-pdf/renderer --save

Write-Host "[OK] Librerias instaladas" -ForegroundColor Green

# ── Carpetas ────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path "src\components\qr" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\exportar" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\export\patient-record" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\export\patients-list" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\export\org-docs" | Out-Null

Write-Host "[OK] Carpetas creadas" -ForegroundColor Green

# ── Componente camara QR ─────────────────────────────────────
$content = @'
"use client"
import { useEffect, useRef, useState } from "react"
import { X, Camera } from "lucide-react"

interface Props {
  onScan: (value: string) => void
  onClose: () => void
}

export default function QRCameraScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const scannerRef = useRef<any>(null)
  const elementId = "qr-camera-scanner"

  useEffect(() => {
    let scanner: any = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        scanner = new Html5Qrcode(elementId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            scanner.stop().catch(() => {})
            onScan(decodedText)
          },
          () => {}
        )
        setStarted(true)
      } catch (err: any) {
        setError("No se pudo acceder a la camara. Verifica los permisos.")
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Escanear QR</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={onClose} className="mt-4 text-xs text-slate-500 underline">Cerrar</button>
            </div>
          ) : (
            <>
              <div id={elementId} className="w-full rounded-lg overflow-hidden" style={{ minHeight: 280 }} />
              <p className="text-xs text-slate-400 text-center mt-3">
                Apunta la camara al codigo QR
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
'@
Set-Content -Path "src\components\qr\QRCameraScanner.tsx" -Value $content
Write-Host "[OK] QRCameraScanner" -ForegroundColor Green

# ── Pantalla dispensa QR con camara ─────────────────────────
$content = @'
"use client"
import { useState, useRef, useEffect, lazy, Suspense } from "react"
import { BackButton } from "@/components/ui/BackButton"
import { Alert } from "@/components/ui"
import { ScanLine, CheckCircle2, AlertTriangle, Loader2, X, ArrowRight, Camera } from "lucide-react"

const QRCameraScanner = lazy(() => import("@/components/qr/QRCameraScanner"))

type Step = "scan-patient" | "scan-lot" | "confirm"
type ScanTarget = "patient" | "lot" | null

interface PatientData {
  id: string; full_name: string; status: string; compliance_status: string
  reprocann_status: string; reprocann_expiry: string | null
  membership_plan: { name: string; monthly_grams: number } | null
  docsCriticos: number; docsPendientes: number
}
interface LotData {
  id: string; lot_code: string; status: string
  genetic: { name: string } | null
  room: { name: string } | null
  stock_position: { available_grams: number } | null
}

export default function DispensaQRPage() {
  const [step, setStep] = useState<Step>("scan-patient")
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [lot, setLot] = useState<LotData | null>(null)
  const [grams, setGrams] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cameraTarget, setCameraTarget] = useState<ScanTarget>(null)
  const patientInputRef = useRef<HTMLInputElement>(null)
  const lotInputRef = useRef<HTMLInputElement>(null)
  const gramsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === "scan-patient") patientInputRef.current?.focus()
    if (step === "scan-lot") lotInputRef.current?.focus()
    if (step === "confirm") gramsInputRef.current?.focus()
  }, [step])

  async function scanPatient(value: string) {
    if (!value.trim()) return
    setLoading(true); setError(null)
    const token = value.includes("/p/") ? value.split("/p/")[1].split("?")[0] : value.trim()
    const res = await fetch(`/api/qr/scan-patient?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Paciente no encontrado"); setLoading(false); return }
    setPatient(data); setStep("scan-lot"); setLoading(false)
  }

  async function scanLot(value: string) {
    if (!value.trim()) return
    setLoading(true); setError(null)
    const token = value.includes("/l/") ? value.split("/l/")[1].split("?")[0] : value.trim()
    const res = await fetch(`/api/qr/scan-lot?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Lote no encontrado"); setLoading(false); return }
    setLot(data); setStep("confirm"); setLoading(false)
  }

  function handleCameraScan(value: string) {
    setCameraTarget(null)
    if (cameraTarget === "patient") scanPatient(value)
    if (cameraTarget === "lot") scanLot(value)
  }

  async function confirmDispense() {
    if (!patient || !lot || !grams) return
    setLoading(true); setError(null)
    const res = await fetch("/api/qr/dispense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id, lotId: lot.id, grams: parseFloat(grams) })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess(true); setLoading(false)
    setTimeout(() => {
      setSuccess(false); setPatient(null); setLot(null)
      setGrams(""); setStep("scan-patient"); setError(null)
    }, 2500)
  }

  function reset() {
    setPatient(null); setLot(null); setGrams("")
    setStep("scan-patient"); setError(null); setSuccess(false)
  }

  const hasWarnings = patient && (
    patient.reprocann_status === "vencido" ||
    patient.reprocann_status === "proximo_vencimiento" ||
    patient.docsCriticos > 0 || patient.status !== "activo"
  )

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Dispensa registrada</h2>
        <p className="text-sm text-slate-500">{grams}g dispensados a {patient?.full_name}</p>
        <p className="text-xs text-slate-400">Preparando nueva dispensa...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {cameraTarget && (
        <Suspense fallback={null}>
          <QRCameraScanner onScan={handleCameraScan} onClose={() => setCameraTarget(null)} />
        </Suspense>
      )}

      <BackButton label="Volver a dispensas" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dispensa por QR</h1>
          <p className="text-sm text-slate-500">Escanea el QR del paciente y del lote</p>
        </div>
        {(patient || lot) && (
          <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3.5 h-3.5" />Reiniciar
          </button>
        )}
      </div>

      {/* Progreso */}
      <div className="flex items-center gap-2">
        {(["scan-patient","scan-lot","confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
              step === s ? "bg-slate-900 text-white" :
              (step === "scan-lot" && i === 0) || (step === "confirm" && i <= 1) ? "bg-green-500 text-white" :
              "bg-slate-100 text-slate-400"
            }`}>
              {((step === "scan-lot" && i === 0) || (step === "confirm" && i <= 1))
                ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-xs text-slate-500 hidden sm:block">
              {s === "scan-patient" ? "Paciente" : s === "scan-lot" ? "Lote" : "Confirmar"}
            </span>
            {i < 2 && <div className="flex-1 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* PASO 1 */}
      {step === "scan-patient" && (
        <div className="card-ong p-6 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ScanLine className="w-6 h-6 text-slate-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Escanear QR del paciente</h2>
            <p className="text-xs text-slate-500 mt-1">Con lector USB, camara o token manual</p>
          </div>
          <input
            ref={patientInputRef}
            type="text"
            placeholder="Escanear o escribir token..."
            className="input-ong text-center font-mono text-sm"
            onKeyDown={e => e.key === "Enter" && scanPatient((e.target as HTMLInputElement).value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => setCameraTarget("patient")}
              className="flex-1 flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Camera className="w-4 h-4" />Usar camara
            </button>
            <button
              onClick={() => scanPatient(patientInputRef.current?.value ?? "")}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Identificar
            </button>
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {step === "scan-lot" && patient && (
        <div className="space-y-3">
          <div className={`card-ong p-4 border-l-4 ${hasWarnings ? "border-l-amber-500" : "border-l-green-500"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-lg">{patient.full_name}</p>
                <p className="text-sm text-slate-500">{patient.membership_plan?.name ?? "Sin plan"}</p>
              </div>
              <span className={`text-xs rounded px-2 py-1 border font-medium ${patient.status === "activo" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {patient.status === "activo" ? "Activo" : patient.status}
              </span>
            </div>
            {hasWarnings && (
              <div className="mt-3 space-y-1">
                {patient.status !== "activo" && <div className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="w-3.5 h-3.5" />Paciente no activo</div>}
                {patient.reprocann_status === "vencido" && <div className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="w-3.5 h-3.5" />REPROCANN vencido</div>}
                {patient.reprocann_status === "proximo_vencimiento" && <div className="flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle className="w-3.5 h-3.5" />REPROCANN proximo a vencer</div>}
                {patient.docsCriticos > 0 && <div className="flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle className="w-3.5 h-3.5" />{patient.docsCriticos} documento{patient.docsCriticos > 1 ? "s" : ""} faltante{patient.docsCriticos > 1 ? "s" : ""}</div>}
              </div>
            )}
          </div>
          <div className="card-ong p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ScanLine className="w-6 h-6 text-slate-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Escanear QR del lote</h2>
              <p className="text-xs text-slate-500 mt-1">Escanea la etiqueta del packaging</p>
            </div>
            <input
              ref={lotInputRef}
              type="text"
              placeholder="Escanear o escribir token..."
              className="input-ong text-center font-mono text-sm"
              onKeyDown={e => e.key === "Enter" && scanLot((e.target as HTMLInputElement).value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCameraTarget("lot")}
                className="flex-1 flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Camera className="w-4 h-4" />Usar camara
              </button>
              <button
                onClick={() => scanLot(lotInputRef.current?.value ?? "")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Identificar lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASO 3 */}
      {step === "confirm" && patient && lot && (
        <div className="space-y-3">
          <div className={`card-ong p-4 border-l-4 ${hasWarnings ? "border-l-amber-500" : "border-l-green-500"}`}>
            <p className="font-semibold text-slate-900">{patient.full_name}</p>
            <p className="text-xs text-slate-500">{patient.membership_plan?.name ?? "Sin plan"}</p>
          </div>
          <div className="card-ong p-4 border-l-4 border-l-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 font-mono">{lot.lot_code}</p>
                <p className="text-xs text-slate-500">{lot.genetic?.name ?? "Sin genetica"} · {lot.room?.name ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{lot.stock_position?.available_grams ?? 0}g</p>
                <p className="text-xs text-slate-400">disponibles</p>
              </div>
            </div>
          </div>
          <div className="card-ong p-6 space-y-4">
            <div>
              <label className="label-ong text-center block text-sm">Cantidad a dispensar (gramos)</label>
              <input
                ref={gramsInputRef}
                type="number"
                step="0.1"
                min="0.1"
                max={lot.stock_position?.available_grams ?? 999}
                value={grams}
                onChange={e => setGrams(e.target.value)}
                onKeyDown={e => e.key === "Enter" && grams && confirmDispense()}
                className="input-ong text-center text-2xl font-semibold font-mono mt-2"
                placeholder="0.0"
                autoFocus
              />
              {grams && lot.stock_position && parseFloat(grams) > lot.stock_position.available_grams && (
                <p className="text-xs text-red-500 mt-1 text-center">Supera el stock disponible</p>
              )}
            </div>
            <button
              onClick={confirmDispense}
              disabled={loading || !grams || parseFloat(grams) <= 0}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar dispensa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
'@
Set-Content -Path "src\app\dispensas\qr\page.tsx" -Value $content
Write-Host "[OK] Dispensa QR con camara" -ForegroundColor Green

# ── Pagina de exportables ────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { FileDown, Users, Building2, Pill } from "lucide-react"
import ExportButton from "./ExportButton"

export default async function ExportarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, dni, status")
    .is("deleted_at", null)
    .eq("status", "activo")
    .order("full_name")

  return (
    <div className="max-w-2xl space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Exportables" description="Genera informes imprimibles para carpetas fisicas y auditorias" />

      <Card>
        <SectionHeader title="Pacientes" />
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Listado general de pacientes</p>
                <p className="text-xs text-slate-500">Estado documental y compliance de todos los pacientes activos</p>
              </div>
            </div>
            <ExportButton href="/api/export/patients-list" label="Descargar" />
          </div>

          <div className="py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-3">Legajo individual por paciente</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(patients ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-900">{p.full_name}</p>
                    <p className="text-xs text-slate-500 font-mono">DNI {p.dni}</p>
                  </div>
                  <ExportButton href={`/api/export/patient-record?id=${p.id}`} label="Legajo" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Institucional" />
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Checklist documental ONG</p>
              <p className="text-xs text-slate-500">Estado de todos los documentos institucionales</p>
            </div>
          </div>
          <ExportButton href="/api/export/org-docs" label="Descargar" />
        </div>
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\exportar\page.tsx" -Value $content
Write-Host "[OK] Pagina exportables" -ForegroundColor Green

# ── Boton de exportacion ─────────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"

export default function ExportButton({ href, label }: { href: string; label: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(href)
      if (!res.ok) throw new Error("Error al generar el informe")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("content-disposition")?.split("filename=")[1] ?? "informe.html"
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert("Error al generar el informe")
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-white rounded-lg px-3 py-1.5 hover:bg-slate-800 disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}
'@
Set-Content -Path "src\app\exportar\ExportButton.tsx" -Value $content
Write-Host "[OK] ExportButton" -ForegroundColor Green

# ── API: listado general de pacientes ────────────────────────
$content = @'
import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const service = await createServiceClient()

  const { data: patients } = await service
    .from("patients")
    .select(`
      full_name, dni, status, compliance_status, reprocann_status, reprocann_expiry, created_at,
      membership_plan:membership_plans(name),
      treating_physician:profiles!patients_treating_physician_id_fkey(full_name)
    `)
    .is("deleted_at", null)
    .order("full_name")

  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

  const statusLabel = (s: string) => ({ activo: "Activo", pendiente_documental: "Pendiente", suspendido: "Suspendido", inactivo: "Inactivo", baja: "Baja" }[s] ?? s)
  const complianceLabel = (s: string) => ({ ok: "En regla", atencion: "Atencion", critico: "Critico" }[s] ?? s)
  const reprocannLabel = (s: string) => ({ vigente: "Vigente", proximo_vencimiento: "Proximo a vencer", vencido: "VENCIDO", pendiente_vinculacion: "Sin vincular" }[s] ?? s)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Listado de pacientes - ${now}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .ok { background: #f0fdf4; color: #166534; }
  .atencion { background: #fffbeb; color: #92400e; }
  .critico { background: #fef2f2; color: #991b1b; }
  .footer { margin-top: 20px; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { margin: 10px; } }
</style>
</head>
<body>
<h1>Listado de pacientes activos</h1>
<div class="subtitle">Generado el ${now} · ${patients?.length ?? 0} pacientes</div>
<table>
<thead>
<tr><th>Nombre</th><th>DNI</th><th>Estado</th><th>Compliance</th><th>REPROCANN</th><th>Plan</th></tr>
</thead>
<tbody>
${(patients ?? []).map((p: any) => `
<tr>
  <td>${p.full_name}</td>
  <td style="font-family:monospace">${p.dni}</td>
  <td>${statusLabel(p.status)}</td>
  <td><span class="badge ${p.compliance_status}">${complianceLabel(p.compliance_status)}</span></td>
  <td>${reprocannLabel(p.reprocann_status)}</td>
  <td>${p.membership_plan?.name ?? "—"}</td>
</tr>`).join("")}
</tbody>
</table>
<div class="footer">Sistema interno ONG Cannabis Medicinal · Documento confidencial</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="pacientes-${now.replace(/\//g, "-")}.html"`
    }
  })
}
'@
Set-Content -Path "src\app\api\export\patients-list\route.ts" -Value $content
Write-Host "[OK] API export pacientes" -ForegroundColor Green

# ── API: legajo individual ───────────────────────────────────
$content = @'
import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const service = await createServiceClient()

  const { data: patient } = await service
    .from("patients")
    .select(`
      *, treating_physician:profiles!patients_treating_physician_id_fkey(full_name),
      membership_plan:membership_plans(name, monthly_grams, monthly_amount)
    `)
    .eq("id", id).single()

  if (!patient) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const { data: documents } = await service
    .from("patient_documents")
    .select("*, doc_type:patient_document_types(name, is_mandatory)")
    .eq("patient_id", id)
    .order("doc_type(sort_order)")

  const { data: dispenses } = await service
    .from("dispenses")
    .select("dispensed_at, grams, product_desc, lot:lots(lot_code)")
    .eq("patient_id", id)
    .order("dispensed_at", { ascending: false })
    .limit(20)

  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("es-AR") : "—"

  const docStatusLabel = (s: string) => ({
    faltante: "FALTANTE", pendiente_revision: "Pendiente", aprobado: "Aprobado",
    observado: "Observado", vencido: "VENCIDO", pendiente_vinculacion: "Sin vincular"
  }[s] ?? s)

  const reprocannLabel = (s: string) => ({
    vigente: "Vigente", proximo_vencimiento: "Proximo a vencer",
    vencido: "VENCIDO", pendiente_vinculacion: "Sin vincular"
  }[s] ?? s)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Legajo - ${patient.full_name}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 24px; }
  h1 { font-size: 18px; margin-bottom: 2px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 4px; }
  .field label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; }
  .field span { font-size: 11px; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f8fafc; padding: 5px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f8fafc; font-size: 11px; }
  .ok { color: #166534; font-weight: 600; }
  .warn { color: #92400e; font-weight: 600; }
  .danger { color: #991b1b; font-weight: 600; }
  .footer { margin-top: 24px; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>${patient.full_name}</h1>
<div class="meta">DNI ${patient.dni} · Alta: ${formatDate(patient.created_at)} · Generado: ${now}</div>

<h2>Datos personales</h2>
<div class="grid">
  <div class="field"><label>Nombre completo</label><span>${patient.full_name}</span></div>
  <div class="field"><label>DNI</label><span>${patient.dni}</span></div>
  ${patient.birth_date ? `<div class="field"><label>Fecha de nacimiento</label><span>${formatDate(patient.birth_date)}</span></div>` : ""}
  ${patient.phone ? `<div class="field"><label>Telefono</label><span>${patient.phone}</span></div>` : ""}
  ${patient.email ? `<div class="field"><label>Email</label><span>${patient.email}</span></div>` : ""}
  ${patient.address ? `<div class="field"><label>Direccion</label><span>${patient.address}</span></div>` : ""}
  ${(patient as any).treating_physician ? `<div class="field"><label>Medico tratante</label><span>${(patient as any).treating_physician.full_name}</span></div>` : ""}
</div>

<h2>REPROCANN</h2>
<div class="grid">
  <div class="field"><label>Estado</label><span class="${patient.reprocann_status === "vigente" ? "ok" : patient.reprocann_status === "vencido" ? "danger" : "warn"}">${reprocannLabel(patient.reprocann_status)}</span></div>
  ${patient.reprocann_ref ? `<div class="field"><label>Numero</label><span>${patient.reprocann_ref}</span></div>` : ""}
  ${patient.reprocann_expiry ? `<div class="field"><label>Vencimiento</label><span>${formatDate(patient.reprocann_expiry)}</span></div>` : ""}
</div>

<h2>Checklist documental</h2>
<table>
<thead><tr><th>Documento</th><th>Obligatorio</th><th>Estado</th><th>Vencimiento</th></tr></thead>
<tbody>
${(documents ?? []).map((d: any) => `
<tr>
  <td>${d.doc_type?.name ?? "—"}</td>
  <td>${d.doc_type?.is_mandatory ? "Si" : "No"}</td>
  <td class="${d.status === "aprobado" ? "ok" : ["faltante","vencido"].includes(d.status) ? "danger" : "warn"}">${docStatusLabel(d.status)}</td>
  <td>${d.expires_at ? formatDate(d.expires_at) : "—"}</td>
</tr>`).join("")}
</tbody>
</table>

${(dispenses ?? []).length > 0 ? `
<h2>Ultimas dispensas</h2>
<table>
<thead><tr><th>Fecha</th><th>Producto</th><th>Lote</th><th>Cantidad</th></tr></thead>
<tbody>
${dispenses!.map((d: any) => `
<tr>
  <td>${formatDate(d.dispensed_at)}</td>
  <td>${d.product_desc}</td>
  <td style="font-family:monospace">${d.lot?.lot_code ?? "—"}</td>
  <td>${d.grams}g</td>
</tr>`).join("")}
</tbody>
</table>` : ""}

<div class="footer">
  <span>Sistema interno ONG Cannabis Medicinal</span>
  <span>Documento confidencial · ${now}</span>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="legajo-${patient.full_name.replace(/\s+/g, "-")}.html"`
    }
  })
}
'@
Set-Content -Path "src\app\api\export\patient-record\route.ts" -Value $content
Write-Host "[OK] API export legajo" -ForegroundColor Green

# ── API: checklist ONG ───────────────────────────────────────
$content = @'
import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const service = await createServiceClient()
  const { data: docs } = await service
    .from("org_documents")
    .select("*")
    .order("is_mandatory", { ascending: false })
    .order("doc_type").order("name")

  const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const total = (docs ?? []).length
  const aprobados = (docs ?? []).filter((d: any) => d.status === "aprobado").length

  const statusLabel = (s: string) => ({
    faltante: "FALTANTE", pendiente_revision: "Pendiente revision", aprobado: "Aprobado",
    observado: "Observado", vencido: "VENCIDO"
  }[s] ?? s)

  const typeLabel = (t: string) => ({
    estatuto: "Estatuto", acta: "Actas", autoridades: "Autoridades", afip_cuit: "AFIP/CUIT",
    igj: "IGJ", habilitacion: "Habilitacion", convenio: "Convenio", inmueble: "Inmueble",
    protocolo: "Protocolo", politica: "Politica", otro: "Otro"
  }[t] ?? t)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Documentacion ONG - ${now}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 24px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .meta { color: #64748b; margin-bottom: 8px; }
  .progress { background: #f1f5f9; border-radius: 4px; height: 8px; margin-bottom: 20px; }
  .progress-bar { background: ${aprobados === total ? "#16a34a" : aprobados/total > 0.7 ? "#d97706" : "#dc2626"}; height: 8px; border-radius: 4px; width: ${total > 0 ? Math.round((aprobados/total)*100) : 0}%; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; padding: 5px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f8fafc; }
  .ok { color: #166534; font-weight: 600; }
  .warn { color: #92400e; font-weight: 600; }
  .danger { color: #991b1b; font-weight: 600; }
  .footer { margin-top: 24px; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>Documentacion institucional ONG</h1>
<div class="meta">Generado el ${now} · ${aprobados}/${total} documentos aprobados (${total > 0 ? Math.round((aprobados/total)*100) : 0}%)</div>
<div class="progress"><div class="progress-bar"></div></div>
<table>
<thead><tr><th>Documento</th><th>Tipo</th><th>Obligatorio</th><th>Estado</th><th>Archivo</th></tr></thead>
<tbody>
${(docs ?? []).map((d: any) => `
<tr>
  <td>${d.name}</td>
  <td>${typeLabel(d.doc_type)}</td>
  <td>${d.is_mandatory ? "Si" : "No"}</td>
  <td class="${d.status === "aprobado" ? "ok" : d.status === "faltante" ? "danger" : "warn"}">${statusLabel(d.status)}</td>
  <td>${d.file_name ?? "—"}</td>
</tr>`).join("")}
</tbody>
</table>
<div class="footer">Sistema interno ONG Cannabis Medicinal · Documento confidencial · ${now}</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="documentacion-ong-${now.replace(/\//g, "-")}.html"`
    }
  })
}
'@
Set-Content -Path "src\app\api\export\org-docs\route.ts" -Value $content
Write-Host "[OK] API export ONG docs" -ForegroundColor Green

Write-Host ""
Write-Host "=== Todo instalado ===" -ForegroundColor Cyan
Write-Host "Agregar link a Exportar en el Sidebar manualmente" -ForegroundColor Yellow
Write-Host "Ejecuta: npx next dev" -ForegroundColor Green
