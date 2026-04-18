import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import DashboardStats from "./DashboardStats"
import DashboardCiclo from "./DashboardCiclo"
import DashboardAlertas from "./DashboardAlertas"
import DashboardActividad from "./DashboardActividad"

function SkeletonCard({ h = "h-32" }: { h?: string }) {
  return <div className={`bg-slate-100 rounded-xl ${h} animate-pulse`} />
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(3)].map((_, i) => <SkeletonCard key={i} h="h-24" />)}
    </div>
  )
}

function SectionSkeleton() {
  return <SkeletonCard h="h-48" />
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SkeletonCard h="h-64" />
      <SkeletonCard h="h-64" />
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = profile?.role ?? ""

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Panel de control</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats role={role} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <DashboardCiclo role={role} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <DashboardActividad role={role} />
      </Suspense>

      <Suspense fallback={<GridSkeleton />}>
        <DashboardAlertas role={role} />
      </Suspense>
    </div>
  )
}
