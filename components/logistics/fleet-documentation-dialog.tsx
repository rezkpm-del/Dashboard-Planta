"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import { createDocumentoLogistica, deleteDocumentoLogistica, updateVehiculo } from "@/lib/supabase-queries"
import { useToast } from "@/hooks/use-toast"
import type { DocumentoLogistica, Vehiculo } from "@/lib/supabase-queries"

interface FleetDocumentationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehiculo
  documents: DocumentoLogistica[]
  canWrite: boolean
  onRefresh: () => void
}

export function FleetDocumentationDialog({
  open,
  onOpenChange,
  vehicle,
  documents,
  canWrite,
  onRefresh,
}: FleetDocumentationDialogProps) {
  const { toast } = useToast()

  const [vtvVencimiento, setVtvVencimiento] = useState(vehicle.vtv_vencimiento || "")
  const [senasaVencimiento, setSenasaVencimiento] = useState(vehicle.senasa_vencimiento || "")
  const [isUpdatingVehicle, setIsUpdatingVehicle] = useState(false)

  const [newDocType, setNewDocType] = useState("")
  const [newDocDate, setNewDocDate] = useState("")
  const [newDocNotes, setNewDocNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checkExpiration = (fechaVencimiento: string) => {
    if (!fechaVencimiento) return { color: "gray", variant: "outline" as const, text: "No configurado" }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expDate = new Date(fechaVencimiento)
    expDate.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { color: "red", variant: "destructive" as const, text: `Vencido hace ${Math.abs(diffDays)} días` }
    } else if (diffDays < 15) {
      return { color: "red", variant: "destructive" as const, text: `${diffDays} días` }
    } else if (diffDays <= 45) {
      return { color: "yellow", variant: "secondary" as const, text: `${diffDays} días` }
    } else {
      return { color: "green", variant: "outline" as const, text: "Vigente" }
    }
  }

  const handleUpdateVehicleDates = async () => {
    if (!vtvVencimiento && !senasaVencimiento) {
      toast({ title: "Error", description: "Ingrese al menos una fecha", variant: "destructive" })
      return
    }

    setIsUpdatingVehicle(true)
    try {
      console.log("[v0] Updating vehicle dates:", { vtv: vtvVencimiento, senasa: senasaVencimiento })
      await updateVehiculo(vehicle.id, {
        vtv_vencimiento: vtvVencimiento || vehicle.vtv_vencimiento,
        senasa_vencimiento: senasaVencimiento || vehicle.senasa_vencimiento,
      })

      toast({ title: "Éxito", description: "Fechas de vencimiento actualizadas" })
      onRefresh()
    } catch (error) {
      console.error("[v0] Error updating vehicle dates:", error)
      toast({ title: "Error", description: "No se pudieron actualizar las fechas", variant: "destructive" })
    } finally {
      setIsUpdatingVehicle(false)
    }
  }

  const handleSaveDocument = async () => {
    if (!newDocType || !newDocDate) {
      toast({ title: "Error", description: "Complete los campos requeridos", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      console.log("[v0] Adding document to vehicle:", vehicle.id)
      await createDocumentoLogistica({
        entidad_tipo: "vehiculo",
        entidad_id: vehicle.id,
        documento_tipo: newDocType,
        fecha_vencimiento: newDocDate,
        notas: newDocNotes || null,
      })

      toast({ title: "Éxito", description: "Documento agregado correctamente" })
      setNewDocType("")
      setNewDocDate("")
      setNewDocNotes("")
      onRefresh()
    } catch (error) {
      console.error("[v0] Error adding document:", error)
      toast({ title: "Error", description: "No se pudo agregar el documento", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (docId: number) => {
    if (!confirm("¿Está seguro de eliminar este documento?")) return

    try {
      console.log("[v0] Deleting document:", docId)
      await deleteDocumentoLogistica(docId)
      toast({ title: "Éxito", description: "Documento eliminado" })
      onRefresh()
    } catch (error) {
      console.error("[v0] Error deleting document:", error)
      toast({ title: "Error", description: "No se pudo eliminar el documento", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Documentación del Vehículo: {vehicle?.patente}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="rounded-xl border bg-slate-50 p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-sm uppercase text-slate-500 tracking-wider">
              + Nueva Documentación
            </h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newDocType} onValueChange={setNewDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Seguro">Seguro</SelectItem>
                      <SelectItem value="VTV">VTV</SelectItem>
                      <SelectItem value="Ruta">Ruta</SelectItem>
                      <SelectItem value="Senasa">Senasa</SelectItem>
                      <SelectItem value="Matafuegos">Matafuegos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vencimiento</Label>
                  <Input type="date" value={newDocDate} onChange={(e) => setNewDocDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  placeholder="Ej: Poliza #12345"
                  value={newDocNotes}
                  onChange={(e) => setNewDocNotes(e.target.value)}
                />
              </div>
              <Button className="w-full bg-slate-900 text-white" onClick={handleSaveDocument} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar Documento"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm uppercase text-slate-500 tracking-wider">
              Documentos Existentes ({documents?.length || 0})
            </h3>

            {documents?.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg text-slate-400 text-sm">
                No hay documentos registrados aún.
              </div>
            ) : (
              <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <p className="font-medium">{doc.documento_tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString("es-AR")}
                      </p>
                      {doc.notas && <p className="text-xs text-slate-500 italic">{doc.notas}</p>}
                    </div>
                    {canWrite && (
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
