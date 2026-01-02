"use client"
import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import {
  getOrdenesCompras,
  getFacturas,
  classifyInvoiceType,
  type OrdenCompraOdoo,
  type Factura,
} from "@/lib/supabase-queries"
import { ShoppingCart, DollarSign, Package, Search, Download, Receipt, X, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import SearchableCombobox from "@/components/SearchableCombobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"

export function VentasModule() {
  const { currentUser } = useAuth()
  const userLevel = Number(currentUser?.nivel || 0)

  const [rawData, setRawData] = useState<OrdenCompraOdoo[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFacturas, setLoadingFacturas] = useState(true)

  const currentDate = new Date()
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  const [dateRange, setDateRange] = useState({
    start: firstDay.toISOString().split("T")[0],
    end: lastDay.toISOString().split("T")[0],
  })

  const [sucursalFilter, setSucursalFilter] = useState("__ALL__")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [tipoCobroFilter, setTipoCobroFilter] = useState("__ALL__")

  const uniqueClients = useMemo(() => {
    const clients = [...new Set(rawData.map((orden) => orden.cliente))].sort()
    console.log(`[v0] Generated ${clients.length} unique clients for filters`)
    return clients
  }, [rawData])

  const uniqueProducts = useMemo(() => {
    const products = [...new Set(rawData.map((orden) => orden.producto))].sort()
    console.log(`[v0] Generated ${products.length} unique products for filters`)
    return products
  }, [rawData])

  const uniqueInvoiceClients = useMemo(() => {
    const clients = [...new Set(facturas.map((f) => f.cliente))].sort()
    console.log("[v0] Unique Invoice Clients found:", clients)
    return clients
  }, [facturas])

  const uniqueInvoiceProducts = useMemo(() => {
    const products = [...new Set(facturas.map((f) => f.producto))].filter(Boolean).sort()
    console.log(`[v0] Generated ${products.length} unique products for invoice filters`)
    return products
  }, [facturas])

  const canSeeOrdenes = userLevel >= 1 && userLevel <= 5
  const canSeeFacturacion = userLevel === 1 || userLevel === 7
  const canSeeInvoices = userLevel === 1 || userLevel === 7

  const defaultTab = canSeeOrdenes ? "ordenes" : canSeeFacturacion ? "facturacion" : "invoices"

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const data = await getOrdenesCompras(dateRange.start, dateRange.end)
      setRawData(data)
      setLoading(false)
    }
    fetchData()
  }, [dateRange])

  useEffect(() => {
    async function fetchFacturas() {
      if (!canSeeInvoices) return

      setLoadingFacturas(true)
      try {
        const data = await getFacturas(dateRange.start, dateRange.end)
        setFacturas(data)
      } catch (error) {
        console.error("[v0] Error fetching facturas:", error)
      } finally {
        setLoadingFacturas(false)
      }
    }
    fetchFacturas()
  }, [dateRange, canSeeInvoices])

  const filteredData = useMemo(() => {
    return rawData.filter((orden) => {
      const matchesSucursal = sucursalFilter === "__ALL__" || orden.cliente === sucursalFilter
      const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(orden.producto)
      return matchesSucursal && matchesProduct
    })
  }, [rawData, sucursalFilter, selectedProducts])

  const filteredFacturas = useMemo(() => {
    console.log(`[v0] Sales Filter: Selected ${selectedProducts.length} products`)
    return facturas.filter((factura) => {
      const matchesSucursal = sucursalFilter === "__ALL__" || factura.cliente === sucursalFilter

      if (selectedProducts.length > 0 && !selectedProducts.includes(factura.producto)) {
        return false
      }

      if (tipoCobroFilter !== "__ALL__") {
        const tipo = classifyInvoiceType(factura.numero)
        if (tipoCobroFilter === "EFECTIVO" && tipo !== "EFECTIVO") return false
        if (tipoCobroFilter === "FACTURADO" && tipo !== "FACTURADO") return false
      }

      return matchesSucursal
    })
  }, [facturas, sucursalFilter, selectedProducts, tipoCobroFilter])

  const totalBultos = useMemo(() => {
    return filteredData.reduce((sum, orden) => sum + (orden.cantidad || 0), 0)
  }, [filteredData])

  const totalFacturado = useMemo(() => {
    return filteredData.reduce((sum, orden) => sum + (orden.total || 0), 0)
  }, [filteredData])

  const totalFacturadoInvoices = useMemo(() => {
    return filteredFacturas.reduce((sum, factura) => sum + (factura.total || 0), 0)
  }, [filteredFacturas])

  const exportToExcel = (tabName: string) => {
    console.log(`[v0] Exporting Sales Data: ${filteredData.length} rows for tab: ${tabName}`)

    const currentDate = new Date().toISOString().split("T")[0]
    let csvContent = ""
    let filename = ""

    if (tabName === "ordenes") {
      filename = `Ordenes_Diarias_${currentDate}.csv`
      csvContent = "Fecha,Sucursal,Producto,Bultos,Unidades\n"
      filteredData.forEach((orden) => {
        const fecha = new Date(orden.fecha + "T00:00:00").toLocaleDateString("es-AR", {
          timeZone: "UTC",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        csvContent += `${fecha},${orden.cliente},${orden.producto},${orden.cantidad},${orden.cantidad_insumos}\n`
      })
    } else {
      filename = `Facturacion_${currentDate}.csv`
      csvContent = "Fecha,Sucursal,Producto,Cantidad,Total\n"
      filteredData.forEach((orden) => {
        const fecha = new Date(orden.fecha + "T00:00:00").toLocaleDateString("es-AR", {
          timeZone: "UTC",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        csvContent += `${fecha},${orden.cliente},${orden.producto},${orden.cantidad},${orden.total.toFixed(2)}\n`
      })
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()

    console.log(`[v0] Export complete: ${filename}`)
  }

  const exportInvoicesToExcel = () => {
    console.log(`[v0] Exporting Invoices Data: ${filteredFacturas.length} rows`)

    const currentDate = new Date().toISOString().split("T")[0]
    const filename = `Facturas_${currentDate}.csv`

    let csvContent = "Fecha,Cliente,Número,Tipo,Total,Estado Pago\n"
    filteredFacturas.forEach((factura) => {
      const tipo = classifyInvoiceType(factura.numero)
      const fecha = new Date(factura.fecha_factura + "T00:00:00").toLocaleDateString("es-AR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      csvContent += `${fecha},${factura.cliente},${factura.numero},${tipo},${factura.total.toFixed(2)},${factura.estado_pago}\n`
    })

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()

    console.log(`[v0] Export complete: ${filename}`)
  }

  const handleProductToggle = (producto: string) => {
    console.log("[v0] Product toggle clicked:", producto)
    setSelectedProducts((prev) => {
      const newSelection = prev.includes(producto) ? prev.filter((p) => p !== producto) : [...prev, producto]
      console.log("[v0] Previous selection:", prev)
      console.log("[v0] New selection:", newSelection)
      return newSelection
    })
  }

  const handleClearProducts = () => {
    console.log("[v0] Clearing all product selections")
    setSelectedProducts([])
  }

  const handleSelectAll = () => {
    console.log("[v0] Selecting all products:", uniqueInvoiceProducts)
    setSelectedProducts([...uniqueInvoiceProducts])
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#ff6b6b]/20 to-[#ff8e53]/20 shadow-[0_0_20px_rgba(255,107,107,0.15)]">
          <ShoppingCart className="h-7 w-7 text-[#ff6b6b]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Módulo de Ventas</h1>
          <p className="text-sm text-zinc-400 font-mono">Gestión de órdenes diarias y facturación</p>
        </div>
      </div>

      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Fecha Inicio</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="glass-panel border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Fecha Fin</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="glass-panel border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Sucursal</Label>
              <SearchableCombobox
                options={uniqueClients}
                value={sucursalFilter}
                onValueChange={setSucursalFilter}
                placeholder="Buscar sucursal..."
                emptyMessage="No se encontraron sucursales."
                allLabel="Todas las Sucursales"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Producto</Label>
              <SearchableCombobox
                options={uniqueProducts}
                value={selectedProducts.join(", ")}
                onValueChange={(value) => setSelectedProducts(value.split(", ").filter(Boolean))}
                placeholder="Buscar producto..."
                emptyMessage="No se encontraron productos."
                allLabel="Todos los Productos"
                multiSelect
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            Mostrando {filteredData.length} de {rawData.length} registros
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="glass-panel border border-white/5 p-1">
          {canSeeOrdenes && (
            <TabsTrigger
              value="ordenes"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff6b6b]/20 data-[state=active]:to-[#ff8e53]/20 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4 mr-2" />
              Órdenes Diarias
            </TabsTrigger>
          )}

          {canSeeFacturacion && (
            <TabsTrigger
              value="facturacion"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff6b6b]/20 data-[state=active]:to-[#ff8e53]/20 data-[state=active]:text-white"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Facturación
            </TabsTrigger>
          )}

          {canSeeInvoices && (
            <TabsTrigger
              value="invoices"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff6b6b]/20 data-[state=active]:to-[#ff8e53]/20 data-[state=active]:text-white"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Facturado / Efectivo
            </TabsTrigger>
          )}
        </TabsList>

        {canSeeOrdenes && (
          <TabsContent value="ordenes" className="space-y-4">
            <Card className="glass-panel border-white/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Órdenes Diarias - Datos Operacionales
                </CardTitle>
                <Button
                  onClick={() => exportToExcel("ordenes")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-zinc-400 text-sm">Cargando datos...</p>
                ) : filteredData.length === 0 ? (
                  <p className="text-zinc-400 text-sm">No se encontraron registros con estos filtros</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Fecha</th>
                            <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Sucursal</th>
                            <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Producto</th>
                            <th className="text-right py-3 px-4 text-zinc-400 font-mono text-xs">Bultos</th>
                            <th className="text-right py-3 px-4 text-zinc-400 font-mono text-xs">Unidades</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.map((orden) => (
                            <tr key={orden.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-3 px-4 text-white font-mono text-xs">
                                {new Date(orden.fecha + "T00:00:00").toLocaleDateString("es-AR", {
                                  timeZone: "UTC",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3 px-4 text-white">{orden.cliente}</td>
                              <td className="py-3 px-4 text-zinc-300 text-xs">{orden.producto}</td>
                              <td className="py-3 px-4 text-right text-white font-mono">{orden.cantidad}</td>
                              <td className="py-3 px-4 text-right text-zinc-300 font-mono">{orden.cantidad_insumos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 p-4 glass-panel rounded-lg border border-[#ff6b6b]/20">
                      <p className="text-lg font-bold text-white font-mono">Total Bultos: {totalBultos}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canSeeFacturacion && (
          <TabsContent value="facturacion" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-panel border-[#ff6b6b]/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Facturado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white font-mono">
                    ${totalFacturado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Período seleccionado</p>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Bultos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white font-mono">{totalBultos}</p>
                  <p className="text-xs text-zinc-500 mt-1">Período seleccionado</p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel border-white/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Facturación - Datos Financieros Sensibles
                </CardTitle>
                <Button
                  onClick={() => exportToExcel("facturacion")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-zinc-400 text-sm">Cargando datos...</p>
                ) : filteredData.length === 0 ? (
                  <p className="text-zinc-400 text-sm">No se encontraron registros con estos filtros</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Fecha</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Sucursal</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Producto</th>
                          <th className="text-right py-3 px-4 text-zinc-400 font-mono text-xs">Cantidad</th>
                          <th className="text-right py-3 px-4 text-zinc-400 font-mono text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((orden) => (
                          <tr key={orden.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 text-white font-mono text-xs">
                              {new Date(orden.fecha + "T00:00:00").toLocaleDateString("es-AR", {
                                timeZone: "UTC",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4 text-white">{orden.cliente}</td>
                            <td className="py-3 px-4 text-zinc-300 text-xs">{orden.producto}</td>
                            <td className="py-3 px-4 text-right text-white font-mono">{orden.cantidad}</td>
                            <td className="py-3 px-4 text-right text-[#ff6b6b] font-mono font-bold">
                              ${orden.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canSeeInvoices && (
          <TabsContent value="invoices" className="space-y-4">
            <Card className="glass-panel border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Filtros - Facturas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs">Sucursal</Label>
                    <SearchableCombobox
                      options={uniqueInvoiceClients}
                      value={sucursalFilter}
                      onValueChange={setSucursalFilter}
                      placeholder="Buscar sucursal..."
                      emptyMessage="No se encontraron sucursales."
                      allLabel="Todas las Sucursales"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400 text-xs">Productos</Label>
                      {selectedProducts.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearProducts}
                          className="h-6 px-2 text-xs text-zinc-500 hover:text-white"
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between glass-panel border-white/10 text-white hover:bg-white/5 bg-transparent"
                        >
                          {selectedProducts.length === 0
                            ? "Seleccionar productos..."
                            : selectedProducts.length === 1
                              ? selectedProducts[0]
                              : selectedProducts.length <= 3
                                ? selectedProducts.join(", ")
                                : `${selectedProducts.length} productos seleccionados`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 glass-panel border-white/10" align="start">
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Buscar producto..." className="text-white" />
                          <CommandList>
                            <CommandEmpty className="text-zinc-500 text-sm py-6 text-center">
                              No se encontraron productos.
                            </CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              <CommandItem
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleSelectAll()
                                }}
                                className="text-white cursor-pointer hover:bg-white/10 border-b border-white/10"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <CheckSquare className="h-4 w-4 text-green-400" />
                                  <span className="flex-1 font-medium">Marcar Todos</span>
                                  <span className="text-xs text-zinc-400">
                                    ({uniqueInvoiceProducts.length} productos)
                                  </span>
                                </div>
                              </CommandItem>
                              <CommandItem
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleClearProducts()
                                }}
                                className="text-white cursor-pointer hover:bg-white/10 border-b border-white/10"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <X className="h-4 w-4 text-red-400" />
                                  <span className="flex-1 font-medium">Desmarcar Todos</span>
                                  {selectedProducts.length > 0 && (
                                    <span className="text-xs text-zinc-400">
                                      ({selectedProducts.length} seleccionado{selectedProducts.length !== 1 ? "s" : ""})
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                              {uniqueInvoiceProducts.map((producto) => (
                                <CommandItem
                                  key={producto}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleProductToggle(producto)
                                  }}
                                  className="text-white cursor-pointer hover:bg-white/10"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <div
                                      className={`h-4 w-4 border rounded flex items-center justify-center ${selectedProducts.includes(producto) ? "bg-[#ff6b6b] border-[#ff6b6b]" : "border-white/30"}`}
                                    >
                                      {selectedProducts.includes(producto) && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="flex-1">{producto}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedProducts.length > 0 && (
                      <p className="text-xs text-zinc-500 font-mono">
                        {selectedProducts.length} producto{selectedProducts.length > 1 ? "s" : ""} seleccionado
                        {selectedProducts.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs">Tipo de Cobro</Label>
                    <Select value={tipoCobroFilter} onValueChange={setTipoCobroFilter}>
                      <SelectTrigger className="glass-panel border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ALL__">Todos</SelectItem>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="FACTURADO">Facturado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 font-mono">
                  Mostrando {filteredFacturas.length} de {facturas.length} facturas
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel border-[#ff6b6b]/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Facturado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white font-mono">
                  ${totalFacturadoInvoices.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Período seleccionado</p>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Control de Facturas
                </CardTitle>
                <Button
                  onClick={exportInvoicesToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </Button>
              </CardHeader>
              <CardContent>
                {loadingFacturas ? (
                  <p className="text-zinc-400 text-sm">Cargando facturas...</p>
                ) : filteredFacturas.length === 0 ? (
                  <p className="text-zinc-400 text-sm">No se encontraron facturas con estos filtros</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Fecha</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Cliente</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Número</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-mono text-xs">Tipo</th>
                          <th className="text-right py-3 px-4 text-zinc-400 font-mono text-xs">Total</th>
                          <th className="text-center py-3 px-4 text-zinc-400 font-mono text-xs">Estado Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFacturas.map((factura) => {
                          const tipo = classifyInvoiceType(factura.numero)
                          return (
                            <tr key={factura.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-3 px-4 text-white font-mono text-xs">
                                {new Date(factura.fecha_factura + "T00:00:00").toLocaleDateString("es-AR", {
                                  timeZone: "UTC",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3 px-4 text-white">{factura.cliente}</td>
                              <td className="py-3 px-4 text-zinc-300 font-mono text-xs">{factura.numero}</td>
                              <td className="py-3 px-4">
                                {tipo === "EFECTIVO" && (
                                  <Badge className="bg-green-600/20 text-green-400 border-green-600/30">EFECTIVO</Badge>
                                )}
                                {tipo === "FACTURADO" && (
                                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">FACTURADO</Badge>
                                )}
                                {tipo === "OTRO" && (
                                  <Badge className="bg-zinc-600/20 text-zinc-400 border-zinc-600/30">OTRO</Badge>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-[#ff6b6b] font-mono font-bold">
                                ${factura.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {factura.estado_pago === "paid" ? (
                                  <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Pagado</Badge>
                                ) : (
                                  <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Pendiente</Badge>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <div className="text-xs text-zinc-600 font-mono text-center">
        Usuario: {currentUser?.usuario} | Nivel: {userLevel} | Ver Órdenes: {canSeeOrdenes ? "Sí" : "No"} | Ver
        Facturación: {canSeeFacturacion ? "Sí" : "No"} | Ver Facturas: {canSeeInvoices ? "Sí" : "No"}
      </div>
    </div>
  )
}
