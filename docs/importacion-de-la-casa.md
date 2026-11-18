# Importación del restaurante «De la Casa»

Fuente: `cnid_pos.sql`, respaldo de MariaDB/phpMyAdmin del 14 de octubre de 2026. Se analizó como datos; no se ejecutó su SQL original sobre PostgreSQL.

## Alcance y resultado

La sucursal 1 pertenece a «De la Casa». Las sucursales DEMO, Salmon House y Asaditos Gourmet pertenecen a otros negocios y no se importaron. El archivo contiene 77 tablas con datos. El inventario relevante de la sucursal 1 es:

| Dato | En el respaldo | En CNID POS |
| --- | ---: | ---: |
| Artículos base del menú | 99 | Expandidos a 302 opciones vendibles |
| Categorías usadas | 10 | 10 |
| Menús usados | 78 | 78 |
| Variantes | 272 | Incluidas en las 302 opciones |
| Opciones vendibles con grupos de agregados | — | 276 |
| Pedidos | 10.876 | 10.445 ventas pagadas |
| Total de ventas pagadas | Gs 337.426.694,095 | Gs 337.426.694,095 |
| Productos de demostración previos | 15 | Conservados, inactivos |

Los artículos con variantes tenían con frecuencia `menu_items.price = 0`; el precio vendible se obtuvo de `menu_item_prices` por tipo de pedido y, cuando faltaba, de `menu_item_variations.price`. Se guardaron precios para consumo en el local, delivery y retiro. Los nombres de menú y categoría se conservaron por artículo. Los grupos de agregados y sus opciones se conservaron y pueden elegirse en el POS.

El respaldo solo contiene `in_stock` como indicador de disponibilidad, sin cantidad física. Los platos importados quedaron disponibles **sin control numérico de stock**. En productos con control de stock, el POS sigue descontando cantidades en cada venta; se puede activar ese control y fijar la cantidad inicial desde la ficha del producto.

Las imágenes del menú están referidas por nombre de archivo en el respaldo, pero el archivo SQL no incluye los archivos de imagen. Los productos muestran una imagen genérica y conservan el nombre original de imagen en su metadato de origen.

## Historial y casos especiales

Se importaron los pedidos con estado `paid` como ventas históricas. Se excluyeron 325 pedidos cancelados y 103 pedidos `billed` sin pago. El total de cada venta se conservó tal como estaba en el respaldo; las ventas históricas **no vuelven a descontar stock**. Se conservaron los artículos, variantes, agregados, cliente, RUC cuando existen, forma de pago y referencias de origen.

La columna `orders.date_time` es `datetime`, pero sus 10.876 valores de la sucursal coinciden con `created_at`, exportado como UTC. Se conservaron las fechas de venta como UTC y la interfaz las presenta en la zona local. Se verificó que no quedaran diferencias de fecha tras la corrección.

Hay 354 pedidos pagados sin filas en `order_items` y 6 sin fila en `payments` dentro de la sucursal. Se conservaron por su importe y estado pagado, con el detalle vacío o el pago marcado como desconocido, en lugar de inventar artículos o medios de pago. Existen 240 líneas históricas de artículos con variantes pero sin variante identificada; conservan el nombre y precio histórico aunque no pueden vincularse a una opción vendible concreta.

Trece ventas pagadas tienen importes con decimales en la base anterior, aunque el guaraní normalmente se presenta sin decimales. Se conservaron para cuadrar el total del respaldo; la interfaz muestra los importes redondeados al formato monetario habitual.

El archivo también contiene 19 gastos en estado `pendiente`; no se mezclaron con los gastos pagados ni con el cálculo de ganancia. No hay proveedores ni cantidades de stock en el respaldo. Las tablas de clientes y otras configuraciones del sistema anterior no se convirtieron en módulos independientes; los datos de cliente asociados a las ventas sí se conservaron.

Como no hay gastos históricos pagados completos en el archivo, el reporte llama **balance registrado** a ventas menos gastos cargados. No debe interpretarse como ganancia neta contable.

## Seguridad y repetición

Antes de aplicar cambios se guardó un respaldo de PostgreSQL en `.backups/`. El importador crea claves únicas de origen para productos y ventas; repetirlo con el mismo archivo no duplica registros. Las contraseñas antiguas son hashes de otro sistema y no se importaron como credenciales activas. Se creó una cuenta nueva para Julio, administrador de «De la Casa», con una contraseña inicial aleatoria. Tras verificar su inicio de sesión se desactivaron las tres cuentas de demostración. Julio puede cambiar su contraseña desde **Usuarios**. El archivo SQL puede contener otros secretos de configuración; por eso no se incorporó al repositorio ni se ejecutó íntegramente.

Para inspeccionar otro respaldo: `node scripts/audit-legacy.mjs ruta.sql`.

Para ensayar sin cambios: `node scripts/import-legacy-restaurant.mjs ruta.sql --branch=1 --check --archive-demo`.

Para aplicar: `node scripts/import-legacy-restaurant.mjs ruta.sql --branch=1 --apply --archive-demo`.
