"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Factory,
  ClipboardCheck,
  Truck,
  UserCog,
  LayoutDashboard,
  Menu,
  Users,
  LogOut,
  MessageSquare,
  ShoppingCart,
} from "lucide-react"
import { DashboardView } from "./dashboard-view"
import { ProductionForm } from "./production-form"
import { QualityForm } from "./quality-form"
import { LogisticsForm } from "./logistics-form"
import { ManagerForm } from "./manager-form"
import { UserManagement } from "./user-management"
import { BranchClaimsView } from "./branch-claims-view" // Import BranchClaimsView
import { VentasModule } from "./ventas-module" // Import new Ventas module
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import Image from "next/image"

type View = "dashboard" | "production" | "quality" | "logistics" | "manager" | "users" | "branch-claims" | "ventas" // Added ventas view

export function DashboardLayout() {
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { currentUser, logout } = useAuth()

  useEffect(() => {
    if (currentUser?.nivel === 6 && currentView !== "branch-claims") {
      setCurrentView("branch-claims")
    } else if (currentUser?.nivel === 7 && currentView !== "ventas") {
      setCurrentView("ventas")
    }
  }, [currentUser, currentView])

  const menuItems =
    currentUser?.nivel === 6
      ? [
          // Level 6 users only see Branch Claims
          { id: "branch-claims" as View, label: "Reclamos Sucursal", icon: MessageSquare, visible: true },
        ]
      : currentUser?.nivel === 7
        ? [
            // Level 7 users only see Ventas
            { id: "ventas" as View, label: "Ventas", icon: ShoppingCart, visible: true },
          ]
        : [
            // Levels 1-5 see full menu including Ventas
            { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard, visible: true },
            { id: "production" as View, label: "Producción", icon: Factory, visible: true },
            { id: "quality" as View, label: "Calidad", icon: ClipboardCheck, visible: true },
            { id: "logistics" as View, label: "Logística", icon: Truck, visible: true },
            { id: "manager" as View, label: "Gerencia", icon: UserCog, visible: true },
            { id: "ventas" as View, label: "Ventas", icon: ShoppingCart, visible: true },
            { id: "branch-claims" as View, label: "Reclamos Sucursales", icon: MessageSquare, visible: true },
            { id: "users" as View, label: "Usuarios", icon: Users, visible: currentUser?.nivel === 1 },
          ]

  const renderView = () => {
    if (currentUser?.nivel === 6 && currentView !== "branch-claims") {
      return <BranchClaimsView />
    }

    if (currentUser?.nivel === 7 && currentView !== "ventas") {
      return <VentasModule />
    }

    switch (currentView) {
      case "dashboard":
        return <DashboardView />
      case "production":
        return <ProductionForm />
      case "quality":
        return <QualityForm />
      case "logistics":
        return <LogisticsForm />
      case "manager":
        return <ManagerForm />
      case "users":
        return currentUser?.nivel === 1 ? <UserManagement /> : <DashboardView />
      case "branch-claims":
        return <BranchClaimsView />
      case "ventas":
        return <VentasModule />
      default:
        return <DashboardView />
    }
  }

  const SidebarContent = () => (
    <>
      <nav className="space-y-1 flex-1">
        {menuItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start transition-all duration-300 ease-out rounded-lg py-4 px-4 text-xs",
                  "hover:bg-white/5 hover:translate-x-1 uppercase tracking-widest font-medium",
                  "active:scale-95",
                  isActive &&
                    "bg-gradient-to-r from-[#ff6b6b]/20 to-[#ff8e53]/20 text-white active-indicator shadow-[0_0_20px_rgba(255,107,107,0.2)]",
                )}
                onClick={() => {
                  setCurrentView(item.id)
                  setIsMobileMenuOpen(false)
                }}
              >
                <Icon className="mr-3 h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            )
          })}
      </nav>
      <div className="pt-3 border-t border-white/10 mt-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg py-4 px-4 transition-all duration-300 text-xs uppercase tracking-widest font-medium"
          onClick={() => {
            if (confirm("¿Desea cerrar sesión?")) {
              logout()
            }
          }}
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen relative z-10">
      <aside className="hidden md:flex w-64 flex-col glass-panel border-r border-red-500/20">
        <div className="p-5 border-b border-red-500/20 flex items-center justify-center">
          <Image
            src="/images/logo-4-removebg-preview.png"
            alt="La Guitarrita - Fundada en 1963"
            width={180}
            height={60}
            className="object-contain filter brightness-0 invert"
            priority
          />
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <SidebarContent />
        </div>

        <div className="p-4 border-t border-red-500/20">
          <p className="text-[10px] text-zinc-500 text-center font-mono uppercase tracking-wider">
            {currentUser?.usuario} · LVL {currentUser?.nivel}
          </p>
          <p className="text-[9px] text-zinc-700 text-center font-mono mt-1 tracking-widest">DASHBOARD - PLANTA</p>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10">
        <div className="flex items-center justify-between p-6">
          <Image
            src="/images/logo-4-removebg-preview.png"
            alt="La Guitarrita"
            width={160}
            height={50}
            className="object-contain filter brightness-0 invert"
          />
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,107,107,0.2)] transition-all duration-300 rounded-xl"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="glass-panel border-white/10 flex flex-col w-80">
              <SheetHeader>
                <SheetTitle className="text-white text-lg">Menú de Navegación</SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex-1 flex flex-col">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="flex-1 md:pt-0 pt-24 overflow-auto relative z-10">{renderView()}</main>
    </div>
  )
}
