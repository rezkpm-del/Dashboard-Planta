# Configuración de Base de Datos Supabase

Este documento contiene las instrucciones para configurar las tablas adicionales necesarias para el módulo de Logística.

## Cómo ejecutar los scripts SQL

1. Ve a tu proyecto de Supabase: https://qpvzvgavtboirssvoqvb.supabase.co
2. En el menú lateral, selecciona **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de cada script en orden
5. Haz clic en **Run** para ejecutar

## Script 1: Crear Tablas

Ejecuta este script primero para crear las tablas de vehículos, choferes y mantenimiento:

```sql
-- Tabla de Vehículos
CREATE TABLE IF NOT EXISTS logistica_vehiculos (
  id SERIAL PRIMARY KEY,
  patente VARCHAR(20) UNIQUE NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  vtv_vencimiento DATE NOT NULL,
  senasa_vencimiento DATE NOT NULL,
  seguro_vencimiento DATE NOT NULL,
  kilometraje_actual INTEGER DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'Activo',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de Choferes
CREATE TABLE IF NOT EXISTS logistica_choferes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  licencia_numero VARCHAR(50) NOT NULL,
  licencia_vencimiento DATE NOT NULL,
  telefono VARCHAR(20),
  estado VARCHAR(50) DEFAULT 'Activo',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de Mantenimiento
CREATE TABLE IF NOT EXISTS logistica_mantenimiento (
  id SERIAL PRIMARY KEY,
  vehiculo_id INTEGER REFERENCES logistica_vehiculos(id) ON DELETE CASCADE,
  fecha_entrada DATE NOT NULL,
  fecha_salida DATE,
  descripcion TEXT NOT NULL,
  taller_nombre VARCHAR(100),
  costo DECIMAL(10, 2),
  estado VARCHAR(50) DEFAULT 'En Taller',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Modificar tabla hojas_ruta para agregar referencias
ALTER TABLE logistica_hojas_ruta 
ADD COLUMN IF NOT EXISTS vehiculo_id INTEGER REFERENCES logistica_vehiculos(id),
ADD COLUMN IF NOT EXISTS chofer_id INTEGER REFERENCES logistica_choferes(id),
ADD COLUMN IF NOT EXISTS kilometraje_salida INTEGER,
ADD COLUMN IF NOT EXISTS kilometraje_llegada INTEGER,
ADD COLUMN IF NOT EXISTS hora_fin TIME,
ADD COLUMN IF NOT EXISTS equipamiento_ok BOOLEAN DEFAULT FALSE;
```

## Script 2: Datos de Ejemplo

Una vez creadas las tablas, ejecuta este script para agregar datos de ejemplo:

```sql
-- Datos de ejemplo para Vehículos
INSERT INTO logistica_vehiculos (patente, modelo, vtv_vencimiento, senasa_vencimiento, seguro_vencimiento, kilometraje_actual) 
VALUES 
  ('AB123CD', 'Ford F-150', '2025-03-15', '2025-02-28', '2025-06-30', 45000),
  ('EF456GH', 'Chevrolet Silverado', '2025-01-20', '2025-01-15', '2025-05-10', 38000),
  ('IJ789KL', 'Toyota Hilux', '2025-04-10', '2025-03-25', '2025-07-15', 52000)
ON CONFLICT (patente) DO NOTHING;

-- Datos de ejemplo para Choferes
INSERT INTO logistica_choferes (nombre, licencia_numero, licencia_vencimiento, telefono) 
VALUES 
  ('Juan Pérez', 'D-12345678', '2025-08-15', '11-2345-6789'),
  ('María González', 'D-87654321', '2025-02-20', '11-9876-5432'),
  ('Carlos Rodríguez', 'D-11223344', '2025-12-30', '11-5555-4444');

-- Datos de ejemplo para Mantenimiento
INSERT INTO logistica_mantenimiento (vehiculo_id, fecha_entrada, descripcion, taller_nombre, estado) 
VALUES 
  (1, '2024-12-15', 'Cambio de aceite y filtros', 'Taller Central', 'Reparado'),
  (2, '2024-12-18', 'Reparación de frenos', 'Taller Norte', 'En Taller');
```

## Verificación

Para verificar que las tablas se crearon correctamente, ejecuta:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'logistica_%';
```

Deberías ver:
- logistica_choferes
- logistica_hojas_ruta
- logistica_mantenimiento
- logistica_vehiculos

## Permisos (Row Level Security)

Si tienes habilitado RLS, necesitarás agregar políticas de seguridad. Por ahora, puedes deshabilitarlo para estas tablas:

```sql
ALTER TABLE logistica_vehiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE logistica_choferes DISABLE ROW LEVEL SECURITY;
ALTER TABLE logistica_mantenimiento DISABLE ROW LEVEL SECURITY;
```

O crear políticas para permitir todas las operaciones:

```sql
-- Políticas para vehiculos
CREATE POLICY "Enable all for vehiculos" ON logistica_vehiculos FOR ALL USING (true);

-- Políticas para choferes
CREATE POLICY "Enable all for choferes" ON logistica_choferes FOR ALL USING (true);

-- Políticas para mantenimiento
CREATE POLICY "Enable all for mantenimiento" ON logistica_mantenimiento FOR ALL USING (true);
```

## Notas Importantes

- Los scripts son seguros para ejecutar múltiples veces (usan `IF NOT EXISTS` y `ON CONFLICT DO NOTHING`)
- Las relaciones entre tablas están configuradas con `ON DELETE CASCADE` para mantener integridad referencial
- Los datos de ejemplo usan fechas de vencimiento futuras para demostrar las alertas del sistema
