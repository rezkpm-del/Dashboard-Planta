"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createNovedad } from "@/lib/supabase-queries"
import { UserCog, Lock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ManagerForm() {
  const { toast } = useToast()
  const { canWrite } = useAuth()
  const canWriteGerencia = canWrite("gerencia")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mensaje, setMensaje] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createNovedad({
        mensaje,
        sector_id: "Gerencia",
      })

      toast({
        title: "Novedad registrada",
        description: "La novedad se ha registrado correctamente.",
      })

      setMensaje("")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la novedad.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-6 w-6 text-purple-500" />
            <div>
              <CardTitle>Registro de Novedades</CardTitle>
              <CardDescription>Gerencia de Planta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!canWriteGerencia && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
              <Lock className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-500">
                Solo tienes permisos de lectura en este módulo
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mensaje">Mensaje</Label>
              <Textarea
                id="mensaje"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escriba la novedad o comunicado para el equipo..."
                rows={6}
                required
                disabled={!canWriteGerencia}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !canWriteGerencia}>
              {!canWriteGerencia ? (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Sin Permisos de Escritura
                </>
              ) : isSubmitting ? (
                "Publicando..."
              ) : (
                "Publicar Novedad"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
