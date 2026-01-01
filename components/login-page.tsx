"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import { Loader2 } from "lucide-react"

export function LoginPage() {
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const success = await login(usuario, password)

    if (!success) {
      setError("Credenciales incorrectas")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Radial gradient background */}
      <div className="fixed inset-0 bg-gradient-radial from-[#2a0a0a] via-black to-black -z-10" />

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 bg-grid-pattern opacity-10 -z-10" />

      {/* Glass panel login card */}
      <Card className="w-full max-w-md glass-panel border-red-500/20 shadow-[0_0_40px_rgba(255,107,107,0.15)]">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/logo-4-removebg-preview.png"
              alt="La Guitarrita - Fundada en 1963"
              width={220}
              height={80}
              className="object-contain filter brightness-0 invert"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-wide">SISTEMA DE GESTIÓN</CardTitle>
          <CardDescription className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
            Ingrese sus credenciales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario" className="text-white">
                Usuario
              </Label>
              <Input
                id="usuario"
                type="text"
                placeholder="Ingrese su usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium transition-all duration-300 electric-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
