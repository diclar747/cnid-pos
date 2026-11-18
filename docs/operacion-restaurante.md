# Órdenes, cocina y tarjetas QR

## Atención y cobro

1. En **POS**, agregá productos por nombre, código de barras o cámara. Si el producto tiene agregados, buscá el acompañamiento dentro del cuadro y elegilo antes de agregar al carrito.
2. **Cobrar ahora** registra una venta inmediata. **Guardar orden abierta** crea una cuenta para mesa, cliente o tarjeta. **Cocina** envía los productos a la preparación; **Enviar e imprimir** también abre la comanda para imprimirla.
3. Desde **Órdenes**, abrí la cuenta por número, mesa, cliente o tarjeta. Podés agregar más consumos y generar varias comandas en la misma cuenta. **Cobrar** factura la cuenta completa cuando termine.
4. **Precuenta**: desde **Órdenes**, el botón **Precuenta** imprime la cuenta para el cliente antes de cobrar (ticket de 75 mm con mesa, mesero, cliente, detalle y total, marcado «No válido como comprobante de pago»). La orden muestra **Precuenta impresa** con la hora. Si después se agregan consumos, la marca desaparece y hay que volver a imprimirla. Cada reimpresión se numera.
5. **Mesero**: al abrir una cuenta se elige el mesero; si quien la abre tiene rol **Mesero**, queda asignado automáticamente. Se puede cambiar desde **Órdenes → Datos**. El mesero aparece en la comanda de cocina, en la precuenta y en el comprobante, y queda guardado en la venta.
6. **Comprobante de pago**: al cobrar se abre el ticket de 75 mm con el mismo formato que la precuenta más forma de pago, monto recibido y saldo devuelto. Las cuentas cobradas tienen **Reimprimir comprobante** en **Órdenes**.
7. La reserva de stock ocurre al enviar a cocina. Al cobrar se descuenta únicamente lo que no se había reservado. Cancelar una orden pendiente devuelve el stock reservado; las órdenes listas o entregadas requieren una devolución aparte.

## Roles en el salón

| Rol | Puede | No puede |
| --- | --- | --- |
| Mesero (`take_orders`) | Abrir cuentas, agregar consumos, enviar a cocina, imprimir precuentas, cambiar datos de la cuenta | Cobrar ni cancelar órdenes |
| Cajero (`manage_sales`) | Todo lo del mesero, cobrar y cancelar | Administración |

El rol se asigna en **Administración → Usuarios**. Al aplicar `pnpm db:setup` sobre una base existente se agregan las columnas de mesero y precuenta en todos los restaurantes (`scripts/06-service-billing.sql`).

## Cocina y delivery

El tablero **Cocina** actualiza las comandas cada 8 segundos. El recorrido es **Pendiente → Preparando → Listo → Servido** para consumo local, **Pendiente → Preparando → Listo → En reparto → Entregado** para delivery, y **Pendiente → Preparando → Listo → Entregado** para retiro. Cada comanda puede reimprimirse desde el tablero o desde la orden. La impresión usa el cuadro de impresión del navegador y está diseñada para papel térmico de 80 mm.

## Tarjetas QR

En **Órdenes → Tarjetas QR**, creá hasta 30 tarjetas por lote y luego imprimilas. Una tarjeta identifica una sola cuenta abierta y queda disponible de nuevo tras cobrarla o cancelarla. El personal puede escanear el QR con la cámara del POS o un lector que escriba el código en el buscador. El cliente puede abrir el mismo QR en su teléfono para consultar productos, total y estado de cocina. La vista del cliente no muestra nombre ni teléfono.

La pantalla de tarjetas toma por defecto la dirección segura del servidor de teléfono configurada en `.local-cert/address.txt`. Antes de imprimir, verificá que esa dirección corresponde a la IP actual del equipo. Para que la cámara y la PWA funcionen en el teléfono, instalá y confiá en la autoridad local `.local-cert/ca.cer` en el dispositivo. Si la IP de la red cambia, actualizá el certificado y la dirección antes de imprimir tarjetas nuevas.

## Salones, mesas y pedidos desde el teléfono

En **Administración → Salones y mesas** creá los espacios del local. Cada salón admite una foto; cada mesa tiene nombre, número de sillas, forma y un QR único. Las cuentas abiertas muestran la mesa ocupada. Una mesa ocupada no se puede desactivar hasta cerrar su cuenta. **Imprimir QR** genera las tarjetas de todas las mesas activas; verificá la dirección HTTPS antes de imprimir.

El personal escanea el QR de mesa desde el buscador superior del POS o abre la mesa desde esta pantalla. Si ya existe una cuenta, se recupera; si está libre, se abre una nueva. También se puede elegir la mesa al guardar o enviar una cuenta desde el carrito y cambiarla desde **Órdenes → Datos**.

El cliente abre el mismo QR en su teléfono, busca productos, elige agregados y envía el carrito. El sistema crea una comanda, la coloca en el tablero **Cocina** y descuenta el stock de los productos controlados. Los reintentos del mismo envío no duplican la comanda. La cuenta acumulada se puede consultar desde la página de la mesa. Por ahora el cobro se realiza en el POS; el QR no procesa pagos en línea. El teléfono y el servidor deben estar en la misma red local.

## Clientes

Cada pedido con teléfono (o cobro con RUC) registra o actualiza al cliente del restaurante: nombre, teléfono, RUC, dirección, cantidad de compras, total gastado y última compra. En **Administración → Clientes** se buscan por nombre, teléfono o RUC, se editan sus datos y se ven sus compras con el ticket de cada una. El teléfono se guarda con código de país (595…) para usarlo después con WhatsApp.

## Delivery por zonas

En **Administración → Delivery** se cargan las zonas (barrios o ciudades, costo de envío, monto para envío gratis y demora estimada) y los repartidores. Al abrir una cuenta de delivery desde el POS se elige la zona y la dirección; el envío se suma solo y se recalcula si cambian los consumos (gratis al superar el monto configurado). El repartidor se asigna desde **Órdenes → Datos** y aparece en la comanda, el tablero de cocina y el ticket. El cobro incluye el envío; el ticket muestra subtotal, envío y total.

## Historial y confirmación de pedidos

Cada orden guarda su historial: creación, productos agregados, envíos a cocina, cambios de estado de cada comanda, precuentas, mesero, repartidor, cobro, cancelación o rechazo, con quién lo hizo y cuándo (**Órdenes → Historial**). Los pedidos que lleguen por canales remotos (WhatsApp, próximamente) entran **pendientes de confirmación**: no van a cocina ni se cobran hasta que el local los **Confirma**; caja también puede **Rechazarlos** indicando el motivo. Los pedidos del QR de mesa quedan marcados con su origen.

## Ficha del restaurante

En **Configuración → Ficha** se cargan descripción, WhatsApp, tipo de establecimiento, modalidades de atención (local, delivery, retiro), ubicación (enlace de Google Maps y coordenadas) y horarios por día.
