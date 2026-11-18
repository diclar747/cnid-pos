# Órdenes, cocina y tarjetas QR

## Atención y cobro

1. En **POS**, agregá productos por nombre, código de barras o cámara. Si el producto tiene agregados, buscá el acompañamiento dentro del cuadro y elegilo antes de agregar al carrito.
2. **Cobrar ahora** registra una venta inmediata. **Guardar orden abierta** crea una cuenta para mesa, cliente o tarjeta. **Cocina** envía los productos a la preparación; **Enviar e imprimir** también abre la comanda para imprimirla.
3. Desde **Órdenes**, abrí la cuenta por número, mesa, cliente o tarjeta. Podés agregar más consumos y generar varias comandas en la misma cuenta. **Cobrar** factura la cuenta completa cuando termine.
4. **Precuenta**: desde **Órdenes**, el botón **Precuenta** imprime la cuenta para el cliente antes de cobrar (ticket de 75 mm con mesa, mesero, cliente, detalle y total, marcado «No válido como comprobante de pago»). La orden muestra **Precuenta impresa** con la hora. Si después se agregan consumos, la marca desaparece y hay que volver a imprimirla. Cada reimpresión se numera.
5. **Mesero**: al abrir una cuenta se elige el mesero; si quien la abre tiene rol **Mesero**, queda asignado automáticamente. Se puede cambiar desde **Órdenes → Datos**. El mesero aparece en la comanda de cocina, en la precuenta y en el comprobante, y queda guardado en la venta.
6. **Cobro en una ventana**: **Cobrar ahora**, **Cobrar cuenta completa**, **Órdenes → Cobrar** y **Pedidos → Cobrar** abren el mismo cuadro sin salir de la pantalla. Se elige el medio (efectivo, tarjeta, transferencia, QR o **A cuenta**), con efectivo se carga lo recibido (o se toca un billete sugerido) y se ve el vuelto al instante. **Dividir pago** reparte el total entre varios medios (por ejemplo, parte en efectivo y parte con tarjeta). Opcionalmente se agregan RUC y nombre para el comprobante. Al terminar muestra el vuelto a entregar, imprime el ticket (se puede desactivar) y queda listo para la venta siguiente.
7. **Comprobante de pago**: al cobrar se abre el ticket de 75 mm con el mismo formato que la precuenta más forma de pago, monto recibido y saldo devuelto. Las cuentas cobradas tienen **Reimprimir comprobante** en **Órdenes**.
8. La reserva de stock ocurre al enviar a cocina. Al cobrar se descuenta únicamente lo que no se había reservado. Cancelar una orden pendiente devuelve el stock reservado; las órdenes listas o entregadas requieren una devolución aparte.

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

El cliente abre el mismo QR en su teléfono, busca productos, elige agregados y envía el carrito. El sistema crea una comanda, la coloca en el tablero **Cocina** y descuenta el stock de los productos controlados. Los reintentos del mismo envío no duplican la comanda. La cuenta acumulada se puede consultar desde la página de la mesa. Por ahora el cobro se realiza en el POS; el QR no procesa pagos en línea.

## Atención en la mesa y avisos

Después de pedir, la página de la mesa muestra **Estado de tu pedido** en vivo: *Recibido → En cocina → Listo → Servido*. Se actualiza sola cada pocos segundos y, cuando la cocina cambia el estado, el teléfono muestra un aviso, vibra y suena.

- **Llamar al mozo** y **Pedir la cuenta** avisan al personal. Tocar varias veces no duplica el llamado, y hay un límite por minuto para evitar abusos.
- En cualquier pantalla del personal con acceso al POS aparece un aviso con la mesa y el salón, suena y el título de la pestaña parpadea. **Atender** lo cierra. Al cobrar la cuenta se cierran los llamados pendientes de esa mesa.
- **Activar avisos** (en la mesa, después de pedir) envía notificaciones push al teléfono del cliente aunque cierre la página: pedido aceptado, listo, servido, cuenta lista o cancelado. En iPhone primero hay que agregar la carta a la pantalla de inicio (Safari → Compartir → Agregar a inicio) y abrirla desde ese ícono.
- **Instalar la carta**: cada mesa se instala como una app propia con el nombre del local y de la mesa.
- El personal activa sus propios avisos con **Activar avisos** en **Órdenes** o **Cocina**: recibe los pedidos nuevos del QR y los llamados de mesa como notificación del teléfono o la PC.

