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
  getDecomisosToday,
  getRutasActivas,
  getActiveBranchClaimsCount,
  getVehiculos,
  getDocumentosLogistica,
} from "@/lib/supabase-queries"
import { AlertTriangle, FileText, Truck, Bell, Calendar, MapPin } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { DashboardExpirationAlerts } from "@/components/dashboard-expiration-alerts"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export async function DashboardView() {
  const [
    decomisosLast7Days,
    reclamosData,
    decomisos,
    reclamos,
    hojasRuta,
    novedades,
    decomisosToday,
    rutasActivas,
    activeBranchClaims,
    vehiculos,
    documentos,
  ] = await Promise.all([
    getDecomisosLast7Days(),
    getReclamosByTipo(),
    getDecomisos(),
    getReclamos(),
    getHojasRuta(),
    getNovedades(),
    getDecomisosToday(),
    getRutasActivas(),
    getActiveBranchClaimsCount(),
    getVehiculos(),
    getDocumentosLogistica(),
  ])

  const kpis = {
    total_decomisos: decomisosToday,
    total_reclamos: (reclamos?.length || 0) + activeBranchClaims,
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

  const rutasActivasList = hojasRuta?.filter((r) => r.estado === "En Ruta") || []

  return (
    <div className="min-h-screen">
      <div className="border-b border-red-500/20 glass-panel sticky top-0 z-20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-widest uppercase">Command Center</h1>
              <p className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-wider">Real-time Operations</p>
            </div>
            <Button className="btn-gradient font-semibold px-4 py-2 rounded-lg text-xs uppercase tracking-wider">
              <Calendar className="mr-2 h-4 w-4" />
              Live
            </Button>
          </div>
        </div>
      </div>
      {/* </CHANGE> */}

      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card rounded-lg p-5 border border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Decomisos Hoy</p>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white neon-text font-mono">{kpis.total_decomisos}</div>
            <p className="text-[10px] text-zinc-600 mt-1 font-mono uppercase tracking-wider">kg · Total de hoy</p>
          </div>

          <div className="glass-card rounded-lg p-5 border border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Reclamos</p>
              <div className="p-2 rounded-lg bg-red-500/10">
                <FileText className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white neon-text font-mono">{kpis.total_reclamos}</div>
            <p className="text-[10px] text-zinc-600 mt-1 font-mono uppercase tracking-wider">Total registrados</p>
          </div>

          <div className="glass-card rounded-lg p-5 border border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Rutas Activas</p>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Truck className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white neon-text font-mono">{kpis.total_hojas_ruta}</div>
            <p className="text-[10px] text-zinc-600 mt-1 font-mono uppercase tracking-wider">En curso</p>
          </div>

          <div className="glass-card rounded-lg p-5 border border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Novedades</p>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Bell className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white neon-text font-mono">{kpis.total_novedades}</div>
            <p className="text-[10px] text-zinc-600 mt-1 font-mono uppercase tracking-wider">Eventos registrados</p>
          </div>
        </div>
        {/* </CHANGE> */}

        <DashboardExpirationAlerts vehiculos={vehiculos || []} documentos={documentos || []} />

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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest">Rutas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rutasActivasList.map((ruta) => (
                <div
                  key={ruta.id}
                  className="flex items-center justify-between p-2 border border-red-500/10 rounded-lg bg-black/40 h-10"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="h-3 w-3 text-blue-500" />
                    <div>
                      <p className="font-medium text-xs font-mono">{ruta.chofer}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className="text-xs font-mono text-zinc-500">{ruta.hora_inicio}</p>
                    <span className="status-glow-green text-[10px] uppercase tracking-wider">En Ruta</span>
                  </div>
                </div>
              ))}
              {rutasActivasList.length === 0 && (
                <p className="text-center text-zinc-600 py-4 text-xs font-mono uppercase tracking-wider">
                  No hay rutas activas
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Todas las Novedades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {novedades?.slice(0, 10).map((novedad) => (
                <div key={novedad.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm">{novedad.mensaje}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(novedad.fecha).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                        <th className="text-left p-2 font-medium">Proveedor</th>
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
                          <td className="p-2">{reclamo.proveedor_id || "-"}</td>
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
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
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
                            <Badge variant={hoja.estado === "Finalizado" ? "default" : "secondary"}>
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
                <CardTitle>Todas las Novedades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {novedades?.map((novedad) => (
                    <div key={novedad.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="text-sm">{novedad.mensaje}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(novedad.fecha).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
      </div>
    </div>
  )
}
