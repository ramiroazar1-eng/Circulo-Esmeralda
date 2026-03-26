"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"
import {
  LayoutDashboard, Users, Building2, FlaskConical,
  Pill, CreditCard, BookOpen, Shield, Settings,
  LogOut, UserCog, ChevronRight, FileDown, QrCode
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/dashboard",         label: "Dashboard",          icon: LayoutDashboard, roles: ["admin","administrativo"] },
  { href: "/pacientes",         label: "Pacientes",          icon: Users,           roles: ["admin","administrativo","medico"] },
  { href: "/documentacion-ong", label: "Documentacion ONG",  icon: Building2,       roles: ["admin","administrativo"] },
  { href: "/trazabilidad",      label: "Trazabilidad",       icon: FlaskConical,    roles: ["admin","administrativo","biologo"] },
  { href: "/dispensas",         label: "Dispensas",          icon: Pill,            roles: ["admin","administrativo"] },
  { href: "/dispensas/qr",      label: "Dispensa por QR",    icon: QrCode,          roles: ["admin","administrativo"] },
  { href: "/membresias",        label: "Membresias",         icon: CreditCard,      roles: ["admin","administrativo"] },
  { href: "/bitacora",          label: "Bitacora",           icon: BookOpen,        roles: ["admin","administrativo","medico","biologo"] },
  { href: "/exportar",          label: "Exportar",           icon: FileDown,        roles: ["admin","administrativo"] },
]

const ADMIN_ITEMS = [
  { href: "/auditoria",    label: "Auditoria",    icon: Shield,   roles: ["admin"] },
  { href: "/usuarios",     label: "Usuarios",     icon: UserCog,  roles: ["admin"] },
  { href: "/configuracion",label: "Configuracion",icon: Settings, roles: ["admin"] },
]

export function Sidebar({ role, userName }: { role: UserRole; userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const visibleNav   = NAV_ITEMS.filter(item => item.roles.includes(role))
  const visibleAdmin = ADMIN_ITEMS.filter(item => item.roles.includes(role))

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-slate-200 flex flex-col z-10">
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Cannabis Medicinal</p>
            <p className="text-xs text-slate-400 truncate">Sistema interno</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => {
          const isActive = pathname === item.href || (item.href !== "/dispensas" && pathname.startsWith(item.href + "/"))
          return (
            <Link key={item.href} href={item.href} className={cn("nav-item", isActive && "active")}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-60" />}
            </Link>
          )
        })}

        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Administracion</p>
            </div>
            {visibleAdmin.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className={cn("nav-item", isActive && "active")}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="px-2 py-3 border-t border-slate-200 space-y-0.5">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-slate-900 truncate">{userName}</p>
          <p className="text-xs text-slate-400 capitalize">{role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-slate-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  )
}
