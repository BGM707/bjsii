# Configuración Inicial - BJ SERVICIOS INFORMÁTICOS

## 1. Verificar Variables de Entorno

El archivo `.env` debe contener:
```
VITE_SUPABASE_URL=tu_url_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

Estas variables se usan automáticamente para conectar con Supabase.

---

## 2. Credenciales de Acceso

**Usuario por defecto:**
```
Usuario: Fuko197160551
Contraseña: Miltonemillonario26$
```

> ⚠️ Importante: Cambiar estas credenciales después del primer acceso en producción

---

## 3. Datos de la Empresa

**BJ SERVICIOS INFORMÁTICOS SpA**
- RUT: 78.332.298-6
- Representante: Benjamín René Obed González Medina
- Teléfono: +56941228089
- Email: contacto@bjservicios.cl

Estos datos se usan automáticamente en:
- Encabezados de documentos
- DTEs y facturas
- Configuración SII

---

## 4. Configurar SII (Siguiente Fase)

Para registrar DTEs en el Servicio de Impuestos Internos:

1. **Obtener certificado digital:**
   - Ir a [SII](https://www.sii.cl)
   - Obtener certificado .pfx (válida 3 años)
   - Costo: aprox. $50.000 CLP

2. **En la aplicación:**
   - Ir a "DTE SII"
   - Pestaña "Configuración SII"
   - Ingresar usuario SII
   - Ingresar contraseña SII
   - Cargar certificado (.pfx)
   - Contraseña del certificado
   - Seleccionar ambiente (Test primero, luego Producción)

3. **Ambiente de Prueba:**
   - Útil para probar la integración
   - No registra DTEs reales
   - Credenciales pueden variar

---

## 5. Base de Datos

La base de datos Supabase está **completamente configurada** con:

- ✅ Tabla de usuarios
- ✅ Tabla de proyectos
- ✅ Tabla de notas de cobro
- ✅ Tabla de boletas
- ✅ Tabla de órdenes de servicio
- ✅ Tabla de DTEs
- ✅ Tabla de configuración SII
- ✅ RLS habilitado en todas las tablas
- ✅ Políticas de seguridad configuradas

### Primer Usuario Creado:

```sql
INSERT INTO users (username, password_hash, name, email)
VALUES (
  'Fuko197160551',
  '13b5b7b99118318a2c704651faedc38c7fc773d603eab1a29bc261624524850f',
  'Benjamín González',
  'benjamin@bjservicios.cl'
);
```

Hash SHA256 de: `Miltonemillonario26$`

---

## 6. Banco de Datos de Clientes

Para mantener un registro de clientes, puedes crear un proyecto por cada uno:

**Ejemplo - Cliente: GYC MANTENCIÓN SPA**

```
Nombre: GYC MANTENCIÓN SPA
RUT: 77.401.522-1
Descripción: Servicios de mantenimiento y soporte
Status: Activo
Cotizaciones: [cotizacion_enero_2025, cotizacion_febrero_2025]
Documentos: [contrato_mantenimiento, acta_servicio]
```

---

## 7. Configuración de Banco (Datos Bancarios)

En las notas de cobro, se muestra:
- Banco: Mercado Pago (C. Vista)
- Cuenta: 1047904829
- Titular: Benjamín González Medina

Puedes cambiar estos datos en:
1. Ir a "Notas de Cobro"
2. Los campos de banco, cuenta y titular son editables
3. Se actualizan para todas las nuevas notas

> En futuras versiones se podrán configurar múltiples cuentas bancarias

---

## 8. Iniciar Sesión

1. Abre la aplicación
2. Ingresa usuario: `Fuko197160551`
3. Ingresa contraseña: `Miltonemillonario26$`
4. Haz clic en "Ingresar"
5. Se mostrará el dashboard principal

---

## 9. Primer Uso - Pasos Recomendados

### Paso 1: Crear un Proyecto de Prueba
```
1. Ir a "Proyectos"
2. Haz clic en "Nuevo Proyecto"
3. Nombre: "Proyecto Prueba"
4. Cliente: "Cliente Prueba SpA"
5. Status: "Activo"
6. Guardar
```

### Paso 2: Crear una Nota de Cobro
```
1. Ir a "Notas de Cobro"
2. Haz clic en "Nueva Nota"
3. Cliente: "Cliente Prueba SpA"
4. RUT: "12.345.678-9" (de prueba)
5. Servicio: "Soporte Técnico"
6. Período: Mes actual
7. Monto: 50.000
8. Guardar
```

### Paso 3: Generar un DTE
```
1. En la nota creada, haz clic en "DTE"
2. Completa los datos del receptor
3. Haz clic en "Generar y Descargar"
4. Se descargarán XML y Timbre
```

### Paso 4: Imprimir la Nota
```
1. En la nota, haz clic en "Imprimir"
2. Se abrirá vista previa
3. Usa Ctrl+P para imprimir o guardar como PDF
```

---

## 10. Cambiar Credenciales

Para cambiar la contraseña (cuando lo requieras):

1. En la BD Supabase, tabla `users`
2. Actualizar campo `password_hash`
3. Hash SHA256 de la nueva contraseña
4. Guardar cambios

**Ejemplo con Node.js:**
```javascript
const crypto = require('crypto');
const newPassword = 'MiNuevaContraseña123$';
const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
console.log(hash); // Copiar este valor a password_hash
```

---

## 11. Backup de Datos

Los datos están en Supabase, que realiza:
- ✅ Backups diarios automáticos
- ✅ Redundancia geográfica
- ✅ Recuperación ante desastres

Además, puedes:
1. Ir a Supabase Dashboard
2. Exportar tabla completa
3. Descargar como CSV o SQL

---

## 12. Acceso Administrativo

Para acceso a Supabase Dashboard:
1. Ir a [supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto
4. Accede a tablas, storage, funciones, etc.

---

## 13. Contacto y Soporte

**Empresa:** BJ SERVICIOS INFORMÁTICOS SpA
- Email: contacto@bjservicios.cl
- Teléfono: +56941228089
- Sitio: www.bjservicios.cl

**Para consultas técnicas:**
- Revisar documentación en el proyecto
- Contactar al equipo de desarrollo
- Crear issues en el repositorio

---

## 14. Próximos Pasos

Después de configuración inicial:

- [ ] Cambiar credenciales por defecto
- [ ] Agregar certificado digital SII
- [ ] Crear proyectos reales
- [ ] Capacitar al equipo
- [ ] Realizar pruebas con DTEs test
- [ ] Ir a producción con SII

---

## Checklist de Verificación

- [ ] Supabase conectado y funcionando
- [ ] Base de datos con todas las tablas
- [ ] Usuario creado en tabla `users`
- [ ] Login funciona correctamente
- [ ] Puedo crear proyectos
- [ ] Puedo crear notas de cobro
- [ ] Puedo generar DTEs
- [ ] Impresión de documentos funciona
- [ ] WhatsApp se abre correctamente
- [ ] Descarga de archivos funciona

---

**Versión:** 1.0
**Fecha:** 2025-03-01
**Maintainer:** BJ SERVICIOS INFORMÁTICOS SpA
