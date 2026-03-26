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
