const fs = require("fs");
let lines = fs.readFileSync("src/app/pacientes/[id]/page.tsx", "utf8").split("\n");

// Insertar despues de la linea que tiene "}" cerrando el document_hash block (linea 143, index 142)
const idx = lines.findIndex(l => l.includes("signature.document_hash") && l.includes("}}"));
if (idx !== -1) {
  lines.splice(idx + 1, 0, '            <div className="mt-3"><ComprobanteButton patientId={patient.id} /></div>');
  console.log("Insertado en linea " + (idx + 2));
} else {
  // buscar la linea con solo )}
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === ")}" && lines[i-1] && lines[i-1].includes("document_hash")) {
      lines.splice(i + 1, 0, '            <div className="mt-3"><ComprobanteButton patientId={patient.id} /></div>');
      console.log("Insertado en linea " + (i + 2));
      break;
    }
  }
}

fs.writeFileSync("src/app/pacientes/[id]/page.tsx", lines.join("\n"), "utf8");