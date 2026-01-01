"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import {
  createMantenimiento,
  getMantenimientos,
  getVehiculos,
  updateMantenimiento,
  type Vehiculo,
} from "@/lib/supabase-queries"
import { Wrench, CheckCircle2 } from "lucide-react"

export function MantenimientoTab() {
  const { user } = useAuth()
  const canWrite = user?.modulos.logistica?.write || false

  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mantenimientos, setMantenimientos] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])

  const [formData, setFormData] = useState({
    vehiculo_id: "",
    fecha_entrada: new Date().toISOString().split("T")[0],
    descripcion: "",
    taller_nombre: "",
    costo: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    console.log("[v0] Fetching vehicles for Workshop...") // Added debug log
    try {
      const [mantenimientosData, vehiculosData] = await Promise.all([getMantenimientos(), getVehiculos()])
      setMantenimientos(mantenimientosData)
      setVehiculos(vehiculosData)
      console.log("[v0] Vehicles loaded:", vehiculosData.length, "vehicles") // Added debug log
    } catch (error) {
      console.error("[v0] Error loading data:", error) // Added error log
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canWrite) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para registrar mantenimientos",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await createMantenimiento({
        vehiculo_id: Number(formData.vehiculo_id),
        fecha_entrada: formData.fecha_entrada,
        fecha_salida: null,
        descripcion: formData.descripcion,
        taller_nombre: formData.taller_nombre,
        costo: formData.costo ? Number(formData.costo) : null,
        estado: "En Taller",
      })

      toast({
        title: "Mantenimiento registrado",
        description: "El registro se ha creado correctamente",
      })

      setFormData({
        vehiculo_id: "",
        fecha_entrada: new Date().toISOString().split("T")[0],
        descripcion: "",
        taller_nombre: "",
        costo: "",
      })

      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el mantenimiento",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarcarReparado = async (id: number) => {
    if (!canWrite) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para actualizar el estado",
        variant: "destructive",
      })
      return
    }

    try {
      await updateMantenimiento(id, {
        estado: "Reparado",
        fecha_salida: new Date().toISOString().split("T")[0],
      })

      toast({
        title: "Reparación completada",
        description: "El vehículo está listo",
      })

      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  const enTaller = mantenimientos.filter((m) => m.estado === "En Taller")
  const reparados = mantenimientos.filter((m) => m.estado === "Reparado")

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Reportar Falla
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehiculo_id">Vehículo</Label>
              <Select
                value={formData.vehiculo_id}
                onValueChange={(value) => setFormData({ ...formData, vehiculo_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map((vehiculo) => (
                    <SelectItem key={vehiculo.id} value={vehiculo.id.toString()}>
                      {vehiculo.patente} - {vehiculo.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_entrada">Fecha de Entrada</Label>
              <Input
                id="fecha_entrada"
                type="date"
                value={formData.fecha_entrada}
                onChange={(e) => setFormData({ ...formData, fecha_entrada: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción de la Falla</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Ej: Frenos traseros con ruido, posible desgaste de pastillas"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taller_nombre">Taller</Label>
              <Input
                id="taller_nombre"
                value={formData.taller_nombre}
                onChange={(e) => setFormData({ ...formData, taller_nombre: e.target.value })}
                placeholder="Nombre del taller"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo">Costo Estimado (opcional)</Label>
              <Input
                id="costo"
                type="number"
                step="0.01"
                value={formData.costo}
                onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                placeholder="15000.00"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !canWrite}>
              {!canWrite ? "Sin permisos" : isSubmitting ? "Registrando..." : "Registrar Mantenimiento"}
            </Button>
          </form>
        </div>

        {/* Listas */}
        <div className="space-y-4">
          {/* En Taller */}
          <div>
            <h3 className="text-lg font-semibold mb-3">En Taller ({enTaller.length})</h3>
            <div className="space-y-2">
              {enTaller.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay vehículos en taller</p>
              ) : (
                enTaller.map((mant) => (
                  <Card key={mant.id} className="border-amber-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">
                            {mant.vehiculo?.patente} - {mant.vehiculo?.modelo}
                          </p>
                          <p className="text-sm text-muted-foreground">{mant.descripcion}</p>
                        </div>
                        <Badge variant="secondary">En Taller</Badge>
                      </div>
                      {mant.taller_nombre && (
                        <p className="text-sm text-muted-foreground">Taller: {mant.taller_nombre}</p>
                      )}
                      {mant.costo && (
                        <p className="text-sm text-muted-foreground">Costo: ${Number(mant.costo).toFixed(2)}</p>
                      )}
                      {canWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-3 bg-transparent"
                          onClick={() => handleMarcarReparado(mant.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Marcar como Reparado
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Historial */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Historial Reciente</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {reparados.slice(0, 5).map((mant) => (
                <Card key={mant.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">
                          {mant.vehiculo?.patente} - {mant.vehiculo?.modelo}
                        </p>
                        <p className="text-xs text-muted-foreground">{mant.descripcion}</p>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        Reparado
                      </Badge>
                    </div>
                    {mant.costo && (
                      <p className="text-xs text-muted-foreground">Costo: ${Number(mant.costo).toFixed(2)}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