Las notificaciones usan Web Push estándar implementado con Node (sin servicios de terceros). Las claves VAPID se generan solas la primera vez y se guardan en la base (`public.system_settings`); opcionalmente se puede definir `VAPID_SUBJECT` (por ejemplo `mailto:soporte@tudominio.com`). Los avisos push necesitan HTTPS. El servidor solo envía a los servicios push de los navegadores (Google, Mozilla, Apple y Microsoft). `pnpm test:push` verifica el cifrado contra el RFC 8291 y `scripts/smoke-table-qr.mjs` prueba el flujo completo.

## Clientes

Cada pedido con teléfono (o cobro con RUC) registra o actualiza al cliente del restaurante: nombre, teléfono, RUC, dirección, cantidad de compras, total gastado y última compra. En **Administración → Clientes** se buscan por nombre, teléfono o RUC, se editan sus datos y se ven sus compras con el ticket de cada una. El teléfono se guarda con código de país (595…) para usarlo después con WhatsApp.

### Cuenta corriente (comer a crédito)

Para clientes fijos que comen y pagan después (por semana, quincena o mes):

1. Al cobrar, elegí **A cuenta (crédito)** y buscá al cliente. Si no existe, **Nuevo cliente** lo registra ahí mismo con nombre, teléfono, cada cuánto paga y un límite opcional. A un cliente existente se le habilita el crédito desde el mismo cuadro.
2. La venta queda registrada y el monto se suma a su **saldo pendiente**. El ticket muestra lo cargado a cuenta, el saldo y una línea para la firma del cliente. Se puede combinar: parte en efectivo y el resto a cuenta.
3. Si el cliente tiene límite y el consumo lo supera, el cobro se bloquea hasta que abone o se ajuste el límite.
4. En **Administración → Clientes** aparece el total **por cobrar**, el filtro **Con saldo pendiente** y, en cada cliente, su cuenta: saldo, consumos y pagos del período actual (semana, quincena o mes) y todos los movimientos.
5. **Registrar pago**: el cliente abona todo o una parte con cualquier medio; el pago entra en la caja abierta (en efectivo suma al esperado del arqueo). Si es transferencia queda por verificar y, si caja la rechaza, la deuda vuelve a la cuenta.
6. **Ajuste** (solo administración): descuentos o correcciones con motivo obligatorio. **Recordar por WhatsApp** abre un mensaje con el saldo y los consumos del período.

Las ventas a cuenta aparecen en caja como «Crédito (cuenta corriente)», pero no suman efectivo; los pagos de cuentas se listan aparte en el resumen y en el arqueo.

## Delivery por zonas

En **Administración → Delivery** se cargan las zonas (barrios o ciudades, costo de envío, monto para envío gratis y demora estimada) y los repartidores. Al abrir una cuenta de delivery desde el POS se elige la zona y la dirección; el envío se suma solo y se recalcula si cambian los consumos (gratis al superar el monto configurado). El repartidor se asigna desde **Órdenes → Datos** y aparece en la comanda, el tablero de cocina y el ticket. El cobro incluye el envío; el ticket muestra subtotal, envío y total.

## Historial y confirmación de pedidos

Cada orden guarda su historial: creación, productos agregados, envíos a cocina, cambios de estado de cada comanda, precuentas, mesero, repartidor, cobro, cancelación o rechazo, con quién lo hizo y cuándo (**Órdenes → Historial**). Los pedidos que lleguen por canales remotos (WhatsApp, próximamente) entran **pendientes de confirmación**: no van a cocina ni se cobran hasta que el local los **Confirma**; caja también puede **Rechazarlos** indicando el motivo. Los pedidos del QR de mesa quedan marcados con su origen.

## Ficha del restaurante

En **Configuración → Ficha** se cargan descripción, WhatsApp, tipo de establecimiento, modalidades de atención (local, delivery, retiro), ubicación (enlace de Google Maps y coordenadas) y horarios por día.

