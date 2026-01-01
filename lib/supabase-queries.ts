import { getSupabaseClient } from "./supabase"

// Types based on your Supabase schema
export type Decomiso = {
  id: number
  motivo: string
  kilos_cantidad: number
  producto: string
  fecha: string
  created_by?: string
}

export type Reclamo = {
  id: number
  tipo: string
  descripcion: string
  urgencia: string
  estado: string
  proveedor_id: number | null
  local_id: number | null // Added local_id field
  fecha: string // Added fecha field
  created_by?: string | null
  foto_url?: string | null // Add foto_url field to Reclamo type
}

export type HojaRuta = {
  id: number
  chofer: string
  ruta_detalle: string
  hora_inicio: string
  hora_fin?: string | null
  estado: string
  vehiculo_id?: number | null
  chofer_id?: number | null
  kilometraje_salida?: number | null
  kilometraje_llegada?: number | null
  equipamiento_ok?: boolean
}

export type Novedad = {
  id: number
  mensaje: string
  fecha: string
  sector_id: string
}

// Types for fleet management
export type Vehiculo = {
  id: number
  patente: string
  modelo: string
  vtv_vencimiento: string
  senasa_vencimiento: string
  seguro_vencimiento: string
  kilometraje_actual: number
  estado: string
  created_at: string
}

export type Chofer = {
  id: number
  nombre: string
  licencia_numero: string
  licencia_vencimiento: string
  telefono: string | null
  estado: string
  created_at: string
}

export type Mantenimiento = {
  id: number
  vehiculo_id: number
  fecha_entrada: string
  fecha_salida: string | null
  descripcion: string
  taller_nombre: string | null
  costo: number | null
  estado: string
  created_at: string
}

// Types for ERP tables
export type Local = {
  id: number
  sucursales: string // Changed from 'nombre' to 'sucursales' to match DB schema
  direccion?: string | null
  created_at?: string
}

export type Proveedor = {
  id: number
  nombre: string
  contacto?: string | null
  telefono?: string | null
  created_at?: string
}

export type CostoOdoo = {
  id: number
  producto: string
  costo: number
  updated_at?: string
}

export type PrecioOdoo = {
  id: number
  producto: string
  precio: number
  total: number
  cantidad_insumo: number
  updated_at?: string
}

export type ProduccionDiaria = {
  id: number
  fecha: string
  producto_nombre: string
  cantidad_pedida: number
  cantidad_realizada: number
  costo_snapshot: number
  created_at?: string
  created_by?: string
}

export type DocumentoLogistica = {
  id: number
  entidad_tipo: string // Changed from 'tipo' to match database column
  entidad_id: number
  documento_tipo: string
  fecha_vencimiento: string
  notas?: string | null // Changed from 'observaciones' to match database column
  created_at?: string
}

// Types for decomiso with additional fields
export type DecomisoPatch = {
  id?: number
  producto: string
  kilos_cantidad: number
  motivo: string
  fecha: string
  costo_total: number
  created_by?: string
}

// Types for ERP tables
export type OrdenCompraOdoo = {
  id: number
  fecha: string
  cliente: string
  producto: string
  cantidad: number
  cantidad_insumos: number
  total: number
}

// ===== PRODUCCIÓN - DECOMISOS =====

export async function getDecomisos() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("produccion_decomisos").select("*").order("fecha", { ascending: false })

  if (error) throw error
  return data as Decomiso[]
}

export async function getDecomisosToday() {
  const supabase = getSupabaseClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase.from("produccion_decomisos").select("kilos_cantidad").gte("fecha", today)

  if (error) throw error

  const total = data?.reduce((sum, item) => sum + item.kilos_cantidad, 0) || 0
  return total
}

export async function getDecomisosLast7Days() {
  const supabase = getSupabaseClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from("produccion_decomisos")
    .select("*")
    .gte("fecha", sevenDaysAgo.toISOString().split("T")[0])
    .order("fecha", { ascending: true })

  if (error) throw error
  return data as Decomiso[]
}

