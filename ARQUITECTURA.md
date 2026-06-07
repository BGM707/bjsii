# Arquitectura del Sistema - BJ SERVICIOS INFORMÁTICOS

## Stack Tecnológico

```
Frontend: React 18 + TypeScript + Tailwind CSS
Backend: Supabase (PostgreSQL)
Autenticación: SHA256 Hash
Documentos: XML/JSON para DTEs
```

---

## Estructura de Archivos

```
src/
├── components/
│   ├── Layout.tsx                 # Layout principal con navegación
│   ├── Login.tsx                  # Pantalla de autenticación
│   ├── ProjectsCarousel.tsx       # Gestor de proyectos
│   ├── CobrosNotes.tsx            # Notas de cobro
│   ├── DTEGenerator.tsx           # Generador de DTEs
│   ├── DTEManagement.tsx          # Panel de gestión de DTEs
│   ├── SIIConfiguration.tsx       # Configuración del SII
│   ├── ReceiptForm.tsx            # Formulario de boletas
│   ├── ServiceOrderForm.tsx       # Órdenes de servicio
│   ├── QuotationForm.tsx          # Cotizaciones
│   └── DocumentsList.tsx          # Listado de documentos
├── lib/
│   ├── supabase.ts               # Cliente Supabase + interfaces
│   └── dte.ts                    # Utilidades para generación de DTEs
├── App.tsx                        # Componente principal
└── main.tsx                       # Punto de entrada
```

---

## Flujo de Datos

### Autenticación
```
1. Usuario ingresa credenciales
2. Se hashean con SHA256
3. Se comparan con hash en BD
4. Se genera token en localStorage
5. Token se valida en cada request
```

### Crear Nota de Cobro
```
1. Usuario completa formulario en CobrosNotes.tsx
2. Se validan los datos (RUT, montos, etc.)
3. Se inserta en tabla cobros_notes en Supabase
4. Se carga lista actualizada
5. Usuario puede imprimir, enviar por WSP o generar DTE
```

### Generar DTE
```
1. DTEGenerator.tsx prepara datos
2. dte.ts genera XML conforme a SII
3. dte.ts genera timbre electrónico con hash
4. Se insertan registros en dte_documents
5. Se descargan archivos automáticamente
6. DTE está listo para enviar a SII
```

---

## Base de Datos

### Tablas Principales

#### users
- Almacena credenciales de acceso
- RLS: Solo el usuario puede ver su registro
```sql
id (uuid) | username | password_hash | name | email | created_at
```

#### projects
- Agrupa documentos por cliente/proyecto
- RLS: Todos los autenticados pueden ver
```sql
id | name | description | client | status | quotations | documents | created_at | updated_at
```

#### cobros_notes
- Notas de cobro con seguimiento
- Vinculadas a proyectos
```sql
id | folio | cliente | rut | telefono | servicio_titulo | servicio_desc
periodo | neto | banco | cuenta | titular | estado | proyecto_id | created_at | updated_at
```

#### receipts
- Boletas de venta
- Vinculadas a proyectos y DTEs
```sql
id | receipt_number | client_name | client_email | client_phone | client_address
items (JSONB) | subtotal | tax | total | project_id | document_type | sii_status | created_at
```

#### service_orders
- Órdenes de servicio
- Vinculadas a proyectos
```sql
id | order_number | client_name | client_email | client_phone | client_address
device_type | device_brand | device_model | device_serial | problem_description
service_type | status | estimated_cost | notes | project_id | created_at | updated_at
```

#### dte_documents
- Documentos tributarios electrónicos
- Centro de integración con SII
```sql
id | folio | company_rut | company_name | document_type | recipient_rut | recipient_name
issue_date | due_date | net_amount | iva_amount | total_amount | document_description
xml_content | electronic_seal | sii_status | sii_response | receipt_id | project_id | created_at | updated_at
```

#### sii_configurations
- Credenciales y configuración SII
- Encriptadas en almacenamiento
```sql
id | company_rut | company_name | sii_username | sii_password_hash
certificate_path | certificate_password_hash | sii_environment | active | created_at | updated_at
```

---

## Seguridad

### Row Level Security (RLS)
```
✓ users: Solo usuario autenticado ve su registro
✓ projects: Todos los autenticados pueden ver (admin futura)
✓ cobros_notes: Todos los autenticados pueden CRUD
✓ receipts: Todos los autenticados pueden CRUD
✓ service_orders: Todos los autenticados pueden CRUD
✓ dte_documents: Todos los autenticados pueden CRUD
✓ sii_configurations: Todos los autenticados pueden CRUD
```

### Encriptación
- Contraseñas: SHA256 en cliente y servidor
- Credenciales SII: SHA256
- Certificado: Hash SHA256
- Comunicación: HTTPS/SSL

---

## Componentes Principales

### Login.tsx
```typescript
Props: { onLoginSuccess: (username: string) => void }
- Validación de credenciales
- Hash SHA256 de contraseña
- Almacenamiento en localStorage
- Manejo de errores
```

### ProjectsCarousel.tsx
```typescript
- CRUD completo de proyectos
- Carrusel de navegación
- Validación de datos
- Sincronización con Supabase
```

### CobrosNotes.tsx
```typescript
- Crear notas de cobro
- Impresión PDF
- Envío por WhatsApp
- Integración con DTEGenerator
- Estados: Pendiente/Pagado
```