## Menú: promociones, preparación y opciones

En **Administración → Productos**, cada producto admite además:

- **Precio promocional**: si es menor al precio normal, se cobra ese precio en el POS, el QR de mesa, las órdenes y WhatsApp; la carta lo muestra tachado.
- **Tiempo de preparación** (minutos) e **ingredientes**: los ve el cliente en el QR y el asistente de WhatsApp los usa para responder.
- **Disponible para vender**: un producto desactivado no se puede cobrar ni pedir.
- **Opciones y adicionales**: grupos como Tamaño, Punto o Extras, cada uno obligatorio o no, con una o varias opciones y precio extra. El sistema exige las opciones obligatorias en todos los canales.

## Caja y pagos

**Caja** (desde el POS o la administración, con permiso de ventas):

1. **Abrir caja** con el efectivo inicial (cambio). Solo puede haber una caja abierta por restaurante.
2. Cada cobro registra el pago con su medio y lo asocia a la caja abierta. Si la caja está cerrada, la venta se registra igual pero no entra en ningún arqueo; la pantalla de cobro lo avisa.
3. **Registrar ingreso o egreso** (refuerzo de cambio, compra de hielo, pago a un proveedor…) con monto, medio y motivo. Un egreso en efectivo no puede superar lo que hay en caja.
4. **Cerrar caja**: se cuenta el efectivo; el sistema muestra lo esperado (inicial + ventas en efectivo + pagos de cuentas en efectivo + ingresos − egresos), la diferencia (sobrante o faltante) e imprime el arqueo en 75 mm. Los cierres quedan en el historial.

**Medios de pago**: efectivo, tarjeta, transferencia y QR vienen cargados; desde **Caja → Medios de pago** se agregan otros (por ejemplo, una billetera) y se activan o desactivan. Las transferencias y los QR quedan **por verificar**: caja los confirma recién cuando ve el dinero acreditado, o los rechaza con un motivo. El comprobante indica «(a verificar)» mientras tanto.

## Pedidos en vivo (tablero CRM)

**Pedidos** muestra los pedidos del día en columnas: *Nuevos* (por confirmar, por ejemplo de WhatsApp), *Pendientes* (con consumos sin enviar), *Confirmados*, *En cocina*, *Listos*, *En delivery*, *Entregados* y *Cancelados*. La columna sale del estado real de la orden y sus comandas.

- Arrastrá una tarjeta a la columna siguiente o usá su botón (*Confirmar y enviar*, *Aceptar en cocina*, *Marcar listo*, *Salió el delivery*, *Entregado*). Se aplican las mismas reglas que en Órdenes y Cocina y el cliente recibe el aviso.
- El detalle muestra productos, comandas, historial, responsable, repartidor y observaciones; desde ahí se cobra, se imprime y se cancela (con motivo).
- Filtros por fecha, origen (POS, QR, WhatsApp) y búsqueda por número, cliente, teléfono o mesa.
- El panel **¿Cómo funciona?** del tablero explica cada paso: qué hace el local y qué aviso recibe el cliente.
- Todo se actualiza en vivo (PostgreSQL LISTEN/NOTIFY + Server-Sent Events). Si la conexión en vivo no está disponible, la pantalla consulta cada pocos segundos.

En **Cocina** cada comanda pendiente o en preparación tiene **Urgente** (se muestra primero), **+10 min** (avisa la demora al cliente) y **Falta** (avisa qué producto falta para ofrecer una alternativa).

## Estadísticas

**Administración → Estadísticas** (permiso de reportes) muestra, para el período elegido y comparado con el anterior: ventas, cobros, ticket promedio, clientes, pedidos y cancelados, evolución diaria, semanal y mensual, horarios de mayor demanda, productos más y menos vendidos (y sin ventas), clientes frecuentes, rendimiento de caja y de mozos, origen y modalidad de los pedidos, medios de pago, tiempos de cocina (hasta «Listo» y hasta la entrega) y delivery por zona y repartidor. Se exporta a CSV. Los pagos rechazados no se cuentan.

## WhatsApp y asistente Niro IA

**Administración → WhatsApp e IA**:

