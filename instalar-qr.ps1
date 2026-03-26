# Modulo QR - ONG Cannabis Medicinal
Write-Host "=== Instalando modulo QR ===" -ForegroundColor Cyan

# Instalar libreria QR
Write-Host "Instalando qrcode..." -ForegroundColor Yellow
npm install qrcode @types/qrcode --save

# ── Carpetas necesarias ──────────────────────────────────────
New-Item -ItemType Directory -Force -Path "src\app\dispensas\qr" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\p\[token]" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\p\[token]\dashboard" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\l\[token]" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\qr\patient" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\qr\lot" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\qr\scan-patient" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\qr\scan-lot" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\qr\dispense" | Out-Null
New-Item -ItemType Directory -Force -Path "src\components\qr" | Out-Null

Write-Host "[OK] Carpetas creadas" -ForegroundColor Green

# ── API: generar QR de paciente ──────────────────────────────
$content = @'
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import QRCode from "qrcode"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { patientId } = await request.json()
  const service = await createServiceClient()

  const { data: patient } = await service
    .from("patients")
    .select("id, full_name, qr_token")
    .eq("id", patientId)
    .single()

  if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

  let token = patient.qr_token
  if (!token) {
    token = "pt_" + Math.random().toString(36).substr(2, 8)
    await service.from("patients").update({ qr_token: token }).eq("id", patientId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const qrUrl = `${appUrl}/p/${token}`
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" }
  })

  return NextResponse.json({ qrDataUrl, token, qrUrl, patientName: patient.full_name })
}
'@
Set-Content -Path "src\app\api\qr\patient\route.ts" -Value $content
Write-Host "[OK] API QR paciente" -ForegroundColor Green

# ── API: generar QR de lote ──────────────────────────────────
$content = @'
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import QRCode from "qrcode"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { lotId } = await request.json()
  const service = await createServiceClient()

  const { data: lot } = await service
    .from("lots")
    .select("id, lot_code, qr_token, genetic:genetics(name)")
    .eq("id", lotId)
    .single()

  if (!lot) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })

  let token = lot.qr_token
  if (!token) {
    token = "lt_" + Math.random().toString(36).substr(2, 8)
    await service.from("lots").update({ qr_token: token }).eq("id", lotId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const qrUrl = `${appUrl}/l/${token}`
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" }
  })

  return NextResponse.json({ qrDataUrl, token, qrUrl, lotCode: lot.lot_code, genetic: (lot as any).genetic?.name })
}
'@
Set-Content -Path "src\app\api\qr\lot\route.ts" -Value $content
Write-Host "[OK] API QR lote" -ForegroundColor Green

# ── API: scan paciente (lector USB) ─────────────────────────
$content = @'
import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const service = await createServiceClient()
  const { data: patient } = await service
    .from("patients")
    .select(`
      id, full_name, dni, status, compliance_status,
      reprocann_status, reprocann_expiry,
      membership_plan:membership_plans(name, monthly_grams, monthly_amount)
    `)
    .eq("qr_token", token)
    .is("deleted_at", null)
    .single()

  if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

  // Docs pendientes
  const { data: docs } = await service
    .from("patient_documents")
    .select("status")
    .eq("patient_id", patient.id)

  const docsCriticos = (docs ?? []).filter(d => ["faltante","vencido"].includes(d.status)).length
  const docsPendientes = (docs ?? []).filter(d => d.status === "pendiente_revision").length

  return NextResponse.json({ ...patient, docsCriticos, docsPendientes })
}
'@
Set-Content -Path "src\app\api\qr\scan-patient\route.ts" -Value $content
Write-Host "[OK] API scan paciente" -ForegroundColor Green

# ── API: scan lote (lector USB) ──────────────────────────────
$content = @'
import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const service = await createServiceClient()
  const { data: lot } = await service
    .from("lots")
    .select(`
      id, lot_code, status, harvest_date,
      genetic:genetics(name, description),
      room:rooms(name),
      stock_position:stock_positions(available_grams)
    `)
    .eq("qr_token", token)
    .single()

  if (!lot) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
  if (lot.status !== "finalizado") return NextResponse.json({ error: "Lote no disponible para dispensa" }, { status: 400 })

  return NextResponse.json(lot)
}
'@
Set-Content -Path "src\app\api\qr\scan-lot\route.ts" -Value $content
Write-Host "[OK] API scan lote" -ForegroundColor Green

