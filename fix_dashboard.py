content = open("src/app/dashboard/page.tsx", "r", encoding="utf-8").read()

# Agregar query de plan_requests
old_query = '  const { data: recentLog } = await supabase.from("daily_log_entries")'
new_query = '''  const { data: planRequests } = await supabase
    .from("plan_requests")
    .select("*, patient:patients(full_name), current_plan:membership_plans!plan_requests_current_plan_id_fkey(name), requested_plan:membership_plans!plan_requests_requested_plan_id_fkey(name)")
    .eq("status", "pendiente")
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: recentLog } = await supabase.from("daily_log_entries")'''

content = content.replace(old_query, new_query)

# Agregar bloque visual antes del cierre del return
old_close = '    </div>\n  )\n}'
new_close = '''
      {/* Solicitudes de plan pendientes */}
      {planRequests && planRequests.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title={`Solicitudes de plan (${planRequests.length})`} />
          </div>
          <div className="divide-y divide-slate-100">
            {(planRequests as any[]).map((req: any) => (
              <div key={req.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#1a2e1a]">{req.patient?.full_name ?? "-"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {req.request_type === "upgrade"
                      ? `Cambio: ${req.current_plan?.name ?? "-"} -> ${req.requested_plan?.name ?? "-"}`
                      : `Excepcion: ${req.requested_grams}g extra`}
                  </p>
                  {req.reason && <p className="text-xs text-slate-400 italic mt-0.5">{req.reason}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PlanReviewButtons requestId={req.id} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  )
}'''

content = content.replace('    </div>\n  )\n}', new_close)

open("src/app/dashboard/page.tsx", "w", encoding="utf-8").write(content)
print("OK - " + str(len(content.splitlines())) + " lineas")