- **Conexión**: *Conectar WhatsApp* genera un código QR; en el teléfono del local, WhatsApp → *Dispositivos vinculados* → *Vincular un dispositivo*. Cada restaurante usa su propia sesión. Si nadie escanea en unos 2 minutos, se detiene. La sesión se reanuda sola cuando el servidor reinicia y se reconecta ante cortes. *Desvincular* cierra la sesión del teléfono. La conexión usa WhatsApp Web (Baileys), que no es oficial: puede desconectarse y WhatsApp puede restringir números que envían en masa.
- **Conversaciones**: todos los mensajes (los audios se transcriben con Niro; las ubicaciones llegan como enlace de mapa). **Tomar conversación** o responder pausa el asistente en ese chat y muestra quién atiende; **Devolver al asistente** lo reactiva. Las conversaciones donde el cliente pidió una persona aparecen primero.
- **Asistente IA**: activalo, cargá el saludo y las instrucciones del local y probalo en **Probar asistente** (no envía WhatsApp ni registra pedidos).
- **Chat dentro del POS**: el acceso **WhatsApp** de Opciones (POS, Pedidos, Cocina, Órdenes) abre la bandeja en un panel, con la cantidad de mensajes sin leer, sin salir de la pantalla.
- **Contactos, audios e imágenes**: cada contacto muestra su foto de perfil (si no la oculta), nombre y número. Los audios llegan y se escuchan en la conversación; si está activado **Transcribir audios automáticamente** (Asistente IA), Niro también los pasa a texto debajo del audio. Las imágenes se ven en la conversación. Los archivos se guardan en la base del restaurante.
- **Delivery con ubicación**: el asistente pide que el cliente comparta su ubicación de WhatsApp. Queda guardada en el pedido (enlace «Ver en el mapa» en el tablero y en Órdenes). Si las zonas tienen **Radio desde el local (km)** y la Ficha tiene la ubicación del local, la zona y el costo de envío se eligen solos por distancia; fuera de todas las zonas, el asistente ofrece retiro.

Cómo trabaja el asistente: conversa con el cliente y propone acciones (agregar productos y opciones, modalidad, dirección y zona, nombre, confirmar). El servidor valida cada acción con la carta, las opciones obligatorias, la disponibilidad y las zonas reales; los precios, el envío y el total los calcula el sistema, nunca la IA. Al confirmar, el pedido entra como **Nuevo** en el tablero para que el local lo confirme; cada cambio de estado (confirmado, en preparación, listo, en camino, entregado, demora, cancelado) se avisa por WhatsApp con el nombre del restaurante y el número de pedido. Si el cliente pide una persona, se queja o Niro no responde (por ejemplo, sin créditos), la conversación pasa al personal con un aviso push. Se registran las respuestas, los tokens y los errores (últimos 30 días en la misma pantalla).

Requiere la variable `NIRO_API_KEY` en el servidor (ver docs/despliegue.md). Sin ella, los mensajes llegan a Conversaciones para que los atienda el personal.

## App instalable

RestoPOS se instala como app (Android, iPhone y escritorio) desde **Instalar app** en la portada o en el inicio de sesión. La primera vez muestra una presentación deslizable que termina en **Iniciar sesión**; después abre directo el inicio de sesión. El manifiesto incluye capturas y accesos directos a POS, Pedidos, Cocina y Caja.

## Marketplace

`/marketplace` es la vitrina pública de todos los restaurantes activos de RestoPOS (enlazada desde la portada). Cada restaurante muestra su logo, foto, si está abierto ahora según sus horarios, dirección, teléfono, WhatsApp, modalidades (delivery, retiro, en el local), promociones y el menú completo por categorías con buscador.

El cliente arma su pedido en la página y lo envía por **WhatsApp** al restaurante con el detalle y el total estimado; si el asistente Niro está activo, lo toma desde ahí. Los datos salen de **Empresa → Ficha** (descripción, WhatsApp, Google Maps, horarios, modalidades) y del catálogo activo; nunca se muestran stock, costos ni clientes. Con **Mostrar en el marketplace** desmarcado, el restaurante deja de aparecer. Los restaurantes suspendidos no se listan.
