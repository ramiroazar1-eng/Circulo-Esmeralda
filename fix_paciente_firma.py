content = open("src/app/pacientes/[id]/page.tsx", "r", encoding="utf-8").read()

# Agregar query de firma
old_query = '  const { data: dispenses }'
new_query = '''  const { data: signature } = await supabase
    .from("document_signatures")
    .select("id, status, signed_at, signer_name, document_hash, template:document_templates(name, version)")
    .eq("patient_id", patient.id)
    .eq("status", "firmado")
    .maybeSingle()

  const { data: dispenses }'''

content = content.replace(old_query, new_query)

# Agregar seccion de firma antes del cierre
old_close = '''      </Card>
    </div>
  )
}'''

new_close = '''      </Card>

      {/* Firma electronica */}
      <Card>
        <SectionHeader title="Documento de membresia" />
        {signature ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                Firmado
              </span>
              <span className="text-xs text-slate-500">
                {signature.signed_at ? new Date(signature.signed_at).toLocaleString("es-AR") : "-"}
              </span>
            </div>
            <p className="text-xs text-slate-600">Firmante: <span className="font-medium">{signature.signer_name}</span></p>
            {signature.document_hash && (
              <p className="text-[10px] text-slate-400 font-mono break-all">Hash: {signature.document_hash}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Pendiente de firma
            </span>
            <span className="text-xs text-slate-500">El paciente debe firmar desde su portal</span>
          </div>
        )}
      </Card>
    </div>
  )
}'''

content = content.replace(old_close, new_close)
open("src/app/pacientes/[id]/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
