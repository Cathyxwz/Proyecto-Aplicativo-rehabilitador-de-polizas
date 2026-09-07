🛡️ Sistema de Gestión y Aprobación de Rehabilitación de Pólizas
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![AppSheet](https://img.shields.io/badge/AppSheet-1A73E8?style=for-the-badge&logo=google&logoColor=white)](https://about.appsheet.com/)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googleworkspace&logoColor=white)](https://sheets.google.com)
[![JavaScript](https://img.shields.io/badge/Vanilla%20JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

Sistema web centralizado, reactivo e interactivo para la radicación, validación y gestión administrativa de solicitudes de rehabilitación de pólizas.
La solución conecta una interfaz web ligera con Google Sheets / AppSheet, proporcionando trazabilidad, auditoría y control de acceso basado en roles (RBAC).

🚀 Flujo de Trabajo y Funcionalidades
📝 1. Captura y Validación en Tiempo Real

El usuario Solicitante radica solicitudes ingresando información como:

Ramo
Producto
Póliza
Fechas de recaudo y anulación
Identificación del cliente
Canal
Inconsistencia

La aplicación realiza validaciones en segundo plano para consultar rehabilitaciones anteriores del cliente durante los últimos 365 días.

🔐 2. Persistencia e Idempotencia Concurrente

Cada solicitud genera automáticamente un identificador único con el formato:

REH-XXXXXX


Para evitar conflictos cuando varios usuarios realizan operaciones simultáneamente, se utiliza:

LockService


Esto permite prevenir condiciones de carrera y sobreescrituras durante las operaciones de escritura.

📥 3. Bandeja Interactiva de Pendientes

Las solicitudes nuevas ingresan automáticamente con el estado:

EN PROCESO


Posteriormente son dirigidas a la bandeja de trabajo correspondiente para que los usuarios con rol de Aprobador puedan gestionarlas.

✅ 4. Dictamen y Auditoría

El Aprobador puede gestionar cada solicitud y establecer diferentes estados finales:

Rehabilitada
Rechazada
Tramitar con Operaciones

Cada resolución puede incluir observaciones y queda registrada para mantener la trazabilidad del proceso.

Para optimizar las consultas y la actualización de las bandejas se utiliza:

CacheService

📚 5. Historial Consolidado

El sistema conserva información relevante de cada operación, incluyendo:

Usuario solicitante
Usuario procesador
Estado de la solicitud
Fecha de creación
Fecha de procesamiento
Observaciones
Trazabilidad del proceso
🗄️ Esquema de Base de Datos

La aplicación utiliza Google Sheets como fuente de datos principal.

La pestaña debe llamarse:

Solicitudes


Y debe mantener exactamente el siguiente orden de columnas:

Col.	Campo	Descripción
A	ID Solicitud	Identificador único (REH-XXXXXX)
B	Timestamp	Fecha y hora de creación
C	Ramo	Ramo asegurador
D	Producto	Nombre del producto
E	Póliza	Número de póliza
F	Cédula Cliente	Identificación del cliente
G	Fecha Recaudo	Fecha del pago
H	Fecha Anulación	Fecha de cancelación
I	Canal	Canal comercial o de atención
J	Inconsistencia	Motivo o detalle de la anulación
K	Estado	Estado actual de la solicitud
L	Usuario Solicitante	Correo del creador
M	Observaciones	Comentarios del Aprobador
N	Fecha Procesado	Fecha de procesamiento
O	Usuario Procesador	Correo del Aprobador

⚠️ Importante: No cambies los nombres ni el orden de las columnas, ya que el código depende de esta estructura.

⚙️ Instalación y Despliegue
1️⃣ 📊 Preparar Google Sheets

Puedes utilizar la plantilla oficial del proyecto:

👉 Abrir plantilla de Google Sheets

Una vez abierta:

Ve a Archivo → Hacer una copia.
Guarda la copia en tu Google Drive.
Verifica que la pestaña Solicitudes tenga la estructura indicada anteriormente.
2️⃣ 💻 Configurar Google Apps Script

Desde la copia de Google Sheets:

Extensiones → Apps Script

Agrega los archivos del proyecto:

Código.gs
Globales.gs
Index.html
APP.html
Estilos.html


En Globales.gs, configura el ID de tu hoja de cálculo:

const SPREADSHEET_ID = 'TU_ID_DE_GOOGLE_SHEETS';


El ID corresponde al identificador que aparece en la URL de tu Google Sheet.

Por ejemplo:

https://docs.google.com/spreadsheets/d/ABC123XYZ456/edit


El ID sería:

ABC123XYZ456


⚠️ Importante: utiliza el ID de tu propia copia de Google Sheets y no el de la plantilla original.

3️⃣ 👥 Configurar Usuarios y Roles

Si el proyecto utiliza una pestaña Usuarios, registra allí los usuarios autorizados.

Ejemplo:

ID	Usuario	Correo	Rol	Estado	Canales
USR-001	Administrador	usuario@empresa.com	Admin	Activo	Todos
USR-002	Solicitante	solicitante@empresa.com	Solicitante	Activo	Canal 1
Roles principales

Solicitante

Radicación de solicitudes.
Consulta de sus propias solicitudes.

Aprobador / Admin

Acceso a la bandeja de pendientes.
Gestión y resolución de solicitudes.
Consulta del historial general.

4️⃣ 🌐 Publicar como Web App

En Google Apps Script selecciona:

Implementar → Nueva implementación → Aplicación web

Configura:

Parámetro	Valor
Ejecutar como	Yo / Owner
Quién tiene acceso	Usuarios de la organización / Cualquier usuario con cuenta de Google

Después:

Haz clic en Implementar.
Autoriza los permisos solicitados por Google.
Copia la URL de la Web App.
Comparte la URL con los usuarios autorizados.
5️⃣ 📱 AppSheet — Opcional

Si deseas disponer de una aplicación móvil, puedes utilizar AppSheet.

Desde Google Sheets:

Extensiones → AppSheet → Crear una aplicación

Utiliza Solicitudes como fuente principal de datos.

Si el proyecto utiliza tablas adicionales como:

Productos
Usuarios


pueden agregarse desde:

Data → Tables

🔒 Seguridad y Control de Concurrencia

El sistema incorpora diferentes mecanismos para mantener la integridad y seguridad de la información.

Mecanismo	Función
🔐 LockService	Previene escrituras simultáneas y condiciones de carrera
⚡ CacheService	Optimiza consultas repetitivas y tiempos de respuesta
👥 RBAC	Controla los permisos según el rol del usuario
📋 Trazabilidad	Registra usuarios, estados y fechas de procesamiento
🔑 Control de acceso	Limita el acceso según la configuración de la Web App

🔒 Para ambientes productivos se recomienda adaptar los permisos y controles de acceso a las políticas de seguridad de la organización.

📁 Estructura del Proyecto
📦 sistema-rehabilitacion
│
├── 📄 Código.gs
├── 📄 Globales.gs
├── 📄 Index.html
├── 📄 APP.html
└── 📄 Estilos.html

🎯 Resultado

Una vez completados los pasos anteriores, la aplicación estará disponible como Web App de Google Apps Script, conectada a la instancia de Google Sheets configurada y lista para realizar pruebas de:

📝 Radicación
🔍 Validación
📥 Gestión de pendientes
✅ Aprobación
❌ Rechazo
🔄 Trámite con Operaciones
📚 Consulta de historial
🔐 Control de acceso
💡 Recomendación

Antes de utilizar el sistema en un ambiente productivo, se recomienda revisar:

Permisos de Google Sheets y Apps Script.
Usuarios y roles autorizados.
Configuración de acceso de la Web App.
Políticas de seguridad de la organización.
Mecanismos de respaldo de la información.
Validaciones y reglas específicas del proceso de rehabilitación.
