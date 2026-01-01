"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getSupabaseClient } from "@/lib/supabase"
import type { Usuario } from "@/lib/auth-context"
import { Plus, Trash2, Loader2 } from "lucide-react"

export function UserManagement() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    usuario: "",
    password: "",
    nivel: "3" as string,
    nombre_completo: "",
  })

  useEffect(() => {
    loadUsuarios()
  }, [])

  const loadUsuarios = async () => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("usuarios").select("*").order("nivel", { ascending: true })

    if (error) {
      console.error("Error loading users:", error)
    } else {
      setUsuarios(data as Usuario[])
    }
    setIsLoading(false)
  }

  const handleCreateUser = async () => {
    if (!newUser.usuario || !newUser.password) return

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("usuarios").insert([
      {
        usuario: newUser.usuario,
        password: newUser.password,
        nivel: Number.parseInt(newUser.nivel),
        nombre_completo: newUser.nombre_completo || null,
      },
    ])

    if (error) {
      console.error("Error creating user:", error)
      alert("Error al crear usuario")
    } else {
      setNewUser({ usuario: "", password: "", nivel: "3", nombre_completo: "" })
      setIsDialogOpen(false)
      loadUsuarios()
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este usuario?")) return

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("usuarios").delete().eq("id", id)

    if (error) {
      console.error("Error deleting user:", error)
      alert("Error al eliminar usuario")
    } else {
      loadUsuarios()
    }
  }

  const getLevelLabel = (nivel: number) => {
    switch (nivel) {
      case 1:
        return "Admin"
      case 2:
        return "Gerencia"
      case 3:
        return "Calidad"
      case 4:
        return "Producción"
      case 5:
        return "Logística"
      case 6:
        return "Sucursal"
      case 7: // Added Level 7 for Facturación role
        return "Facturación"
      default:
        return "Desconocido"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-zinc-400 mt-1">Administre los usuarios y sus permisos</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FF6B6B] hover:bg-[#FF5252] text-white electric-glow">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Crear Nuevo Usuario</DialogTitle>
              <DialogDescription className="text-zinc-400">Complete los datos del nuevo usuario</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="usuario" className="text-white">
                  Usuario *
                </Label>
                <Input
                  id="usuario"
                  value={newUser.usuario}
                  onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="nombre.usuario"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-white">
                  Nombre Completo
                </Label>
                <Input
                  id="nombre"
                  value={newUser.nombre_completo}
                  onChange={(e) => setNewUser({ ...newUser, nombre_completo: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Contraseña *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivel" className="text-white">
                  Nivel de Acceso *
                </Label>
                <Select value={newUser.nivel} onValueChange={(value) => setNewUser({ ...newUser, nivel: value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="1">Nivel 1 - Admin (Acceso Total)</SelectItem>
                    <SelectItem value="2">Nivel 2 - Gerencia (Todo menos Usuarios)</SelectItem>
                    <SelectItem value="3">Nivel 3 - Calidad (Solo Calidad)</SelectItem>
                    <SelectItem value="4">Nivel 4 - Producción (Solo Producción)</SelectItem>
                    <SelectItem value="5">Nivel 5 - Logística (Solo Logística)</SelectItem>
                    <SelectItem value="6">Nivel 6 - Sucursal (Solo Reclamos Sucursal)</SelectItem>
                    <SelectItem value="7">Nivel 7 - Facturación (Solo Ventas/Facturación)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateUser}
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
                disabled={!newUser.usuario || !newUser.password}
              >
                Crear Usuario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usuarios.map((user) => (
          <Card key={user.id} className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{user.usuario}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteUser(user.id)}
                  className="hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.nombre_completo && <p className="text-sm text-zinc-400">{user.nombre_completo}</p>}
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Nivel:</span>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded ${
                    user.nivel === 1
                      ? "bg-purple-500/20 text-purple-400"
                      : user.nivel === 2
                        ? "bg-blue-500/20 text-blue-400"
                        : user.nivel === 3
                          ? "bg-green-500/20 text-green-400"
                          : user.nivel === 4
                            ? "bg-orange-500/20 text-orange-400"
                            : user.nivel === 5
                              ? "bg-cyan-500/20 text-cyan-400"
                              : user.nivel === 6
                                ? "bg-sky-500/20 text-sky-400"
                                : "bg-yellow-500/20 text-yellow-400" // Added yellow color for Level 7 Facturación
                  }`}
                >
                  {getLevelLabel(user.nivel)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
