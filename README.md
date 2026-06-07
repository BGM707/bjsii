# BJ SERVICIOS INFORMÁTICOS - Sistema de Gestión y Facturación

Sistema profesional de gestión empresarial, facturación y emisión de Documentos Tributarios Electrónicos (DTEs) para BJ SERVICIOS INFORMÁTICOS SpA, con integración con el Servicio de Impuestos Internos (SII) de Chile.

## 🎯 Características Principales

### 1. **Gestión de Proyectos**
- Crear y organizar proyectos por cliente
- Asociar cotizaciones y documentos
- Carrusel de visualización interactivo
- Estados: Activo, Pausado, Completado

### 2. **Notas de Cobro**
- Emitir notas de cobro profesionales
- Impresión en PDF de alta calidad
- Envío por WhatsApp automático
- Seguimiento de estado (Pendiente/Pagado)
- Watermark dinámico según estado

### 3. **DTEs - Timbre Electrónico SII**
- Generación de Documentos Tributarios Electrónicos
- Soporte para: Boletas, Facturas, Notas de Crédito, Notas de Débito
- Validación automática de RUTs
- Cálculo de IVA (19%) automático
- Generación de XML conforme a estándares SII
- Timbre electrónico con hash de seguridad
- Descarga automática de archivos

### 4. **Configuración SII**
- Almacenamiento seguro de credenciales
- Encriptación SHA256 de contraseñas
- Soporte para certificado digital
- Selección de ambiente (Producción/Test)

### 5. **Boletas y Facturas**
- Creación de boletas de venta
- Múltiples items por documento
- Cálculo automático de totales
- Vinculación a proyectos

### 6. **Órdenes de Servicio**
- Registro de equipos a reparar/instalar
- Descripción técnica detallada
- Seguimiento de estado
- Costo estimado

### 7. **Cotizaciones**
- Emisión de cotizaciones profesionales
- Desglose de items y precios
- Vinculación a proyectos
- Exportación a cliente

### 8. **Autenticación Segura**
- Login con credenciales hash SHA256
- Sesión persistente en localStorage
- Row Level Security en todas las tablas
- Acceso restringido a usuarios autenticados

---

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet
- Cuenta Supabase configurada

---

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd proyecto
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env`:
```
VITE_SUPABASE_URL=tu_url_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 4. Iniciar desarrollo
```bash
npm run dev
```

### 5. Build para producción
```bash
npm run build
```

---

## 👤 Credenciales de Acceso

```
Usuario: Fuko197160551
Contraseña: Miltonemillonario26$
```

> ⚠️ Cambiar en producción

---

## 📊 Tecnologías

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Estado:** React Hooks
- **Backend:** Supabase PostgreSQL
- **Autenticación:** SHA256 Hash
- **Documentos:** XML/JSON para DTEs
- **Build:** Vite
- **Iconos:** Lucide React
- **Crypto:** crypto-js

---

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
├── lib/                 # Utilidades y configuración
├── App.tsx             # Componente principal
├── index.css           # Estilos globales
└── main.tsx            # Punto de entrada

supabase/
└── migrations/         # Scripts de base de datos
```

---

## 🗄️ Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema |
| `projects` | Proyectos por cliente |
| `cobros_notes` | Notas de cobro |
| `receipts` | Boletas |
| `service_orders` | Órdenes de servicio |
| `dte_documents` | Documentos tributarios electrónicos |
| `sii_configurations` | Configuración SII |

Todas las tablas tienen:
- ✅ RLS habilitado
- ✅ Políticas de seguridad
- ✅ Timestamps de auditoría

---

## 🔐 Seguridad

- **Autenticación:** SHA256
- **Encriptación:** Contraseñas hasheadas
- **RLS:** Row Level Security en BD
- **HTTPS:** Conexión segura
- **Validaciones:** Cliente y servidor

---

## 📖 Documentación

- **[GUIA_DE_USO.md](./GUIA_DE_USO.md)** - Cómo usar el sistema
- **[ARQUITECTURA.md](./ARQUITECTURA.md)** - Arquitectura técnica
- **[CONFIGURACION_INICIAL.md](./CONFIGURACION_INICIAL.md)** - Setup inicial
- **[DTE_SII_REFERENCE.md](./DTE_SII_REFERENCE.md)** - Referencia DTEs/SII

---

## 🎮 Uso Básico

### 1. Iniciar Sesión
```
Usuario: Fuko197160551
Contraseña: Miltonemillonario26$
```

### 2. Crear un Proyecto
```
Proyectos > Nuevo Proyecto > Completar datos > Guardar
```

### 3. Emitir una Nota de Cobro
```
Notas de Cobro > Nueva Nota > Completar datos > Guardar
```

### 4. Generar DTE
```
DTE SII > Generar DTE > Completar datos > Generar y Descargar
```

### 5. Imprimir Documento
```
Nota/Boleta > Imprimir > Ctrl+P > Guardar como PDF
```

---

## 🔄 Flujos Principales

### Crear Nota de Cobro con DTE
```
1. Crear nota de cobro
2. Haz clic en "DTE"
3. Se abre DTEGenerator
4. Completa datos del receptor
5. Genera XML y Timbre
6. Descargan archivos automáticamente
```

### Registrar en SII
```
1. Configurar credenciales SII
2. Generar DTEs
3. (Próximo) Registrar automáticamente en SII
4. (Próximo) Recibir confirmación de SII
```

---

## 📱 Funcionalidades Avanzadas

### Impresión PDF
- Notas de cobro con watermark
- Boletas profesionales
- Cotizaciones formales

### WhatsApp Integration
- Envío automático de mensajes
- Envío de notas de cobro
- Links de seguimiento

### Descarga de Archivos
- DTEs en XML
- Timbres en JSON
- Reportes en PDF

### Búsqueda y Filtrado
- Búsqueda por cliente
- Filtrado por estado
- Orden cronológico

---

## 🔜 Próximas Mejoras

### Corto Plazo
- [ ] Integración automática con SII
- [ ] Firma digital de DTEs
- [ ] Webhooks de SII
- [ ] Búsqueda avanzada

### Mediano Plazo
- [ ] Reportes tributarios
- [ ] Dashboard de estadísticas
- [ ] API REST
- [ ] Multi-empresa

### Largo Plazo
- [ ] App móvil
- [ ] OCR para documentos
- [ ] CRM integrado
- [ ] Contabilidad

---

## 🐛 Reportar Problemas

Para reportar bugs o sugerencias:
- Email: contacto@bjservicios.cl
- Teléfono: +56941228089

---

## 📄 Licencia

Propietario de BJ SERVICIOS INFORMÁTICOS SpA
RUT: 78.332.298-6

---

## 👨‍💻 Desarrollo

### Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build producción
npm run build

# Preview de build
npm run preview

# Type checking
npm run typecheck

# Lint
npm run lint
```

---

## 📞 Contacto

**BJ SERVICIOS INFORMÁTICOS SpA**
- Representante: Benjamín René Obed González Medina
- RUT: 78.332.298-6
- Email: contacto@bjservicios.cl
- Teléfono: +56941228089
- Sitio web: www.bjservicios.cl

---

## 🙏 Créditos

Desarrollado con React, Typescript, Tailwind CSS y Supabase.
Integración con Sistema de Impuestos Internos (SII) de Chile.

---

**Versión:** 1.0
**Estado:** Producción
**Última actualización:** 2025-03-01
