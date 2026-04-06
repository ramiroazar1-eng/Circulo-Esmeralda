const fs = require("fs");
let c = fs.readFileSync("src/app/pacientes/[id]/page.tsx", "utf8");

c = c.replace(
  '            )}\n          </div>\n        ) : (\n          <div className="flex items-center gap-2">\n            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">\n              Pendiente de firma',
  '            )}\n            <div className="mt-3"><ComprobanteButton patientId={patient.id} /></div>\n          </div>\n        ) : (\n          <div className="flex items-center gap-2">\n            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">\n              Pendiente de firma'
);

fs.writeFileSync("src/app/pacientes/[id]/page.tsx", c, "utf8");
console.log("OK");