# Guía DTE - Sistema de Impuestos Internos (SII) Chile

## Descripción General

Este sistema implementa la integración con el Servicio de Impuestos Internos (SII) de Chile para la generación de **Documentos Tributarios Electrónicos (DTE)** y timbres electrónicos.

## Características Implementadas

### 1. Generador de DTEs
- Crea documentos válidos para el SII
- Soporta múltiples tipos: Boletas, Facturas, Notas de Crédito, Notas de Débito
- Valida RUTs de emisor y receptor
- Calcula automáticamente IVA (19%)
- Genera XML conforme a estándares SII

### 2. Timbre Electrónico
- Genera código de validación digital
- Incluye timestamp y hash de seguridad
- Descarga automática de archivo JSON con datos del timbre

### 3. Base de Datos Integrada
**Tabla: `dte_documents`**
```sql
- folio: Número único del documento
- company_rut: RUT del emisor (BJ SERVICIOS)
- document_type: Tipo de documento (boleta, factura, nota_credito, nota_debito)
- recipient_rut: RUT del receptor
- recipient_name: Nombre del receptor
- issue_date: Fecha de emisión
- due_date: Fecha de vencimiento
- net_amount: Monto neto
- iva_amount: Impuesto (19%)
- total_amount: Total con impuesto
- xml_content: Documento XML completo
- electronic_seal: Datos del timbre
- sii_status: Estado en SII (pending, registered, rejected)
- sii_response: Respuesta del SII
```

**Tabla: `sii_configurations`**
```sql
- company_rut: RUT de la empresa
- company_name: Nombre de la empresa
- sii_username: Usuario SII
- sii_password_hash: Contraseña encriptada SHA256
- certificate_path: Ruta del certificado .pfx
- certificate_password_hash: Contraseña del certificado encriptada
- sii_environment: production o test
```

## Flujo de Trabajo

### Generar un DTE

1. **Acceder a DTEs SII** desde el menú principal
2. **Ir a la pestaña "Generar DTE"**
3. **Completar el formulario:**
   - Tipo de documento (Boleta, Factura, etc.)
   - Nombre del receptor
   - RUT del receptor (formato: XX.XXX.XXX-X)
   - Descripción del servicio
   - Monto neto

4. **Hacer clic en "Generar y Descargar"**
5. **Se descargarán dos archivos:**
   - `DTE_[folio].xml` - Documento tributario en XML
   - `TIMBRE_[folio].json` - Timbre electrónico

### Registrar en SII

1. **Configurar credenciales SII:**
   - Ir a la pestaña "Configuración SII"
   - Ingresar usuario y contraseña SII
   - Cargar certificado digital (.pfx)
   - Guardar configuración

2. **La contraseña y certificado se almacenan encriptados**

3. **El registro en SII se realiza a través de Edge Functions** (próxima fase)

### Ver Historial

1. **Ir a la pestaña "Historial DTEs"**
2. **Ver todos los DTEs generados con su estado**
3. **Descargar archivos nuevamente si es necesario**

## Tipos de Documentos Soportados

| Código | Tipo | Descripción |
|--------|------|------------|
| 33 | Factura | Documento tributario estándar |
| 39 | Boleta | Documento simplificado |
| 61 | Nota Crédito | Devolución o ajuste |
| 56 | Nota Débito | Ajuste por defecto |
| 34 | Factura Exenta | Sin IVA |

## Campos del Timbre Electrónico

El timbre incluye:
- **folio**: Identificador único del documento
- **timestamp**: Fecha y hora de generación (UTC)
- **hash**: Código de validación SHA-256
- **version**: Versión del formato
- **status**: Estado actual
- **sii_response**: Respuesta del servidor SII (cuando aplica)

## Validaciones Implementadas

### RUT
- Valida formato de RUT chileno
- Verifica dígito verificador
- Acepta puntos y guiones

### Montos
- Monto neto > 0
- IVA calculado automáticamente (19%)
- Total = Neto + IVA

### Documentos
- Requiere nombre de receptor
- Requiere RUT válido
- Requiere descripción del servicio

## Enlace con Proyectos

Cada DTE se puede vincular a un proyecto:
- Agrega trazabilidad
- Agrupa documentos por cliente/proyecto
- Facilita auditoría y seguimiento

## Próximas Fases de Implementación

### 1. Edge Function de Integración SII
```typescript
// supabase/functions/sii-register-dte
// Registra DTEs en servidor SII
// Valida certificado digital
// Actualiza estado en base de datos
```

### 2. Firma Digital
- Integración con certificado .pfx
- Firma XML antes de envío
- Validación de integridad

### 3. Webhooks SII
- Recibe confirmación de registro
- Actualiza estado automáticamente
- Historial de intentos

### 4. Reportes
- Exportar DTEs registrados
- Cálculo de impuestos
- Auditoría completa

## Seguridad

- Las credenciales se almacenan con hash SHA256
- Row Level Security (RLS) en todas las tablas
- Acceso solo para usuarios autenticados
- Logs de todas las operaciones (próximo)

## Referencias

- [SII Chile - DTE](https://www.sii.cl/destacados/dte.html)
- [Manual Técnico DTE v1.0](https://www.sii.cl/ayudadte/)
- [XML Schema DTE](https://www.sii.cl/siideclaraciones/)

## Soporte

Para preguntas sobre DTEs y SII, contactar a:
- Email: contacto@bjservicios.cl
- Teléfono: +56941228089
