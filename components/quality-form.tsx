"use client"

import type React from "react"
import { Lock, FileSpreadsheet, Plus, Camera, ClipboardCheck } from "lucide-react"
import { createClient } from "@/lib/supabase-client" // Ensure this import is correct

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  createReclamo,
  getLocales,
  getProveedores,
  createLocal,
  createProveedor,
  getReclamosWithFilters,
  type Local,
  type Proveedor,
} from "@/lib/supabase-queries"
import { Badge } from "@/components/ui/badge" // Ensure this import is correct
import { useAuth } from "@/lib/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableCell, TableRow, TableHeader, TableHead } from "@/components/ui/table"

export function QualityForm() {
  const { toast } = useToast()
  const { canWrite, currentUser } = useAuth()
  const canWriteQuality = canWrite("calidad")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingLocales, setIsLoadingLocales] = useState(true)
  const [isLoadingProveedores, setIsLoadingProveedores] = useState(true)
  const [locales, setLocales] = useState<Local[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [isAddLocalOpen, setIsAddLocalOpen] = useState(false)
  const [isAddProveedorOpen, setIsAddProveedorOpen] = useState(false)
  const [newLocalName, setNewLocalName] = useState("")
  const [newProveedorName, setNewProveedorName] = useState("")

  const [historyData, setHistoryData] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyFilters, setHistoryFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    tipo: "",
    local_id: "",
    proveedor_id: "",
  })

  const [formData, setFormData] = useState({
    tipo: "Local",
    local_id: "",
    proveedor_id: "",
    descripcion: "",
    urgencia: "Media",
    fecha: new Date().toISOString().split("T")[0],
    estado: "Pendiente",
  })

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const [activeTab, setActiveTab] = useState("registro")

  useEffect(() => {
    loadLocalesAndProveedores()
  }, [])

  const loadLocalesAndProveedores = async () => {
    setIsLoadingLocales(true)
    setIsLoadingProveedores(true)

    try {
      const [localesData, proveedoresData] = await Promise.all([getLocales(), getProveedores()])

      console.log("Locales fetched:", localesData)
      console.log("Proveedores fetched:", proveedoresData)

      setLocales(localesData)
      setProveedores(proveedoresData)
    } catch (error) {
      console.error("[v0] Error loading locales/proveedores:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los locales y proveedores",
        variant: "destructive",
      })
    } finally {
      setIsLoadingLocales(false)
      setIsLoadingProveedores(false)
    }
  }

  const handleAddLocal = async () => {
    if (!newLocalName.trim()) return

    try {
      const newLocal = await createLocal({ sucursales: newLocalName })
      toast({
        title: "Local agregado",
        description: "El local se ha agregado correctamente",
      })
      setNewLocalName("")
      setIsAddLocalOpen(false)
      await loadLocalesAndProveedores()
      setFormData({ ...formData, local_id: newLocal.id.toString() })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el local",
        variant: "destructive",
      })
    }
  }

  const handleAddProveedor = async () => {
    if (!newProveedorName.trim()) return

    try {
      const newProveedor = await createProveedor({ nombre: newProveedorName })
      toast({
        title: "Proveedor agregado",
        description: "El proveedor se ha agregado correctamente",
      })
      setNewProveedorName("")
      setIsAddProveedorOpen(false)
      await loadLocalesAndProveedores()
      setFormData({ ...formData, proveedor_id: newProveedor.id.toString() })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el proveedor",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("[v0] Submitting reclamo...")
      console.log("[v0] Form Data:", formData)

      let fotoUrl: string | null = null
      if (photoFile) {
        setIsUploadingPhoto(true)
        console.log(`[v0] Uploading file to bucket 'reclamos' folder 'calidad'...`)

        const fileName = `${Date.now()}_${photoFile.name}`
        const filePath = `calidad/${fileName}`

        const supabase = createClient()
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("reclamos")
          .upload(filePath, photoFile)

        if (uploadError) {
          console.error("[v0] Error uploading photo:", uploadError)
          throw new Error("No se pudo subir la foto")
        }

        const { data: urlData } = supabase.storage.from("reclamos").getPublicUrl(filePath)

        fotoUrl = urlData.publicUrl
        console.log("[v0] Photo uploaded successfully:", fotoUrl)
        setIsUploadingPhoto(false)
      }

      const reclamoData = {
        fecha: formData.fecha,
        tipo: formData.tipo,
        local_id: formData.tipo === "Local" ? Number(formData.local_id) : null,
        proveedor_id: formData.tipo === "Proveedor" ? Number(formData.proveedor_id) : null,
        descripcion: formData.descripcion,
        urgencia: formData.urgencia,
        estado: formData.estado,
        foto_url: fotoUrl,
      }

      console.log("[v0] Prepared Data:", reclamoData)

      await createReclamo(reclamoData)

      console.log("[v0] Reclamo created successfully!")

      toast({
        title: "Reclamo registrado",
        description: "El reclamo ha sido guardado correctamente",
      })

      setFormData({
        fecha: new Date().toISOString().split("T")[0],
        tipo: "Local",
        local_id: "",
        proveedor_id: "",
        descripcion: "",
        urgencia: "Media",
        estado: "Pendiente",
      })
      setPhotoFile(null)

      setActiveTab("historial")
      setTimeout(() => {
        handleSearchHistory()
      }, 300)
    } catch (error: any) {
      console.error("[v0] Error submitting reclamo:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el reclamo",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setIsUploadingPhoto(false)
    }
  }

  const handleSearchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      console.log("[v0] Searching Quality History...")

      const endDateTime = new Date(historyFilters.endDate)
      endDateTime.setHours(23, 59, 59, 999)
      const endDateFormatted = endDateTime.toISOString().split("T")[0]

      console.log("[v0] Date Range:", historyFilters.startDate, "to", endDateFormatted, "(23:59:59)")

      const filters = {
        startDate: historyFilters.startDate,
        endDate: endDateFormatted,
        tipo: historyFilters.tipo && historyFilters.tipo !== "all" ? historyFilters.tipo : undefined,
        local_id:
          historyFilters.local_id && historyFilters.local_id !== "all" ? Number(historyFilters.local_id) : undefined,
        proveedor_id:
          historyFilters.proveedor_id && historyFilters.proveedor_id !== "all"
            ? Number(historyFilters.proveedor_id)
            : undefined,
      }

      console.log("[v0] Filters applied:", filters)

      const data = await getReclamosWithFilters(filters)

      console.log("[v0] Found rows:", data.length)

      setHistoryData(data)
      toast({
        title: "Búsqueda completada",
        description: `Se encontraron ${data.length} reclamos`,
      })
    } catch (error) {
      console.error("[v0] Error searching history:", error)
      toast({
        title: "Error",
        description: "No se pudo buscar el historial",
        variant: "destructive",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleExportToExcel = () => {
    if (historyData.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos para exportar",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "ID",
      "Fecha",
      "Tipo",
      "Local",
      "Proveedor",
      "Descripción",
      "Urgencia",
      "Estado",
      "Creado Por",
      "Fecha Creación",
      "Foto URL",
    ]
    const rows = historyData.map((reclamo) => [
      reclamo.id,
      reclamo.fecha,
      reclamo.tipo,
      reclamo.local?.sucursales || "N/A",
      reclamo.proveedor?.nombre || "N/A",
      reclamo.descripcion,
      reclamo.urgencia,
      reclamo.estado,
      reclamo.created_by || "N/A",
      reclamo.created_at ? new Date(reclamo.created_at).toLocaleString() : "N/A",
      reclamo.foto_url || "N/A",
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Reclamos_${historyFilters.startDate}_${historyFilters.endDate}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportado",
      description: "El archivo CSV se ha descargado correctamente",
    })
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <Tabs defaultValue="registro" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="registro">Registro de Reclamos</TabsTrigger>
          <TabsTrigger value="historial">Historial de Reclamos</TabsTrigger>
        </TabsList>

        <TabsContent value="registro">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 text-red-500" />
                <div>
                  <CardTitle>Registro de Reclamos</CardTitle>
                  <CardDescription>Área de Calidad</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!canWriteQuality && (
                <div className="mb-4 border-amber-500/50 bg-amber-500/10 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-500">Solo tienes permisos de lectura en este módulo</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Reclamo</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="Proveedor">Proveedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    type="date"
                    id="fecha"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>

                {formData.tipo === "Local" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="local_id">Local</Label>
                      <Dialog open={isAddLocalOpen} onOpenChange={setIsAddLocalOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" disabled={!canWriteQuality}>
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Agregar Nuevo Local</DialogTitle>
                            <DialogDescription>Ingrese el nombre del nuevo local</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Input
                              placeholder="Nombre del local"
                              value={newLocalName}
                              onChange={(e) => setNewLocalName(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleAddLocal}>Agregar Local</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Select
                      value={formData.local_id}
                      onValueChange={(value) => setFormData({ ...formData, local_id: value })}
                      disabled={isLoadingLocales}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingLocales ? "Cargando locales..." : "Seleccione local"} />
                      </SelectTrigger>
                      <SelectContent>
                        {locales.map((local) => (
                          <SelectItem key={local.id} value={local.id.toString()}>
                            {local.sucursales}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.tipo === "Proveedor" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="proveedor_id">Proveedor</Label>
                      <Dialog open={isAddProveedorOpen} onOpenChange={setIsAddProveedorOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" disabled={!canWriteQuality}>
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
                            <DialogDescription>Ingrese el nombre del nuevo proveedor</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Input
                              placeholder="Nombre del proveedor"
                              value={newProveedorName}
                              onChange={(e) => setNewProveedorName(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleAddProveedor}>Agregar Proveedor</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Select
                      value={formData.proveedor_id}
                      onValueChange={(value) => setFormData({ ...formData, proveedor_id: value })}
                      disabled={isLoadingProveedores}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={isLoadingProveedores ? "Cargando proveedores..." : "Seleccione proveedor"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedores.map((proveedor) => (
                          <SelectItem key={proveedor.id} value={proveedor.id.toString()}>
                            {proveedor.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describa el reclamo en detalle..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgencia">Urgencia</Label>
                  <Select
                    value={formData.urgencia}
                    onValueChange={(value) => setFormData({ ...formData, urgencia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione urgencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo">Foto (Opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          console.log("[v0] Photo selected:", file.name, file.size, "bytes")
                          setPhotoFile(file)
                        }
                      }}
                      className="flex-1"
                    />
                    {photoFile && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        {photoFile.name}
                      </Badge>
                    )}
                  </div>
                  {photoFile && (
                    <p className="text-xs text-muted-foreground">Se subirá a: reclamos/calidad/{photoFile.name}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || isUploadingPhoto || !canWriteQuality}
                >
                  {!canWriteQuality ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Sin Permisos de Escritura
                    </>
                  ) : isUploadingPhoto ? (
                    "Subiendo foto..."
                  ) : isSubmitting ? (
                    "Registrando..."
                  ) : (
                    "Registrar Reclamo"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Reclamos</CardTitle>
              <CardDescription>Consulta y exporta reclamos anteriores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, endDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={historyFilters.tipo}
                    onValueChange={(value) => setHistoryFilters({ ...historyFilters, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="Proveedor">Proveedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Local</Label>
                  <Select
                    value={historyFilters.local_id}
                    onValueChange={(value) => setHistoryFilters({ ...historyFilters, local_id: value })}
                    disabled={isLoadingLocales}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {locales.map((local) => (
                        <SelectItem key={local.id} value={local.id.toString()}>
                          {local.sucursales}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select
                    value={historyFilters.proveedor_id}
                    onValueChange={(value) => setHistoryFilters({ ...historyFilters, proveedor_id: value })}
                    disabled={isLoadingProveedores}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {proveedores.map((proveedor) => (
                        <SelectItem key={proveedor.id} value={proveedor.id.toString()}>
                          {proveedor.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSearchHistory} disabled={isLoadingHistory} className="flex-1">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isLoadingHistory ? "Buscando..." : "Buscar"}
                </Button>
                <Button
                  onClick={handleExportToExcel}
                  variant="outline"
                  disabled={historyData.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>

              {isLoadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">Buscando reclamos...</div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron reclamos. Presiona "Buscar" para cargar resultados.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Local/Proveedor</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Urgencia</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-center">Foto</TableHead> {/* Add Foto header */}
                        </TableRow>
                      </TableHeader>
                      <tbody>
                        {historyData.map((reclamo) => (
                          <TableRow key={reclamo.id}>
                            <TableCell>{reclamo.id}</TableCell>
                            <TableCell>
                              {new Date(reclamo.fecha).toLocaleDateString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                timeZone: "UTC",
                              })}
                            </TableCell>
                            <TableCell>{reclamo.tipo}</TableCell>
                            <TableCell className="max-w-[300px]">
                              {reclamo.tipo === "Local"
                                ? locales.find((l) => l.id === reclamo.local_id)?.sucursales || "N/A"
                                : proveedores.find((p) => p.id === reclamo.proveedor_id)?.nombre || "N/A"}
                            </TableCell>
                            <TableCell className="max-w-[400px] truncate" title={reclamo.descripcion}>
                              {reclamo.descripcion}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  reclamo.urgencia === "Alta"
                                    ? "destructive"
                                    : reclamo.urgencia === "Media"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {reclamo.urgencia}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  reclamo.estado === "Resuelto"
                                    ? "outline"
                                    : reclamo.estado === "En Proceso"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {reclamo.estado}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {reclamo.foto_url ? (
                                <a
                                  href={reclamo.foto_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline"
                                >
                                  <Camera className="h-4 w-4" />
                                  Ver Foto
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-muted text-sm">
                    <strong>Total de registros:</strong> {historyData.length}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
