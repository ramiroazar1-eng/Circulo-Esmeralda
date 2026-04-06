content = open("src/app/mi-perfil/PedidosWidget.tsx", "r", encoding="utf-8").read()

# Agregar estado para delivery_type
content = content.replace(
    '  const [notes, setNotes] = useState("")',
    '  const [notes, setNotes] = useState("")\n  const [deliveryType, setDeliveryType] = useState<"retiro" | "envio">("retiro")\n  const [deliveryAddress, setDeliveryAddress] = useState("")\n  const [deliveryPhone, setDeliveryPhone] = useState("")'
)

# Agregar delivery_type al body del fetch
content = content.replace(
    'body: JSON.stringify({ patient_id: patientId, genetic_id: selectedGenetic, grams: parseFloat(grams), notes: notes || null })',
    'body: JSON.stringify({ patient_id: patientId, genetic_id: selectedGenetic, grams: parseFloat(grams), notes: notes || null, delivery_type: deliveryType, delivery_address: deliveryType === "envio" ? deliveryAddress : null, delivery_phone: deliveryType === "envio" ? deliveryPhone : null })'
)

# Resetear estados al limpiar
content = content.replace(
    '    setShowForm(false); setSelectedGenetic(""); setGrams(""); setNotes("")',
    '    setShowForm(false); setSelectedGenetic(""); setGrams(""); setNotes(""); setDeliveryType("retiro"); setDeliveryAddress(""); setDeliveryPhone("")'
)

# Agregar selector de retiro/envio antes del campo de notas
old_notes = '''            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Notas (opcional)</p>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..."'''

new_notes = '''            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Tipo de entrega</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {(["retiro", "envio"] as const).map(type => (
                  <button key={type} type="button" onClick={() => setDeliveryType(type)}
                    style={{ background: deliveryType === type ? "rgba(45,90,39,0.4)" : "rgba(255,255,255,0.04)", border: `1px solid ${deliveryType === type ? "#4d8a3d" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", padding: "8px", fontSize: "12px", fontWeight: 600, color: deliveryType === type ? "#a8e095" : "rgba(255,255,255,0.5)", cursor: "pointer", textTransform: "capitalize" }}>
                    {type === "retiro" ? "Retiro en local" : "Envio a domicilio"}
                  </button>
                ))}
              </div>
            </div>
            {deliveryType === "envio" && (
              <>
                <div>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Direccion de envio *</p>
                  <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} required={deliveryType === "envio"} placeholder="Calle, numero, piso..."
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Telefono de contacto *</p>
                  <input type="tel" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} required={deliveryType === "envio"} placeholder="11 1234 5678"
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
                </div>
              </>
            )}
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Notas (opcional)</p>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..."'''

content = content.replace(old_notes, new_notes)

open("src/app/mi-perfil/PedidosWidget.tsx", "w", encoding="utf-8").write(content)
print("OK - " + str(len(content.splitlines())) + " lineas")
