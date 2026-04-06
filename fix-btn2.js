const fs = require("fs");
let c = fs.readFileSync("src/app/pacientes/[id]/page.tsx", "utf8");

// Agregar import
c = c.replace(
  'import DeletePatientButton from "./DeletePatientButton"',
  'import DeletePatientButton from "./DeletePatientButton"\nimport ComprobanteButton from "./ComprobanteButton"'
);

// Agregar boton despues del hash
c = c.replace(
  '{signature.document_hash && (\n              <p className="text-[10px] text-slate-400 font-mono break-all">Hash: {signature.document_hash}</p>',
  '{signature.document_hash && (\n              <p className="text-[10px] text-slate-400 font-mono break-all">Hash: {signature.document_hash}</p>'
);

// Agregar boton despues del bloque de firma
c = c.replace(
  "signature.document_hash && (\n              <p className=\"text-[10px] text-slate-400 font-mono break-all\">Hash: {signature.document_hash}</p>\n            )}",
  "signature.document_hash && (\n              <p className=\"text-[10px] text-slate-400 font-mono break-all\">Hash: {signature.document_hash}</p>\n            )}\n            <div className=\"mt-3\"><ComprobanteButton patientId={patient.id} /></div>"
);

fs.writeFileSync("src/app/pacientes/[id]/page.tsx", c, "utf8");
console.log("OK");