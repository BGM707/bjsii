# Inicio Rápido

## 1️⃣ Acceso al Sistema

**Usuario:** `Fuko197160551`
**Contraseña:** `Miltonemillonario26$`

Haz clic en **"Ingresar"** y accederás al dashboard.

---

## 2️⃣ Dashboard Principal

Una vez autenticado verás el menú con 7 opciones:

1. **Proyectos** - Gestionar clientes/proyectos
2. **Notas de Cobro** - Emitir cobros
3. **Boleta** - Emitir boletas
4. **Orden Servicio** - Órdenes de reparación
5. **Cotización** - Presupuestos
6. **Documentos** - Archivo de documentos
7. **DTE SII** - Documentos tributarios electrónicos

---

## 3️⃣ Crear Tu Primer Proyecto

```
1. Haz clic en "Proyectos"
2. Haz clic en "Nuevo Proyecto"
3. Completa:
   - Nombre: "Mi Cliente"
   - Cliente: "Cliente SpA"
   - Descripción: "Soporte técnico"
   - Status: "Activo"
4. Haz clic en "Crear Proyecto"
```

---

## 4️⃣ Emitir Tu Primera Nota de Cobro

```
1. Haz clic en "Notas de Cobro"
2. Haz clic en "Nueva Nota"
3. Completa:
   - Cliente: "Cliente SpA"
   - RUT: "12.345.678-9"
   - Teléfono: "+569xxxxxxxx"
   - Servicio: "Soporte Técnico Mensual"
   - Período: Mes actual
   - Monto: 50000
   - Proyecto: "Mi Cliente"
4. Haz clic en "Guardar"
5. En la nota:
   - Haz clic en "Imprimir" para PDF
   - Haz clic en "WSP" para WhatsApp
   - Haz clic en "DTE" para generar DTE
```

---

## 5️⃣ Generar Tu Primer DTE

```
1. En la nota de cobro, haz clic en "DTE"
2. Se abre el generador con datos pre-llenados
3. Verifica:
   - Tipo de documento: "Boleta"
   - Nombre receptor: Correcto
   - RUT: Formato XX.XXX.XXX-X
   - Monto: Correcto
4. Haz clic en "Generar y Descargar"
5. Se descargarán dos archivos:
   - DTE_[folio].xml
   - TIMBRE_[folio].json
```

---

## 6️⃣ Configurar SII (Importante)

```
1. Haz clic en "DTE SII"
2. Ir a pestaña "Configuración SII"
3. Ingresar:
   - Usuario SII
   - Contraseña SII
   - Ruta certificado
   - Contraseña certificado
4. Guardar configuración
```

---

## 7️⃣ Imprimir un Documento

```
1. En cualquier documento, haz clic en "Imprimir"
2. Se abre vista previa
3. Usa Ctrl+P (Windows) o Cmd+P (Mac)
4. Selecciona:
   - "Guardar como PDF" para descargar
   - Tu impresora para imprimir físicamente
```

---

## 8️⃣ Enviar por WhatsApp

```
1. En nota de cobro, haz clic en "WSP"
2. Se abre WhatsApp con mensaje pre-escrito
3. Selecciona el contacto
4. Haz clic en "Enviar"
```

---

## 9️⃣ Ver Historial de DTEs

```
1. Haz clic en "DTE SII"
2. Ir a pestaña "Historial DTEs"
3. Ver todos los DTEs generados
4. Hacer clic en "XML" o "Timbre" para descargar
```

---

## 🔟 Cambiar Credenciales

> ⚠️ Esto requiere acceso a Supabase Dashboard

```
1. Ir a supabase.com
2. Login con tu cuenta
3. Ir a tabla "users"
4. Editar campo "password_hash"
5. Pegar nuevo SHA256 hash de contraseña
```

---

## 📋 Datos Empresa

Todos estos datos se usan automáticamente:

```
Empresa: BJ SERVICIOS INFORMÁTICOS SpA
RUT: 78.332.298-6
Representante: Benjamín René Obed González Medina
Teléfono: +56941228089
Email: contacto@bjservicios.cl
```

Estos están grabados en:
- DTEs y facturas
- Notas de cobro
- Configuración SII

---

## 🔗 Enlaces Útiles

- **SII Chile:** https://www.sii.cl
- **Obtener Certificado:** https://www.sii.cl/ayudadte/
- **Manual SII:** https://www.sii.cl/destacados/dte.html

---

## ❓ Preguntas Frecuentes

**P: ¿Cómo cambio el cliente de una nota?**
R: No se puede editar directamente. Crea una nueva nota o elimina y crea de nuevo.

**P: ¿Dónde se guardan los datos?**
R: En Supabase cloud. Accesible desde cualquier dispositivo.

**P: ¿Puedo descargar los DTEs nuevamente?**
R: Sí. Ve a "DTE SII" > "Historial DTEs" y haz clic en XML o Timbre.

**P: ¿Qué pasa si pierdo mi certificado SII?**
R: Puedes pedir uno nuevo en www.sii.cl. Cuesta aprox. $50.000.

**P: ¿Puedo usar en móvil?**
R: Sí. El sistema es responsive y funciona en tablets.

---

## 🆘 Ayuda y Soporte

**Email:** contacto@bjservicios.cl
**Teléfono:** +56941228089
**Documentación:** Revisa los archivos .md en el proyecto

---

## ✅ Próximos Pasos

1. ✅ Cambiar contraseña por defecto
2. ✅ Crear tus proyectos reales
3. ✅ Obtener certificado SII
4. ✅ Configurar credenciales SII
5. ✅ Probar con ambiente test
6. ✅ Ir a producción

---

**Felicidades!**
Ahora tienes un sistema profesional de facturación y DTEs listo para usar.

Para más detalles, revisa:
- GUIA_DE_USO.md
- ARQUITECTURA.md
- DTE_SII_REFERENCE.md
