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
  ('Carlos Rodríguez', 'D-11223344', '2025-12-30', '11-5555-4444')
ON CONFLICT DO NOTHING;

-- Datos de ejemplo para Mantenimiento
INSERT INTO logistica_mantenimiento (vehiculo_id, fecha_entrada, descripcion, taller_nombre, estado) 
VALUES 
  (1, '2024-12-15', 'Cambio de aceite y filtros', 'Taller Central', 'Reparado'),
  (2, '2024-12-18', 'Reparación de frenos', 'Taller Norte', 'En Taller')
ON CONFLICT DO NOTHING;
