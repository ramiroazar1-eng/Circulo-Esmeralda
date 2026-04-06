const fs = require("fs");

const content = `import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import React from "react"

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", backgroundColor: "#ffffff" },
  header: { marginBottom: 32, borderBottom: "2px solid #2d5a27", paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#1a2e1a", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#4d7a46" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", color: "#4d7a46", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { fontSize: 10, color: "#64748b", width: 140 },
  value: { fontSize: 10, color: "#1a2e1a", flex: 1, fontWeight: "bold" },
  hash: { fontSize: 8, color: "#64748b", fontFamily: "Courier", marginTop: 4, backgroundColor: "#f8fafc", padding: 8, borderRadius: 4 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, borderTop: "1px solid #e2e8f0", paddingTop: 10 },
  footerText: { fontSize: 8, color: "#94a3b8", textAlign: "center" },
  badge: { backgroundColor: "#edf7e8", padding: "4 10", borderRadius: 4, alignSelf: "flex-start", marginTop: 8 },
  badgeText: { fontSize: 10, color: "#2d6a1f", fontWeight: "bold" },
})

function ComprobantePDF({ sig }: { sig: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Comprobante de Firma Electronica</Text>
          <Text style={styles.subtitle}>Circulo Esmeralda - ONG Cannabis Medicinal</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DOCUMENTO FIRMADO DIGITALMENTE</Text>
        </View>
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos del Firmante</Text>
            <View style={styles.row}><Text style={styles.label}>Nombre completo:</Text><Text style={styles.value}>{sig.signer_name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>DNI:</Text><Text style={styles.value}>{sig.signer_dni}</Text></View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos del Documento</Text>
            <View style={styles.row}><Text style={styles.label}>Documento:</Text><Text style={styles.value}>{sig.template?.name ?? "DDJJ Membresia"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Version:</Text><Text style={styles.value}>{sig.template_version ?? 1}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Estado:</Text><Text style={styles.value}>FIRMADO</Text></View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidencia de Firma</Text>
            <View style={styles.row}><Text style={styles.label}>Fecha y hora:</Text><Text style={styles.value}>{sig.signed_at ? new Date(sig.signed_at).toLocaleString("es-AR") : "-"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>IP:</Text><Text style={styles.value}>{sig.ip_address ?? "-"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>OTP verificado:</Text><Text style={styles.value}>{sig.otp_verified ? "Si" : "No"}</Text></View>
            <Text style={styles.label}>Hash SHA256:</Text>
            <Text style={styles.hash}>{sig.document_hash}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Este documento es un comprobante de firma electronica generado por el sistema de Circulo Esmeralda.</Text>
          <Text style={styles.footerText}>El hash SHA256 permite verificar la integridad del documento original firmado.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await (await createServiceClient())
    .from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["admin", "administrativo"].includes(profile.role))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patient_id")
  if (!patientId) return NextResponse.json({ error: "Falta patient_id" }, { status: 400 })

  const service = await createServiceClient()
  const { data: sig } = await service
    .from("document_signatures")
    .select("*, template:document_templates(name, version)")
    .eq("patient_id", patientId)
    .eq("status", "firmado")
    .maybeSingle()

  if (!sig) return NextResponse.json({ error: "Sin firma" }, { status: 404 })

  const buffer = await renderToBuffer(<ComprobantePDF sig={sig} />)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": \`attachment; filename="comprobante-firma-\${sig.signer_dni}.pdf"\`,
    }
  })
}
`;

fs.writeFileSync("src/app/api/signatures/comprobante/route.tsx", content, "utf8");
console.log("OK");