export async function createDecomiso(decomiso: Omit<Decomiso, "id">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("produccion_decomisos").insert([decomiso]).select()

  if (error) throw error
  return data[0] as Decomiso
}

export async function updateDecomiso(id: number, decomiso: Partial<Decomiso>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("produccion_decomisos").update(decomiso).eq("id", id).select()

  if (error) throw error
  return data[0] as Decomiso
}

export async function createDecomisoWithCost(decomiso: Omit<DecomisoPatch, "id">) {
  const supabase = getSupabaseClient()

  console.log(
    `[v0] Inserting Decomiso: Product [${decomiso.producto}], Kilos [${decomiso.kilos_cantidad}] (mapped to kilos_cantidad)`,
  )
  console.log("[v0] Full decomiso data:", decomiso)

  const { data, error } = await supabase.from("produccion_decomisos").insert([decomiso]).select()

  if (error) {
    console.error("[v0] Error inserting decomiso:", error)
    throw error
  }

  console.log("[v0] Decomiso inserted successfully:", data)
  return data[0] as DecomisoPatch
}

export async function getTotalDecomisoCost() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("produccion_decomisos").select("costo_total")

  if (error) throw error
  const total = data?.reduce((sum, item) => sum + (item.costo_total || 0), 0) || 0
  return total
}

// ===== CALIDAD - RECLAMOS =====

export async function getReclamos() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("calidad_reclamos").select("*").order("id", { ascending: false })

  if (error) throw error
  return data as Reclamo[]
}

export async function getReclamosByTipo() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("calidad_reclamos").select("tipo")

  if (error) throw error

  const counts =
    data?.reduce(
      (acc, item) => {
        acc[item.tipo] = (acc[item.tipo] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ) || {}

  return Object.entries(counts).map(([tipo, cantidad]) => ({
    tipo,
    cantidad,
  }))
}

export async function createReclamo(reclamo: {
  tipo: string
  descripcion: string
  urgencia: string
  estado: string
  proveedor_id: number | null
  local_id: number | null
  fecha: string
  foto_url?: string | null // Add foto_url parameter to createReclamo function
}) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("calidad_reclamos").insert([reclamo]).select()

  if (error) {
    console.error("Error creating reclamo:", error)
    throw error
  }

  return data
}

export async function updateReclamo(id: number, reclamo: Partial<Reclamo>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("calidad_reclamos").update(reclamo).eq("id", id).select()

  if (error) throw error
  return data[0] as Reclamo
}

