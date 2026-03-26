# Portal paciente completo
Write-Host "=== Instalando portal de paciente ===" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "src\app\mi-perfil" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\mi-perfil\documentos" | Out-Null

# ── Dashboard layout con redirect paciente ───────────────────
$content = @'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/Sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || !profile.is_active) redirect("/login")
  if (profile.role === "paciente") redirect("/mi-perfil")
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
Set-Content -Path "src\app\dashboard\layout.tsx" -Value $content
Write-Host "[OK] Dashboard layout" -ForegroundColor Green

# ── Portal principal del paciente ────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatDate, formatGrams } from "@/lib/utils"
import Link from "next/link"
import LogoutButton from "./LogoutButton"

export default async function MiPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, patient:patients(*, membership_plan:membership_plans(name, monthly_grams, monthly_amount))").eq("id", user.id).single()

  if (!profile) redirect("/login")
  if (profile.role !== "paciente") redirect("/dashboard")

  const patient = (profile as any).patient

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
            <span className="text-white text-sm font-bold">ONG</span>
          </div>
          <h1 className="text-xl font-bold">Hola, {profile.full_name}</h1>
          <p className="text-slate-400 text-sm">Tu cuenta esta siendo configurada por el equipo. En breve vas a poder ver tu informacion.</p>
          <LogoutButton />
        </div>
      </div>
    )
  }

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: dispenses } = await supabase
    .from("dispenses")
    .select("id, dispensed_at, grams, lot:lots(lot_code, genetic:genetics(name))")
    .eq("patient_id", patient.id)
    .gte("dispensed_at", oneYearAgo.toISOString())
    .order("dispensed_at", { ascending: false })

  const { data: allDispenses } = await supabase
    .from("dispenses").select("id, grams").eq("patient_id", patient.id)

  const { data: docs } = await supabase
    .from("patient_documents")
    .select("*, doc_type:patient_document_types(name, slug, has_expiry)")
    .eq("patient_id", patient.id)
    .order("doc_type(sort_order)")

  const dispenseList = (dispenses ?? []) as any[]
  const allList = (allDispenses ?? []) as any[]
  const docList = (docs ?? []) as any[]

  const totalGramsYear = dispenseList.reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const totalDispenses = allList.length
  const totalGramsAll = allList.reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const avgMonthly = totalGramsYear / 12
  const plan = patient.membership_plan as any

  const geneticCount: Record<string, number> = {}
  for (const d of dispenseList) {
    const name = d.lot?.genetic?.name ?? "Sin especificar"
    geneticCount[name] = (geneticCount[name] ?? 0) + d.grams
  }
  const topGenetic = Object.entries(geneticCount).sort((a, b) => b[1] - a[1])[0]

  const lastDispense = dispenseList[0]
  const daysSinceLast = lastDispense
    ? Math.floor((Date.now() - new Date(lastDispense.dispensed_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const docsOk = docList.every(d => ["aprobado","pendiente_vinculacion"].includes(d.status))
  const docsFaltantes = docList.filter(d => ["faltante","vencido","observado"].includes(d.status)).length
  const docsPendientes = docList.filter(d => d.status === "pendiente_revision").length

  const firstName = patient.full_name.split(" ")[0]
  const isActive = patient.status === "activo"

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <LogoutButton />
        </div>

        {/* Saludo */}
        <div>
          <h1 className="text-3xl font-black text-white">Hola, {firstName}</h1>
          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full ${isActive ? "bg-green-500/20" : "bg-red-500/20"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            <span className={`text-xs font-medium ${isActive ? "text-green-400" : "text-red-400"}`}>
              {isActive ? "Socio activo" : "Cuenta inactiva"}
            </span>
          </div>
        </div>

        {/* Stat principal */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ultimo año</p>
          <p className="text-5xl font-black text-white mb-1">
            {totalGramsYear.toFixed(0)}<span className="text-2xl text-slate-400 font-normal">g</span>
          </p>
          <p className="text-sm text-slate-400">consumidos en 12 meses</p>
          {plan?.monthly_grams && (
            <div className="mt-3 bg-slate-700/50 rounded-xl p-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Uso promedio mensual</span>
                <span>{avgMonthly.toFixed(1)}g / {plan.monthly_grams}g</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-400" style={{ width: `${Math.min((avgMonthly / plan.monthly_grams) * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Grid stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{totalDispenses}</p>
            <p className="text-xs text-slate-400 mt-0.5">Retiros totales</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{totalGramsAll.toFixed(0)}<span className="text-base text-slate-400">g</span></p>
            <p className="text-xs text-slate-400 mt-0.5">Acumulado total</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{avgMonthly.toFixed(1)}<span className="text-base text-slate-400">g</span></p>
            <p className="text-xs text-slate-400 mt-0.5">Promedio mensual</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{daysSinceLast ?? "—"}<span className="text-base text-slate-400">{daysSinceLast !== null ? "d" : ""}</span></p>
            <p className="text-xs text-slate-400 mt-0.5">Desde ultima visita</p>
          </div>
        </div>

        {/* Genetica preferida */}
        {topGenetic && (
          <div className="bg-green-950/40 rounded-2xl p-5 border border-green-800/50">
            <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Genetica preferida</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">{topGenetic[0]}</p>
                <p className="text-xs text-slate-400">{topGenetic[1].toFixed(1)}g consumidos</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">🌿</div>
            </div>
          </div>
        )}

        {/* Documentacion */}
        <Link href="/mi-perfil/documentos" className="block">
          <div className={`rounded-2xl p-5 border ${docsOk ? "bg-green-950/30 border-green-800/50" : "bg-amber-950/30 border-amber-800/50"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Mis documentos</p>
                <p className={`text-sm font-semibold ${docsOk ? "text-green-400" : "text-amber-400"}`}>
                  {docsOk ? "Todo en orden" : `${docsFaltantes} faltante${docsFaltantes > 1 ? "s" : ""}${docsPendientes > 0 ? ` · ${docsPendientes} pendiente${docsPendientes > 1 ? "s" : ""}` : ""}`}
                </p>
                <p className="text-xs text-slate-500 mt-1">Toca para ver y subir documentos</p>
              </div>
              <span className="text-2xl">{docsOk ? "✓" : "⚠"}</span>
            </div>
          </div>
        </Link>

        {/* Membresia */}
        {plan && (
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Tu plan</p>
            <p className="text-lg font-bold text-white">{plan.name}</p>
            {plan.monthly_grams && <p className="text-sm text-slate-400">{plan.monthly_grams}g por mes incluidos</p>}
          </div>
        )}

        {/* Ultimas dispensas */}
        {dispenseList.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Ultimas visitas</p>
            <div className="space-y-2">
              {dispenseList.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white">{formatDate(d.dispensed_at)}</p>
                    <p className="text-xs text-slate-500">{d.lot?.genetic?.name ?? "Flor seca"}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-300">{formatGrams(d.grams)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-700 pb-4">
          Socio desde {formatDate(patient.created_at)} · Uso exclusivamente medicinal
        </p>
      </div>
    </div>
  )
}
'@
Set-Content -Path "src\app\mi-perfil\page.tsx" -Value $content
Write-Host "[OK] Portal paciente principal" -ForegroundColor Green

# ── Logout button ────────────────────────────────────────────
$content = @'
"use client"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
  const router = useRouter()
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }
  return (
    <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
      <LogOut className="w-3.5 h-3.5" />Salir
    </button>
  )
}
'@
Set-Content -Path "src\app\mi-perfil\LogoutButton.tsx" -Value $content
Write-Host "[OK] LogoutButton" -ForegroundColor Green

# ── Pagina de documentos del paciente ────────────────────────
$content = @'
"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, RefreshCw, Trash2, Eye, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  faltante:             { label: "Faltante",           color: "text-red-400",    icon: XCircle },
  pendiente_revision:   { label: "En revision",        color: "text-amber-400",  icon: Clock },
  aprobado:             { label: "Aprobado",            color: "text-green-400",  icon: CheckCircle2 },
  observado:            { label: "Observado",           color: "text-orange-400", icon: AlertCircle },
  vencido:              { label: "Vencido",             color: "text-red-400",    icon: XCircle },
  pendiente_vinculacion:{ label: "Sin vincular",        color: "text-slate-400",  icon: Clock },
}

interface DocItem {
  id: string; status: string; file_path: string | null; file_name: string | null
  expires_at: string | null; observations: string | null; patient_id: string
  doc_type: { name: string; slug: string; has_expiry: boolean; is_mandatory: boolean } | null
}

export default function MisDocumentosPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [patientId, setPatientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showExpiry, setShowExpiry] = useState<{ docId: string; file: File } | null>(null)
  const [expiry, setExpiry] = useState("")
  const router = useRouter()
  const inputRefs = useRef<Record<string, HTMLInputElement>>({})

  useEffect(() => {
    loadDocs()
  }, [])

  async function loadDocs() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("patient_id").eq("id", user.id).single()

    if (!profile?.patient_id) { setLoading(false); return }
    setPatientId(profile.patient_id)

    const { data } = await supabase
      .from("patient_documents")
      .select("*, doc_type:patient_document_types(name, slug, has_expiry, is_mandatory)")
      .eq("patient_id", profile.patient_id)
      .order("doc_type(sort_order)")

    setDocs((data ?? []) as DocItem[])
    setLoading(false)
  }

  async function handleFileSelect(docId: string, file: File, hasExpiry: boolean) {
    if (hasExpiry) {
      setShowExpiry({ docId, file })
    } else {
      await uploadFile(docId, file, "")
    }
  }

  async function uploadFile(docId: string, file: File, expiryDate: string) {
    setUploading(docId)
    setShowExpiry(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !patientId) { setUploading(null); return }

    const doc = docs.find(d => d.id === docId)
    const slug = doc?.doc_type?.slug ?? "doc"

    // Eliminar archivo anterior
    if (doc?.file_path) {
      await supabase.storage.from("patient-documents").remove([doc.file_path])
    }

    const ext = file.name.split(".").pop()
    const path = `${patientId}/${slug}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("patient-documents").upload(path, file, { upsert: true })

    if (uploadError) { alert("Error al subir: " + uploadError.message); setUploading(null); return }

    const updateData: any = {
      file_path: path, file_name: file.name, file_size_bytes: file.size,
      status: "pendiente_revision", uploaded_by: user.id,
      uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    if (expiryDate) updateData.expires_at = expiryDate

    await supabase.from("patient_documents").update(updateData).eq("id", docId)
    setUploading(null)
    loadDocs()
  }

  async function deleteFile(docId: string, filePath: string, slug: string) {
    if (!confirm("Eliminar este archivo?")) return
    setUploading(docId)
    const supabase = createClient()
    await supabase.storage.from("patient-documents").remove([filePath])
    await supabase.from("patient_documents").update({
      file_path: null, file_name: null, file_size_bytes: null,
      status: slug === "reprocann" ? "pendiente_vinculacion" : "faltante",
      uploaded_by: null, uploaded_at: null, expires_at: null,
      observations: null, updated_at: new Date().toISOString(),
    }).eq("id", docId)
    setUploading(null)
    loadDocs()
  }

  async function viewFile(filePath: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from("patient-documents").createSignedUrl(filePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/mi-perfil")} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Mis documentos</h1>
            <p className="text-xs text-slate-400">Subi tus documentos para que el equipo los revise</p>
          </div>
        </div>

        {/* Expiry modal */}
        {showExpiry && (
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-600 space-y-3">
            <p className="text-sm font-medium text-white">Fecha de vencimiento del documento</p>
            <p className="text-xs text-slate-400">Ingresa la fecha que figura en el REPROCANN</p>
            <input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowExpiry(null); setExpiry("") }}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm"
              >Cancelar</button>
              <button
                disabled={!expiry}
                onClick={() => uploadFile(showExpiry.docId, showExpiry.file, expiry)}
                className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50"
              >Subir</button>
            </div>
          </div>
        )}

        {/* Lista de documentos */}
        <div className="space-y-3">
          {docs.map(doc => {
            const config = DOC_STATUS_CONFIG[doc.status] ?? DOC_STATUS_CONFIG.faltante
            const Icon = config.icon
            const isLoading = uploading === doc.id

            return (
              <div key={doc.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{doc.doc_type?.name}</p>
                      {doc.doc_type?.is_mandatory && (
                        <span className="text-xs text-slate-500">Obligatorio</span>
                      )}
                    </div>
                    {doc.file_name && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{doc.file_name}</p>
                    )}
                    {doc.expires_at && (
                      <p className="text-xs text-amber-400 mt-0.5">
                        Vence: {new Date(doc.expires_at).toLocaleDateString("es-AR")}
                      </p>
                    )}
                    {doc.observations && (
                      <p className="text-xs text-orange-400 mt-0.5">Obs: {doc.observations}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{config.label}</span>
                  </div>
                </div>

                {/* Acciones */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Ver archivo */}
                    {doc.file_path && (
                      <button
                        onClick={() => viewFile(doc.file_path!)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />Ver
                      </button>
                    )}

                    {/* Subir / reemplazar */}
                    {doc.status !== "aprobado" && (
                      <>
                        <input
                          ref={el => { if (el) inputRefs.current[doc.id] = el }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect(doc.id, file, doc.doc_type?.has_expiry ?? false)
                            e.target.value = ""
                          }}
                        />
                        <button
                          onClick={() => inputRefs.current[doc.id]?.click()}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 text-xs text-white hover:bg-white/20 transition-colors"
                        >
                          {doc.file_path
                            ? <><RefreshCw className="w-3.5 h-3.5" />Reemplazar</>
                            : <><Upload className="w-3.5 h-3.5" />Subir</>
                          }
                        </button>
                      </>
                    )}

                    {/* Eliminar */}
                    {doc.file_path && doc.status !== "aprobado" && (
                      <button
                        onClick={() => deleteFile(doc.id, doc.file_path!, doc.doc_type?.slug ?? "")}
                        className="p-2 rounded-xl border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Aprobado - solo lectura */}
                    {doc.status === "aprobado" && (
                      <p className="text-xs text-slate-500 flex-1 text-center">Documento aprobado por el equipo</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            Los documentos subidos son revisados por el equipo de la ONG. Una vez aprobados no pueden ser modificados.
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 pb-4">
          Sistema interno ONG Cannabis Medicinal
        </p>
      </div>
    </div>
  )
}
'@
Set-Content -Path "src\app\mi-perfil\documentos\page.tsx" -Value $content
Write-Host "[OK] Pagina mis documentos" -ForegroundColor Green

# ── Actualizar modal de crear usuario para vincular paciente ─
$content = @'
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewUserModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [role, setRole] = useState("")
  const [patients, setPatients] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    if (open && role === "paciente") {
      loadPatients()
    }
  }, [open, role])

  async function loadPatients() {
    const supabase = createClient()
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, dni")
      .is("deleted_at", null)
      .order("full_name")
    setPatients(data ?? [])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        full_name: form.get("full_name"),
        role: form.get("role"),
        patient_id: form.get("patient_id") || null,
      })
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Error al crear usuario"); setLoading(false); return }

    setSuccess(true); setLoading(false)
    setTimeout(() => { setOpen(false); setSuccess(false); setRole(""); router.refresh() }, 1500)
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo usuario</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nuevo usuario</h2>
            <button onClick={() => { setOpen(false); setRole("") }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">Usuario creado correctamente.</Alert>}
            <div><label className="label-ong">Nombre completo *</label><input name="full_name" required className="input-ong" placeholder="Apellido, Nombre" /></div>
            <div><label className="label-ong">Email *</label><input name="email" type="email" required className="input-ong" placeholder="usuario@email.com" /></div>
            <div><label className="label-ong">Contrasena inicial *</label><input name="password" type="password" required minLength={8} className="input-ong" placeholder="Minimo 8 caracteres" /></div>
            <div>
              <label className="label-ong">Rol *</label>
              <select name="role" required className="input-ong" value={role} onChange={e => setRole(e.target.value)}>
                <option value="">Selecciona un rol...</option>
                <option value="administrativo">Administrativo</option>
                <option value="medico">Medico</option>
                <option value="biologo">Biologo</option>
                <option value="paciente">Paciente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {role === "paciente" && (
              <div>
                <label className="label-ong">Vincular con paciente *</label>
                <select name="patient_id" required className="input-ong">
                  <option value="">Selecciona el paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} — DNI {p.dni}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">El usuario podra ver y gestionar su propio legajo.</p>
              </div>
            )}

            <p className="text-xs text-slate-500">El usuario debera cambiar su contrasena al primer ingreso.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setOpen(false); setRole("") }}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear usuario</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
'@
Set-Content -Path "src\app\usuarios\NewUserModal.tsx" -Value $content
Write-Host "[OK] NewUserModal con vinculacion paciente" -ForegroundColor Green

# ── Actualizar API create-user para guardar patient_id ───────
$content = @'
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { email, password, full_name, role, patient_id } = await request.json()
  if (!email || !password || !full_name || !role) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email, password, email_confirm: true
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const profileData: any = { id: authData.user.id, full_name, role }
  if (patient_id) profileData.patient_id = patient_id

  const { error: profileError } = await service.from("profiles").insert(profileData)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
'@
Set-Content -Path "src\app\api\admin\create-user\route.ts" -Value $content
Write-Host "[OK] API create-user con patient_id" -ForegroundColor Green

Write-Host ""
Write-Host "=== Portal de paciente instalado ===" -ForegroundColor Cyan
Write-Host "Ejecuta: npx next dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Flujo para crear un usuario paciente:" -ForegroundColor White
Write-Host "1. Ir a Usuarios > Nuevo usuario" -ForegroundColor Gray
Write-Host "2. Seleccionar rol 'Paciente'" -ForegroundColor Gray
Write-Host "3. Vincular con el paciente existente" -ForegroundColor Gray
Write-Host "4. El paciente ingresa con su email/contrasena" -ForegroundColor Gray
Write-Host "5. Ve su portal en /mi-perfil" -ForegroundColor Gray
