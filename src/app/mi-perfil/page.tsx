"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import LogoutButton from "./LogoutButton"

export default function MiPerfilPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, patient:patients!profiles_patient_id_fkey(*, membership_plan:membership_plans(name, monthly_grams, monthly_amount))")
        .eq("id", user.id)
        .single()
      
      if (!profile) { router.push("/login"); return }
      if (profile.role !== "paciente") { router.push("/dashboard"); return }
      
      setData(profile)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080f09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#4d7a46", fontSize: "14px" }}>Cargando...</div>
    </div>
  )

  const patient = data?.patient
  const plan = patient?.membership_plan

  return (
    <div style={{ minHeight: "100vh", background: "#080f09", color: "white", fontFamily: "system-ui", padding: "24px 16px" }}>
      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#2d5a27", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "22px", fontWeight: 800, border: "3px solid rgba(255,255,255,0.12)" }}>
            {patient?.full_name?.split(" ")[0]?.[0] ?? "?"}
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 800 }}>{patient?.full_name ?? data.full_name}</h1>
          {plan && <p style={{ fontSize: "12px", color: "#4d7a46", marginTop: "4px" }}>{plan.name}</p>}
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Mi plan</p>
          {plan ? (
            <div>
              <p style={{ fontWeight: 700, fontSize: "16px" }}>{plan.name}</p>
              {plan.monthly_grams && <p style={{ fontSize: "12px", color: "#4d7a46", marginTop: "4px" }}>{plan.monthly_grams}g por mes</p>}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Sin plan asignado</p>
          )}
        </div>
        <div style={{ marginTop: "24px" }}>
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}