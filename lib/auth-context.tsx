"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getSupabaseClient } from "./supabase"

export type Usuario = {
  id: number
  usuario: string
  password: string
  nivel: 1 | 2 | 3 | 4 | 5 | 6 | 7 // Added nivel 7 for Facturación users
  nombre_completo?: string
  created_at?: string
}

type AuthContextType = {
  currentUser: Usuario | null
  login: (usuario: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  canWrite: (module: "calidad" | "produccion" | "logistica" | "gerencia" | "usuarios" | "facturacion") => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is logged in from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Error parsing stored user:", e)
        localStorage.removeItem("currentUser")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (usuario: string, password: string): Promise<boolean> => {
    console.log("[v0] Attempting login for user:", usuario)
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("usuario", usuario)
      .eq("password", password)
      .single()

    if (error || !data) {
      console.log("[v0] Login failed:", error?.message)
      return false
    }

    console.log("[v0] Login successful for user:", data.usuario, "Level:", data.nivel)
    setCurrentUser(data as Usuario)
    localStorage.setItem("currentUser", JSON.stringify(data))
    return true
  }

  const logout = () => {
    console.log("[v0] User logged out")
    setCurrentUser(null)
    localStorage.removeItem("currentUser")
  }

  const canWrite = (
    module: "calidad" | "produccion" | "logistica" | "gerencia" | "usuarios" | "facturacion",
  ): boolean => {
    if (!currentUser) return false

    // Level 1 (Admin) and Level 2 (Gerencia) have full access
    if (currentUser.nivel === 1 || currentUser.nivel === 2) return true

    // Level 3 (Calidad) can only write in Calidad
    if (currentUser.nivel === 3 && module === "calidad") return true

    // Level 4 (Produccion) can only write in Produccion
    if (currentUser.nivel === 4 && module === "produccion") return true

    // Level 5 (Logistica) can only write in Logistica
    if (currentUser.nivel === 5 && module === "logistica") return true

    // Level 6 (Sucursal) can only write in Sucursal
    if (currentUser.nivel === 6 && module === "sucursal") return true

    // Level 7 (Facturación) can only write in Facturación
    if (currentUser.nivel === 7 && module === "facturacion") return true

    return false
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading, canWrite }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