### DTEGenerator.tsx
```typescript
- Genera XML conforme SII
- Valida RUTs
- Cálculo automático IVA
- Descarga automática
- Almacenamiento en BD
```

### DTEManagement.tsx
```typescript
- Interfaz unificada para DTEs
- 3 tabs: Generar, Configurar, Historial
- Gestión de SII
- Descarga de archivos
```

### SIIConfiguration.tsx
```typescript
- Almacenar credenciales SII
- Encriptación de contraseñas
- Selección de ambiente (Prod/Test)
- Validación de datos
```

---

## Utilidades

### dte.ts
```typescript
generateDTEXML(data): string
  - Crea XML válido para SII
  - Incluye validaciones
  - Escapa caracteres especiales

generateElectronicSeal(folio, xml): string
  - Crea timbre electrónico
  - Hash SHA-256
  - Metadata para auditoría

downloadDTEFile(xml, folio): void
  - Descarga automática de XML

downloadElectronicSeal(seal, folio): void
  - Descarga de timbre JSON

validateRUT(rut): boolean
  - Valida RUT chileno
  - Verifica dígito verificador
```

### supabase.ts
```typescript
hashPassword(password): string
  - SHA256 de contraseña
  - Retorna string hexadecimal

Interfaces:
  - User: Estructura de usuario
  - Receipt: Boleta
  - ServiceOrder: Orden
  - Project: Proyecto
  - CobrosNote: Nota de cobro
```

---

## Flujo de Autenticación

```
┌─────────────────────────────────────────────────────┐
│ 1. Usuario abre aplicación                          │
└────────────────┬────────────────────────────────────┘
                 │
    ┌────────────▼────────────────┐
    │ ¿Token en localStorage?     │
    └────────────┬────────┬───────┘
           SÍ    │        │    NO
    ┌────────────▼─┐  ┌───▼──────────────┐
    │ Ir a Dashboard│  │ Mostrar Login     │
    └──────────────┘  │ (componente Login)│
                      └───┬──────────────┘
                          │
                    ┌─────▼────────────┐
                    │ Usuario ingresa  │
                    │ credenciales     │
                    └─────┬────────────┘
                          │
                    ┌─────▼──────────────────┐
                    │ Hash SHA256 de pwd     │
                    └─────┬──────────────────┘
                          │
                    ┌─────▼──────────────────┐
                    │ ¿Credenciales ok?      │
                    └────┬────────────┬──────┘
                    SÍ   │            │  NO
            ┌────────────▼─┐  ┌──────▼──────┐
            │ Guardar token │  │ Mostrar error
            │ localStorage  │  │ (intenta nueva)
            └────────────┬──┘  └──────────────┘
                         │
            ┌────────────▼─────┐
            │ Ir a Dashboard   │
            │ Actualizar state │
            └──────────────────┘
```

---

## Flujo de Generación DTE

```
┌──────────────────────────────────────┐
│ Usuario abre DTEGenerator            │
└────────────────┬─────────────────────┘
                 │
         ┌───────▼─────────┐
         │ Llenar formulario│
         └───────┬─────────┘
                 │
         ┌───────▼──────────────────┐
         │ Validar RUT receptor     │
         └───────┬────────┬────────┘
            OK   │        │  ERROR
      ┌──────────▼─┐  ┌───▼──────┐
      │Calcular IVA│  │Mostrar err│
      └──────────┬─┘  └───┬───────┘
                 │        │
                 │   ┌────▼─────┐
                 │   │Volver a   │
                 │   │completar  │
                 │   └───────────┘
                 │
         ┌───────▼──────────────┐
         │ generateDTEXML()     │
         │ (Crea XML)           │
         └───────┬──────────────┘
                 │
         ┌───────▼────────────────┐
         │ generateElectronicSeal()│
         │ (Crea timbre)          │
         └───────┬────────────────┘
                 │
         ┌───────▼─────────────────┐
         │ Insertar en dte_documents│
         └───────┬────────┬────────┘
            OK   │        │  ERROR
      ┌──────────▼─┐  ┌───▼───────┐
      │Descargar   │  │Log error  │
      │XML + Timbre│  │(usuario)  │
      └────────────┘  └───────────┘
```

---

## Próximas Mejoras

### Corto Plazo
- [ ] Integración automática con SII
- [ ] Firma digital de DTEs
- [ ] Webhooks de SII
- [ ] Búsqueda y filtrado avanzado

### Mediano Plazo
- [ ] Reportes tributarios
- [ ] Dashboard de estadísticas
- [ ] Exportación a Excel
- [ ] API REST para integraciones
- [ ] Multi-empresa

### Largo Plazo
- [ ] Aplicación móvil
- [ ] OCR para documentos
- [ ] Machine Learning para predicción
- [ ] Contabilidad integrada
- [ ] CRM module

---

## Performance

### Optimizaciones Implementadas
- Lazy loading de componentes
- Caching de datos en Supabase
- Lazy queries con `maybeSingle()`
- Índices en columnas frecuentes

### Monitoreo
- Errores logged a consola
- Validaciones en cliente
- RLS valida en servidor

---

## Testing (A Implementar)

```typescript
// Tests necesarios
- Validación de RUT
- Generación de XML
- Creación de DTEs
- Autenticación
- CRUD de proyectos
- Cálculos de impuestos
```

---

**Versión:** 1.0
**Mantenida por:** BJ SERVICIOS INFORMÁTICOS SpA
**Última actualización:** 2025-03-01
