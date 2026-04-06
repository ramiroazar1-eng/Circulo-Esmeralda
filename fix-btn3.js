const fs = require("fs");
let c = fs.readFileSync("src/app/pacientes/[id]/page.tsx", "utf8");

c = c.replace(
  `            {signature.document_hash && (
              <p className="text-[10px] text-slate-400 font-mono break-all">Hash: {signature.document_hash}</p>
            )}`,
  `            {signature.document_hash && (
              <p className="text-[10px] text-slate-400 font-mono break-all">Hash: {signature.document_hash}</p>
            )}
            <div className="mt-3"><ComprobanteButton patientId={patient.id} /></div>`
);

fs.writeFileSync("src/app/pacientes/[id]/page.tsx", c, "utf8");
console.log("OK");