const fs = require("fs");
let c = fs.readFileSync("src/app/mi-perfil/page.tsx", "utf8");

// Agregar estado statsOpen
c = c.replace(
  "const [docs, setDocs] = useState<any[]>([])",
  "const [docs, setDocs] = useState<any[]>([])\n  const [statsOpen, setStatsOpen] = useState(false)"
);

// Reemplazar StatsGamificados con desplegable
c = c.replace(
  "<StatsGamificados patientId={patient?.id ?? \"\"} firstName={firstName ?? \"\"} createdAt={patient?.created_at ?? null} />",
  `<div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
          <button onClick={() => setStatsOpen(v => !v)} style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>Mis estadisticas</span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", transition: "transform 0.2s", display: "inline-block", transform: statsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>v</span>
          </button>
          {statsOpen && <div style={{ padding: "0 14px 14px" }}><StatsGamificados patientId={patient?.id ?? ""} firstName={firstName ?? ""} createdAt={patient?.created_at ?? null} /></div>}
        </div>`
);

fs.writeFileSync("src/app/mi-perfil/page.tsx", c, "utf8");
console.log("OK");