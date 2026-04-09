import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: periodsData, error: periodsError } = await supabase
    .rpc("generate_monthly_periods", { p_year: year, p_month: month })

  if (periodsError) {
    console.error("Error generating periods:", periodsError)
    return NextResponse.json({ error: periodsError.message }, { status: 500 })
  }

  const { error: expensesError } = await supabase
    .rpc("create_and_distribute_recurring_expenses", { p_month: month, p_year: year })

  if (expensesError) {
    console.error("Error distributing recurring expenses:", expensesError)
  }

  return NextResponse.json({
    ok: true,
    year,
    month,
    periods: periodsData,
    recurring_expenses_distributed: !expensesError,
  })
}