# ── API: registrar dispensa desde QR ────────────────────────
$content = @'
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { patientId, lotId, grams, observations } = await request.json()
  if (!patientId || !lotId || !grams) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar stock
  const { data: stock } = await service
    .from("stock_positions")
    .select("available_grams")
    .eq("lot_id", lotId)
    .single()

  if (!stock || stock.available_grams < grams) {
    return NextResponse.json({ error: `Stock insuficiente. Disponible: ${stock?.available_grams ?? 0}g` }, { status: 400 })
  }

  const { data: dispense, error } = await service
    .from("dispenses")
    .insert({
      patient_id: patientId,
      lot_id: lotId,
      grams,
      product_desc: "flor seca",
      observations: observations || null,
      performed_by: user.id,
      dispensed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, dispense })
}
'@
Set-Content -Path "src\app\api\qr\dispense\route.ts" -Value $content
Write-Host "[OK] API dispensa QR" -ForegroundColor Green

# ── Componente QRDisplay ─────────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { Download, QrCode, Loader2, RefreshCw } from "lucide-react"

interface Props {
  entityId: string
  entityType: "patient" | "lot"
  entityName: string
  currentToken?: string | null
}

export default function QRDisplay({ entityId, entityType, entityName, currentToken }: Props) {
  const [qrData, setQrData] = useState<{ qrDataUrl: string; token: string; qrUrl: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateQR() {
    setLoading(true); setError(null)
    const body = entityType === "patient" ? { patientId: entityId } : { lotId: entityId }
    const res = await fetch(`/api/qr/${entityType === "patient" ? "patient" : "lot"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setQrData(data)
    setLoading(false)
  }

  function downloadQR() {
    if (!qrData) return
    const link = document.createElement("a")
    link.href = qrData.qrDataUrl
    link.download = `qr-${entityType}-${entityName.replace(/\s+/g, "-")}.png`
    link.click()
  }

  function printCard() {
    if (!qrData) return
    const win = window.open("", "_blank")
    if (!win) return
    const isPatient = entityType === "patient"
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${entityName}</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
          .card { background: white; border-radius: 16px; padding: 24px; text-align: center; width: 280px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; }
          .logo { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
          .qr-img { width: 200px; height: 200px; margin: 0 auto 16px; display: block; }
          .name { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }
          .token { font-family: monospace; font-size: 10px; color: #cbd5e1; margin-top: 12px; }
          .divider { border: none; border-top: 1px solid #f1f5f9; margin: 12px 0; }
          @media print { body { background: white; } .card { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Cannabis Medicinal · ONG</div>
          <img src="${qrData.qrDataUrl}" class="qr-img" alt="QR" />
          <hr class="divider" />
          <div class="name">${entityName}</div>
          ${isPatient ? '<div class="sub">Socio / Paciente</div>' : `<div class="sub">Lote de produccion</div>`}
          <div class="token">${qrData.token}</div>
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  if (!qrData) {
    return (
      <div>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button
          onClick={generateQR}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-3 py-1.5 hover:border-slate-400 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
          {currentToken ? "Ver QR" : "Generar QR"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <img src={qrData.qrDataUrl} alt="QR Code" className="w-40 h-40" />
      <p className="font-mono text-xs text-slate-400">{qrData.token}</p>
      <div className="flex gap-2">
        <button onClick={downloadQR} className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-white rounded px-3 py-1.5">
          <Download className="w-3.5 h-3.5" />Descargar
        </button>
        <button onClick={printCard} className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 rounded px-3 py-1.5">
          Imprimir tarjeta
        </button>
        <button onClick={() => setQrData(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
'@
Set-Content -Path "src\components\qr\QRDisplay.tsx" -Value $content
Write-Host "[OK] QRDisplay component" -ForegroundColor Green

# ── Pantalla de dispensa por QR ──────────────────────────────
$content = @'
"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Alert } from "@/components/ui"
import { ScanLine, CheckCircle2, AlertTriangle, Loader2, X, ArrowRight } from "lucide-react"

type Step = "scan-patient" | "scan-lot" | "confirm"

interface PatientData {
  id: string; full_name: string; status: string; compliance_status: string
  reprocann_status: string; reprocann_expiry: string | null
  membership_plan: { name: string; monthly_grams: number } | null
  docsCriticos: number; docsPendientes: number
}

interface LotData {
  id: string; lot_code: string; status: string
  genetic: { name: string; description: string | null } | null
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
  const [scanBuffer, setScanBuffer] = useState("")
  const patientInputRef = useRef<HTMLInputElement>(null)
  const lotInputRef = useRef<HTMLInputElement>(null)
  const gramsInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Auto-focus segun el paso
  useEffect(() => {
    if (step === "scan-patient") patientInputRef.current?.focus()
    if (step === "scan-lot") lotInputRef.current?.focus()
    if (step === "confirm") gramsInputRef.current?.focus()
  }, [step])

  async function scanPatient(value: string) {
    if (!value.trim()) return
    setLoading(true); setError(null)

    // Extraer token: puede venir como URL completa o solo el token
    const token = value.includes("/p/") ? value.split("/p/")[1] : value.trim()

    const res = await fetch(`/api/qr/scan-patient?token=${encodeURIComponent(token)}`)
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? "Paciente no encontrado"); setLoading(false); return }
    setPatient(data)
    setStep("scan-lot")
    setLoading(false)
  }

  async function scanLot(value: string) {
    if (!value.trim()) return
    setLoading(true); setError(null)

    const token = value.includes("/l/") ? value.split("/l/")[1] : value.trim()

    const res = await fetch(`/api/qr/scan-lot?token=${encodeURIComponent(token)}`)
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? "Lote no encontrado"); setLoading(false); return }
    setLot(data)
    setStep("confirm")
    setLoading(false)
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
    setSuccess(true)
    setLoading(false)
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
    patient.docsCriticos > 0 ||
    patient.status !== "activo"
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

      {/* Barra de progreso */}
      <div className="flex items-center gap-2">
        {(["scan-patient","scan-lot","confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
              step === s ? "bg-slate-900 text-white" :
              (step === "scan-lot" && i === 0) || (step === "confirm" && i <= 1) ? "bg-green-500 text-white" :
              "bg-slate-100 text-slate-400"
            }`}>
              {((step === "scan-lot" && i === 0) || (step === "confirm" && i <= 1)) ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-xs text-slate-500 hidden sm:block">
              {s === "scan-patient" ? "Paciente" : s === "scan-lot" ? "Lote" : "Confirmar"}
            </span>
            {i < 2 && <div className="flex-1 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* PASO 1: Scan paciente */}
      {step === "scan-patient" && (
        <div className="card-ong p-6 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ScanLine className="w-6 h-6 text-slate-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Escanear QR del paciente</h2>
            <p className="text-xs text-slate-500 mt-1">Con lector USB o ingresa el token manualmente</p>
          </div>
          <input
            ref={patientInputRef}
            type="text"
            placeholder="Escanear o escribir token..."
            className="input-ong text-center font-mono text-sm"
            onKeyDown={e => e.key === "Enter" && scanPatient((e.target as HTMLInputElement).value)}
            autoFocus
          />
          <button
            onClick={() => {
              const val = patientInputRef.current?.value ?? ""
              scanPatient(val)
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Identificar paciente
          </button>
        </div>
      )}

      {/* PASO 2: Paciente identificado + scan lote */}
      {step === "scan-lot" && patient && (
        <div className="space-y-3">
          {/* Card paciente */}
          <div className={`card-ong p-4 border-l-4 ${
            patient.status !== "activo" ? "border-l-red-500" :
            hasWarnings ? "border-l-amber-500" : "border-l-green-500"
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-lg">{patient.full_name}</p>
                <p className="text-sm text-slate-500">{patient.membership_plan?.name ?? "Sin plan"}</p>
              </div>
              <span className={`text-xs rounded px-2 py-1 border font-medium ${
                patient.status === "activo" ? "bg-green-50 text-green-700 border-green-200" :
                "bg-red-50 text-red-700 border-red-200"
              }`}>
                {patient.status === "activo" ? "Activo" : patient.status}
              </span>
            </div>
            {hasWarnings && (
              <div className="mt-3 space-y-1">
                {patient.status !== "activo" && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertTriangle className="w-3.5 h-3.5" />Paciente no activo — verificar antes de dispensar
                  </div>
                )}
                {patient.reprocann_status === "vencido" && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertTriangle className="w-3.5 h-3.5" />REPROCANN vencido
                  </div>
                )}
                {patient.reprocann_status === "proximo_vencimiento" && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />REPROCANN proximo a vencer
                  </div>
                )}
                {patient.docsCriticos > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />{patient.docsCriticos} documento{patient.docsCriticos > 1 ? "s" : ""} faltante{patient.docsCriticos > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scan lote */}
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
            <button
              onClick={() => scanLot(lotInputRef.current?.value ?? "")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Identificar lote
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Confirmar cantidad */}
      {step === "confirm" && patient && lot && (
        <div className="space-y-3">
          {/* Resumen paciente */}
          <div className={`card-ong p-4 border-l-4 ${hasWarnings ? "border-l-amber-500" : "border-l-green-500"}`}>
            <p className="font-semibold text-slate-900">{patient.full_name}</p>
            <p className="text-xs text-slate-500">{patient.membership_plan?.name ?? "Sin plan"}</p>
          </div>

          {/* Info lote */}
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

          {/* Input cantidad */}
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
Write-Host "[OK] Pantalla dispensa QR" -ForegroundColor Green

# ── Vista publica del paciente /p/[token] ────────────────────
$content = @'
import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

export default async function PublicPatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: patient } = await service
    .from("patients")
    .select("id, full_name, status, membership_plan:membership_plans(name)")
    .eq("qr_token", token)
    .is("deleted_at", null)
    .single()

  if (!patient) notFound()

  const isActive = patient.status === "activo"
  const firstName = patient.full_name.split(" ")[0]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Header ONG */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Cannabis Medicinal</p>
        </div>

        {/* Estado */}
        <div className={`rounded-2xl p-5 text-center border ${isActive ? "bg-green-950/50 border-green-800" : "bg-red-950/50 border-red-800"}`}>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3 ${isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-red-400"}`} />
            {isActive ? "Socio activo" : "Socio inactivo"}
          </div>
          <h1 className="text-2xl font-bold text-white">{firstName}</h1>
          {patient.membership_plan && (
            <p className="text-sm text-slate-400 mt-1">{(patient.membership_plan as any).name}</p>
          )}
        </div>

        {/* Info publica */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Informacion del socio</p>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-sm text-slate-300">Estado</span>
            <span className={`text-sm font-medium ${isActive ? "text-green-400" : "text-red-400"}`}>
              {isActive ? "Al dia" : "Revisar"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-slate-300">Plan</span>
            <span className="text-sm text-white">{(patient.membership_plan as any)?.name ?? "—"}</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600">
          Esta credencial es personal e intransferible.
        </p>
      </div>
    </div>
  )
}
'@
Set-Content -Path "src\app\p\[token]\page.tsx" -Value $content
Write-Host "[OK] Vista publica paciente" -ForegroundColor Green

# ── Vista publica del lote /l/[token] ────────────────────────
$content = @'
import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

export default async function PublicLotPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: lot } = await service
    .from("lots")
    .select("*, genetic:genetics(name, description), room:rooms(name)")
    .eq("qr_token", token)
    .single()

  if (!lot) notFound()

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Cannabis Medicinal</p>
        </div>

        {/* Producto */}
        <div className="bg-green-950/50 rounded-2xl p-5 border border-green-800 text-center">
          <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Producto medicinal</p>
          <h1 className="text-3xl font-bold text-white mb-1">
            {(lot as any).genetic?.name ?? "Flor seca"}
          </h1>
          {(lot as any).genetic?.description && (
            <p className="text-sm text-slate-400">{(lot as any).genetic.description}</p>
          )}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs text-slate-300">Produccion propia</span>
          </div>
        </div>

        {/* Trazabilidad */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Trazabilidad</p>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-sm text-slate-300">Codigo de lote</span>
            <span className="text-sm font-mono text-white">{lot.lot_code}</span>
          </div>
          {(lot as any).room?.name && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-sm text-slate-300">Sala de produccion</span>
              <span className="text-sm text-white">{(lot as any).room.name}</span>
            </div>
          )}
          {lot.start_date && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-sm text-slate-300">Inicio de ciclo</span>
              <span className="text-sm text-white">{formatDate(lot.start_date)}</span>
            </div>
          )}
          {lot.harvest_date && (
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-300">Fecha de cosecha</span>
              <span className="text-sm text-white">{formatDate(lot.harvest_date)}</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600">
          Produccion organica · Uso medicinal exclusivo
        </p>
      </div>
    </div>
  )
}
'@
Set-Content -Path "src\app\l\[token]\page.tsx" -Value $content
Write-Host "[OK] Vista publica lote" -ForegroundColor Green

# ── Agregar boton QR a ficha de paciente ─────────────────────
# (Solo el componente QRDisplay que se agrega manualmente)

Write-Host ""
Write-Host "=== Modulo QR instalado ===" -ForegroundColor Cyan
Write-Host "Archivos pendientes de copiar manualmente (carpetas con corchetes):" -ForegroundColor Yellow
Write-Host "  - src/app/p/[token]/page.tsx" -ForegroundColor Yellow
Write-Host "  - src/app/l/[token]/page.tsx" -ForegroundColor Yellow
Write-Host "Ejecuta: npx next dev" -ForegroundColor Green
