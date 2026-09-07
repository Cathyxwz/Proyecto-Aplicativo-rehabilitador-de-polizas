🛡️ Sistema de Gestión y Aprobación de Rehabilitación de Pólizas

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![AppSheet](https://img.shields.io/badge/AppSheet-1A73E8?style=for-the-badge&logo=google&logoColor=white)](https://about.appsheet.com/)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googleworkspace&logoColor=white)](https://sheets.google.com)
[![JavaScript](https://img.shields.io/badge/Vanilla%20JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

Un sistema web centralizado, reactivo e interactivo diseñado para la radicación, validación en tiempo real y gestión administrativa de solicitudes de rehabilitación de pólizas. El sistema conecta una interfaz web ligera con Google Sheets / AppSheet, proporcionando trazabilidad, auditoría y control de acceso basado en roles (RBAC).

🚀 Flujo de Trabajo y Funcionalidades

Captura y Validación en Tiempo Real

El usuario Solicitante radica solicitudes con información de ramo, producto, póliza, fechas, cliente, canal e inconsistencia.
Se realizan validaciones en segundo plano para consultar rehabilitaciones anteriores del cliente durante los últimos 365 días.

Persistencia e Idempotencia Concurrente

Cada solicitud genera un ID único con formato REH-XXXXXX.
LockService evita condiciones de carrera y sobreescrituras cuando existen solicitudes simultáneas.

Bandeja Interactiva de Pendientes

Las solicitudes ingresan con estado EN PROCESO y son dirigidas automáticamente a la bandeja de los Aprobadores.

Dictamen y Auditoría

El Aprobador puede resolver las solicitudes como Rehabilitada, Rechazada o Tramitar con Operaciones, incluyendo observaciones.
CacheService permite optimizar las consultas y actualización de las bandejas.

Historial Consolidado

Se almacena el usuario procesador, fecha de procesamiento y trazabilidad de las solicitudes.
🗄️ Esquema de Base de Datos — Google Sheets

La pestaña Solicitudes requiere el siguiente orden de columnas:

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
K	Estado	Estado de la solicitud
L	Usuario Solicitante	Correo del creador
M	Observaciones	Comentarios del Aprobador
N	Fecha Procesado	Fecha de procesamiento
O	Usuario Procesador	Correo del Aprobador

⚙️ Instalación y Despliegue
1. 📊 Preparar Google Sheets

Puedes utilizar la plantilla oficial del proyecto:

👉 Abrir plantilla de Google Sheets

En Google Sheets selecciona:

Archivo → Hacer una copia

Verifica que la pestaña Solicitudes y sus columnas coincidan con el esquema anterior.

2. 💻 Configurar Apps Script

Desde la copia de Google Sheets:

Extensiones → Apps Script

Crea o incorpora los archivos del proyecto:

Código.gs
Constantes.gs
APP.html
Estilos.html
Index.html


En Constantes.gs, configura el ID de tu hoja:

const SPREADSHEET_ID = 'TU_ID_DE_GOOGLE_SHEETS';


El ID corresponde al valor que aparece en la URL de tu Google Sheet.

⚠️ Utiliza el ID de tu propia copia y no el de la plantilla original.

3. 👥 Configurar usuarios y roles

Si el proyecto utiliza una pestaña Usuarios, registra allí los usuarios autorizados y sus roles.

Ejemplo:

ID	Usuario	Correo	Rol	Estado	Canales
USR-001	Administrador	usuario@empresa.com	Admin	Activo	Todos
USR-002	Solicitante	solicitante@empresa.com	Solicitante	Activo	Canal 1

Los roles principales son:

Solicitante: radicación y consulta de sus solicitudes.
Aprobador/Admin: gestión de pendientes, resolución y consulta del historial.

4. 🌐 Publicar como Web App
   
En Apps Script:

Implementar → Nueva implementación → Aplicación web

Configura:

Ejecutar como: Yo / Owner
Quién tiene acceso: usuarios de la organización o cualquier usuario con cuenta de Google.

Luego:

Haz clic en Implementar.
Autoriza los permisos solicitados.
Copia la URL de la Web App.
Comparte la URL con los usuarios autorizados.
5. 📱 AppSheet — Opcional

Para utilizar una interfaz móvil:

Google Sheets → Extensiones → AppSheet → Crear una aplicación

AppSheet puede utilizar Solicitudes como fuente principal. Si el proyecto utiliza tablas adicionales como Productos y Usuarios, agrégalas desde:

Data → Tables

🔒 Control de Concurrencia y Seguridad (RBAC)
Prevención de colisiones: LockService evita escrituras simultáneas sobre los mismos recursos.
Caché: CacheService reduce consultas repetitivas y mejora los tiempos de respuesta.
RBAC: los permisos se determinan según el rol y estado del usuario.
Trazabilidad: cada solicitud conserva información del solicitante, procesador, estado y fechas.
Acceso: la configuración de la Web App debe ajustarse a las políticas de seguridad de la organización.
📁 Estructura del Proyecto
📦 sistema-rehabilitacion
├── Código.gs
├── Globales.gs
├── Index.html
├── APP.html
└── Estilos.html

🎯 Resultado

Una vez completados los pasos anteriores, la aplicación estará disponible como Web App de Google Apps Script, conectada a la instancia de Google Sheets configurada y lista para realizar pruebas de radicación, aprobación y seguimiento de solicitudes.

💡 Nota: Para ambientes productivos se recomienda revisar los permisos de acceso, políticas de seguridad, estructura de usuarios y mecanismos de respaldo antes del despliegue definitivo.
