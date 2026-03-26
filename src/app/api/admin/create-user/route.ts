import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { email, password, full_name, role, patient_id, use_invite } = await request.json()
  if (!email || !full_name || !role) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
  if (!use_invite && !password) return NextResponse.json({ error: "La contrasena es obligatoria para usuarios internos" }, { status: 400 })

  const service = await createServiceClient()
  let userId: string

  if (use_invite) {
    // Pacientes: invitacion por email
    const { data: authData, error: authError } = await service.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role }
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    userId = authData.user.id
  } else {
    // Personal interno: crear con contrasena
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email, password, email_confirm: true
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    userId = authData.user.id
  }

  // Crear perfil
  const profileData: any = { id: userId, full_name, role }
  if (patient_id) profileData.patient_id = patient_id

  const { error: profileError } = await service.from("profiles").insert(profileData)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({
    success: true,
    message: use_invite ? `Invitacion enviada a ${email}` : "Usuario creado correctamente"
  })
}
