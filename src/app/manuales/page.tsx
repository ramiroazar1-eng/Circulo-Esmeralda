import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { BookOpen } from "lucide-react"
import UploadManualButton from "./UploadManualButton"
import DeleteManualButton from "./DeleteManualButton"
import ViewFileButton from "@/app/documentacion-ong/ViewFileButton"

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  dispensas: "Protocolo de dispensas",
  produccion: "Produccion",
  administrativo: "Administrativo",
  legal: "Legal",
  seguridad: "Seguridad",
}

export default async function ManualesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo"].includes(profile?.role ?? "")) redirect("/dashboard")

  const { data: manuales } = await supabase
    .from("manuales")
    .select("*, uploaded_by_profile:profiles(full_name)")
    .order("category")
    .order("created_at", { ascending: false })

  const grouped = ((manuales ?? []) as any[]).reduce<Record<string, any[]>>((acc, m) => {
    const cat = m.category ?? "general"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Manuales y procedimientos"
        description="Documentacion interna de la organizacion"
        actions={<UploadManualButton />}
      />

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <EmptyState
            title="Sin manuales cargados"
            description="Subi el primer manual o protocolo con el boton de arriba."
            icon={BookOpen}
          />
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category} padding={false}>
            <div className="px-5 pt-5 pb-4">
              <SectionHeader title={CATEGORY_LABELS[category] ?? category} />
            </div>
            <Table>
              <thead>
                <tr><th>Titulo</th><th>Descripcion</th><th>Subido por</th><th>Archivo</th><th></th></tr>
              </thead>
              <tbody>
                {(items as any[]).map((m: any) => (
                  <tr key={m.id}>
                    <td className="font-medium text-[#1a2e1a]">{m.title}</td>
                    <td className="text-[#6b8c65]">{m.description ?? "—"}</td>
                    <td className="text-[#9ab894]">{m.uploaded_by_profile?.full_name ?? "—"}</td>
                    <td>
                      {m.file_path && (
                        <ViewFileButton filePath={m.file_path} bucketName="manuales" />
                      )}
                    </td>
                    <td>
                      <DeleteManualButton manualId={m.id} filePath={m.file_path} title={m.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ))
      )}
    </div>
  )
}
