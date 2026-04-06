content = open("src/app/pacientes/nuevo/page.tsx", "r", encoding="utf-8").read()

old = '''    const { data: patient, error: insertError } = await supabase.from("patients").insert(payload).select("id").single()
    if (insertError) {
      setError(insertError.code === "23505" ? "Ya existe un paciente con ese DNI." : insertError.message)
      setLoading(false)
      return
    }'''

new = '''    const { data: patient, error: insertError } = await supabase.from("patients").insert(payload).select("id").single()
    if (insertError) {
      setError(insertError.code === "23505" ? "Ya existe un paciente con ese DNI." : insertError.message)
      setLoading(false)
      return
    }

    // Crear documentos para el nuevo paciente
    const { data: docTypes } = await supabase.from("patient_document_types").select("id, slug").eq("is_active", true)
    if (docTypes && docTypes.length > 0) {
      const docs = docTypes.map((dt: any) => ({
        patient_id: patient.id,
        doc_type_id: dt.id,
        status: dt.slug === "reprocann" ? "pendiente_vinculacion" : "faltante"
      }))
      await supabase.from("patient_documents").insert(docs)
    }'''

content = content.replace(old, new)
open("src/app/pacientes/nuevo/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
