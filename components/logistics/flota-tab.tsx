"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  getVehiculos,
  createVehiculo,
  getChoferes,
  createChofer,
  getDocumentosLogistica,
  createDocumentoLogistica,
  type Vehiculo,
  type Chofer,
  type DocumentoLogistica,
  getDocumentosByVehiculo, // Added import
} from "@/lib/supabase-queries"
import { Plus, FileText, AlertTriangle } from "lucide-react"
import { FleetDocumentationDialog } from "./fleet-documentation-dialog"

export function FlotaTab() {
  const { currentUser, user } = useAuth() // Added currentUser to check nivel
  const canWrite = user?.modulos.logistica?.write || false

  const canAddItems = currentUser && [1, 2, 5].includes(Number(currentUser.nivel))

  const { toast } = useToast()
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [documentos, setDocumentos] = useState<DocumentoLogistica[]>([])
  const [selectedEntity, setSelectedEntity] = useState<{ id: number; tipo: string; nombre: string } | null>(null)
  const [selectedVehicleForDocs, setSelectedVehicleForDocs] = useState<Vehiculo | null>(null)
  const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false)
  const [vehicleDocuments, setVehicleDocuments] = useState<DocumentoLogistica[]>([]) // Added state for vehicle documents

  const [isAddVehiculoOpen, setIsAddVehiculoOpen] = useState(false)
  const [isAddChoferOpen, setIsAddChoferOpen] = useState(false)
  const [isAddDocumentoOpen, setIsAddDocumentoOpen] = useState(false)

  const [newVehiculo, setNewVehiculo] = useState({ patente: "", modelo: "" })
  const [newChofer, setNewChofer] = useState({ nombre: "", dni: "", observaciones: "" })
  const [newDocumento, setNewDocumento] = useState({ nombre: "", fecha_vencimiento: "" })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [vehiculosData, choferesData, documentosData] = await Promise.all([
        getVehiculos(),
        getChoferes(),
        getDocumentosLogistica(),
      ])
      setVehiculos(vehiculosData)
      setChoferes(choferesData)
      setDocumentos(documentosData)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    }
  }

  const handleAddVehiculo = async () => {
    if (!canAddItems) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para agregar vehículos",
        variant: "destructive",
      })
      return
    }

    if (!newVehiculo.patente) {
      toast({
        title: "Error",
        description: "La patente es obligatoria",
        variant: "destructive",
      })
      return
    }

    try {
      await createVehiculo({
        patente: newVehiculo.patente,
        modelo: newVehiculo.modelo || "",
        vtv_vencimiento: "",
        senasa_vencimiento: "",
        seguro_vencimiento: "",
        kilometraje_actual: 0,
        estado: "Activo",
      })

      toast({
        title: "Vehículo agregado",
        description: `${newVehiculo.patente} se ha agregado correctamente`,
      })

      setNewVehiculo({ patente: "", modelo: "" })
      setIsAddVehiculoOpen(false)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el vehículo",
        variant: "destructive",
      })
    }
  }

  const handleAddChofer = async () => {
    if (!canAddItems) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para agregar choferes",
        variant: "destructive",
      })
      return
    }

    if (!newChofer.nombre) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      })
      return
    }

    try {
      await createChofer({
        nombre: newChofer.nombre,
        licencia_numero: newChofer.dni || "",
        licencia_vencimiento: "",
        telefono: null,
        estado: "Activo",
      })

      toast({
        title: "Chofer agregado",
        description: `${newChofer.nombre} se ha agregado correctamente`,
      })

      setNewChofer({ nombre: "", dni: "", observaciones: "" })
      setIsAddChoferOpen(false)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el chofer",
        variant: "destructive",
      })
    }
  }

  const handleAddDocumento = async () => {
    if (!canWrite) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para agregar documentos",
        variant: "destructive",
      })
      return
    }

    if (!selectedEntity || !newDocumento.nombre || !newDocumento.fecha_vencimiento) {
      toast({
        title: "Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      await createDocumentoLogistica({
        tipo: selectedEntity.tipo,
        entidad_id: selectedEntity.id,
        documento_tipo: newDocumento.nombre,
        fecha_vencimiento: newDocumento.fecha_vencimiento,
        observaciones: null,
      })

      toast({
        title: "Documento agregado",
        description: `Documento agregado a ${selectedEntity.nombre}`,
      })

      setNewDocumento({ nombre: "", fecha_vencimiento: "" })
      setIsAddDocumentoOpen(false)
      setSelectedEntity(null)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el documento",
        variant: "destructive",
      })
    }
  }

  const handleOpenDocs = async (vehicle: Vehiculo) => {
    setSelectedVehicleForDocs(vehicle)
    setIsDocsDialogOpen(true)
    await loadVehicleDocuments(vehicle.id) // Fetch documents when opening dialog
  }

  const loadVehicleDocuments = async (vehiculoId: number) => {
    try {
      const docs = await getDocumentosByVehiculo(vehiculoId)
      setVehicleDocuments(docs)
    } catch (error) {
      console.error("[v0] Error loading vehicle documents:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      })
    }
  }

  const handleDocsRefresh = async () => {
    await loadData() // Reload all data
    if (selectedVehicleForDocs) {
      await loadVehicleDocuments(selectedVehicleForDocs.id) // Reload documents for current vehicle
    }
  }

  const checkExpiration = (dateString: string) => {
    if (!dateString) return { status: "ok", days: 999, variant: "default" as const, color: "green" }

    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: "expired", days: Math.abs(diffDays), variant: "destructive" as const, color: "red" }
    } else if (diffDays <= 15) {
      return { status: "warning-red", days: diffDays, variant: "destructive" as const, color: "red" }
    } else if (diffDays <= 30) {
      return { status: "warning-yellow", days: diffDays, variant: "secondary" as const, color: "yellow" }
    } else {
      return { status: "ok", days: diffDays, variant: "default" as const, color: "green" }
    }
  }

  const getDocumentosForEntity = (tipo: string, entidadId: number) => {
    return documentos.filter((d) => d.tipo === tipo && d.entidad_id === entidadId)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="vehiculos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
          <TabsTrigger value="choferes">Choferes</TabsTrigger>
        </TabsList>

        <TabsContent value="vehiculos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gestión de Flota</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{vehiculos.length} vehículos</Badge>
              {canAddItems && (
                <Dialog open={isAddVehiculoOpen} onOpenChange={setIsAddVehiculoOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Vehículo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Vehículo</DialogTitle>
                      <DialogDescription>Agregue un nuevo vehículo a la flota</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="patente">Patente *</Label>
                        <Input
                          id="patente"
                          value={newVehiculo.patente}
                          onChange={(e) => setNewVehiculo({ ...newVehiculo, patente: e.target.value })}
                          placeholder="Ej: ABC123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modelo">Modelo</Label>
                        <Input
                          id="modelo"
                          value={newVehiculo.modelo}
                          onChange={(e) => setNewVehiculo({ ...newVehiculo, modelo: e.target.value })}
                          placeholder="Ej: Fiat Ducato"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddVehiculo} className="w-full">
                      Guardar Vehículo
                    </Button>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {vehiculos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center mb-4">No hay vehículos cargados. Agregue el primero.</p>
                {canAddItems && (
                  <Button onClick={() => setIsAddVehiculoOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Primer Vehículo
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehiculos.map((vehiculo) => {
                const docs = getDocumentosForEntity("vehiculo", vehiculo.id)
                const hasWarnings = docs.some((d) => {
                  const status = checkExpiration(d.fecha_vencimiento)
                  return status.color === "red" || status.color === "yellow"
                })

                return (
                  <Card key={vehiculo.id} className={hasWarnings ? "border-red-500 border-2" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{vehiculo.patente}</CardTitle>
                          <p className="text-sm text-muted-foreground">{vehiculo.modelo}</p>
                        </div>
                        {hasWarnings && <AlertTriangle className="h-5 w-5 text-red-500" />}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Documentación
                        </h4>
                        {docs.map((doc) => {
                          const status = checkExpiration(doc.fecha_vencimiento)
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{doc.documento_tipo}</span>
                              </div>
                              <Badge
                                variant={status.variant}
                                className={`${status.color === "yellow" ? "bg-yellow-500 text-yellow-950" : ""} font-mono text-xs`}
                              >
                                {status.status === "expired"
                                  ? `Vencido (${status.days}d)`
                                  : status.days <= 30
                                    ? `${status.days} días`
                                    : "Vigente"}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex gap-2">
                        {canWrite && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => {
                              setSelectedEntity({ id: vehiculo.id, tipo: "vehiculo", nombre: vehiculo.patente })
                              setIsAddDocumentoOpen(true)
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Agregar Documento
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                          onClick={() => handleOpenDocs(vehiculo)}
                        >
                          DOCUMENTACIÓN
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="choferes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gestión de Choferes</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{choferes.length} choferes</Badge>
              {canAddItems && (
                <Dialog open={isAddChoferOpen} onOpenChange={setIsAddChoferOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Chofer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Chofer</DialogTitle>
                      <DialogDescription>Agregue un nuevo chofer</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                          id="nombre"
                          value={newChofer.nombre}
                          onChange={(e) => setNewChofer({ ...newChofer, nombre: e.target.value })}
                          placeholder="Ej: Juan Pérez"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dni">DNI / Licencia</Label>
                        <Input
                          id="dni"
                          value={newChofer.dni}
                          onChange={(e) => setNewChofer({ ...newChofer, dni: e.target.value })}
                          placeholder="Ej: 12345678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="obs">Observaciones</Label>
                        <Input
                          id="obs"
                          value={newChofer.observaciones}
                          onChange={(e) => setNewChofer({ ...newChofer, observaciones: e.target.value })}
                          placeholder="Notas adicionales"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddChofer} className="w-full">
                      Guardar Chofer
                    </Button>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {choferes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center mb-4">No hay choferes cargados. Agregue el primero.</p>
                {canAddItems && (
                  <Button onClick={() => setIsAddChoferOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Primer Chofer
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {choferes.map((chofer) => {
                const docs = getDocumentosForEntity("chofer", chofer.id)
                const licenciaStatus = chofer.licencia_vencimiento
                  ? checkExpiration(chofer.licencia_vencimiento)
                  : { status: "ok", color: "green", variant: "default" as const, days: 999 }
                const hasWarnings =
                  licenciaStatus.color === "red" ||
                  licenciaStatus.color === "yellow" ||
                  docs.some((d) => {
                    const status = checkExpiration(d.fecha_vencimiento)
                    return status.color === "red" || status.color === "yellow"
                  })

                return (
                  <Card key={chofer.id} className={hasWarnings ? "border-red-500 border-2" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{chofer.nombre}</CardTitle>
                          <p className="text-sm text-muted-foreground">{chofer.licencia_numero || "Sin licencia"}</p>
                        </div>
                        {hasWarnings && <AlertTriangle className="h-5 w-5 text-red-500" />}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {chofer.licencia_vencimiento && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Licencia:</span>
                            <Badge
                              variant={licenciaStatus.variant}
                              className={`${licenciaStatus.color === "yellow" ? "bg-yellow-500 text-yellow-950" : ""} font-mono text-xs`}
                            >
                              {licenciaStatus.status === "expired"
                                ? `Vencida (${licenciaStatus.days}d)`
                                : licenciaStatus.days <= 30
                                  ? `${licenciaStatus.days} días`
                                  : "Vigente"}
                            </Badge>
                          </div>
                        )}

                        {docs.map((doc) => {
                          const status = checkExpiration(doc.fecha_vencimiento)
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{doc.documento_tipo}</span>
                              </div>
                              <Badge
                                variant={status.variant}
                                className={`${status.color === "yellow" ? "bg-yellow-500 text-yellow-950" : ""} font-mono text-xs`}
                              >
                                {status.status === "expired"
                                  ? `Vencido (${status.days}d)`
                                  : status.days <= 30
                                    ? `${status.days} días`
                                    : "Vigente"}
                              </Badge>
                            </div>
                          )
                        })}

                        {chofer.telefono && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Teléfono:</span>
                            <span className="font-medium">{chofer.telefono}</span>
                          </div>
                        )}
                      </div>

                      {canWrite && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4 bg-transparent"
                          onClick={() => {
                            setSelectedEntity({ id: chofer.id, tipo: "chofer", nombre: chofer.nombre })
                            setIsAddDocumentoOpen(true)
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Agregar Documento
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedVehicleForDocs && (
        <FleetDocumentationDialog
          open={isDocsDialogOpen}
          onOpenChange={setIsDocsDialogOpen}
          vehicle={selectedVehicleForDocs}
          documents={vehicleDocuments} // Use state instead of filter
          canWrite={canWrite}
          onRefresh={handleDocsRefresh} // Use new refresh handler
        />
      )}

      {canWrite && (
        <Dialog open={isAddDocumentoOpen} onOpenChange={setIsAddDocumentoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Vencimiento</DialogTitle>
              <DialogDescription>
                Agregando documento a {selectedEntity?.nombre} ({selectedEntity?.tipo})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="doc-nombre">Nombre Documento *</Label>
                <Input
                  id="doc-nombre"
                  value={newDocumento.nombre}
                  onChange={(e) => setNewDocumento({ ...newDocumento, nombre: e.target.value })}
                  placeholder="Ej: VTV, Seguro, Licencia Nacional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-fecha">Fecha Vencimiento *</Label>
                <Input
                  id="doc-fecha"
                  type="date"
                  value={newDocumento.fecha_vencimiento}
                  onChange={(e) => setNewDocumento({ ...newDocumento, fecha_vencimiento: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleAddDocumento} className="w-full">
              Guardar Documento
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
