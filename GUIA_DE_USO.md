# Guía de Uso - BJ SERVICIOS INFORMÁTICOS SpA

## Acceso al Sistema

**Credenciales:**
- Usuario: `Fuko197160551`
- Contraseña: `Miltonemillonario26$`

El sistema utiliza autenticación SHA256 de alta seguridad.

---

## Módulos Principales

### 1. Proyectos
Gestiona los proyectos de tus clientes.

**Funcionalidades:**
- Crear nuevo proyecto
- Asociar cotizaciones
- Asociar documentos
- Ver estado del proyecto (Activo, Pausado, Completado)
- Carrusel de visualización

**Cómo usar:**
1. Haz clic en **"Proyectos"** en el menú
2. Haz clic en **"Nuevo Proyecto"**
3. Completa los campos: nombre, descripción, cliente, estado
4. Opcionalmente agrega cotizaciones y documentos (separados por comas)
5. Haz clic en **"Crear Proyecto"**

---

### 2. Notas de Cobro
Gestiona y emite notas de cobro para tus servicios.

**Funcionalidades:**
- Crear nota de cobro
- Imprimir en PDF
- Enviar por WhatsApp
- Vincular a proyecto
- Seguimiento de estado (Pendiente/Pagado)

**Cómo usar:**
1. Haz clic en **"Notas de Cobro"**
2. Haz clic en **"Nueva Nota"**
3. Completa los datos:
   - Cliente y RUT
   - Descripción del servicio
   - Período (mes)
   - Monto neto
   - Proyecto relacionado (opcional)
4. Haz clic en **"Guardar Nota de Cobro"**
5. Para imprimir: clic en **"Imprimir"**
6. Para enviar por WhatsApp: clic en **"WSP"**
7. Para generar DTE: clic en **"DTE"**

---

### 3. DTEs - Timbre Electrónico SII
Genera documentos tributarios electrónicos válidos para el SII.

**Funcionalidades:**
- Generar DTEs (Boleta, Factura, Nota Crédito, Nota Débito)
- Validación de RUT automática
- Cálculo automático de IVA (19%)
- Descarga de XML y Timbre electrónico
- Configuración de credenciales SII
- Historial de DTEs generados

**Cómo usar:**

#### Generar DTE:
1. Haz clic en **"DTE SII"** en el menú
2. Ir a pestaña **"Generar DTE"**
3. Llenar formulario:
   - Tipo de documento (Boleta, Factura, etc.)
   - Nombre del receptor
   - RUT del receptor (formato: XX.XXX.XXX-X)
   - Descripción del servicio
   - Monto neto
4. Haz clic en **"Generar y Descargar DTE + Timbre"**
5. Se descargarán dos archivos:
   - `DTE_[folio].xml` - Documento tributario
   - `TIMBRE_[folio].json` - Timbre electrónico

#### Configurar SII:
1. En **"DTE SII"** ir a pestaña **"Configuración SII"**
2. Ingresar:
   - Usuario SII
   - Contraseña SII (se encripta automáticamente)
   - Ruta del certificado digital (.pfx)
   - Contraseña del certificado
   - Seleccionar ambiente (Producción o Test)
3. Haz clic en **"Guardar Configuración"**

#### Ver Historial:
1. En **"DTE SII"** ir a pestaña **"Historial DTEs"**
2. Ver todos los DTEs generados
3. Descargar archivos nuevamente si es necesario

---

### 4. Boletas
Genera boletas de venta.

**Funcionalidades:**
- Crear nueva boleta
- Agregar múltiples items
- Cálculo automático de totales
- Vinculación a proyecto

---

### 5. Órdenes de Servicio
Crea órdenes para reparación, mantenimiento o instalación.

**Funcionalidades:**
- Descripción detallada del equipo
- Tipo de servicio
- Costo estimado
- Estado del servicio
- Notas técnicas

---

### 6. Cotizaciones
Emite cotizaciones a tus clientes.

**Funcionalidades:**
- Crear cotizaciones detalladas
- Múltiples items
- Cálculo automático
- Vincular a proyecto

---

### 7. Documentos
Visualiza todos los documentos generados.

**Funcionalidades:**
- Listar boletas, órdenes y cotizaciones
- Búsqueda y filtrado
- Descarga de documentos

---

## Enlaces entre Entidades

Todos los documentos pueden asociarse a **Proyectos**:
- Una Nota de Cobro → Proyecto
- Una Boleta → Proyecto
- Una Orden de Servicio → Proyecto
- Un DTE → Proyecto

Esto permite una **trazabilidad completa** de cada cliente y proyecto.

---

## Impresión y Descarga

### Imprimir en PDF
- Haz clic en el botón **"Imprimir"** en cualquier documento
- Se abrirá una vista previa
- Usa `Ctrl+P` o `Cmd+P` para imprimir
- Selecciona "Guardar como PDF" para descargar

### Descargar Archivos
- Haz clic en los botones de descarga
- Los archivos se descargan automáticamente
- DTEs se descargan en formato XML + JSON

---

## Seguridad y Privacidad

- Todos los datos están encriptados en Supabase
- Las contraseñas se hashean con SHA256
- Solo usuarios autenticados pueden acceder
- Row Level Security en todas las tablas
- Los datos se sincronizan entre dispositivos

---

## Consejos de Uso

1. **Crea proyectos primero** - Facilita organización
2. **Usa nombres descriptivos** - Para fácil búsqueda
3. **Vincula todos los documentos** - Mantén trazabilidad
4. **Guarda copias de DTEs** - Para auditoría SII
5. **Configura SII** - Para automatizar registro
6. **Realiza backup regular** - Los datos son valiosos

---

## Soporte

Para consultas:
- Email: contacto@bjservicios.cl
- Teléfono: +56941228089

---

## Actualizaciones y Mejoras Próximas

- Integración automática con SII
- Firma digital de documentos
- Reportes y estadísticas
- API para integraciones externas
- Aplicación móvil

---

**Versión:** 1.0
**Última actualización:** 2025-03-01
