-- Tablero de cocina editable: además de su estado, una comanda puede estar en una columna propia del restaurante
-- (por ejemplo «Esperando bebidas»), que se apoya en uno de los estados reales. NULL = columna del estado.
-- Se aplica en cada esquema de restaurante.
ALTER TABLE kitchen_tickets ADD COLUMN IF NOT EXISTS board_column TEXT;
