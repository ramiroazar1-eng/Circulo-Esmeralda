content = open("src/app/mi-perfil/PedidosWidget.tsx", "r", encoding="utf-8").read()

old = '''    load()

    const channel = supabase.channel("orders-patient")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `patient_id=eq.${patientId}` }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }'''

new = '''    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)'''

if old in content:
    content = content.replace(old, new)
    open("src/app/mi-perfil/PedidosWidget.tsx", "w", encoding="utf-8").write(content)
    print("OK")
else:
    print("Patron no encontrado")
    idx = content.find("load()\n")
    print(repr(content[idx:idx+300]))
