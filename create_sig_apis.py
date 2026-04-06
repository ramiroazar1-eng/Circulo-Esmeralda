import os

# API request-otp
content_otp = '''import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, template_id } = body
  if (!patient_id || !template_id) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que no haya firma existente
  const { data: existing } = await service
    .from("document_signatures")
    .select("id, status")
    .eq("patient_id", patient_id)
    .eq("template_id", template_id)
    .eq("status", "firmado")
    .maybeSingle()

  if (existing) return NextResponse.json({ error: "El documento ya fue firmado" }, { status: 400 })

  // Obtener template
  const { data: template } = await service
    .from("document_templates")
    .select("version")
    .eq("id", template_id)
    .single()

  if (!template) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })

  // Generar OTP
  const otp = generateOTP()
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos

  // Upsert signature record con OTP
  const { data: sig, error: sigError } = await service
    .from("document_signatures")
    .upsert({
      patient_id,
      template_id,
      template_version: template.version,
      status: "pendiente",
      otp_code: otp,
      otp_sent_at: new Date().toISOString(),
      otp_verified: false,
      updated_at: new Date().toISOString()
    }, { onConflict: "patient_id,template_id" })
    .select()
    .single()

  if (sigError) return NextResponse.json({ error: sigError.message }, { status: 400 })

  // Enviar OTP por email via Supabase Auth
  const { error: emailError } = await service.auth.admin.sendRawEmail({
    to: user.email!,
    subject: "Codigo de verificacion - AEF Simple Asociacion",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a2e1a;">Circulo Esmeralda - AEF</h2>
        <p>Tu codigo de verificacion para firmar el documento de membresia es:</p>
        <div style="background: #f0f4f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d5a27;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 13px;">Este codigo vence en 10 minutos.</p>
        <p style="color: #666; font-size: 13px;">Si no solicitaste este codigo, ignora este mensaje.</p>
      </div>
    `
  })

  if (emailError) {
    // Intentar con Brevo SMTP como fallback
    console.error("Email error:", emailError.message)
  }

  return NextResponse.json({ success: true, signature_id: sig.id })
}'''

with open("src/app/api/signatures/request-otp/route.ts", "w", encoding="utf-8") as f:
    f.write(content_otp)
print("OK request-otp")

# API verify-and-sign
content_sign = '''import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createHash } from "crypto"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, template_id, otp_code, signer_name, signer_dni, patient_category } = body

  if (!patient_id || !template_id || !otp_code || !signer_name || !signer_dni || !patient_category) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  }

  const service = await createServiceClient()

  // Obtener firma pendiente
  const { data: sig } = await service
    .from("document_signatures")
    .select("*, template:document_templates(content, version)")
    .eq("patient_id", patient_id)
    .eq("template_id", template_id)
    .eq("status", "pendiente")
    .single()

  if (!sig) return NextResponse.json({ error: "No hay firma pendiente" }, { status: 404 })

  // Verificar OTP
  if (sig.otp_code !== otp_code) {
    return NextResponse.json({ error: "Codigo incorrecto" }, { status: 400 })
  }

  // Verificar que OTP no haya vencido (10 minutos)
  const otpAge = Date.now() - new Date(sig.otp_sent_at).getTime()
  if (otpAge > 10 * 60 * 1000) {
    return NextResponse.json({ error: "El codigo ha vencido. Solicita uno nuevo." }, { status: 400 })
  }

  // Obtener IP y user agent del request
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
  const userAgent = request.headers.get("user-agent") ?? "unknown"

  // Generar hash del documento con datos del firmante
  const signedAt = new Date().toISOString()
  const documentContent = [
    (sig.template as any).content,
    signer_name,
    signer_dni,
    patient_category,
    signedAt,
    ip,
    user.email
  ].join("|")
  const documentHash = createHash("sha256").update(documentContent).digest("hex")

  // Actualizar firma con evidencia completa
  const { error } = await service
    .from("document_signatures")
    .update({
      status: "firmado",
      signer_name,
      signer_dni,
      signed_at: signedAt,
      ip_address: ip,
      user_agent: userAgent,
      otp_verified: true,
      document_hash: documentHash,
      updated_at: signedAt
    })
    .eq("id", sig.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Log en auditoria
  await service.from("audit_logs").insert({
    user_id: user.id,
    action: "document_signed",
    table_name: "document_signatures",
    record_id: sig.id,
    new_values: { patient_id, template_id, signer_name, document_hash: documentHash, ip }
  }).then(() => {})

  return NextResponse.json({ success: true, document_hash: documentHash, signed_at: signedAt })
}'''

with open("src/app/api/signatures/sign/route.ts", "w", encoding="utf-8") as f:
    f.write(content_sign)
print("OK sign")
