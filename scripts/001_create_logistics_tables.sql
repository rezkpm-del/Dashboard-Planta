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
  vehiculo_id INTEGER REFERENCES logistica_vehiculos(id),
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
