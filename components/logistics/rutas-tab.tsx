"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  getChoferes,
  getVehiculos,
  getHojasRuta,
  createHojaRuta,
  finalizarHojaRuta,
  type HojaRuta,
  type Chofer,
  type Vehiculo,
} from "@/lib/supabase-queries"
import { CheckCircle2, FileCheck, Wrench } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function RutasTab() {
  const { currentUser, user } = useAuth()
  const canWrite = user?.modulos.logistica?.write || false
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rutas, setRutas] = useState<HojaRuta[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [fecha, setFecha] = useState("")
  const [chofer, setChofer] = useState("")
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false)
  const [rutaToFinish, setRutaToFinish] = useState<HojaRuta | null>(null)
  const [finishData, setFinishData] = useState({ hora_fin: "", kilometraje_llegada: "" })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [rutasData, choferesData, vehiculosData] = await Promise.all([
        getHojasRuta(),
        getChoferes(),
        getVehiculos(),
      ])
      setRutas(rutasData)
      setChoferes(choferesData)
      setVehiculos(vehiculosData)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const allDocsOK =
      formData.vtv_vigente && formData.seguro_vigente && formData.patente_vigente && formData.habilitacion_municipal
    if (!allDocsOK && !formData.motivo_faltantes.trim()) {
      toast({
        title: "Documentación requerida",
        description: "Debe completar el campo 'Motivo / Faltantes' si hay documentos sin verificar",
        variant: "destructive",
      })
      return
    }

    const allEquipmentOK =
      formData.matafuego &&
      formData.balizas &&
      formData.botiquin &&
      formData.gato_llave_cruz &&
      formData.documentos_vehiculo
    if (!allEquipmentOK) {
      toast({
        title: "Equipamiento incompleto",
        description: "Todos los elementos de seguridad deben estar presentes",
        variant: "destructive",
      })
      return
    }

    if (!canWrite) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para iniciar rutas",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const chofer = choferes.find((c) => c.id === Number(formData.chofer_id))

      await createHojaRuta({
        chofer: chofer?.nombre || "",
        chofer_id: Number(formData.chofer_id),
        vehiculo_id: Number(formData.vehiculo_id),
        ruta_detalle: formData.ruta_detalle,
        hora_inicio: formData.hora_inicio,
        equipamiento_ok: allEquipmentOK,
        estado: "En Ruta",
      })

      toast({
        title: "Ruta iniciada",
        description: "La hoja de ruta se ha registrado correctamente",
      })

      setFormData({
        chofer_id: "",
        vehiculo_id: "",
        ruta_detalle: "",
        hora_inicio: "",
        vtv_vigente: false,
        seguro_vigente: false,
        patente_vigente: false,
        habilitacion_municipal: false,
        motivo_faltantes: "",
        matafuego: false,
        balizas: false,
        botiquin: false,
        gato_llave_cruz: false,
        documentos_vehiculo: false,
      })

      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la hoja de ruta",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalizarRuta = async (rutaId: number) => {
    if (!canWrite) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para finalizar rutas",
        variant: "destructive",
      })
      return
    }

    try {
      await finalizarHojaRuta(rutaId, {
        hora_fin: finishData.hora_fin,
        kilometraje_llegada: Number(finishData.kilometraje_llegada),
        estado: "Finalizado",
      })

      toast({
        title: "Ruta finalizada",
        description: "La ruta se ha completado exitosamente",
      })

      setIsFinalizarOpen(false)
      setRutaToFinish(null)
      setFinishData({ hora_fin: "", kilometraje_llegada: "" })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo finalizar la ruta",
        variant: "destructive",
      })
    }
  }

  const rutasActivas = rutas.filter((r) => r.estado === "En Ruta")
  const isAdmin = currentUser && Number(currentUser.nivel) === 1
  const canFinalize = currentUser && [1, 2, 5].includes(Number(currentUser.nivel))

  const [formData, setFormData] = useState({
    chofer_id: "",
    vehiculo_id: "",
    ruta_detalle: "",
    hora_inicio: "",
    vtv_vigente: false,
    seguro_vigente: false,
    patente_vigente: false,
    habilitacion_municipal: false,
    motivo_faltantes: "",
    matafuego: false,
    balizas: false,
    botiquin: false,
    gato_llave_cruz: false,
    documentos_vehiculo: false,
  })

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Iniciar Nueva Ruta</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="chofer_id">Chofer</Label>
              <Select
                value={formData.chofer_id}
                onValueChange={(value) => setFormData({ ...formData, chofer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione chofer" />
                </SelectTrigger>
                <SelectContent>
                  {choferes.map((chofer) => (
                    <SelectItem key={chofer.id} value={chofer.id.toString()}>
                      {chofer.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="ruta_detalle">Detalle de Ruta</Label>
              <Input
                id="ruta_detalle"
                value={formData.ruta_detalle}
                onChange={(e) => setFormData({ ...formData, ruta_detalle: e.target.value })}
                placeholder="Ej: Zona Norte - Entregas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Hora Inicio</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Documentation Status */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="h-5 w-5 text-[#FF6B6B]" />
                  <h4 className="font-semibold text-sm">Estado Documentación</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vtv" className="text-xs">
                      VTV al día
                    </Label>
                    <Switch
                      id="vtv"
                      checked={formData.vtv_vigente}
                      onCheckedChange={(checked) => setFormData({ ...formData, vtv_vigente: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="seguro" className="text-xs">
                      Seguro vigente
                    </Label>
                    <Switch
                      id="seguro"
                      checked={formData.seguro_vigente}
                      onCheckedChange={(checked) => setFormData({ ...formData, seguro_vigente: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="patente" className="text-xs">
                      Patente vigente
                    </Label>
                    <Switch
                      id="patente"
                      checked={formData.patente_vigente}
                      onCheckedChange={(checked) => setFormData({ ...formData, patente_vigente: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="habilitacion" className="text-xs">
                      Habilitación municipal
                    </Label>
                    <Switch
                      id="habilitacion"
                      checked={formData.habilitacion_municipal}
                      onCheckedChange={(checked) => setFormData({ ...formData, habilitacion_municipal: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="motivo-faltantes" className="text-xs">
                    Motivo / Faltantes
                  </Label>
                  <Textarea
                    id="motivo-faltantes"
                    value={formData.motivo_faltantes}
                    onChange={(e) => setFormData({ ...formData, motivo_faltantes: e.target.value })}
                    placeholder="Completar si hay docs sin verificar..."
                    rows={3}
                    className="bg-black/60 border-white/20 text-xs"
                  />
                </div>
              </div>

              {/* Right Column: Equipment and Safety */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-5 w-5 text-[#FF6B6B]" />
                  <h4 className="font-semibold text-sm">Equipamiento y Seguridad</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="matafuego" className="text-xs">
                      Matafuego
                    </Label>
                    <Switch
                      id="matafuego"
                      checked={formData.matafuego}
                      onCheckedChange={(checked) => setFormData({ ...formData, matafuego: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="balizas" className="text-xs">
                      Balizas
                    </Label>
                    <Switch
                      id="balizas"
                      checked={formData.balizas}
                      onCheckedChange={(checked) => setFormData({ ...formData, balizas: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="botiquin" className="text-xs">
                      Botiquín
                    </Label>
                    <Switch
                      id="botiquin"
                      checked={formData.botiquin}
                      onCheckedChange={(checked) => setFormData({ ...formData, botiquin: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="gato" className="text-xs">
                      Gato + Llave Cruz
                    </Label>
                    <Switch
                      id="gato"
                      checked={formData.gato_llave_cruz}
                      onCheckedChange={(checked) => setFormData({ ...formData, gato_llave_cruz: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="docs-vehiculo" className="text-xs">
                      Docs. Vehículo
                    </Label>
                    <Switch
                      id="docs-vehiculo"
                      checked={formData.documentos_vehiculo}
                      onCheckedChange={(checked) => setFormData({ ...formData, documentos_vehiculo: checked })}
                      className="data-[state=checked]:bg-[#FF6B6B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !canWrite}>
              {!canWrite ? "Sin permisos" : isSubmitting ? "Iniciando..." : "Iniciar Ruta"}
            </Button>
          </form>
        </div>

        {/* Rutas Activas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Rutas Activas ({rutasActivas.length})</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">Chofer</TableHead>
                  <TableHead className="w-[30%]">Detalle de Ruta</TableHead>
                  <TableHead className="w-[18%]">Hora Inicio</TableHead>
                  <TableHead className="w-[30%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rutasActivas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay rutas activas
                    </TableCell>
                  </TableRow>
                ) : (
                  rutasActivas.map((ruta) => (
                    <TableRow key={ruta.id}>
                      <TableCell className="font-medium py-4">{ruta.chofer}</TableCell>
                      <TableCell className="py-4">{ruta.ruta_detalle}</TableCell>
                      <TableCell className="font-mono py-4">{ruta.hora_inicio}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          {canFinalize && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRutaToFinish(ruta)
                                setIsFinalizarOpen(true)
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Finalizar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isFinalizarOpen} onOpenChange={setIsFinalizarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Ruta</DialogTitle>
            <DialogDescription>Complete los datos para finalizar la ruta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hora_fin">Hora Fin</Label>
              <Input
                id="hora_fin"
                type="time"
                value={finishData.hora_fin}
                onChange={(e) => setFinishData({ ...finishData, hora_fin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kilometraje_llegada">Kilometraje Llegada</Label>
              <Input
                id="kilometraje_llegada"
                type="number"
                value={finishData.kilometraje_llegada}
                onChange={(e) => setFinishData({ ...finishData, kilometraje_llegada: e.target.value })}
                placeholder="45120"
              />
            </div>
          </div>
          <Button onClick={() => handleFinalizarRuta(rutaToFinish?.id || 0)} className="w-full">
            Confirmar Finalización
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
