import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("id")
  if (!orderId) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const service = await createServiceClient()
  const { data: order, error } = await service
    .from("orders")
    .select("*, patient:patients(full_name, dni), lot:lots(lot_code), packed_by_profile:profiles!orders_packed_by_fkey(full_name), items:order_items(grams, genetic:genetics(name), lot:lots(lot_code))")
    .eq("id", orderId)
    .single()

  if (error || !order) return NextResponse.json({ error: "Pedido no encontrado", detail: error?.message }, { status: 404 })

  // Generar qr_token si no tiene
  let qrToken = (order as any).qr_token
  if (!qrToken) {
    qrToken = "ord_" + Math.random().toString(36).substr(2, 10)
    await service.from("orders").update({ qr_token: qrToken }).eq("id", orderId)
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.circuloesmeralda.com.ar"
  const orderUrl = appUrl + "/o/" + qrToken
  const qrData = "ORD-" + order.id.substring(0,8).toUpperCase()
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(orderUrl)

  const STATUS_LABELS: Record<string, string> = {
    nuevo: "Nuevo", pendiente_aprobacion: "Pendiente", aprobado: "Aprobado",
    en_preparacion: "En preparacion", empaquetado: "Empaquetado",
    entregado: "Entregado", cancelado: "Cancelado"
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Etiqueta Pedido</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; }
  .label { width: 80mm; padding: 6mm; border: 1px solid #000; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
  .org { font-size: 13px; font-weight: 900; color: #0f1f12; }
  .order-num { font-size: 10px; color: #555; font-family: monospace; }
  .patient-name { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
  .patient-dni { font-size: 11px; color: #555; margin-bottom: 8px; }
  .detail-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .detail-label { color: #777; }
  .detail-value { font-weight: 700; }
  .grams-box { background: #0f1f12; color: white; text-align: center; padding: 6px; border-radius: 6px; margin: 8px 0; }
  .grams-num { font-size: 24px; font-weight: 900; }
  .grams-unit { font-size: 12px; opacity: 0.7; }
  .qr-section { display: flex; align-items: center; gap: 8px; margin-top: 8px; border-top: 1px solid #ccc; padding-top: 6px; }
  .qr-data { font-size: 8px; color: #888; font-family: monospace; word-break: break-all; flex: 1; }
  .status-badge { display: inline-block; background: #edf7e8; color: #2d6a1f; border: 1px solid #b8daa8; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="label">
  <div class="header">
    <div>
      <div class="org">Circulo Esmeralda</div>
      <div class="order-num">ORD-${order.id.substring(0, 8).toUpperCase()}</div>
    </div>
    <span class="status-badge">${STATUS_LABELS[order.status] ?? order.status}</span>
  </div>
  <div class="patient-name">${(order as any).patient?.full_name ?? "—"}</div>
  <div class="patient-dni">DNI ${(order as any).patient?.dni ?? "—"}</div>
  <div class="grams-box">
    <div class="grams-num">${order.grams}<span class="grams-unit">g</span></div>
    <div style="font-size:10px;opacity:0.7">${order.product_desc ?? "flor seca"}</div>
  </div>
  ${((order as any).items ?? []).length > 0
    ? (order as any).items.map((item: any) => `
  <div class="detail-row">
    <span class="detail-label">${item.genetic?.name ?? "Sin genetica"}</span>
    <span class="detail-value">${item.grams}g - <span style="font-family:monospace">${item.lot?.lot_code ?? "Sin lote"}</span></span>
  </div>`).join("")
    : `<div class="detail-row"><span class="detail-label">Genetica</span><span class="detail-value">${(order as any).genetic?.name ?? "Sin especificar"}</span></div>`
  }
  ${order.packed_at ? `<div class="detail-row"><span class="detail-label">Empaquetado</span><span class="detail-value">${new Date(order.packed_at).toLocaleString("es-AR")}</span></div>` : ""}
  <div class="qr-section">
    <img src="${qrUrl}" width="80" height="80" />
    <div class="qr-data">${orderUrl}</div>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  })
}