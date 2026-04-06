content = '''"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { FileText, CheckCircle2, Loader2, Shield, AlertCircle } from "lucide-react"

interface Template {
  id: string
  name: string
  version: number
  content: string
}

interface Signature {
  id: string
  status: string
  signed_at: string | null
  signer_name: string | null
  document_hash: string | null
}

export default function FirmaDocumento({ patientId, patientName, patientDni }: { 
  patientId: string
  patientName: string
  patientDni: string
}) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [signature, setSignature] = useState<Signature | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<"ver" | "datos" | "otp" | "firmado">("ver")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDoc, setShowDoc] = useState(false)
  
  // Datos del formulario
  const [signerName, setSignerName] = useState("")
  const [signerDni, setSignerDni] = useState("")
  const [category, setCategory] = useState("")
  const [reprocannCode, setReprocannCode] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [signatureId, setSignatureId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const [templateRes, sigRes] = await Promise.all([
        supabase.from("document_templates").select("id, name, version, content").eq("slug", "solicitud-membresia").eq("is_active", true).single(),
        supabase.from("document_signatures").select("id, status, signed_at, signer_name, document_hash").eq("patient_id", patientId).eq("status", "firmado").maybeSingle()
      ])
      setTemplate(templateRes.data)
      setSignature(sigRes.data)
      if (sigRes.data?.status === "firmado") setStep("firmado")
      setLoading(false)
    }
    load()
  }, [patientId])

  async function requestOTP() {
    if (!signerName || !signerDni || !category) { setError("Completa todos los campos requeridos"); return }
    setSubmitting(true); setError(null)
    const res = await fetch("/api/signatures/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId, template_id: template?.id })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }
    setSignatureId(data.signature_id)
    setStep("otp")
    setSubmitting(false)
  }

  async function signDocument() {
    if (!otpCode || otpCode.length !== 6) { setError("Ingresa el codigo de 6 digitos"); return }
    setSubmitting(true); setError(null)
    const res = await fetch("/api/signatures/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        template_id: template?.id,
        otp_code: otpCode,
        signer_name: signerName,
        signer_dni: signerDni,
        patient_category: category,
        reprocann_code: reprocannCode || null
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }
    setStep("firmado")
    setSignature({ id: signatureId!, status: "firmado", signed_at: data.signed_at, signer_name: signerName, document_hash: data.document_hash })
    setSubmitting(false)
  }

  if (loading) return null

  if (step === "firmado" && signature) {
    return (
      <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "16px", padding: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <CheckCircle2 size={16} color="#4ade80" />
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#4ade80" }}>Documento firmado</p>
        </div>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
          Firmado el {signature.signed_at ? new Date(signature.signed_at).toLocaleString("es-AR") : "-"}
        </p>
        {signature.document_hash && (
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace", wordBreak: "break-all" }}>
            Hash: {signature.document_hash}
          </p>
        )}
      </div>
    )
  }

  if (!template) return null

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "16px", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <AlertCircle size={14} color="#fbbf24" />
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#fbbf24" }}>Documento pendiente de firma</p>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#f87171", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      {/* Ver documento */}
      <button onClick={() => setShowDoc(!showDoc)}
        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "10px", textDecoration: "underline" }}>
        <FileText size={12} />
        {showDoc ? "Ocultar documento" : "Leer documento completo"}
      </button>

      {showDoc && (
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "10px", padding: "12px", maxHeight: "300px", overflowY: "auto", marginBottom: "12px", fontSize: "10px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "serif" }}>
          {template.content}
        </div>
      )}

      {step === "ver" && (
        <button onClick={() => setStep("datos")}
          style={{ width: "100%", background: "#2d5a27", color: "#a8e095", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Shield size={14} />
          Firmar documento
        </button>
      )}

      {step === "datos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Nombre completo *</p>
            <input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder={patientName}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>DNI *</p>
            <input value={signerDni} onChange={e => setSignerDni(e.target.value)} placeholder={patientDni}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Categoria de ingreso *</p>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }}>
              <option value="" style={{ background: "#0f1f12" }}>Seleccionar...</option>
              <option value="paciente_adherente" style={{ background: "#0f1f12" }}>Paciente adherente (con REPROCANN vigente)</option>
              <option value="paciente_excepcion" style={{ background: "#0f1f12" }}>Paciente con excepcion (auto-cultivador)</option>
              <option value="paciente_tramite" style={{ background: "#0f1f12" }}>Paciente en tramite (sin REPROCANN aun)</option>
            </select>
          </div>
          {(category === "paciente_adherente" || category === "paciente_excepcion") && (
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Codigo REPROCANN *</p>
              <input value={reprocannCode} onChange={e => setReprocannCode(e.target.value)} placeholder="Codigo de vinculacion"
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
            </div>
          )}
          {category === "paciente_tramite" && (
            <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "8px 12px", fontSize: "11px", color: "#fbbf24" }}>
              Codigo REPROCANN: EN TRAMITE - Recorda presentarlo dentro de los 30 dias de obtenerlo.
            </div>
          )}
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px" }}>
            Al continuar, confirmas que leiste el documento completo y que la firma electronica que realizaras tiene validez legal conforme a la Ley 25.506.
          </div>
          <button onClick={requestOTP} disabled={submitting || !signerName || !signerDni || !category}
            style={{ width: "100%", background: "#2d5a27", color: "#a8e095", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: !signerName || !signerDni || !category ? 0.5 : 1 }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
            {submitting ? "Enviando codigo..." : "Recibir codigo de verificacion por email"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ background: "rgba(45,90,39,0.2)", border: "1px solid rgba(77,138,61,0.3)", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#a8e095" }}>
            Te enviamos un codigo de 6 digitos a tu email. Vence en 10 minutos.
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Codigo de verificacion *</p>
            <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} 
              placeholder="000000" maxLength={6}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px", fontSize: "24px", color: "white", outline: "none", textAlign: "center", letterSpacing: "8px", fontFamily: "monospace" }} />
          </div>
          <button onClick={signDocument} disabled={submitting || otpCode.length !== 6}
            style={{ width: "100%", background: "#2d5a27", color: "#a8e095", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: otpCode.length !== 6 ? 0.5 : 1 }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {submitting ? "Firmando..." : "Confirmar y firmar"}
          </button>
          <button onClick={() => { setStep("datos"); setOtpCode(""); setError(null) }}
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Volver / Reenviar codigo
          </button>
        </div>
      )}
    </div>
  )
}'''

with open("src/app/mi-perfil/FirmaDocumento.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("OK - " + str(len(content.splitlines())) + " lineas")
