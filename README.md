# 🛡️ Sistema de Gestión y Aprobación de Rehabilitación de Pólizas

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/apps-script)

[![AppSheet](https://img.shields.io/badge/AppSheet-1A73E8?style=for-the-badge&logo=google&logoColor=white)](https://about.appsheet.com/)

[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googleworkspace&logoColor=white)](https://sheets.google.com)

[![JavaScript](https://img.shields.io/badge/Vanilla%20JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

Sistema web para la **gestión, validación, aprobación y seguimiento de solicitudes de rehabilitación de pólizas**, desarrollado sobre **Google Apps Script, Google Sheets y JavaScript Vanilla**.

El sistema permite centralizar el proceso de **radicación y aprobación**, controlar el acceso de los usuarios mediante **roles**, mantener la **trazabilidad de cada solicitud** y prevenir conflictos de concurrencia durante operaciones simultáneas.

---

## 📑 Índice

- 🚀 [Funcionalidades](#-funcionalidades)
- 👥 [Usuarios y Roles](#-usuarios-y-roles)
- 🗄️ [Estructura de Datos](#️-estructura-de-datos)
- 🔐 [Seguridad y Control de Acceso](#-seguridad-y-control-de-acceso)
- ⚙️ [Instalación y Configuración](#️-instalación-y-configuración)
- 🌐 [Publicación como Web App](#-publicación-como-web-app)
- 📱 [AppSheet](#-appsheet)
- 📁 [Estructura del Proyecto](#-estructura-del-proyecto)
- 🎯 [Resultado](#-resultado)
- 💡 [Recomendaciones para Producción](#-recomendaciones-para-producción)
- 🛠️ [Tecnologías Utilizadas](#️-tecnologías-utilizadas)
- 📌 [Estado del Proyecto](#-estado-del-proyecto)

---

## 🚀 Funcionalidades

### 📋 Captura y Validación en Tiempo Real

El usuario **Solicitante** puede radicar una solicitud proporcionando la información necesaria para gestionar la rehabilitación de una póliza.

La aplicación permite registrar:

- **Ramo**
- **Producto**
- **Número de póliza**
- **Cédula del cliente**
- **Fecha de recaudo**
- **Fecha de anulación**
- **Canal**
- **Inconsistencia o motivo de la solicitud**

Durante la radicación se realizan validaciones en segundo plano, incluyendo la consulta de **rehabilitaciones anteriores del cliente durante los últimos 365 días**.

---

### 🆔 Generación de Identificadores

Cada solicitud recibe un identificador único con el siguiente formato:

```text
REH-XXXXXX
```

El identificador permite realizar el seguimiento individual de cada solicitud durante todo su ciclo de vida.

---

### 🔒 Persistencia e Idempotencia Concurrente

El sistema utiliza **LockService** para controlar operaciones simultáneas y evitar condiciones de carrera.

Esto permite prevenir:

- IDs duplicados.
- Sobreescritura de registros.
- Actualizaciones simultáneas inconsistentes.
- Conflictos durante la radicación de solicitudes.

---

### 📥 Bandeja de Solicitudes Pendientes

Las solicitudes nuevas son registradas inicialmente con el estado:

```text
EN PROCESO
```

Posteriormente quedan disponibles en la bandeja de gestión de los usuarios autorizados como **Aprobador**.

---

### ✅ Dictamen y Resolución

El **Aprobador** puede resolver una solicitud mediante alguno de los siguientes estados:

- **REHABILITADA**
- **RECHAZADA**
- **TRAMITAR CON OPERACIONES**

Cada resolución puede incluir **observaciones**, permitiendo documentar el motivo o las condiciones asociadas al dictamen.

---

### 📝 Historial y Auditoría

El sistema conserva la información necesaria para garantizar la trazabilidad de cada solicitud.

Se registra:

- **Usuario Solicitante**
- **Fecha de creación**
- **Estado**
- **Usuario Procesador**
- **Fecha de procesamiento**
- **Dictamen**
- **Observaciones**
- **ID de Solicitud**

---

## 👥 Usuarios y Roles

El sistema implementa un esquema de **Control de Acceso Basado en Roles (RBAC)**.

Actualmente se manejan **dos roles principales**:

### 👤 Solicitante

El usuario **Solicitante** puede:

- ✅ Radicar solicitudes.
- ✅ Consultar sus solicitudes.
- ✅ Realizar seguimiento al estado de sus solicitudes.
- ✅ Consultar la información relacionada con sus radicaciones.

---

### 👨‍💼 Aprobador

El usuario **Aprobador** puede:

- ✅ Consultar solicitudes pendientes.
- ✅ Gestionar la bandeja de aprobación.
- ✅ Revisar la información de las solicitudes.
- ✅ Resolver solicitudes.
- ✅ Registrar observaciones.
- ✅ Consultar el historial.

---

### 📊 Tabla de Usuarios

La configuración de usuarios puede manejarse mediante una tabla con la siguiente estructura:

| ID | Usuario | Correo | Rol | Estado | Canales |
|---|---|---|---|---|---|
| **USR-001** | Aprobador | aprobador@empresa.com | **Aprobador** | **Activo** | Todos |
| **USR-002** | Solicitante | solicitante@empresa.com | **Solicitante** | **Activo** | Canal 1 |

### 🔹 Estado del Usuario

El campo **Estado** permite habilitar o deshabilitar usuarios.

Valores permitidos:

```text
Activo
Inactivo
```

Los usuarios con estado **Inactivo** no deben tener acceso operativo al sistema.

### 🔹 Canales

El campo **Canales** permite controlar los canales comerciales o de atención a los que puede acceder cada usuario.

Ejemplos:

```text
Todos
Canal 1
Canal 2
Canal 1, Canal 2
```

---

## 🗄️ Estructura de Datos

La información principal del sistema se almacena en **Google Sheets**.

La pestaña principal utilizada por la aplicación es:

```text
Solicitudes
```

### 📊 Tabla Solicitudes

La pestaña **Solicitudes** debe mantener exactamente el siguiente orden de columnas:

| Col. | Campo | Descripción |
|:---:|---|---|
| **A** | **ID Solicitud** | Identificador único `REH-XXXXXX` |
| **B** | **Timestamp** | Fecha y hora de creación |
| **C** | **Ramo** | Ramo asegurador |
| **D** | **Producto** | Nombre del producto |
| **E** | **Póliza** | Número de póliza |
| **F** | **Cédula Cliente** | Identificación del cliente |
| **G** | **Fecha Recaudo** | Fecha del pago |
| **H** | **Fecha Anulación** | Fecha de cancelación |
| **I** | **Canal** | Canal comercial o de atención |
| **J** | **Inconsistencia** | Motivo o detalle de la anulación |
| **K** | **Estado** | Estado de la solicitud |
| **L** | **Usuario Solicitante** | Correo del creador |
| **M** | **Observaciones** | Comentarios del Aprobador |
| **N** | **Fecha Procesado** | Fecha de procesamiento |
| **O** | **Usuario Procesador** | Correo del Aprobador |

---

### 📌 Estados de las Solicitudes

Los principales estados utilizados por el sistema son:

| Estado | Descripción |
|---|---|
| 🟡 **EN PROCESO** | Solicitud pendiente de resolución |
| 🟢 **REHABILITADA** | Solicitud aprobada |
| 🔴 **RECHAZADA** | Solicitud no aprobada |
| 🔵 **TRAMITAR CON OPERACIONES** | Solicitud que requiere gestión adicional de Operaciones |

---

## 🔐 Seguridad y Control de Acceso

### 🔑 RBAC — Role-Based Access Control

Los permisos de la aplicación se determinan según:

- **Rol del usuario**
- **Estado del usuario**
- **Canales autorizados**

Los roles disponibles actualmente son:

- **Solicitante**
- **Aprobador**

---

### 🔒 Prevención de Colisiones

**LockService** controla el acceso concurrente a operaciones críticas.

Su utilización permite prevenir:

- IDs duplicados.
- Escrituras simultáneas.
- Sobreescritura de información.
- Condiciones de carrera.
- Inconsistencias durante operaciones concurrentes.

---

### ⚡ CacheService

El sistema utiliza **CacheService** para mejorar los tiempos de respuesta de las consultas frecuentes.

Puede utilizarse para almacenar temporalmente:

- Bandejas de pendientes.
- Información de usuarios.
- Configuraciones.
- Consultas frecuentes.
- Información temporal del sistema.

---

### 📝 Trazabilidad

Cada solicitud conserva información relacionada con:

- **Usuario Solicitante**
- **Fecha de creación**
- **Estado**
- **Usuario Procesador**
- **Fecha de procesamiento**
- **Dictamen**
- **Observaciones**

Esto permite mantener un historial completo de las operaciones realizadas sobre cada solicitud.

---

### 🌐 Control de Acceso

La Web App debe configurarse de acuerdo con las políticas de seguridad de la organización.

Se recomienda restringir el acceso a:

- Usuarios autorizados.
- Usuarios autenticados.
- Usuarios registrados en la tabla de usuarios.
- Usuarios con estado **Activo**.

---

## ⚙️ Instalación y Configuración

### 1️⃣ 📊 Preparar Google Sheets

Utiliza la plantilla oficial del proyecto.

En Google Sheets:

**Archivo → Hacer una copia**

Verifica que exista la pestaña:

```text
Solicitudes
```

y que sus columnas coincidan exactamente con el esquema definido anteriormente.

---

### 2️⃣ 💻 Configurar Google Apps Script

Desde Google Sheets:

**Extensiones → Apps Script**

Crea o incorpora los siguientes archivos:

```text
📦 sistema-rehabilitacion
│
├── 📄 Código.gs
├── 📄 Globales.gs
├── 📄 Index.html
├── 📄 APP.html
└── 📄 Estilos.html
```

Configura el ID del archivo de Google Sheets:

```javascript
const SPREADSHEET_ID = 'TU_ID_DE_GOOGLE_SHEETS';
```

Reemplaza:

```text
TU_ID_DE_GOOGLE_SHEETS
```

por el ID real del Spreadsheet utilizado como base de datos.

---

### 3️⃣ 👥 Configurar Usuarios y Roles

Registra los usuarios autorizados en la tabla correspondiente.

Ejemplo:

| ID | Usuario | Correo | Rol | Estado | Canales |
|---|---|---|---|---|---|
| **USR-001** | Aprobador | aprobador@empresa.com | **Aprobador** | **Activo** | Todos |
| **USR-002** | Solicitante | solicitante@empresa.com | **Solicitante** | **Activo** | Canal 1 |

Verifica que:

- El correo corresponda al usuario real.
- El rol sea **Solicitante** o **Aprobador**.
- El usuario se encuentre **Activo**.
- Los canales estén correctamente configurados.

---

## 🌐 Publicación como Web App

Para publicar la aplicación:

**Implementar → Nueva implementación → Aplicación web**

Configura:

| Configuración | Valor |
|---|---|
| **Ejecutar como** | Yo / Owner |
| **Acceso** | Usuarios de la organización o usuarios con cuenta Google |

Posteriormente:

1. Autoriza los permisos solicitados.
2. Crea la implementación.
3. Copia la URL generada.
4. Comparte la URL con los usuarios autorizados.

La aplicación estará disponible desde el navegador como una **Web App de Google Apps Script**.

---

## 📱 AppSheet

El uso de **AppSheet** es opcional y puede utilizarse como complemento para proporcionar una experiencia móvil.

Para crear la aplicación:

**Google Sheets → Extensiones → AppSheet → Crear aplicación**

### ⚙️ Configuración recomendada

- Utilizar **Solicitudes** como fuente principal.
- Agregar tablas adicionales desde **Data → Tables**.
- Configurar vistas según el rol.
- Configurar acciones de aprobación.
- Aplicar filtros y restricciones de acceso.
- Configurar las vistas de acuerdo con los perfiles **Solicitante** y **Aprobador**.

---

## 📁 Estructura del Proyecto

```text
📦 sistema-rehabilitacion
│
├── 📄 Código.gs
│   └── Lógica principal del sistema
│
├── 📄 Globales.gs
│   └── Constantes y configuraciones generales
│
├── 📄 Index.html
│   └── Punto de entrada de la Web App
│
├── 📄 APP.html
│   └── Interfaz y componentes funcionales
│
└── 📄 Estilos.html
    └── Estilos y diseño visual
```

### 📄 Código.gs

Contiene la lógica principal del sistema:

- Radicación.
- Validaciones.
- Consultas.
- Actualización de solicitudes.
- Gestión de estados.
- Procesamiento.

### 📄 Globales.gs

Contiene:

- Constantes.
- Configuraciones.
- Parámetros generales.
- Variables compartidas.

### 📄 Index.html

Es el punto de entrada de la aplicación web.

### 📄 APP.html

Contiene los componentes principales de la interfaz y las funcionalidades del sistema.

### 📄 Estilos.html

Contiene los estilos visuales utilizados por la aplicación.

---

## 🎯 Resultado

La aplicación estará disponible como una **Web App de Google Apps Script**, conectada a **Google Sheets** y preparada para gestionar el proceso completo de rehabilitación de pólizas.

### 🚀 El sistema permite:

- ✅ Radicar solicitudes.
- ✅ Validar información.
- ✅ Consultar antecedentes de rehabilitación.
- ✅ Generar identificadores únicos.
- ✅ Gestionar solicitudes pendientes.
- ✅ Aprobar solicitudes.
- ✅ Rechazar solicitudes.
- ✅ Tramitar solicitudes con Operaciones.
- ✅ Registrar observaciones.
- ✅ Controlar usuarios y roles.
- ✅ Gestionar permisos por canal.
- ✅ Mantener historial y trazabilidad.
- ✅ Controlar operaciones concurrentes.
- ✅ Optimizar consultas mediante caché.

---

## 💡 Recomendaciones para Producción

Antes del despliegue definitivo se recomienda validar:

### 🔒 Seguridad

- Permisos de acceso a la Web App.
- Permisos sobre Google Sheets.
- Políticas de seguridad de la organización.
- Usuarios autorizados.
- Configuración de roles.

### 👥 Usuarios

- Usuarios correctamente registrados.
- Roles correctamente asignados.
- Estado de usuario correctamente configurado.
- Canales correctamente definidos.

### 🔄 Operación

- Pruebas de concurrencia.
- Pruebas de radicación.
- Pruebas de aprobación.
- Pruebas de rechazo.
- Pruebas de trámite con Operaciones.
- Pruebas de consulta del historial.

### 💾 Respaldo

Se recomienda establecer mecanismos de:

- Copias de seguridad.
- Recuperación de información.
- Control de cambios.
- Auditoría.

> ⚠️ **Importante:** antes de utilizar el sistema en producción, se recomienda realizar pruebas completas del proceso de **Radicación → Validación → Aprobación/Rechazo → Actualización → Historial**, incluyendo escenarios de acceso simultáneo y usuarios con diferentes roles.

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Uso |
|---|---|
| 🟦 **Google Apps Script** | Backend y lógica de negocio |
| 🟩 **Google Sheets** | Persistencia de información |
| 🟨 **JavaScript ES6+** | Lógica del frontend |
| 🟧 **HTML5** | Estructura de la interfaz |
| 🎨 **CSS3** | Diseño visual |
| 🔐 **LockService** | Control de concurrencia |
| ⚡ **CacheService** | Optimización de consultas |
| 📱 **AppSheet** | Interfaz móvil opcional |

---

## 📄 Licencia

Este proyecto es de uso interno y está sujeto a las políticas, permisos y condiciones establecidas por la organización propietaria del sistema.
