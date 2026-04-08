import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createHash } from "crypto"

function hashOTP(otp: string): string {
  return createHash("sha256").update(otp).digest("hex")
}

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

  const { data: sig } = await service
    .from("document_signatures")
    .select("*, template:document_templates(content, version)")
    .eq("patient_id", patient_id)
    .eq("template_id", template_id)
    .eq("status", "pendiente")
    .single()
  if (!sig) return NextResponse.json({ error: "No hay firma pendiente" }, { status: 404 })

  // Verificar OTP contra hash
  if (sig.otp_code !== hashOTP(otp_code)) {
    return NextResponse.json({ error: "Codigo incorrecto" }, { status: 400 })
  }

  const otpAge = Date.now() - new Date(sig.otp_sent_at).getTime()
  if (otpAge > 10 * 60 * 1000) {
    return NextResponse.json({ error: "El codigo ha vencido. Solicita uno nuevo." }, { status: 400 })
  }

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
  const userAgent = request.headers.get("user-agent") ?? "unknown"

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

  await service.from("audit_logs").insert({
    user_id: user.id,
    action: "document_signed",
    table_name: "document_signatures",
    record_id: sig.id,
    new_values: { patient_id, template_id, signer_name, document_hash: documentHash, ip }
  }).then(() => {})

  return NextResponse.json({ success: true, document_hash: documentHash, signed_at: signedAt })
}