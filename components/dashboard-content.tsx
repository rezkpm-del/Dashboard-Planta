import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getDecomisos,
  getReclamos,
  getHojasRuta,
  getNovedades,
  getDecomisosLast7Days,
  getReclamosByTipo,
  getRecentActivity,
  getDecomisosToday,
  getRutasActivas,
} from "@/lib/supabase-queries"
import { AlertTriangle, FileText, Truck, Bell, Calendar, MapPin } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export async function DashboardContent() {
  const [
    decomisosLast7Days,
    reclamosData,
    activity,
    decomisos,
    reclamos,
    hojasRuta,
    novedades,
    decomisosToday,
    rutasActivas,
  ] = await Promise.all([
    getDecomisosLast7Days(),
    getReclamosByTipo(),
    getRecentActivity(),
    getDecomisos(),
    getReclamos(),
    getHojasRuta(),
    getNovedades(),
    getDecomisosToday(),
    getRutasActivas(),
  ])

  const kpis = {
    total_decomisos: decomisosToday,
    total_reclamos: reclamos?.length || 0,
    total_hojas_ruta: rutasActivas,
    total_novedades: novedades?.length || 0,
  }

  const decomisosChartData = decomisosLast7Days?.reduce(
    (acc, decomiso) => {
      const fecha = new Date(decomiso.fecha).toLocaleDateString("es-AR", { month: "short", day: "numeric" })
      const existing = acc.find((item) => item.fecha === fecha)
      if (existing) {
        existing.cantidad += decomiso.kilos_cantidad
      } else {
        acc.push({ fecha, cantidad: decomiso.kilos_cantidad })
      }
      return acc
    },
    [] as { fecha: string; cantidad: number }[],
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard de Gestión</h1>
              <p className="text-sm text-muted-foreground mt-1">Monitoreo en tiempo real de operaciones</p>
            </div>
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              Hoy
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Decomisos Hoy</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.total_decomisos} kg</div>
              <p className="text-xs text-muted-foreground mt-1">Total de hoy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reclamos de Calidad</CardTitle>
              <FileText className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.total_reclamos}</div>
              <p className="text-xs text-muted-foreground mt-1">Total registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rutas Activas</CardTitle>
              <Truck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.total_hojas_ruta}</div>
              <p className="text-xs text-muted-foreground mt-1">En curso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Novedades</CardTitle>
              <Bell className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.total_novedades}</div>
              <p className="text-xs text-muted-foreground mt-1">Eventos registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Decomisos Últimos 7 Días</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={decomisosChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="fecha" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="cantidad" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reclamos por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reclamosData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ tipo, cantidad }) => `${tipo} (${cantidad})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cantidad"
                    nameKey="tipo"
                  >
                    {reclamosData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs with Data Tables */}
        <Tabs defaultValue="decomisos" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="decomisos">Decomisos</TabsTrigger>
            <TabsTrigger value="reclamos">Reclamos</TabsTrigger>
            <TabsTrigger value="hojas-ruta">Hojas de Ruta</TabsTrigger>
            <TabsTrigger value="novedades">Novedades</TabsTrigger>
          </TabsList>

          <TabsContent value="decomisos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Decomisos de Producción</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Fecha</th>
                        <th className="text-left p-2 font-medium">Producto</th>
                        <th className="text-left p-2 font-medium">Motivo</th>
                        <th className="text-right p-2 font-medium">Cantidad (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decomisos?.map((decomiso) => (
                        <tr key={decomiso.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{new Date(decomiso.fecha).toLocaleDateString()}</td>
                          <td className="p-2">{decomiso.producto}</td>
                          <td className="p-2">
                            <Badge variant="outline">{decomiso.motivo}</Badge>
                          </td>
                          <td className="p-2 text-right font-medium">{decomiso.kilos_cantidad}</td>
                        </tr>
                      ))}
                      {!decomisos?.length && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No hay decomisos registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reclamos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reclamos de Calidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Tipo</th>
                        <th className="text-left p-2 font-medium">Descripción</th>
                        <th className="text-left p-2 font-medium">Urgencia</th>
                        <th className="text-left p-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reclamos?.map((reclamo) => (
                        <tr key={reclamo.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Badge>{reclamo.tipo}</Badge>
                          </td>
                          <td className="p-2 max-w-xs truncate">{reclamo.descripcion}</td>
                          <td className="p-2">
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
                          </td>
                          <td className="p-2">
                            <Badge variant={reclamo.estado === "Resuelto" ? "default" : "secondary"}>
                              {reclamo.estado}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {!reclamos?.length && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No hay reclamos registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hojas-ruta" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hojas de Ruta - Logística</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Chofer</th>
                        <th className="text-left p-2 font-medium">Ruta</th>
                        <th className="text-left p-2 font-medium">Hora Inicio</th>
                        <th className="text-left p-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hojasRuta?.map((hoja) => (
                        <tr key={hoja.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{hoja.chofer}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {hoja.ruta_detalle}
                            </div>
                          </td>
                          <td className="p-2">{hoja.hora_inicio}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                hoja.estado === "completada"
                                  ? "default"
                                  : hoja.estado === "activa"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {hoja.estado}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {!hojasRuta?.length && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No hay hojas de ruta registradas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="novedades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Novedades Generales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {novedades?.map((novedad) => (
                    <div key={novedad.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="text-sm">{novedad.mensaje}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(novedad.fecha).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!novedades?.length && (
                    <div className="p-8 text-center text-muted-foreground">No hay novedades registradas</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity?.map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.type === "decomiso"
                        ? "bg-orange-500"
                        : item.type === "reclamo"
                          ? "bg-red-500"
                          : item.type === "ruta"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                    }`}
                  />
                  <span className="text-muted-foreground">{new Date(item.date).toLocaleString()}</span>
                  <span className="flex-1">{item.message}</span>
                </div>
              ))}
              {!activity?.length && (
                <div className="p-4 text-center text-muted-foreground">No hay actividad reciente</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
