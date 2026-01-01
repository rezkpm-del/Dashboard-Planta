"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Wrench, Users, MapPin } from "lucide-react"
import { RutasTab } from "./logistics/rutas-tab"
import { FlotaTab } from "./logistics/flota-tab"
import { MantenimientoTab } from "./logistics/mantenimiento-tab"
import { ChoferesTab } from "./logistics/choferes-tab"

export function LogisticsForm() {
  return (
    <div className="container mx-auto px-6 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-500" />
            <div>
              <CardTitle>Sistema de Gestión de Flota</CardTitle>
              <CardDescription>Área de Logística - Control completo de vehículos y conductores</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rutas" className="w-full">
            <TabsList className="inline-flex flex-wrap h-auto w-full items-center gap-2 p-2 bg-transparent">
              <TabsTrigger
                value="rutas"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg data-[state=active]:bg-[#FF6B6B]/20 data-[state=active]:border-[#FF6B6B]"
              >
                <MapPin className="h-4 w-4" />
                Rutas y Viajes
              </TabsTrigger>
              <TabsTrigger
                value="flota"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg data-[state=active]:bg-[#FF6B6B]/20 data-[state=active]:border-[#FF6B6B] whitespace-nowrap"
              >
                <Truck className="h-4 w-4" />
                Flota y Vencimientos
              </TabsTrigger>
              <TabsTrigger
                value="mantenimiento"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg data-[state=active]:bg-[#FF6B6B]/20 data-[state=active]:border-[#FF6B6B]"
              >
                <Wrench className="h-4 w-4" />
                Taller
              </TabsTrigger>
              <TabsTrigger
                value="choferes"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg data-[state=active]:bg-[#FF6B6B]/20 data-[state=active]:border-[#FF6B6B]"
              >
                <Users className="h-4 w-4" />
                Choferes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rutas" className="mt-6">
              <RutasTab />
            </TabsContent>

            <TabsContent value="flota" className="mt-6">
              <FlotaTab />
            </TabsContent>

            <TabsContent value="mantenimiento" className="mt-6">
              <MantenimientoTab />
            </TabsContent>

            <TabsContent value="choferes" className="mt-6">
              <ChoferesTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
