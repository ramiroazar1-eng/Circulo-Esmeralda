import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/dashboard"

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash })
    if (!error) {
      if (type === "invite" || type === "recovery") {
        redirect("/auth/reset-password")
      }
      redirect(next)
    }
  }

  redirect("/login?error=link_invalido")
}