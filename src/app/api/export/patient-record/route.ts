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
