"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  getProductos,
  createDecomisoWithCost,
  createProduccionDiaria,
  getProduccionHistory,
  getDecomisoHistory,
  deleteProduccionDiaria,
  deleteDecomiso,
} from "@/lib/supabase-queries"
import { Factory, DollarSign, AlertCircle, Download, Search, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase"
import * as XLSX from "xlsx"
import ProductCombobox from "@/components/ui/product-combobox"
import { useAuth } from "@/lib/auth-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const ProductionForm = () => {
  const { toast } = useToast()
  const { currentUser, canWrite } = useAuth()
  const canWriteProduction = canWrite("produccion")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [productos, setProductos] = useState<any[]>([])

  const [selectedProductCost, setSelectedProductCost] = useState<number>(0)
  const [selectedProductPrice, setSelectedProductPrice] = useState<number>(0)
  const [costoTotal, setCostoTotal] = useState(0)

  const [decomisoForm, setDecomisoForm] = useState({
    producto: "",
    kilos_cantidad: "",
    motivo: "",
    fecha: new Date().toISOString().split("T")[0],
  })

  const [dailyForm, setDailyForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    producto: "",
    cantidad_pedida: "",
    cantidad_realizada: "",
  })

  const [unitPrice, setUnitPrice] = useState<number>(0)

  const [historyDateRange, setHistoryDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  })
  const [historyDecomisos, setHistoryDecomisos] = useState<any[]>([])
  const [historyProduccion, setHistoryProduccion] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: "produccion" | "decomiso" | null
    id: number | null
  }>({
    open: false,
    type: null,
    id: null,
  })

  useEffect(() => {
    async function loadHistory() {
      try {
        const [produccionData, decomisosData] = await Promise.all([
          getProduccionHistory(historyDateRange.start, historyDateRange.end),
          getDecomisoHistory(historyDateRange.start, historyDateRange.end),
        ])
        setHistoryProduccion(produccionData)
        setHistoryDecomisos(decomisosData)
      } catch (error) {
        console.error("[v0] Error loading history:", error)
      }
    }
    loadHistory()
  }, [historyDateRange])

  useEffect(() => {
    loadProductos()
  }, [])

  const loadProductos = async () => {
    try {
      setIsLoading(true)
      console.log("[v0] Loading productos from costos_odoo...")
      const costosData = await getProductos()
      console.log("[v0] Loaded productos:", costosData.length)
      setProductos(costosData)
    } catch (error) {
      console.error("[v0] Error loading productos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos desde la base de datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPrice = async (productName: string): Promise<number> => {
    try {
      // Step 1: Extract First Main Word (The Net)
      const cleanName = productName.replace(/^\[.*?\]\s*/, "").trim()
      const firstWord = cleanName.split(/\s+/)[0]

      if (!firstWord || firstWord.length < 2) {
        console.log("[v0] Invalid first word")
        return 0
      }

      console.log("[v0] Broad search starting with:", firstWord)

      // Step 1: Broad Fetch - Get EVERYTHING starting with this word
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from("precio_odoo")
        .select("producto, total, cantidad_insumo")
        .ilike("producto", `%${firstWord}%`)
        .gt("total", 0) // Strictly ignore $0 prices
        .limit(20)

      if (error) {
        console.error("[v0] Error fetching candidates:", error)
        return 0
      }

      if (!data || data.length === 0) {
        console.log("[v0] No candidates found")
        return 0
      }

      console.log(`[v0] Found ${data.length} candidates`)

      // Step 2: Scoring System (The Filter)
      // Tokenize the full search name
      const searchTokens = cleanName
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 1)

      console.log("[v0] Search tokens:", searchTokens)

      // Score each candidate
      const scoredResults = data.map((record) => {
        const candidateName = record.producto.toLowerCase()
        let score = 0

        // Count how many search tokens appear in the candidate
        searchTokens.forEach((token) => {
          if (candidateName.includes(token)) {
            score++
          }
        })

        return { ...record, score }
      })

      // Step 3: Select Winner - Sort by score descending
      scoredResults.sort((a, b) => b.score - a.score)

      const winner = scoredResults[0]

      if (!winner || winner.score === 0) {
        console.log("[v0] No matching candidates (all scored 0)")
        return 0
      }

      // Step 4: Calculate unit price
      if (!winner.cantidad_insumo || winner.cantidad_insumo === 0) {
        console.log("[v0] Warning: cantidad_insumo is 0 for winner")
        return 0
      }

      const unitPrice = winner.total / winner.cantidad_insumo

      console.log(`[v0] Winner: "${winner.producto}" | Score: ${winner.score} | Price: $${unitPrice.toFixed(2)}`)

      return unitPrice
    } catch (error) {
      console.error("[v0] Exception in fetchPrice:", error)
      return 0
    }
  }

  const handleProductChange = async (productoNombre: string) => {
    setDecomisoForm({ ...decomisoForm, producto: productoNombre })

    console.log("[v0] Selected product:", productoNombre)

    // Get cost from costos_odoo
    const productoCosto = productos.find((p) => p.producto === productoNombre)
    const costoUnitario = productoCosto?.costo || 0
    console.log("[v0] Found cost:", costoUnitario)
    setSelectedProductCost(costoUnitario)

    const precioVenta = await fetchPrice(productoNombre)
    console.log("[v0] Found price:", precioVenta)
    setSelectedProductPrice(precioVenta)
  }

  const handleDailyProductChange = async (productoNombre: string) => {
    setDailyForm({ ...dailyForm, producto: productoNombre })

    console.log("[v0] Selected product for production:", productoNombre)

    // Fetch cost from costos_odoo
    const productoCosto = productos.find((p) => p.producto === productoNombre)
    const costoUnitario = productoCosto?.costo || 0
    console.log("[v0] Production cost:", costoUnitario)
    setUnitPrice(costoUnitario)
  }

  const handleDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite("produccion")) {
      toast({ title: "Sin permisos", description: "No tienes permisos para crear registros", variant: "destructive" })
      return
    }

    try {
      const costSnapshot = unitPrice * Number.parseInt(dailyForm.cantidad_realizada || "0")

      await createProduccionDiaria({
        fecha: dailyForm.fecha,
        producto_nombre: dailyForm.producto,
        cantidad_pedida: Number.parseInt(dailyForm.cantidad_pedida),
        cantidad_realizada: Number.parseInt(dailyForm.cantidad_realizada),
        costo_snapshot: costSnapshot,
        created_by: currentUser?.usuario || "unknown",
      })

      toast({ title: "Registro creado", description: "Producción diaria registrada exitosamente" })
      setDailyForm({
        fecha: new Date().toISOString().split("T")[0],
        producto: "",
        cantidad_pedida: "",
        cantidad_realizada: "",
      })
      setUnitPrice(0)

      // Refresh history
      const produccionData = await getProduccionHistory(historyDateRange.start, historyDateRange.end)
      setHistoryProduccion(produccionData)
    } catch (error: any) {
      console.error("[v0] Error submitting production:", error)
      toast({ title: "Error", description: error.message || "No se pudo guardar el registro", variant: "destructive" })
    }
  }

  const handleDecomisoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite("produccion")) {
      toast({ title: "Sin permisos", description: "No tienes permisos para crear registros", variant: "destructive" })
      return
    }

    try {
      const costTotal = unitPrice * Number.parseFloat(decomisoForm.kilos_cantidad)

      await createDecomisoWithCost({
        fecha: decomisoForm.fecha,
        producto: decomisoForm.producto,
        kilos_cantidad: Number.parseFloat(decomisoForm.kilos_cantidad),
        motivo: decomisoForm.motivo,
        costo_total: costTotal,
        created_by: currentUser?.usuario || "unknown",
      })

      toast({ title: "Registro creado", description: "Decomiso registrado exitosamente" })
      setDecomisoForm({ fecha: new Date().toISOString().split("T")[0], producto: "", kilos_cantidad: "", motivo: "" })
      setUnitPrice(0)

      // Refresh history
      const decomisosData = await getDecomisoHistory(historyDateRange.start, historyDateRange.end)
      setHistoryDecomisos(decomisosData)
    } catch (error: any) {
      console.error("[v0] Error submitting decomiso:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el registro",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    console.log("[v0] Submitting Decomiso with kilos_cantidad:", decomisoForm.kilos_cantidad)

    try {
      await createDecomisoWithCost({
        producto: decomisoForm.producto,
        kilos_cantidad: Number.parseFloat(decomisoForm.kilos_cantidad),
        motivo: decomisoForm.motivo,
        fecha: decomisoForm.fecha,
        costo_total: costoTotal,
      })

      toast({
        title: "Decomiso registrado",
        description: `Decomiso registrado. Costo total: $${costoTotal.toFixed(2)}`,
      })

      setDecomisoForm({
        producto: "",
        kilos_cantidad: "",
        motivo: "",
        fecha: new Date().toISOString().split("T")[0],
      })
      setCostoTotal(0)
      setSelectedProductCost(0)
      setSelectedProductPrice(0)
    } catch (error: any) {
      console.error("[v0] Error submitting decomiso:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el decomiso.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (decomisoForm.producto && decomisoForm.kilos_cantidad && selectedProductCost > 0) {
      const total = selectedProductCost * Number.parseFloat(decomisoForm.kilos_cantidad)
      setCostoTotal(total)
    } else {
      setCostoTotal(0)
    }
  }, [decomisoForm.kilos_cantidad, selectedProductCost, decomisoForm.producto])

  const exportToExcel = () => {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new()

      // Sheet 1: Decomisos
      const decomisosSheet = historyDecomisos.map((d) => ({
        Fecha: new Date(d.fecha + "T00:00:00").toLocaleDateString("es-AR", { timeZone: "UTC" }),
        Producto: d.producto,
        Cantidad: d.kilos_cantidad,
        Unidad: (d as any).unidad || "Kilos",
        "Costo Total": (d as any).costo_total || 0,
        Motivo: d.motivo,
        CreadoPor: (d as any).created_by || "N/A",
      }))
      const ws1 = XLSX.utils.json_to_sheet(decomisosSheet)
      XLSX.utils.book_append_sheet(workbook, ws1, "Decomisos")

      // Sheet 2: Producción Diaria
      const produccionSheet = historyProduccion.map((p) => ({
        Fecha: new Date(p.fecha + "T00:00:00").toLocaleDateString("es-AR", { timeZone: "UTC" }),
        Producto: p.producto_nombre,
        Pedido: p.cantidad_pedida,
        Realizado: p.cantidad_realizada,
        Eficiencia: `${((p.cantidad_realizada / p.cantidad_pedida) * 100).toFixed(1)}%`,
        CreadoPor: (p as any).created_by || "N/A",
      }))
      const ws2 = XLSX.utils.json_to_sheet(produccionSheet)
      XLSX.utils.book_append_sheet(workbook, ws2, "Producción Diaria")

      // Generate filename
      const filename = `Reporte_Produccion_${historyDateRange.start}_${historyDateRange.end}.xlsx`

      // Download
      XLSX.writeFile(workbook, filename)

      toast({
        title: "Archivo descargado",
        description: `El reporte ${filename} se ha descargado correctamente`,
      })
    } catch (error) {
      console.error("[v0] Error exporting to Excel:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el archivo Excel",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (type: "produccion" | "decomiso", id: number) => {
    setDeleteDialog({ open: true, type, id })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id || !deleteDialog.type) return

    try {
      if (deleteDialog.type === "produccion") {
        await deleteProduccionDiaria(deleteDialog.id)
        const produccionData = await getProduccionHistory(historyDateRange.start, historyDateRange.end)
        setHistoryProduccion(produccionData)
        toast({ title: "Registro eliminado", description: "Producción eliminada exitosamente" })
      } else {
        await deleteDecomiso(deleteDialog.id)
        const decomisosData = await getDecomisoHistory(historyDateRange.start, historyDateRange.end)
        setHistoryDecomisos(decomisosData)
        toast({ title: "Registro eliminado", description: "Decomiso eliminado exitosamente" })
      }
    } catch (error: any) {
      console.error("[v0] Error deleting record:", error)
      toast({ title: "Error", description: "No se pudo eliminar el registro", variant: "destructive" })
    } finally {
      setDeleteDialog({ open: false, type: null, id: null })
    }
  }

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0]
    return dateStr === today
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
      {!isLoading && productos.length === 0 && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay productos disponibles. Asegúrate de que la tabla <code>costos_odoo</code> tenga datos en Supabase.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="decomisos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="decomisos">Decomisos</TabsTrigger>
          <TabsTrigger value="produccion">Producción Diaria</TabsTrigger>
          <TabsTrigger value="historial">Historial y Exportación</TabsTrigger>
        </TabsList>

        <TabsContent value="decomisos">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Factory className="h-6 w-6 text-orange-500" />
                <div>
                  <CardTitle>Registro de Decomisos</CardTitle>
                  <CardDescription>Área de Producción</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!canWriteProduction && (
                <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
                  <Lock className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-500">
                    Solo tienes permisos de lectura en este módulo
                  </AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando productos...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="producto">Producto</Label>
                    <ProductCombobox
                      products={productos}
                      value={decomisoForm.producto}
                      onValueChange={handleProductChange}
                      disabled={productos.length === 0}
                      placeholder={productos.length === 0 ? "No hay productos disponibles" : "Buscar producto..."}
                    />
                  </div>

                  {decomisoForm.producto && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Costo Unitario</Label>
                        <Input value={`$${selectedProductCost.toFixed(2)}`} readOnly className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio Venta</Label>
                        <Input value={`$${selectedProductPrice.toFixed(2)}`} readOnly className="bg-muted" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="kilos_cantidad">Kilos</Label>
                    <Input
                      id="kilos_cantidad"
                      type="number"
                      step="0.01"
                      value={decomisoForm.kilos_cantidad}
                      onChange={(e) => setDecomisoForm({ ...decomisoForm, kilos_cantidad: e.target.value })}
                      placeholder="Ej: 25.5"
                      required
                    />
                  </div>

                  {costoTotal > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Pérdida Total</p>
                            <p className="text-2xl font-bold text-red-600">${costoTotal.toFixed(2)}</p>
                          </div>
                        </div>
                        {selectedProductPrice > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-red-700">Valor de venta perdido</p>
                            <p className="text-lg font-semibold text-red-800">
                              $
                              {(selectedProductPrice * Number.parseFloat(decomisoForm.kilos_cantidad || "0")).toFixed(
                                2,
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo</Label>
                    <Textarea
                      id="motivo"
                      value={decomisoForm.motivo}
                      onChange={(e) => setDecomisoForm({ ...decomisoForm, motivo: e.target.value })}
                      placeholder="Describa el motivo del decomiso..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={decomisoForm.fecha}
                      onChange={(e) => setDecomisoForm({ ...decomisoForm, fecha: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || productos.length === 0 || !canWriteProduction}
                  >
                    {!canWriteProduction ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Sin Permisos de Escritura
                      </>
                    ) : isSubmitting ? (
                      "Registrando..."
                    ) : (
                      "Registrar Decomiso"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produccion">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Factory className="h-6 w-6 text-green-500" />
                <div>
                  <CardTitle>Producción Diaria</CardTitle>
                  <CardDescription>Registro de metas vs realidad</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!canWriteProduction && (
                <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
                  <Lock className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-500">
                    Solo tienes permisos de lectura en este módulo
                  </AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando productos...</div>
              ) : (
                <form onSubmit={handleDailySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_prod">Fecha</Label>
                    <Input
                      id="fecha_prod"
                      type="date"
                      value={dailyForm.fecha}
                      onChange={(e) => setDailyForm({ ...dailyForm, fecha: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="producto_prod">Producto</Label>
                    <ProductCombobox
                      products={productos}
                      value={dailyForm.producto}
                      onValueChange={handleDailyProductChange}
                      disabled={productos.length === 0}
                      placeholder={productos.length === 0 ? "No hay productos disponibles" : "Buscar producto..."}
                    />
                  </div>

                  {dailyForm.producto && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Costo Unitario</p>
                          <p className="text-lg font-bold text-blue-900">${unitPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Precio Venta</p>
                          <p className="text-lg font-bold text-blue-900">${selectedProductPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700 mb-1">Margen Unitario</p>
                          <p className="text-lg font-bold text-green-900">
                            ${(selectedProductPrice - unitPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cantidad_pedida">Cantidad Pedida</Label>
                      <Input
                        id="cantidad_pedida"
                        type="number"
                        step="0.01"
                        value={dailyForm.cantidad_pedida}
                        onChange={(e) => setDailyForm({ ...dailyForm, cantidad_pedida: e.target.value })}
                        placeholder="Ej: 100"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cantidad_realizada">Cantidad Realizada</Label>
                      <Input
                        id="cantidad_realizada"
                        type="number"
                        step="0.01"
                        value={dailyForm.cantidad_realizada}
                        onChange={(e) => setDailyForm({ ...dailyForm, cantidad_realizada: e.target.value })}
                        placeholder="Ej: 95"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || productos.length === 0 || !canWriteProduction}
                  >
                    {!canWriteProduction ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Sin Permisos de Escritura
                      </>
                    ) : isSubmitting ? (
                      "Registrando..."
                    ) : (
                      "Registrar Producción"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          {/* Date Range Filter */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Rango de Fechas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_desde">Fecha Desde</Label>
                <Input
                  id="fecha_desde"
                  type="date"
                  value={historyDateRange.start}
                  onChange={(e) => setHistoryDateRange({ ...historyDateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_hasta">Fecha Hasta</Label>
                <Input
                  id="fecha_hasta"
                  type="date"
                  value={historyDateRange.end}
                  onChange={(e) => setHistoryDateRange({ ...historyDateRange, end: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={() => {}} disabled={isLoadingHistory} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {isLoadingHistory ? "Buscando..." : "Buscar / Filtrar"}
            </Button>
          </div>

          {/* Export Button */}
          {(historyDecomisos.length > 0 || historyProduccion.length > 0) && (
            <Button onClick={exportToExcel} className="w-full bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Descargar Excel (.xlsx)
            </Button>
          )}

          {/* Decomisos Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Decomisos</h3>
              <span className="text-sm text-muted-foreground">{historyDecomisos.length} registros</span>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Fecha</th>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-right">Cantidad</th>
                      <th className="px-4 py-2 text-right">Costo</th>
                      <th className="px-4 py-2 text-left">Creado por</th>
                      {currentUser?.nivel === 1 && <th className="px-4 py-2 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {historyDecomisos.map((d) => (
                      <tr
                        key={d.id}
                        className={`border-t hover:bg-muted/50 ${
                          isToday(d.fecha) ? "bg-green-50 dark:bg-green-950/20" : "bg-gray-50 dark:bg-gray-900/20"
                        }`}
                      >
                        <td className="px-4 py-2">
                          {new Date(d.fecha + "T00:00:00").toLocaleDateString("es-AR", { timeZone: "UTC" })}
                        </td>
                        <td className="px-4 py-2">{d.producto}</td>
                        <td className="px-4 py-2 text-right">
                          {d.kilos_cantidad} {(d as any).unidad || "Kilos"}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-red-600">
                          ${((d as any).costo_total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{(d as any).created_by || "N/A"}</td>
                        {currentUser?.nivel === 1 && (
                          <td className="px-4 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick("decomiso", d.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {historyDecomisos.length > 0 && (
                    <tfoot className="bg-muted font-bold sticky bottom-0">
                      <tr>
                        <td colSpan={currentUser?.nivel === 1 ? 4 : 3} className="px-4 py-2 text-right">
                          Total Perdido:
                        </td>
                        <td className="px-4 py-2 text-right text-red-700">
                          ${historyDecomisos.reduce((sum, d) => sum + ((d as any).costo_total || 0), 0).toFixed(2)}
                        </td>
                        <td colSpan={currentUser?.nivel === 1 ? 2 : 1}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {historyDecomisos.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No hay decomisos en el rango seleccionado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Producción Diaria Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Producción Diaria</h3>
              <span className="text-sm text-muted-foreground">{historyProduccion.length} registros</span>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Fecha</th>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-right">Pedido</th>
                      <th className="px-4 py-2 text-right">Realizado</th>
                      <th className="px-4 py-2 text-right">Eficiencia</th>
                      <th className="px-4 py-2 text-left">Creado por</th>
                      {currentUser?.nivel === 1 && <th className="px-4 py-2 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {historyProduccion.map((p) => {
                      const eficiencia = (p.cantidad_realizada / p.cantidad_pedida) * 100
                      const eficienciaColor =
                        eficiencia >= 95 ? "text-green-600" : eficiencia >= 80 ? "text-yellow-600" : "text-red-600"
                      return (
                        <tr
                          key={p.id}
                          className={`border-t hover:bg-muted/50 ${
                            isToday(p.fecha) ? "bg-green-50 dark:bg-green-950/20" : "bg-gray-50 dark:bg-gray-900/20"
                          }`}
                        >
                          <td className="px-4 py-2">
                            {new Date(p.fecha + "T00:00:00").toLocaleDateString("es-AR", { timeZone: "UTC" })}
                          </td>
                          <td className="px-4 py-2">{p.producto_nombre}</td>
                          <td className="px-4 py-2 text-right">{p.cantidad_pedida}</td>
                          <td className="px-4 py-2 text-right">{p.cantidad_realizada}</td>
                          <td className={`px-4 py-2 text-right font-medium ${eficienciaColor}`}>
                            {eficiencia.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{(p as any).created_by || "N/A"}</td>
                          {currentUser?.nivel === 1 && (
                            <td className="px-4 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick("produccion", p.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {historyProduccion.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No hay registros de producción en el rango seleccionado
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* AlertDialog for delete confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro será eliminado permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ProductionForm
export { ProductionForm }
