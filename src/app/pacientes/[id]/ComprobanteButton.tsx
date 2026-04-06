"use client"
export default function ComprobanteButton({ patientId }: { patientId: string }) {
  return (
    
      href={"/api/signatures/comprobante?patient_id=" + patientId}
      target="_blank"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] hover:bg-[#d4eecc]"
    >
      Descargar comprobante PDF
    </a>
  )
}