export async function getReclamosWithFilters(filters: {
  startDate?: string
  endDate?: string
  tipo?: string
  local?: string
  proveedor?: string
}) {
  const supabase = getSupabaseClient()

  console.log("[v0] getReclamosWithFilters called with:", filters)

  let query = supabase.from("calidad_reclamos").select("*").order("fecha", { ascending: false })

  if (filters.startDate) {
    query = query.gte("fecha", filters.startDate)
  }
  if (filters.endDate) {
    const endDateTime = `${filters.endDate}T23:59:59`
    query = query.lte("fecha", endDateTime)
  }
  if (filters.tipo) {
    query = query.eq("tipo", filters.tipo)
  }
  if (filters.local) {
    query = query.ilike("local", `%${filters.local}%`)
  }
  if (filters.proveedor) {
    query = query.ilike("proveedor", `%${filters.proveedor}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Supabase error:", error)
    throw error
  }

  console.log("[v0] Supabase returned:", data?.length || 0, "rows")

  return data
}

export async function getReclamosSucursales(usuarioSucursal: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("reclamos_sucursales")
    .select("*")
    .eq("usuario_sucursal", usuarioSucursal)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function createReclamoSucursal(reclamo: {
  usuario_sucursal: string
  asunto: string
  descripcion: string
  estado: string
  fecha: string
  lote?: string | null
  foto_url?: string | null
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("reclamos_sucursales").insert([reclamo]).select()

  if (error) throw error
  return data[0]
}

export async function updateReclamoSucursal(
  id: number,
  updates: {
    estado?: string
    respuesta_planta?: string
  },
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("reclamos_sucursales").update(updates).eq("id", id).select()

  if (error) throw error
  return data[0]
}

// Function to get active branch claims count
export async function getActiveBranchClaimsCount() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("reclamos_sucursales")
    .select("*", { count: "exact", head: true })
    .neq("estado", "Resuelto")

  if (error) {
    console.error("[v0] Error fetching active branch claims count:", error)
    return 0
  }
  return data ? data.length : 0
}

// ===== LOGÍSTICA - HOJAS DE RUTA =====

export async function getHojasRuta() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_hojas_ruta").select("*").order("id", { ascending: false })

  if (error) throw error
  return data as HojaRuta[]
}

export async function getRutasActivas() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_hojas_ruta").select("*").eq("estado", "En Ruta")

  if (error) throw error
  return data?.length || 0
}

export async function createHojaRuta(hojaRuta: Omit<HojaRuta, "id">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_hojas_ruta").insert([hojaRuta]).select()

  if (error) throw error
  return data[0] as HojaRuta
}

export async function updateHojaRuta(id: number, hojaRuta: Partial<HojaRuta>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_hojas_ruta").update(hojaRuta).eq("id", id).select()

  if (error) throw error
  return data[0] as HojaRuta
}

export async function finalizarHojaRuta(id: number, finalizacionData: Partial<HojaRuta>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("logistica_hojas_ruta")
    .update({ ...finalizacionData, estado: "Finalizado" })
    .eq("id", id)
    .select()

  if (error) throw error
  return data[0] as HojaRuta
}

export async function deleteHojaRuta(id: number) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("logistica_hojas_ruta").delete().eq("id", id)

  if (error) throw error
  return true
}

// ===== NOVEDADES GENERALES =====

export async function getNovedades() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("novedades_generales").select("*").order("fecha", { ascending: false })

  if (error) throw error
  return data as Novedad[]
}

export async function getUltimaNovedad() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("novedades_generales")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] as Novedad | null
}

export async function createNovedad(novedad: { mensaje: string; sector_id: string }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("novedades_generales")
    .insert([
      {
        mensaje: novedad.mensaje,
        sector_id: novedad.sector_id,
        fecha: new Date().toISOString(),
      },
    ])
    .select()

  if (error) throw error
  return data[0] as Novedad
}

// ===== ACTIVIDAD RECIENTE (Para el Dashboard Global) =====

export async function getRecentActivity() {
  const supabase = getSupabaseClient()

  // Obtener las últimas 5 entradas de cada tabla
  const [decomisos, reclamos, rutas, novedades] = await Promise.all([
    supabase.from("produccion_decomisos").select("*").order("fecha", { ascending: false }).limit(5),
    supabase.from("calidad_reclamos").select("*").order("id", { ascending: false }).limit(5),
    supabase.from("logistica_hojas_ruta").select("*").order("id", { ascending: false }).limit(5),
    supabase.from("novedades_generales").select("*").order("fecha", { ascending: false }).limit(5),
  ])

  const activities = [
    ...(decomisos.data || []).map((d) => ({
      type: "decomiso",
      message: `Decomiso: ${d.producto} - ${d.kilos_cantidad}kg`,
      date: d.fecha,
    })),
    ...(reclamos.data || []).map((r) => ({
      type: "reclamo",
      message: `Reclamo ${r.tipo}: ${r.descripcion}`,
      date: r.fecha,
    })),
    ...(rutas.data || []).map((r) => ({
      type: "ruta",
      message: `Ruta: ${r.chofer} - ${r.ruta_detalle}`,
      date: new Date().toISOString().split("T")[0],
    })),
    ...(novedades.data || []).map((n) => ({
      type: "novedad",
      message: n.mensaje,
      date: n.fecha,
    })),
  ]

  // Ordenar por fecha descendente y tomar los últimos 10
  return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
}

// ===== VEHÍCULOS =====

export async function getVehiculos() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_vehiculos").select("*").order("patente", { ascending: true })

  if (error) throw error
  return data as Vehiculo[]
}

export async function createVehiculo(vehiculo: Omit<Vehiculo, "id" | "created_at">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_vehiculos").insert([vehiculo]).select()

  if (error) throw error
  return data[0] as Vehiculo
}

export async function updateVehiculo(id: number, vehiculo: Partial<Vehiculo>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_vehiculos").update(vehiculo).eq("id", id).select()

  if (error) throw error
  return data[0] as Vehiculo
}

// ===== CHOFERES =====

export async function getChoferes() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_choferes").select("*").order("nombre", { ascending: true })

  if (error) throw error
  return data as Chofer[]
}

export async function createChofer(chofer: Omit<Chofer, "id" | "created_at">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_choferes").insert([chofer]).select()

  if (error) throw error
  return data[0] as Chofer
}

export async function updateChofer(id: number, chofer: Partial<Chofer>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_choferes").update(chofer).eq("id", id).select()

  if (error) throw error
  return data[0] as Chofer
}

// ===== MANTENIMIENTO =====

export async function getMantenimientos() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("logistica_mantenimiento")
    .select(
      `
      *,
      vehiculo:logistica_vehiculos(patente, modelo)
    `,
    )
    .order("fecha_entrada", { ascending: false })

  if (error) throw error
  return data
}

export async function createMantenimiento(mantenimiento: Omit<Mantenimiento, "id" | "created_at">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_mantenimiento").insert([mantenimiento]).select()

  if (error) throw error
  return data[0] as Mantenimiento
}

export async function updateMantenimiento(id: number, mantenimiento: Partial<Mantenimiento>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_mantenimiento").update(mantenimiento).eq("id", id).select()

  if (error) throw error
  return data[0] as Mantenimiento
}

// ===== ERP TABLES MANAGEMENT =====

// ===== LOCALES =====

export async function getLocales() {
  console.log("[v0] Fetching locales from database...")
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("locales_lg")
    .select("id, sucursales")
    .order("sucursales", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching locales:", error)
    return []
  }
  console.log("[v0] Locales fetched (Example):", data?.[0]?.sucursales)
  return data as Local[]
}

export async function createLocal(local: { sucursales: string }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("locales_lg").insert([local]).select()

  if (error) throw error
  return data[0] as Local
}

// ===== PROVEEDORES =====

export async function getProveedores() {
  console.log("[v0] Fetching proveedores from database...")
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("proveedores_lg")
    .select("id, nombre")
    .order("nombre", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching proveedores:", error)
    return []
  }
  console.log("[v0] Proveedores fetched (Example):", data?.[0]?.nombre)
  return data as Proveedor[]
}

export async function createProveedor(proveedor: Omit<Proveedor, "id" | "created_at">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("proveedores_lg").insert([proveedor]).select()

  if (error) throw error
  return data[0] as Proveedor
}

// ===== COSTOS ODOO =====

export async function getCostosOdoo() {
  console.log("[v0] Fetching costos_odoo from database...")
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("costos_odoo").select("*").order("producto", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching costos:", error.message, error.details, error.hint)
    return []
  }
  console.log("[v0] Costos fetched:", data?.length || 0, "items")
  if (data && data.length > 0) {
    console.log("[v0] First costo item:", data[0])
  }
  return data as CostoOdoo[]
}

// ===== PRECIOS ODOO =====

export async function getPreciosOdoo() {
  console.log("[v0] Fetching precio_odoo from database...")
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("precio_odoo")
    .select("id, producto, total, cantidad_insumo")
    .order("producto", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching precios:", error.message, error.details, error.hint)
    return []
  }
  console.log("[v0] Precios fetched:", data?.length || 0, "items")
  if (data && data.length > 0) {
    console.log("[v0] First precio item:", data[0])
  }

  const preciosWithUnitPrice = data.map((item: any) => {
    // Safety check: avoid division by zero or null
    const unitPrice = item.cantidad_insumo && item.cantidad_insumo > 0 ? item.total / item.cantidad_insumo : 0

    return {
      id: item.id,
      producto: item.producto,
      precio: unitPrice, // Unit price calculated from total / cantidad_insumo
      total: item.total,
      cantidad_insumo: item.cantidad_insumo,
    }
  })

  console.log("[v0] Precios with unit price calculated:", preciosWithUnitPrice.length)
  return preciosWithUnitPrice as PrecioOdoo[]
}

// ===== PRODUCCIÓN DIARIA =====

export async function getProduccionDiaria(fecha?: string) {
  const supabase = getSupabaseClient()
  let query = supabase.from("produccion_diaria").select("*").order("fecha", { ascending: false })

  if (fecha) {
    query = query.eq("fecha", fecha)
  }

  const { data, error } = await query

  if (error) throw error
  return data as ProduccionDiaria[]
}

export async function createProduccionDiaria(produccion: Omit<ProduccionDiaria, "id" | "created_at">) {
  const supabase = getSupabaseClient()

  console.log(`[v0] Inserting Production: Cost Snapshot [${produccion.costo_snapshot}]`)
  console.log("[v0] Full production data:", produccion)
  console.log(
    "[v0] Inserting produccion_diaria with columns: fecha, producto_nombre, cantidad_pedida, cantidad_realizada, costo_snapshot, created_by",
  )

  const { data, error } = await supabase.from("produccion_diaria").insert([produccion]).select()

  if (error) {
    console.error("[v0] Database error inserting production:", error)
    throw error
  }

  console.log("[v0] Production inserted successfully:", data)
  return data[0] as ProduccionDiaria
}

export async function getTopProduccionToday() {
  const supabase = getSupabaseClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("produccion_diaria")
    .select("*")
    .eq("fecha", today)
    .order("cantidad_realizada", { ascending: false })
    .limit(5)

  if (error) throw error
  return data as ProduccionDiaria[]
}

export async function deleteProduccionDiaria(id: number) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("produccion_diaria").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting produccion_diaria:", error)
    throw error
  }

  console.log("[v0] Successfully deleted produccion_diaria record:", id)
}

export async function deleteDecomiso(id: number) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("produccion_decomisos").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting decomiso:", error)
    throw error
  }

  console.log("[v0] Successfully deleted decomiso record:", id)
}

// ===== DOCUMENTOS DE LOGÍSTICA =====

export async function getDocumentosLogistica() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("logistica_documentos")
    .select("*")
    .order("fecha_vencimiento", { ascending: true })

  if (error) throw error
  return data as DocumentoLogistica[]
}

export async function createDocumentoLogistica(
  documento: Omit<DocumentoLogistica, "id" | "created_at">,
): Promise<DocumentoLogistica> {
  console.log("[v0] Creating documento:", documento)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_documentos").insert([documento]).select()

  if (error) {
    console.error("[v0] Error creating documento:", error)
    throw error
  }
  console.log("[v0] Documento created with ID:", data[0]?.id)
  return data[0] as DocumentoLogistica
}

export async function getDocumentosVencenPronto() {
  const supabase = getSupabaseClient()
  const today = new Date()
  const in15Days = new Date(today)
  in15Days.setDate(today.getDate() + 15)

  const { data, error } = await supabase
    .from("logistica_documentos")
    .select("*")
    .lte("fecha_vencimiento", in15Days.toISOString().split("T")[0])
    .order("fecha_vencimiento", { ascending: true })

  if (error) throw error
  return data as DocumentoLogistica[]
}

export async function updateDocumentoLogistica(id: number, documento: Partial<DocumentoLogistica>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("logistica_documentos").update(documento).eq("id", id).select()

  if (error) throw error
  return data[0] as DocumentoLogistica
}

export async function deleteDocumentoLogistica(id: number) {
  console.log("[v0] Deleting documento:", id)
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("logistica_documentos").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting documento:", error)
    throw error
  }
  console.log("[v0] Documento deleted successfully")
}

export async function getDocumentosByVehiculo(vehiculoId: number): Promise<DocumentoLogistica[]> {
  console.log("[v0] Fetching documents for vehicle:", vehiculoId)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("logistica_documentos")
    .select("*")
    .eq("entidad_tipo", "vehiculo")
    .eq("entidad_id", vehiculoId)
    .order("fecha_vencimiento", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching documents:", error)
    throw error
  }
  console.log(`[v0] Documents refreshed for vehicle ${vehiculoId}. Count: ${data?.length || 0}`)
  return data as DocumentoLogistica[]
}

// ===== ORDENES DE COMPRAS =====

export async function getOrdenesCompras(startDate: string, endDate: string) {
  console.log(`[v0] Fetching ordenes_compras_odoo from ${startDate} to ${endDate}...`)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("ordenes_compras_odoo")
    .select("*")
    .gte("fecha", startDate)
    .lte("fecha", endDate)
    .order("fecha", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching ordenes:", error.message)
    return []
  }
  console.log(`[v0] Fetched ${data?.length || 0} rows from Odoo table`)
  return data as OrdenCompraOdoo[]
}

// ===== USUARIOS =====

export type Usuario = {
  id: number
  usuario: string
  password: string
  nivel: 1 | 2 | 3 | 4 | 5
  nombre_completo?: string
  created_at?: string
}

export async function getUsuarios() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("usuarios").select("*").order("nivel", { ascending: true })

  if (error) throw error
  return data as Usuario[]
}

export async function createUsuario(usuario: Omit<Usuario, "id" | "created_at">) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("usuarios").insert([usuario]).select()

  if (error) throw error
  return data[0] as Usuario
}

export async function deleteUsuario(id: number) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("usuarios").delete().eq("id", id)

  if (error) throw error
  return true
}

export async function updateUsuario(id: number, usuario: Partial<Usuario>) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("usuarios").update(usuario).eq("id", id).select()

  if (error) throw error
  return data[0] as Usuario
}

// ===== HISTORIAL =====

export async function getProduccionHistory(startDate: string, endDate: string) {
  const supabase = getSupabaseClient()

  // Fix midnight bug: ensure end date includes full day
  const endDateTime = `${endDate} 23:59:59`

  console.log("[v0] Fetching produccion history from", startDate, "to", endDateTime)

  const { data, error } = await supabase
    .from("produccion_diaria")
    .select("*")
    .gte("fecha", startDate)
    .lte("fecha", endDateTime)
    .order("fecha", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching produccion history:", error)
    throw error
  }

  console.log("[v0] Found", data?.length || 0, "produccion records")
  return data as ProduccionDiaria[]
}

export async function getDecomisoHistory(startDate: string, endDate: string) {
  const supabase = getSupabaseClient()

  // Fix midnight bug: ensure end date includes full day
  const endDateTime = `${endDate} 23:59:59`

  console.log("[v0] Fetching decomiso history from", startDate, "to", endDateTime)

  const { data, error } = await supabase
    .from("produccion_decomisos")
    .select("*")
    .gte("fecha", startDate)
    .lte("fecha", endDateTime)
    .order("fecha", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching decomiso history:", error)
    throw error
  }

  console.log("[v0] Found", data?.length || 0, "decomiso records with kilos_cantidad values")
  return data as Decomiso[]
}

// ===== PRODUCTOS =====

export async function getProductos() {
  return await getCostosOdoo()
}

// ===== FACTURAS =====

export type Factura = {
  id: number
  fecha_factura: string
  cliente: string
  numero: string
  total: number
  estado_pago: "paid" | "not_paid"
  created_at: string
}

export async function getFacturas(startDate: string, endDate: string) {
  const supabase = getSupabaseClient()

  console.log(`[v0] Fetching facturas from ${startDate} to ${endDate}`)

  const { data, error } = await supabase
    .from("facturas")
    .select("*")
    .gte("fecha_factura", startDate)
    .lte("fecha_factura", endDate)
    .order("fecha_factura", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching facturas:", error)
    throw error
  }

  console.log(`[v0] Fetched ${data?.length || 0} facturas`)
  return data as Factura[]
}

// Helper function to classify invoice type based on numero
export function classifyInvoiceType(numero: string): "EFECTIVO" | "FACTURADO" | "OTRO" {
  if (numero.startsWith("1")) return "EFECTIVO"
  if (numero.startsWith("00013")) return "FACTURADO"
  return "OTRO"
}
