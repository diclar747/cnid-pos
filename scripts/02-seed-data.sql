-- Insertar configuración inicial de empresa
INSERT INTO company_config (name, ruc, address, phone, email, logo, website, slogan) VALUES
('Mi Empresa S.A.', '80000000-0', 'Av. Principal 123, Asunción, Paraguay', '+595 21 123456', 'info@miempresa.com.py', '/placeholder.svg?height=80&width=200&text=LOGO', 'www.miempresa.com.py', 'Tu mejor opción en productos de calidad');

-- Insertar usuario administrador por defecto
INSERT INTO users (username, password, name, role, is_active) VALUES
('admin', 'admin123', 'Administrador', 'admin', true),
('cajero1', 'cajero123', 'Juan Pérez', 'cashier', true);

-- Insertar categorías de productos
INSERT INTO categories (name, description) VALUES
('comida', 'Productos alimenticios'),
('bebidas', 'Bebidas y refrescos'),
('postres', 'Postres y dulces');

-- Insertar categorías de gastos
INSERT INTO expense_categories (name, description) VALUES
('suministros', 'Suministros y materiales'),
('servicios', 'Servicios públicos y privados'),
('mantenimiento', 'Mantenimiento y reparaciones'),
('marketing', 'Publicidad y marketing'),
('personal', 'Gastos de personal'),
('transporte', 'Transporte y combustible'),
('otros', 'Otros gastos');

-- Insertar productos iniciales
WITH category_ids AS (
    SELECT id, name FROM categories
)
INSERT INTO products (name, description, price, barcode, category_id, stock, image) VALUES
('Hamburguesa con Queso', 'Deliciosa hamburguesa con queso cheddar, lechuga y tomate', 25000, '7501234567890', (SELECT id FROM category_ids WHERE name = 'comida'), 50, '/classic-beef-burger.png'),
('Pizza Pepperoni', 'Pizza familiar con pepperoni y queso mozzarella', 45000, '7501234567891', (SELECT id FROM category_ids WHERE name = 'comida'), 30, '/delicious-pizza.png'),
('Ensalada César', 'Ensalada fresca con pollo, crutones y aderezo césar', 18000, '7501234567892', (SELECT id FROM category_ids WHERE name = 'comida'), 25, '/vibrant-mixed-salad.png'),
('Alitas de Pollo', 'Alitas de pollo crujientes con salsa BBQ', 22000, '7501234567893', (SELECT id FROM category_ids WHERE name = 'comida'), 40, '/crispy-chicken-wings.png'),
('Papas Fritas', 'Papas fritas doradas y crujientes', 12000, '7501234567894', (SELECT id FROM category_ids WHERE name = 'comida'), 60, '/crispy-french-fries.png'),
('Coca Cola', 'Refresco de cola 500ml', 8000, '7501234567895', (SELECT id FROM category_ids WHERE name = 'bebidas'), 100, '/refreshing-cola.png'),
('Té Helado', 'Té helado con limón 500ml', 9000, '7501234567896', (SELECT id FROM category_ids WHERE name = 'bebidas'), 80, '/iced-tea.png'),
('Jugo de Naranja', 'Jugo natural de naranja 300ml', 10000, '7501234567897', (SELECT id FROM category_ids WHERE name = 'bebidas'), 70, '/glass-of-orange-juice.png'),
('Café Latte', 'Café latte con leche espumosa', 15000, '7501234567898', (SELECT id FROM category_ids WHERE name = 'bebidas'), 45, '/latte-coffee.png'),
('Agua Embotellada', 'Agua mineral 500ml', 5000, '7501234567899', (SELECT id FROM category_ids WHERE name = 'bebidas'), 120, '/bottled-water.png'),
('Pastel de Chocolate', 'Porción de pastel de chocolate con crema', 20000, '7501234567800', (SELECT id FROM category_ids WHERE name = 'postres'), 20, '/chocolate-cake-slice.png'),
('Cheesecake', 'Cheesecake de frutilla con base de galleta', 22000, '7501234567801', (SELECT id FROM category_ids WHERE name = 'postres'), 15, '/cheesecake-slice.png'),
('Helado', 'Copa de helado con frutas y crema', 16000, '7501234567802', (SELECT id FROM category_ids WHERE name = 'postres'), 35, '/ice-cream-sundae.png'),
('Pay de Manzana', 'Pay casero de manzana con canela', 18000, '7501234567803', (SELECT id FROM category_ids WHERE name = 'postres'), 25, '/apple-pie-slice.png'),
('Brownie', 'Brownie de chocolate con nueces', 14000, '7501234567804', (SELECT id FROM category_ids WHERE name = 'postres'), 30, '/chocolate-brownie.png');

-- Insertar algunos clientes de ejemplo
INSERT INTO customers (name, ruc, address, phone, email) VALUES
('Juan Pérez', '12345678-9', 'Av. España 456, Asunción', '+595 981 123456', 'juan.perez@email.com'),
('María González', '98765432-1', 'Calle Palma 789, Asunción', '+595 982 654321', 'maria.gonzalez@email.com'),
('Empresa ABC S.A.', '80123456-7', 'Av. Mariscal López 321, Asunción', '+595 21 987654', 'contacto@empresaabc.com.py');
