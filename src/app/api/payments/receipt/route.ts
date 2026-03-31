import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("id")
  if (!paymentId) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const service = await createServiceClient()
  const { data: payment } = await service
    .from("membership_payments")
    .select("*, patient:patients(full_name, dni), plan:membership_plans(name), created_by_profile:profiles(full_name)")
    .eq("id", paymentId)
    .single()

  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })

  const receiptNum = String(payment.receipt_number).padStart(8, "0")
  const monthName = MONTHS[(payment.period_month - 1)]
  const paymentDate = new Date(payment.payment_date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const amount = parseFloat(payment.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo N° ${receiptNum}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: white; }
  .page { width: 210mm; min-height: 297mm; padding: 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f1f12; padding-bottom: 16px; margin-bottom: 20px; }
  .org-name { font-size: 20px; font-weight: 900; color: #0f1f12; letter-spacing: -0.5px; }
  .org-details { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.6; }
  .receipt-box { text-align: right; }
  .receipt-type { font-size: 28px; font-weight: 900; color: #0f1f12; letter-spacing: 2px; }
  .receipt-num { font-size: 13px; color: #555; margin-top: 4px; font-family: monospace; }
  .condition-box { display: inline-block; border: 2px solid #0f1f12; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #0f1f12; margin-top: 6px; letter-spacing: 1px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 10px; }
  .field-row { display: flex; margin-bottom: 6px; }
  .field-label { font-size: 11px; color: #777; width: 140px; shrink: 0; }
  .field-value { font-size: 12px; font-weight: 600; color: #1a1a1a; flex: 1; }
  .amount-box { background: #0f1f12; color: white; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin: 24px 0; }
  .amount-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: 0.7; }
  .amount-value { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
  .amount-currency { font-size: 14px; opacity: 0.7; margin-right: 4px; }
  .method-badge { display: inline-block; background: #e8f5e3; color: #2d5a27; border: 1px solid #b8daa8; border-radius: 20px; padding: 3px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .signature-line { border-top: 1px solid #333; width: 180px; padding-top: 6px; text-align: center; font-size: 10px; color: #777; }
  .legal-text { font-size: 9px; color: #aaa; text-align: center; margin-top: 20px; line-height: 1.5; }
  .divider { border: none; border-top: 1px dashed #ccc; margin: 24px 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="org-name">AEF Simple Asociación</div>
      <div class="org-details">
        CUIT: 30-71823978-4<br>
        Florida 935<br>
        Condición IVA: Exento
      </div>
    </div>
    <div class="receipt-box">
      <div class="receipt-type">RECIBO</div>
      <div class="receipt-num">N° ${receiptNum}</div>
      <div class="condition-box">EXENTO</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del receptor</div>
    <div class="field-row"><span class="field-label">Apellido y nombre</span><span class="field-value">${(payment as any).patient?.full_name ?? "—"}</span></div>
    <div class="field-row"><span class="field-label">DNI</span><span class="field-value">${(payment as any).patient?.dni ?? "—"}</span></div>
    <div class="field-row"><span class="field-label">Condición</span><span class="field-value">Consumidor Final</span></div>
  </div>

  <div class="section">
    <div class="section-title">Detalle del comprobante</div>
    <div class="field-row"><span class="field-label">Concepto</span><span class="field-value">Membresía mensual como miembro adherente</span></div>
    <div class="field-row"><span class="field-label">Plan</span><span class="field-value">${(payment as any).plan?.name ?? "—"}</span></div>
    <div class="field-row"><span class="field-label">Período</span><span class="field-value">${monthName} ${payment.period_year}</span></div>
    <div class="field-row"><span class="field-label">Fecha de pago</span><span class="field-value">${paymentDate}</span></div>
    <div class="field-row"><span class="field-label">Forma de pago</span><span class="field-value"><span class="method-badge">${payment.payment_method}</span></span></div>
    ${payment.notes ? `<div class="field-row"><span class="field-label">Observaciones</span><span class="field-value">${payment.notes}</span></div>` : ""}
  </div>

  <div class="amount-box">
    <div>
      <div class="amount-label">Total recibido</div>
      <div style="font-size:11px;opacity:0.6;margin-top:2px;">Exento de IVA</div>
    </div>
    <div style="text-align:right">
      <div class="amount-value"><span class="amount-currency">$</span>${amount}</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="footer">
    <div>
      <div class="signature-line">Firma y sello</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#777;margin-bottom:4px;">Emitido por</div>
      <div style="font-size:12px;font-weight:700;">${(payment as any).created_by_profile?.full_name ?? "Sistema"}</div>
      <div style="font-size:10px;color:#777;margin-top:2px;">${new Date().toLocaleDateString("es-AR")}</div>
    </div>
  </div>

  <div class="legal-text">
    AEF Simple Asociación · CUIT 30-71823978-4 · Florida 935<br>
    Este recibo es válido como comprobante de pago interno. Entidad sin fines de lucro exenta de IVA.
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    }
  })
}
