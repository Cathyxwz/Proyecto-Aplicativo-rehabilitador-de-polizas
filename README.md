# 🛡️ Sistema de Gestión y Aprobación de Rehabilitación de Pólizas

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![AppSheet](https://img.shields.io/badge/AppSheet-1A73E8?style=for-the-badge&logo=google&logoColor=white)](https://about.appsheet.com/)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googleworkspace&logoColor=white)](https://sheets.google.com)
[![JavaScript](https://img.shields.io/badge/Vanilla%20JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

Un sistema web centralizado, reactivo e interactivo diseñado para la radicación, validación en tiempo real y gestión administrativa de solicitudes de rehabilitación de pólizas. Este software conecta una interfaz web ligera con la base de datos subyacente en **Google Sheets / AppSheet**, garantizando auditoría total y control de acceso basado en roles (RBAC).

---

## 🚀 Flujo de Trabajo y Funcionalidades

1. **Captura y Validación en Tiempo Real**:
   - El usuario *Solicitante* radica solicitudes ingresando los datos correspondientes (*Ramo, Producto, Fechas de Recaudo/Anulación, Identificación del Cliente, Canal e Inconsistencia*).
   - En segundo plano, la interfaz ejecuta consultas al servidor mediante eventos `blur` sobre la póliza para alertar en tiempo real cuántas rehabilitaciones ha tenido el cliente en los últimos **365 días**.
2. **Persistencia e Idempotencia Concurrente**:
   - Cada solicitud genera un ID único e irrepetible (formato `REH-XXXXXX`).
   - Se utiliza **`LockService`** para evitar condiciones de carrera (*Race Conditions*) o sobreescritura cuando múltiples usuarios radican al mismo tiempo.
3. **Bandeja Interactiva de Pendientes**:
   - Los registros entran con estado inicial `EN PROCESO` y son enrutados automáticamente a la bandeja de trabajo de los *Aprobadores*.
4. **Dictamen y Auditoría Integrada**:
   - El *Aprobador* gestiona las solicitudes permitiendo dictaminar estados finales (`Rehabilitada`, `Rechazada` o `Tramitar con Operaciones`), adjuntando observaciones detalladas.
   - Se utiliza **`CacheService`** para acelerar el tiempo de respuesta y la actualización visual de las bandejas.
5. **Historial Consolidado**:
   - Registro permanente del usuario aprobador, fecha de proceso y traza completa de cambios para fines de auditoría interna.

---

## 🗄️ Esquema de Base de Datos (Google Sheets)

La pestaña **`Solicitudes`** requiere el siguiente orden de columnas:

| Col. | Campo | Descripción |
| :-: | :--- | :--- |
| **A** | `ID Solicitud` | Identificador único (`REH-XXXXXX`) |
| **B** | `Timestamp` | Fecha y hora de creación de la solicitud |
| **C** | `Ramo` | Ramo asegurador |
| **D** | `Producto` | Nombre del producto |
| **E** | `Póliza` | Número de la póliza afectada |
| **F** | `Cédula Cliente` | Identificación del tomador |
| **G** | `Fecha Recaudo` | Fecha del pago registrado |
| **H** | `Fecha Anulación` | Fecha de cancelación de la póliza |
| **I** | `Canal` | Canal comercial o de atención |
| **J** | `Inconsistencia` | Detalle o motivo de la anulación |
| **K** | `Estado` | `EN PROCESO`, `Rehabilitada`, `Rechazada`, etc. |
| **L** | `Usuario Solicitante` | Correo del creador del registro |
| **M** | `Observaciones` | Justificación ingresada por el Aprobador |
| **N** | `Fecha Procesado` | Timestamp de la aprobación/rechazo |
| **O** | `Usuario Procesador` | Correo del Aprobador |

---

## ⚙️ Configuración y Despliegue

### 1. Preparar Google Sheets
1. Crea un nuevo libro en **Google Sheets**.
2. Renombra la pestaña principal como `Solicitudes` y configura los encabezados definidos en el [Esquema de Base de Datos](#️-esquema-de-base-de-datos-google-sheets).

### 2. Configurar el Proyecto en Apps Script
1. En Google Sheets, ve a **Extensiones > Apps Script**.
2. Crea los siguientes archivos y copia sus respectivos códigos:
   - `Código.gs`
   - `Constantes.gs`
   - `APP.html`
   - `Estilos.html`
3. Si utilizas un archivo `Constantes.gs` externo, asegúrate de configurar el `SPREADSHEET_ID` y nombres de pestañas según tu entorno.

### 3. Publicar la Web App
1. En la esquina superior derecha, haz clic en **Implementar > Nueva implementación**.
2. Selecciona **Aplicación Web**.
3. Configura las opciones:
   - **Ejecutar como**: `Tu usuario (Owner)`
   - **Quién tiene acceso**: `Usuarios de la organización / Cualquiera con cuenta de Google`
4. Haz clic en **Implementar** y autoriza los permisos requeridos.
5. Copia la **URL de la Web App** generada.

---

## 🔒 Control de Concurrencia y Seguridad (RBAC)

* **Prevención de colisiones**: `LockService` aplica un bloqueo exclusivo de hasta 10 segundos al momento de escribir o actualizar en la hoja, encolando peticiones simultáneas.
* **Caché de alto rendimiento**: `CacheService` optimiza las peticiones repetitivas reduciendo los tiempos de llamada a las APIs de Google Sheets.
* **Roles del Sistema**:
  * **Solicitante**: Radicación de peticiones y consulta de historial propio.
  * **Aprobador / Admin**: Acceso a bandeja de pendientes, facultad de resolución y vista del historial general consolidado.
