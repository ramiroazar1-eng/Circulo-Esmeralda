const fs = require("fs");
let c = fs.readFileSync("src/app/mi-perfil/StatsGamificados.tsx", "utf8");
const m = c.match(/icon: "[^"]+"/g);
console.log(m);