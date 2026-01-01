"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, FileText } from "lucide-react"
import type { Vehiculo, DocumentoLogistica } from "@/lib/supabase-queries"

interface ExpirationAlert {
  patente: string
  tipo: string
  vencimiento: string
  daysRemaining: number
  color: "red" | "yellow" | "green"
}

interface DashboardExpirationAlertsProps {
  vehiculos: Vehiculo[]
  documentos: DocumentoLogistica[]
}

export function DashboardExpirationAlerts({ vehiculos, documentos }: DashboardExpirationAlertsProps) {
  console.log("[v0] Aggregating Dashboard Alerts...")

  const calculateDaysRemaining = (fechaVencimiento: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expDate = new Date(fechaVencimiento)
    expDate.setHours(0, 0, 0, 0)
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getColor = (days: number): "red" | "yellow" | "green" => {
    if (days < 15) return "red"
    if (days <= 45) return "yellow"
    return "green"
  }

  const alerts: ExpirationAlert[] = []

  // Process vehicle VTV and SENASA expirations
  vehiculos.forEach((vehiculo) => {
    if (vehiculo.vtv_vencimiento) {
      const days = calculateDaysRemaining(vehiculo.vtv_vencimiento)
      const color = getColor(days)
      if (color === "red" || color === "yellow") {
        alerts.push({
          patente: vehiculo.patente,
          tipo: "VTV",
          vencimiento: vehiculo.vtv_vencimiento,
          daysRemaining: days,
          color,
        })
      }
    }

    if (vehiculo.senasa_vencimiento) {
      const days = calculateDaysRemaining(vehiculo.senasa_vencimiento)
      const color = getColor(days)
      if (color === "red" || color === "yellow") {
        alerts.push({
          patente: vehiculo.patente,
          tipo: "SENASA",
          vencimiento: vehiculo.senasa_vencimiento,
          daysRemaining: days,
          color,
        })
      }
    }
  })

  // Process documents
  documentos
    .filter((doc) => doc.entidad_tipo === "vehiculo")
    .forEach((doc) => {
      const vehiculo = vehiculos.find((v) => v.id === doc.entidad_id)
      if (vehiculo) {
        const days = calculateDaysRemaining(doc.fecha_vencimiento)
        const color = getColor(days)
        if (color === "red" || color === "yellow") {
          alerts.push({
            patente: vehiculo.patente,
            tipo: doc.documento_tipo,
            vencimiento: doc.fecha_vencimiento,
            daysRemaining: days,
            color,
          })
        }
      }
    })

  // Sort by days remaining (urgent first)
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)

  console.log(`[v0] Found ${alerts.length} expiration alerts`)

  if (alerts.length === 0) {
    return null
  }

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Vencimientos Próximos (Flota)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.color === "red" ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/30"
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className={`h-4 w-4 ${alert.color === "red" ? "text-red-500" : "text-yellow-500"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {alert.patente} - {alert.tipo}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Vence el{" "}
                    {new Date(alert.vencimiento).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Badge
                variant={alert.color === "red" ? "destructive" : "secondary"}
                className={alert.color === "yellow" ? "bg-yellow-500 text-yellow-950" : ""}
              >
                {alert.daysRemaining < 0
                  ? `Vencido hace ${Math.abs(alert.daysRemaining)}d`
                  : alert.daysRemaining === 0
                    ? "Vence hoy"
                    : `En ${alert.daysRemaining} días`}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
