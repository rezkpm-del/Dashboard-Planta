"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Plus, AlertCircle, Clock, ImageIcon, Upload, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ReclamoSucursal = {
  id: number
  usuario_sucursal: string
  asunto: string
  descripcion: string
  estado: string
  respuesta_planta: string | null
  fecha: string
  lote: string | null
  foto_url: string | null
  created_at: string
}

export function BranchClaimsView() {
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [reclamos, setReclamos] = useState<ReclamoSucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    asunto: "",
    descripcion: "",
    fecha: new Date().toISOString().split("T")[0],
    lote: "",
  })

  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    loadReclamos()
  }, [])

  const loadReclamos = async () => {
    if (!currentUser) return

    const userLevel = Number(currentUser.nivel)

    console.log("[v0] Current User:", currentUser.usuario, "Level:", userLevel)
    console.log("[v0] Fetching mode:", userLevel <= 5 ? "SUPERVISOR (All)" : "BRANCH (Filtered)")

    const supabase = getSupabaseClient()

    let query = supabase.from("reclamos_sucursales").select("*").order("created_at", { ascending: false })

    if (userLevel === 6) {
      console.log("[v0] Applying filter for branch user:", currentUser.usuario)
      query = query.eq("usuario_sucursal", currentUser.usuario)
    } else if (userLevel <= 5) {
      console.log("[v0] No filter applied - fetching ALL claims")
    }

    const { data, error } = await query

    console.log("[v0] Supabase Response - Data:", data, "Error:", error)

    if (error) {
      console.error("[v0] Error loading claims:", error)
      toast({
        title: "Error en Base de Datos",
        description: error.message || "No se pudieron cargar los reclamos",
        variant: "destructive",
      })
    } else {
      console.log("[v0] Successfully loaded", data?.length || 0, "claims")
      setReclamos(data as ReclamoSucursal[])
    }
    setIsLoading(false)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (): Promise<string | null> => {
    if (!selectedPhoto) return null

    const supabase = getSupabaseClient()
    const filePath = `public/${Date.now()}_${selectedPhoto.name}`

    console.log("[v0] Uploading photo to path:", filePath)

    const { error: uploadError } = await supabase.storage.from("reclamos").upload(filePath, selectedPhoto)

    if (uploadError) {
      console.error("Error uploading photo:", uploadError)
      toast({
        title: "Error",
        description: "No se pudo subir la foto",
        variant: "destructive",
      })
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("reclamos").getPublicUrl(filePath)

    console.log("[v0] Upload success:", publicUrl)
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setIsUploading(true)

    let fotoUrl: string | null = null
    if (selectedPhoto) {
      fotoUrl = await uploadPhoto()
    }

    const supabase = getSupabaseClient()

    const { error } = await supabase.from("reclamos_sucursales").insert([
      {
        usuario_sucursal: currentUser.usuario,
        asunto: formData.asunto,
        descripcion: formData.descripcion,
        estado: "Pendiente",
        respuesta_planta: null,
        fecha: formData.fecha,
        lote: formData.lote || null,
        foto_url: fotoUrl,
        created_at: new Date().toISOString(),
      },
    ])

    setIsUploading(false)

    if (error) {
      console.error("Error creating claim:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el reclamo",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Reclamo creado",
        description: "El reclamo se ha registrado correctamente",
      })
      setFormData({
        asunto: "",
        descripcion: "",
        fecha: new Date().toISOString().split("T")[0],
        lote: "",
      })
      setSelectedPhoto(null)
      setPhotoPreview(null)
      setIsDialogOpen(false)
      loadReclamos()
    }
  }

  const handleDelete = async (id: number) => {
    const userLevel = Number(currentUser?.nivel)

    if (userLevel !== 1) {
      toast({
        title: "Sin permisos",
        description: "Solo administradores pueden eliminar reclamos",
        variant: "destructive",
      })
      return
    }

    if (!confirm("¿Está seguro de eliminar este reclamo?")) return

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("reclamos_sucursales").delete().eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el reclamo",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Reclamo eliminado",
        description: "El reclamo se ha eliminado correctamente",
      })
      loadReclamos()
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    const userLevel = Number(currentUser?.nivel)

    if (!currentUser || userLevel === 6) {
      toast({
        title: "Sin permisos",
        description: "Las sucursales no pueden cambiar el estado",
        variant: "destructive",
      })
      return
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("reclamos_sucursales").update({ estado: newStatus }).eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Estado actualizado",
        description: `El reclamo ahora está en estado: ${newStatus}`,
      })
      loadReclamos()
    }
  }

  const handleReply = async (id: number, reply: string) => {
    if (!currentUser) return

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("reclamos_sucursales").update({ respuesta_planta: reply }).eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la respuesta",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Respuesta enviada",
        description: "La respuesta se ha registrado correctamente",
      })
      loadReclamos()
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Reclamos - Sucursales</h1>
          <p className="text-zinc-400 mt-1">
            {Number(currentUser?.nivel) === 6
              ? "Portal de reclamos de sucursal"
              : "Vista de todos los reclamos de sucursales"}
          </p>
        </div>

        {Number(currentUser?.nivel) === 6 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#FF6B6B] hover:bg-[#FF5252] text-white electric-glow">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Reclamo
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Nuevo Reclamo</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Sucursal (Bloqueado)</Label>
                    <Input
                      value={currentUser?.usuario || ""}
                      disabled
                      className="bg-zinc-800/50 border-white/20 text-zinc-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-zinc-500">Este campo está bloqueado y se asigna automáticamente</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Fecha</Label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Asunto</Label>
                  <Input
                    value={formData.asunto}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Título del reclamo..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">N° de Lote (Opcional)</Label>
                  <Input
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Ej: L20240115"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Descripción</Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="bg-white/5 border-white/10 text-white min-h-[120px]"
                    placeholder="Describe el reclamo..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Adjuntar Foto (Opcional)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="bg-white/5 border-white/10 text-white file:bg-[#FF6B6B] file:text-white file:border-0 file:px-4 file:py-2 file:rounded file:mr-4"
                    />
                    {photoPreview && (
                      <img
                        src={photoPreview || "/placeholder.svg"}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded border border-white/20"
                      />
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
                >
                  {isUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    "Crear Reclamo"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {viewPhotoUrl && (
        <Dialog open={!!viewPhotoUrl} onOpenChange={() => setViewPhotoUrl(null)}>
          <DialogContent className="glass-panel border-white/10 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white">Foto del Reclamo</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <img
                src={viewPhotoUrl || "/placeholder.svg"}
                alt="Reclamo"
                className="w-full h-auto rounded border border-white/20"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reclamos.length === 0 && !isLoading ? (
          <div className="col-span-full text-center py-12">
            <AlertCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">No hay reclamos registrados</p>
            <p className="text-xs text-zinc-600">
              Debug Mode: Level [{Number(currentUser?.nivel)}] User [{currentUser?.usuario}]
            </p>
          </div>
        ) : (
          reclamos.map((reclamo) => (
            <Card key={reclamo.id} className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between text-lg">
                  <span>{reclamo.asunto}</span>
                  <div className="flex items-center gap-2">
                    {currentUser && Number(currentUser.nivel) <= 5 ? (
                      <Select value={reclamo.estado} onValueChange={(value) => handleStatusChange(reclamo.id, value)}>
                        <SelectTrigger className="w-32 h-7 text-xs bg-transparent border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="En Proceso">En Proceso</SelectItem>
                          <SelectItem value="Resuelto">Resuelto</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          reclamo.estado === "Pendiente"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : reclamo.estado === "En Proceso"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {reclamo.estado}
                      </span>
                    )}

                    {Number(currentUser?.nivel) === 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(reclamo.id)}
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentUser && Number(currentUser.nivel) <= 5 && (
                  <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded font-medium">
                      Sucursal: {reclamo.usuario_sucursal}
                    </span>
                  </div>
                )}

                {reclamo.lote && (
                  <div className="text-xs text-zinc-400">
                    <span className="font-medium">Lote:</span> {reclamo.lote}
                  </div>
                )}

                <p className="text-sm text-zinc-300">{reclamo.descripcion}</p>

                {reclamo.foto_url && (
                  <div className="mt-3">
                    <button
                      onClick={() => setViewPhotoUrl(reclamo.foto_url)}
                      className="relative group overflow-hidden rounded border border-white/20 hover:border-[#FF6B6B] transition-all"
                    >
                      <img
                        src={reclamo.foto_url || "/placeholder.svg"}
                        alt="Reclamo"
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-white" />
                      </div>
                    </button>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Click para ampliar
                    </p>
                  </div>
                )}

                {reclamo.respuesta_planta && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded">
                    <p className="text-xs text-green-400 font-medium mb-1">Respuesta de Planta:</p>
                    <p className="text-xs text-zinc-300">{reclamo.respuesta_planta}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-white/10">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(reclamo.fecha).toLocaleDateString()}
                  </span>
                  <span className="text-zinc-600">#{reclamo.id}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
