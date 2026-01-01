"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button" // Added import
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog" // Added import
import { Label } from "@/components/ui/label" // Added import
import { Input } from "@/components/ui/input" // Added import
import { useToast } from "@/hooks/use-toast"
import { getChoferes, updateChofer, type Chofer } from "@/lib/supabase-queries"
import { AlertCircle, Phone, CreditCard, Pencil } from "lucide-react" // Added Pencil icon

export function ChoferesTab() {
  const { toast } = useToast()
  const [choferes, setChoferes] = useState<Chofer[]>([])

  const [editingChofer, setEditingChofer] = useState<Chofer | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editNombre, setEditNombre] = useState("")
  const [editLicenciaVencimiento, setEditLicenciaVencimiento] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadChoferes()
  }, [])

  const loadChoferes = async () => {
    try {
      const data = await getChoferes()
      setChoferes(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los choferes",
        variant: "destructive",
      })
    }
  }

  const handleEditChofer = (chofer: Chofer) => {
    setEditingChofer(chofer)
    setEditNombre(chofer.nombre)
    setEditLicenciaVencimiento(chofer.licencia_vencimiento)
    setIsEditDialogOpen(true)
  }

  const handleSaveChofer = async () => {
    if (!editingChofer || !editNombre || !editLicenciaVencimiento) {
      toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      console.log(`[v0] Updating driver ${editingChofer.id}...`)
      await updateChofer(editingChofer.id, {
        nombre: editNombre,
        licencia_vencimiento: editLicenciaVencimiento,
      })

      console.log(`[v0] Driver ${editingChofer.id} updated successfully.`)
      toast({ title: "Éxito", description: "Chofer actualizado correctamente" })
      setIsEditDialogOpen(false)
      loadChoferes() // Refresh the driver list
    } catch (error) {
      console.error("[v0] Error updating driver:", error)
      toast({ title: "Error", description: "No se pudo actualizar el chofer", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const checkLicenciaExpiration = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: "expired", days: Math.abs(diffDays), isWarning: true }
    } else if (diffDays <= 15) {
      return { status: "warning", days: diffDays, isWarning: true }
    } else {
      return { status: "ok", days: diffDays, isWarning: false }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestión de Choferes</h3>
        <Badge variant="outline">{choferes.length} choferes</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {choferes.map((chofer) => {
          const licenciaStatus = checkLicenciaExpiration(chofer.licencia_vencimiento)

          return (
            <Card key={chofer.id} className={licenciaStatus.isWarning ? "border-red-500 border-2" : ""}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {chofer.nombre
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{chofer.nombre}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEditChofer(chofer)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                      {licenciaStatus.isWarning && <AlertCircle className="h-5 w-5 text-red-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{chofer.estado}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Licencia:</span>
                    <span className="font-medium">{chofer.licencia_numero}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Vencimiento:</span>
                    <Badge variant={licenciaStatus.isWarning ? "destructive" : "default"}>
                      {licenciaStatus.status === "expired"
                        ? `Vencida (${licenciaStatus.days}d)`
                        : licenciaStatus.status === "warning"
                          ? `Vence en ${licenciaStatus.days} días`
                          : new Date(chofer.licencia_vencimiento).toLocaleDateString("es-AR")}
                    </Badge>
                  </div>

                  {chofer.telefono && (
                    <div className="flex items-center gap-2 text-sm pt-2 border-t">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{chofer.telefono}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Chofer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input
                id="edit-nombre"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-licencia">Licencia Vencimiento *</Label>
              <Input
                id="edit-licencia"
                type="date"
                value={editLicenciaVencimiento}
                onChange={(e) => setEditLicenciaVencimiento(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveChofer} disabled={isSaving} className="w-full">
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
