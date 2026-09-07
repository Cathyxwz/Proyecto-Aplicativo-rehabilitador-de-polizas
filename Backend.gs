/**
 * ============================================================================
 * SISTEMA DE GESTIÓN DE REHABILITACIÓN DE PÓLIZAS - BACKEND (GAS)
 * Archivo: Backend.gs
 * Responsabilidad: Server-Side API, Persistencia, Control de Acceso (RBAC),
 *                  Auto-registro de Usuarios, Idempotencia y Validaciones.
 *                  OPTIMIZADO PARA ALTO RENDIMIENTO (SINGLE-PASS & O(1) INDEXING)
 * ============================================================================
 */


/**
 * Helper centralizado para obtener la hoja de Rehabilitación.
 * @private
 */
function obtenerHojaRehab_(ss) {
  if (!ss) return null;
  return ss.getSheetByName(CONFIG.SHEET_REHAB) || ss.getSheets()[0];
}


/**
 * Helper centralizado para obtener la hoja de Usuarios.
 * @private
 */
function obtenerHojaUsuarios_(ss) {
  if (!ss) return null;
  return ss.getSheetByName(CONFIG.SHEET_USUARIOS);
}


/**
 * Helper centralizado para obtener la hoja de Productos.
 * @private
 */
function obtenerHojaProductos_(ss) {
  if (!ss) return null;
  return ss.getSheetByName(CONFIG.SHEET_PRODUCTOS);
}


function doGet(e) {
  try {
    const ssRehab = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const email = Session.getActiveUser().getEmail();
   
    const userCache = CacheService.getUserCache();
    const userCacheKey = 'USR_AUTH_' + email.replace(/[^a-zA-Z0-9]/g, '_');
    const cachedUser = userCache.get(userCacheKey);
    let estaAutorizado = false;
   
    if (cachedUser) {
      try {
        estaAutorizado = true;
      } catch (e) { /* caché corrupta, recalcula */ }
    }
   
    if (!estaAutorizado) {
      const usuarioInfo = resolverOAutoRegistrarUsuario_(ssRehab, email);
      if (!usuarioInfo || !usuarioInfo.isAuthorized) {
        return crearRespuestaError404_(email);
      }
      userCache.put(userCacheKey, JSON.stringify({
        id: usuarioInfo.id,
        nombre: usuarioInfo.nombre,
        rol: usuarioInfo.rol,
        estado: usuarioInfo.estado,
        canal: usuarioInfo.canal
      }), 600);
    }
   
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Gestión de Rehabilitación de Pólizas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return HtmlService.createHtmlOutput(
      `<h3 style="color:red; font-family:sans-serif;">Error crítico al cargar el sistema: ${AppCore.Utilidades.sanitizarTexto(error.message)}</h3>`
    );
  }
}


function crearRespuestaError404_(userEmail) {
  const css = include('Styles');
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <base target="_top">
      <meta charset="utf-8">
      <title>Acceso No Autorizado - 404</title>
      ${css}
    </head>
    <body>
      <div class="error-404-container">
        <div class="error-404-card">
          <div class="error-404-icon">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div class="error-404-code">404</div>
          <h1 class="error-404-title">Acceso No Autorizado</h1>
          <p class="error-404-message">Lo sentimos, la cuenta con la que intentas ingresar no está registrada o se encuentra inactiva en el sistema de gestión.</p>
          <div class="error-404-user">${AppCore.Utilidades.sanitizarTexto(userEmail)}</div>
        </div>
      </div>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(htmlContent)
    .setTitle('Acceso No Autorizado - 404')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


function getContextoUsuarioYCatalogos() {
  try {
    const ssRehab = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const email = Session.getActiveUser().getEmail();
    const userCache = CacheService.getUserCache();
    const userCacheKey = 'USR_AUTH_' + email.replace(/[^a-zA-Z0-9]/g, '_');
    let usuarioInfo = null;
    const cachedUser = userCache.get(userCacheKey);
   
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        usuarioInfo = {
          id: parsed.id || '',
          nombre: parsed.nombre || '',
          email: email,
          rol: parsed.rol,
          estado: parsed.estado || 'ACTIVO',
          canal: parsed.canal || '',
          isAuthorized: true
        };
      } catch (e) {
        usuarioInfo = null;
      }
    }
   
    if (!usuarioInfo) {
      usuarioInfo = resolverOAutoRegistrarUsuario_(ssRehab, email);
      if (usuarioInfo && usuarioInfo.isAuthorized) {
        userCache.put(userCacheKey, JSON.stringify({
          id: usuarioInfo.id,
          nombre: usuarioInfo.nombre,
          rol: usuarioInfo.rol,
          estado: usuarioInfo.estado,
          canal: usuarioInfo.canal
        }), 600);
      }
    }
   
    if (!usuarioInfo || !usuarioInfo.isAuthorized) {
      return { success: false, unauthorized: true, userEmail: email };
    }


    const scriptCache = CacheService.getScriptCache();
    const cachedCatalogos = scriptCache.get('CATALOGOS_CACHE');
    let catalogos;
   
    if (cachedCatalogos) {
      catalogos = JSON.parse(cachedCatalogos);
      if (usuarioInfo.canal && !catalogos.canales.includes(usuarioInfo.canal)) {
        catalogos.canales.push(usuarioInfo.canal);
        catalogos.canales.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      }
    } else {
      const sheetProductos = obtenerHojaProductos_(ssRehab);
      const dataProductos = sheetProductos ? sheetProductos.getDataRange().getValues() : [];
      const sheetUsuarios = obtenerHojaUsuarios_(ssRehab);
      const dataUsuarios = sheetUsuarios ? sheetUsuarios.getDataRange().getValues() : [];
      catalogos = obtenerCatalogosYRelacionesOptimizados_(dataProductos, dataUsuarios, usuarioInfo);
    }


    return {
      success: true,
      currentUser: {
        id: usuarioInfo.id,
        name: usuarioInfo.nombre,
        email: usuarioInfo.email,
        role: usuarioInfo.rol,
        status: usuarioInfo.estado,
        canal: usuarioInfo.canal || ''
      },
      canales: catalogos.canales,
      ramos: catalogos.ramos,
      productos: catalogos.productos,
      ramoProductoMap: catalogos.ramoProductoMap
    };
  } catch (error) {
    Logger.log('Error en getContextoUsuarioYCatalogos: ' + error.message);
    return { success: false, error: error.message };
  }
}


function getInitialContext() {
  try {
    const ssRehab = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const email = Session.getActiveUser().getEmail();


    const userCache = CacheService.getUserCache();
    const userCacheKey = 'USR_AUTH_' + email.replace(/[^a-zA-Z0-9]/g, '_');
    let usuarioInfo = null;
    const cachedUser = userCache.get(userCacheKey);
   
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        usuarioInfo = {
          id: parsed.id || '',
          nombre: parsed.nombre || '',
          email: email,
          rol: parsed.rol,
          estado: parsed.estado || 'ACTIVO',
          canal: parsed.canal || '',
          isAuthorized: true
        };
      } catch (e) {
        usuarioInfo = null;
      }
    }
   
    if (!usuarioInfo) {
      usuarioInfo = resolverOAutoRegistrarUsuario_(ssRehab, email);
      if (usuarioInfo && usuarioInfo.isAuthorized) {
        userCache.put(userCacheKey, JSON.stringify({
          id: usuarioInfo.id,
          nombre: usuarioInfo.nombre,
          rol: usuarioInfo.rol,
          estado: usuarioInfo.estado,
          canal: usuarioInfo.canal
        }), 600);
      }
    }
   
    if (!usuarioInfo || !usuarioInfo.isAuthorized) {
      return {
        success: false,
        unauthorized: true,
        userEmail: email,
        error: "No tienes permisos para acceder a esta aplicación. Contacta al administrador para habilitar tu usuario."
      };
    }


    const sheetRehab = obtenerHojaRehab_(ssRehab);
    const dataRehab = sheetRehab ? sheetRehab.getDataRange().getValues() : [];
    const sheetUsuarios = obtenerHojaUsuarios_(ssRehab);
    const dataUsuarios = sheetUsuarios ? sheetUsuarios.getDataRange().getValues() : [];
    const sheetProductos = obtenerHojaProductos_(ssRehab);
    const dataProductos = sheetProductos ? sheetProductos.getDataRange().getValues() : [];


    const catalogos = obtenerCatalogosYRelacionesOptimizados_(dataProductos, dataUsuarios, usuarioInfo);
    const registros = procesarRegistrosSolicitudesOptimizados_(dataRehab, ssRehab.getSpreadsheetTimeZone());


    let listaUsuarios = [];
    if (usuarioInfo.rol === CONFIG.ROLES.APROBADOR) {
      listaUsuarios = obtenerListaUsuarios_(dataUsuarios);
    }


    return {
      success: true,
      currentUser: {
        id: usuarioInfo.id,
        name: usuarioInfo.nombre,
        email: usuarioInfo.email,
        role: usuarioInfo.rol,
        status: usuarioInfo.estado,
        canal: usuarioInfo.canal || ""
      },
      canales: catalogos.canales,
      ramos: catalogos.ramos,
      productos: catalogos.productos,
      ramoProductoMap: catalogos.ramoProductoMap,
      solicitudes: registros.pendientes,
      historial: registros.procesados,
      usuarios: listaUsuarios
    };
  } catch (error) {
    Logger.log("Error en getInitialContext: " + error.stack);
    return {
      success: false,
      error: error.message,
      currentUser: null,
      canales: [],
      ramos: [],
      productos: [],
      ramoProductoMap: {},
      solicitudes: [],
      historial: [],
      usuarios: []
    };
  }
}


function obtenerListaUsuarios_(dataUsuarios) {
  if (!dataUsuarios || dataUsuarios.length <= 1) return [];
  const headers = dataUsuarios[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
  const idxId     = headers.findIndex(h => h.includes('ID USUARIO') || h === 'ID');
  const idxNombre = headers.findIndex(h => h.includes('NOMBRE DE USUARIO') || h.includes('NOMBRE'));
  const idxDoc    = headers.findIndex(h => h.includes('DOCUMENTO') || h.includes('DOC'));
  const idxEmail  = headers.findIndex(h => h.includes('CORREO') || h.includes('EMAIL'));
  const idxRol    = headers.findIndex(h => h.includes('ROL'));
  const idxEstado = headers.findIndex(h => h.includes('ESTADO'));
  const resultado = [];
  for (let i = 1; i < dataUsuarios.length; i++) {
    const row = dataUsuarios[i];
    resultado.push({
      id:         idxId     !== -1 ? String(row[idxId]     || '') : '',
      name:       idxNombre !== -1 ? String(row[idxNombre] || '') : '',
      documentId: idxDoc    !== -1 ? String(row[idxDoc]    || '') : '',
      email:      idxEmail  !== -1 ? String(row[idxEmail]  || '') : '',
      role:       idxRol    !== -1 ? String(row[idxRol]    || '') : '',
      status:     idxEstado !== -1 ? String(row[idxEstado] || '') : ''
    });
  }
  return resultado;
}


function obtenerSpreadsheetContexto_(id) {
  let ss = null;
  let errorDetalle = "";
  if (id && String(id).trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(String(id).trim());
    } catch (e) {
      errorDetalle = e.message;
      Logger.log(`⚠️ Falló openById con ID '${id}': ${e.message}`);
    }
  }
  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      Logger.log(`⚠️ Falló getActiveSpreadsheet: ${e.message}`);
    }
  }
  if (!ss) {
    throw new Error(
      `No se pudo conectar al Spreadsheet ID: '${id}'. ` +
      (errorDetalle ? `Detalle: ${errorDetalle}. ` : '') +
      `Verifica que el ID en CONFIG sea correcto y que la cuenta ejecutora tenga permisos de acceso.`
    );
  }
  return ss;
}


function resolverOAutoRegistrarUsuario_(ss, emailUsuario) {
  const emailLimpio = String(emailUsuario || '').trim().toLowerCase();
  const usuarioNoAutorizado = {
    id: "",
    nombre: "",
    email: emailLimpio,
    rol: null,
    estado: "INACTIVO",
    canal: "",
    isAuthorized: false
  };
  if (!emailLimpio) return usuarioNoAutorizado;
  try {
    const sheetUsuarios = obtenerHojaUsuarios_(ss);
    if (!sheetUsuarios) return usuarioNoAutorizado;
    const data = sheetUsuarios.getDataRange().getValues();
    if (data.length <= 1) return usuarioNoAutorizado;
    const headersSanitizados = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
    const colIdIndex = headersSanitizados.findIndex(h => h.includes('ID USUARIO') || h === 'ID');
    const colNombreIndex = headersSanitizados.findIndex(h => h.includes('NOMBRE DE USUARIO') || h.includes('NOMBRE'));
    const colCorreoIndex = headersSanitizados.findIndex(h => h.includes('CORREO') || h.includes('EMAIL'));
    const colRolIndex = headersSanitizados.findIndex(h => h.includes('ROL'));
    const colEstadoIndex = headersSanitizados.findIndex(h => h.includes('ESTADO'));
    const colCanalIndex = headersSanitizados.findIndex(h => h.includes('NOMBRE CANAL') || h.includes('CANAL'));
    if (colCorreoIndex === -1 || colRolIndex === -1) return usuarioNoAutorizado;
    for (let i = 1; i < data.length; i++) {
      const fila = data[i];
      const correoFila = String(fila[colCorreoIndex] || '').trim().toLowerCase();
      if (correoFila === emailLimpio) {
        const estadoFila = colEstadoIndex !== -1 ? AppCore.Utilidades.sanitizarTexto(fila[colEstadoIndex]) : 'ACTIVO';
        if (estadoFila.includes('INACTIVO')) {
          return usuarioNoAutorizado;
        }
        const rolTexto = AppCore.Utilidades.sanitizarTexto(fila[colRolIndex]);
        let rolFinal = CONFIG.ROLES.SOLICITANTE;
        if (rolTexto.includes('APROBADOR')) {
          rolFinal = CONFIG.ROLES.APROBADOR;
        }
        const nombreExistente = colNombreIndex !== -1 ? fila[colNombreIndex] : '';
        const canalUsuario = colCanalIndex !== -1 && fila[colCanalIndex] ? String(fila[colCanalIndex]).trim() : '';
        return {
          id: colIdIndex !== -1 && fila[colIdIndex] ? fila[colIdIndex] : generarSiguienteIdUsuario(),
          nombre: nombreExistente ? AppCore.Utilidades.formatearNombreUsuario(nombreExistente) : AppCore.Utilidades.formatearNombreUsuario(emailLimpio),
          email: emailLimpio,
          rol: rolFinal,
          estado: estadoFila,
          canal: canalUsuario,
          isAuthorized: true
        };
      }
    }
    return usuarioNoAutorizado;
  } catch (error) {
    Logger.log(`❌ Error resolviendo usuario (${emailUsuario}): ${error.message}`);
    return usuarioNoAutorizado;
  }
}


function autoRegistrarUsuarioEnSheet_(sheetUsuarios, emailLimpio) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(10000);
    const data = sheetUsuarios.getDataRange().getValues();
    const headersSanitizados = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
    const colIdIndex = headersSanitizados.findIndex(h => h.includes('ID USUARIO') || h === 'ID');
    const colNombreIndex = headersSanitizados.findIndex(h => h.includes('NOMBRE'));
    const colCorreoIndex = headersSanitizados.findIndex(h => h.includes('CORREO') || h.includes('EMAIL'));
    const colRolIndex = headersSanitizados.findIndex(h => h.includes('ROL'));
    const colEstadoIndex = headersSanitizados.findIndex(h => h.includes('ESTADO'));
    const colCanalIndex = headersSanitizados.findIndex(h => h.includes('NOMBRE CANAL') || h.includes('CANAL'));
    const nextId = generarSiguienteIdUsuario();
    const nombreFormateado = AppCore.Utilidades.formatearNombreUsuario(emailLimpio);
    const totalCols = data[0].length || 7;
    const nuevaFila = new Array(totalCols).fill('');
    if (colIdIndex !== -1) nuevaFila[colIdIndex] = nextId;
    if (colNombreIndex !== -1) nuevaFila[colNombreIndex] = nombreFormateado;
    if (colCorreoIndex !== -1) nuevaFila[colCorreoIndex] = emailLimpio;
    if (colRolIndex !== -1) nuevaFila[colRolIndex] = CONFIG.ROLES.SOLICITANTE;
    if (colEstadoIndex !== -1) nuevaFila[colEstadoIndex] = "ACTIVO";
    if (colCanalIndex !== -1) nuevaFila[colCanalIndex] = "";
    sheetUsuarios.appendRow(nuevaFila);
    SpreadsheetApp.flush();
    return { id: nextId, nombre: nombreFormateado, email: emailLimpio, rol: CONFIG.ROLES.SOLICITANTE, estado: "ACTIVO", canal: "" };
  } catch (e) {
    const fallbackId = `USR-${obtenerCincoDigitosNumericosAleatorios()}`;
    return { id: fallbackId, nombre: AppCore.Utilidades.formatearNombreUsuario(emailLimpio), email: emailLimpio, rol: CONFIG.ROLES.SOLICITANTE, estado: "ACTIVO", canal: "" };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}


/**
 * Extrae catálogos usando la nueva hoja de Productos y caché de Apps Script.
 * @private
 */
function obtenerCatalogosYRelacionesOptimizados_(dataProductos, dataUsers, usuarioInfo) {
  try {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get("CATALOGOS_CACHE");
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (usuarioInfo && usuarioInfo.canal && !parsed.canales.includes(usuarioInfo.canal)) {
        parsed.canales.push(usuarioInfo.canal);
        parsed.canales.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      }
      return parsed;
    }
    const ramosSet = new Set();
    const productosSet = new Set();
    const ramoProductoMap = {};
    if (dataProductos && dataProductos.length > 1) {
      const headers = dataProductos[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
      const colRamoIndex = headers.findIndex(h => h.includes('RAMO'));
      const colProductoIndex = headers.findIndex(h => h.includes('PRODUCTO') || h.includes('PROD'));
      for (let i = 1; i < dataProductos.length; i++) {
        const row = dataProductos[i];
        const valRamo = colRamoIndex !== -1 && row[colRamoIndex] ? String(row[colRamoIndex]).trim() : "";
        const valProd = colProductoIndex !== -1 && row[colProductoIndex] ? String(row[colProductoIndex]).trim() : "";
        if (valRamo) ramosSet.add(valRamo);
        if (valProd) productosSet.add(valProd);
        if (valRamo && valProd) {
          if (!ramoProductoMap[valRamo]) ramoProductoMap[valRamo] = new Set();
          ramoProductoMap[valRamo].add(valProd);
        }
      }
    }
    const canalesSet = new Set();
    if (dataUsers && dataUsers.length > 1) {
      const headersU = dataUsers[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
      const colNombreCanal = headersU.findIndex(h => h.includes('NOMBRE CANAL') || h.includes('CANAL'));
      if (colNombreCanal !== -1) {
        for (let i = 1; i < dataUsers.length; i++) {
          const valCanal = String(dataUsers[i][colNombreCanal] || '').trim();
          if (valCanal !== '') {
            canalesSet.add(valCanal);
          }
        }
      }
    }
    if (usuarioInfo && usuarioInfo.canal) {
      canalesSet.add(usuarioInfo.canal);
    }
    const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    const mapaProcesado = {};
    Object.keys(ramoProductoMap).forEach(k => {
      mapaProcesado[k] = Array.from(ramoProductoMap[k]).sort(naturalSort);
    });
    const resultado = {
      ramos: Array.from(ramosSet).sort(naturalSort),
      productos: Array.from(productosSet).sort(naturalSort),
      canales: Array.from(canalesSet).sort(naturalSort),
      ramoProductoMap: mapaProcesado
    };
    cache.put("CATALOGOS_CACHE", JSON.stringify(resultado), 300); // 5 Minutos de Cache
    return resultado;
  } catch (e) {
    return { ramos: [], productos: [], canales: [], ramoProductoMap: {} };
  }
}


function obtenerCatalogosYRelaciones(ss, usuarioInfo) {
  const sheetProductos = obtenerHojaProductos_(ss);
  const dataProductos = sheetProductos ? sheetProductos.getDataRange().getValues() : [];
  const sheetUsuarios = obtenerHojaUsuarios_(ss);
  const dataUsers = sheetUsuarios ? sheetUsuarios.getDataRange().getValues() : [];
  return obtenerCatalogosYRelacionesOptimizados_(dataProductos, dataUsers, usuarioInfo);
}


function consultarRehabilitacionesUltimoAno(poliza) {
  try {
    const polizaLimpia = String(poliza || '').trim();
    if (!polizaLimpia) return { success: true, count: 0 };
    const ss = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const sheet = obtenerHojaRehab_(ss);
    if (!sheet) return { success: true, count: 0 };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, count: 0 };
    const headersSanitizados = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
    const colPolizaIndex = headersSanitizados.findIndex(h => h.includes('POLIZA'));
    const colEstadoIndex = headersSanitizados.findIndex(h => h.includes('ESTADO'));
    const colFechaIndex = headersSanitizados.findIndex(h =>
      h.includes('ACTUALIZACION') || h.includes('FECHA PROCESO') || h.includes('FECHA SOLICITUD') || h.includes('FECHA')
    );
    if (colPolizaIndex === -1 || colEstadoIndex === -1) {
      return { success: true, count: 0 };
    }
    const ahora = new Date();
    const haceUnAno = new Date();
    haceUnAno.setFullYear(ahora.getFullYear() - 1);
    const targetEstadoRehab = AppCore.Utilidades.sanitizarTexto(CONFIG.ESTADOS.REHABILITADA);
    const targetEstadoOp = AppCore.Utilidades.sanitizarTexto(CONFIG.ESTADOS.TRAMITAR_OPERACIONES);
    let contador = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const polizaFila = String(row[colPolizaIndex] || '').trim();
      if (polizaFila === polizaLimpia) {
        const estadoFila = AppCore.Utilidades.sanitizarTexto(row[colEstadoIndex]);
        if (estadoFila === targetEstadoRehab || estadoFila === targetEstadoOp) {
          if (colFechaIndex !== -1 && row[colFechaIndex]) {
            const fechaVal = row[colFechaIndex];
            const fechaObj = AppCore.Utilidades.parsearFechaISO(String(fechaVal)) || new Date(fechaVal);
            if (fechaObj && !isNaN(fechaObj.getTime())) {
              if (fechaObj >= haceUnAno && fechaObj <= ahora) {
                contador++;
              }
            } else {
              contador++;
            }
          } else {
            contador++;
          }
        }
      }
    }
    return { success: true, count: contador };
  } catch (error) {
    Logger.log("Error en consultarRehabilitacionesUltimoAno: " + error.message);
    return { success: false, count: 0, error: error.message };
  }
}


function guardarSolicitud(datos) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(30000);
    if (!hasLock) return { success: false, message: 'El servidor está ocupado. Reintenta en un momento.' };
    const validacion = validarPayloadSolicitud(datos);
    if (!validacion.valido) return { success: false, message: validacion.mensaje };
    const polizaLimpia = String(datos.poliza).trim();
    const idClienteLimpio = String(datos.identificacionCliente).trim();
    const fechaRecaudoISO = AppCore.Utilidades.normalizarFechaISO(datos.fechaRecaudo, false);
    const fechaAnulacionISO = AppCore.Utilidades.normalizarFechaISO(datos.fechaAnulacion, false);
    const ss = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const sheet = obtenerHojaRehab_(ss);
    if (!sheet) throw new Error(`No se encontró la pestaña '${CONFIG.SHEET_REHAB}' en el libro.`);
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) throw new Error('La hoja de cálculo está vacía.');
    const rawHeaders = data[0];
    const headersSanitizados = rawHeaders.map(h => AppCore.Utilidades.sanitizarTexto(h));
    const nuevoIdSolicitud = generarSiguienteIdSolicitud();
    const fechaCreacionSolicitud = AppCore.Utilidades.formatearAFechaISO(new Date(), true, ss.getSpreadsheetTimeZone());
    const usuarioRaw = Session.getActiveUser().getEmail() || "Usuario Formulario";
    const usuarioFormateado = AppCore.Utilidades.formatearNombreUsuario(usuarioRaw);
    const inconsistenciaTexto = datos.inconsistencia ? String(datos.inconsistencia).trim() : '';
    const observacionesTexto = datos.observaciones ? String(datos.observaciones).trim() : '';
    const canalIngresado = datos.canal.trim();
    const nuevaFila = new Array(rawHeaders.length).fill('');
    headersSanitizados.forEach((h, index) => {
      if (h.includes('IDENTIFICAC') || h.includes('ID CLIENTE') || h === 'IDENTIFICACION') {
        nuevaFila[index] = `'${idClienteLimpio}`;
      } else if (h.includes('NOMBRE CLIENTE') || (h.includes('CLIENTE') && !h.includes('IDENTIFICAC') && !h.includes('ID'))) {
        nuevaFila[index] = datos.nombreCliente.trim();
      } else if (h.includes('ID REHABILITAC') || h.includes('ID SOLICITUD') || h === 'ID') {
        nuevaFila[index] = nuevoIdSolicitud;
      } else if (h.includes('FECHA') && (h.includes('SOLICITUD') || h.includes('CREACION') || h.includes('REGISTRO') || h === 'FECHA') && !h.includes('PROCESO') && !h.includes('ACTUALIZACION')) {
        nuevaFila[index] = fechaCreacionSolicitud;
      } else if (h.includes('RAMO')) {
        nuevaFila[index] = datos.ramo.trim();
      } else if (h.includes('PRODUCTO') || h.includes('PROD')) {
        nuevaFila[index] = datos.producto.trim();
      } else if (h.includes('POLIZA')) {
        nuevaFila[index] = `${polizaLimpia}`;
      } else if (h.includes('RECAUDO')) {
        nuevaFila[index] = fechaRecaudoISO;
      } else if (h.includes('ANULACION')) {
        nuevaFila[index] = fechaAnulacionISO;
      } else if (h.includes('INCONSISTENCIA') || h.includes('INCONCISTENCIA')) {
        nuevaFila[index] = inconsistenciaTexto;
      } else if (h.includes('OBSERVACIONES')) {
        nuevaFila[index] = observacionesTexto;
      } else if (h.includes('ESTADO')) {
        nuevaFila[index] = CONFIG.ESTADOS.EN_PROCESO;
      } else if (h.includes('FUNCIONARIO') || h.includes('SOLICITANTE') || h.includes('NOMBRE FUNCIONARIO')) {
        nuevaFila[index] = usuarioFormateado;
      } else if (h.includes('CANAL') || h.includes('OFICINA')) {
        nuevaFila[index] = canalIngresado;
      }
    });
    sheet.appendRow(nuevaFila);
    actualizarCanalUsuarioSiVacio_(ss, usuarioRaw, canalIngresado);
    SpreadsheetApp.flush();
   
    CacheService.getScriptCache().remove("CATALOGOS_CACHE");
    if (typeof AppCore !== 'undefined' && AppCore.Datos && AppCore.Datos.limpiarCache) {
      AppCore.Datos.limpiarCache();
    }
    return {
      success: true,
      idGenerado: nuevoIdSolicitud,
      message: 'Solicitud registrada correctamente.'
    };
  } catch (error) {
    if (typeof AppCore !== 'undefined' && AppCore.Logs) {
      AppCore.Logs.error('Error al guardar la solicitud', error);
    }
    return {
      success: false,
      message: 'Ocurrió un error al guardar la solicitud: ' + error.message
    };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}


function createUser(userData) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(15000);
    if (!hasLock) return { success: false, message: 'El servidor está ocupado. Reintenta en un momento.' };
    if (!userData || !userData.email || !userData.name) {
      return { success: false, message: 'Nombre y correo son obligatorios.' };
    }
    const emailNuevo = String(userData.email).trim().toLowerCase();
    const ss = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const sheetUsuarios = obtenerHojaUsuarios_(ss);
    if (!sheetUsuarios) return { success: false, message: 'No se encontró la hoja de Usuarios.' };
    const data = sheetUsuarios.getDataRange().getValues();
    const headersSanitizados = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
    const colIdIndex     = headersSanitizados.findIndex(h => h.includes('ID USUARIO') || h === 'ID');
    const colNombreIndex = headersSanitizados.findIndex(h => h.includes('NOMBRE DE USUARIO') || h.includes('NOMBRE'));
    const colDocIndex    = headersSanitizados.findIndex(h => h.includes('DOCUMENTO') || h.includes('DOC'));
    const colCorreoIndex = headersSanitizados.findIndex(h => h.includes('CORREO') || h.includes('EMAIL'));
    const colRolIndex    = headersSanitizados.findIndex(h => h.includes('ROL'));
    const colEstadoIndex = headersSanitizados.findIndex(h => h.includes('ESTADO'));


    for (let i = 1; i < data.length; i++) {
      const correoFila = String(data[i][colCorreoIndex] || '').trim().toLowerCase();
      if (correoFila === emailNuevo) {
        return { success: false, message: `Ya existe un usuario registrado con el correo: ${emailNuevo}` };
      }
    }
    const nuevoId = generarSiguienteIdUsuario();
    const rolFinal = userData.role || CONFIG.ROLES.SOLICITANTE;
    const estadoFinal = userData.status || 'Activo';
    const totalCols = data[0].length;
    const nuevaFila = new Array(totalCols).fill('');
    if (colIdIndex     !== -1) nuevaFila[colIdIndex]     = nuevoId;
    if (colNombreIndex !== -1) nuevaFila[colNombreIndex] = String(userData.name).trim();
    if (colDocIndex    !== -1) nuevaFila[colDocIndex]    = String(userData.documentId || '').trim();
    if (colCorreoIndex !== -1) nuevaFila[colCorreoIndex] = emailNuevo;
    if (colRolIndex    !== -1) nuevaFila[colRolIndex]    = rolFinal;
    if (colEstadoIndex !== -1) nuevaFila[colEstadoIndex] = estadoFinal;
    sheetUsuarios.appendRow(nuevaFila);
    SpreadsheetApp.flush();
    return {
      success: true,
      user: {
        id:         nuevoId,
        name:       String(userData.name).trim(),
        documentId: String(userData.documentId || '').trim(),
        email:      emailNuevo,
        role:       rolFinal,
        status:     estadoFinal
      }
    };
  } catch (error) {
    Logger.log("Error en createUser: " + error.message);
    return { success: false, message: 'Error al registrar usuario: ' + error.message };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}


function actualizarCanalUsuarioSiVacio_(ss, emailUsuario, canalNuevo) {
  try {
    const emailLimpio = String(emailUsuario || '').trim().toLowerCase();
    if (!emailLimpio || !canalNuevo) return;
    const sheetUsuarios = obtenerHojaUsuarios_(ss);
    if (!sheetUsuarios) return;
    const data = sheetUsuarios.getDataRange().getValues();
    if (data.length <= 1) return;
    const headersSanitizados = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
    const colCorreoIndex = headersSanitizados.findIndex(h => h.includes('CORREO') || h.includes('EMAIL'));
    let colCanalIndex = headersSanitizados.findIndex(h => h.includes('NOMBRE CANAL') || h.includes('CANAL'));
    if (colCorreoIndex === -1) return;
    if (colCanalIndex === -1) {
      colCanalIndex = data[0].length;
      sheetUsuarios.getRange(1, colCanalIndex + 1).setValue('Nombre canal');
    }
    for (let i = 1; i < data.length; i++) {
      const correoFila = String(data[i][colCorreoIndex] || '').trim().toLowerCase();
      if (correoFila === emailLimpio) {
        const canalActual = String(data[i][colCanalIndex] || '').trim();
        if (canalActual === '') {
          sheetUsuarios.getRange(i + 1, colCanalIndex + 1).setValue(canalNuevo);
        }
        break;
      }
    }
  } catch (e) {
    Logger.log("⚠️ Error en actualizarCanalUsuarioSiVacio_: " + e.message);
  }
}


function procesarAprobacion(filaFisica, accion, polizaEsperada, observaciones) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(15000);
    if (!hasLock) return { success: false, error: 'Servidor ocupado. Intenta de nuevo.' };
    const targetRow = Number(filaFisica);
    if (!targetRow || isNaN(targetRow) || targetRow <= 1) {
      return { success: false, error: `Número de fila física inválido: ${filaFisica}` };
    }
    const ss = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const usuarioActual = Session.getActiveUser().getEmail() || "";
    const usuarioInfo = resolverOAutoRegistrarUsuario_(ss, usuarioActual);
    if (usuarioInfo.rol !== CONFIG.ROLES.APROBADOR) {
      return { success: false, error: 'Acceso Denegado: No posees permisos suficientes para esta acción.' };
    }
    const sheet = obtenerHojaRehab_(ss);
    if (!sheet) return { success: false, error: `No se encontró la hoja '${CONFIG.SHEET_REHAB}'.` };
    const data = sheet.getDataRange().getValues();
    const rawHeaders = data[0];
    const headersSanitizados = rawHeaders.map(h => AppCore.Utilidades.sanitizarTexto(h));
    const colEstadoIndex = headersSanitizados.findIndex(h => h.includes('ESTADO'));
    if (colEstadoIndex === -1) {
      return { success: false, error: 'No se encontró la columna de Estado en la hoja.' };
    }
    let colObservacionesIndex = headersSanitizados.findIndex(h =>
      h.includes('OBSERVACIONES') || h.includes('OBSERVACION')
    );
    if (colObservacionesIndex === -1) {
      colObservacionesIndex = rawHeaders.length;
      sheet.getRange(1, colObservacionesIndex + 1).setValue('Observaciones');
      rawHeaders.push('Observaciones');
      headersSanitizados.push('OBSERVACIONES');
    }
    let colUsuarioIndex = headersSanitizados.findIndex(h =>
      h.includes('PROCESADO POR') || h.includes('APROBADO POR') || h.includes('APROBADOR')
    );
    if (colUsuarioIndex === -1) {
      colUsuarioIndex = rawHeaders.length;
      sheet.getRange(1, colUsuarioIndex + 1).setValue('Procesado Por');
      rawHeaders.push('Procesado Por');
      headersSanitizados.push('PROCESADO POR');
    }
    let colActualizacionesIndex = headersSanitizados.findIndex(h =>
      h.includes('ACTUALIZACION') || h.includes('ACTUALIZACIONES') || h.includes('FECHA PROCESO') || h.includes('FECHA APROBACION')
    );
    if (colActualizacionesIndex === -1) {
      colActualizacionesIndex = rawHeaders.length;
      sheet.getRange(1, colActualizacionesIndex + 1).setValue('Actualización');
      rawHeaders.push('Actualización');
      headersSanitizados.push('ACTUALIZACION');
    }
    const polizaLimpia = polizaEsperada ? String(polizaEsperada).trim() : '';
    const accionUpper = String(accion).toUpperCase();
    const textoObservaciones = observaciones ? String(observaciones).trim() : '';
    let nuevoEstado = CONFIG.ESTADOS.RECHAZADA;
    if (accionUpper === 'APROBADO' || accionUpper === 'REHABILITADA') {
      nuevoEstado = CONFIG.ESTADOS.REHABILITADA;
    } else if (accionUpper === 'TRAMITAR_OPERACIONES' || accionUpper === 'TRAMITAR CON OPERACIONES') {
      nuevoEstado = CONFIG.ESTADOS.TRAMITAR_OPERACIONES;
    }
    const fechaHoraProcesoISO = AppCore.Utilidades.formatearAFechaISO(new Date(), true, ss.getSpreadsheetTimeZone());
    const nombreOEmail = usuarioInfo.nombre || usuarioActual;
    const nombreFormateado = AppCore.Utilidades.formatearNombreUsuario(nombreOEmail);
    sheet.getRange(targetRow, colEstadoIndex + 1).setValue(nuevoEstado);
    sheet.getRange(targetRow, colObservacionesIndex + 1).setValue(textoObservaciones);
    sheet.getRange(targetRow, colUsuarioIndex + 1).setValue(nombreFormateado);
    sheet.getRange(targetRow, colActualizacionesIndex + 1).setValue(fechaHoraProcesoISO);
    SpreadsheetApp.flush();
    return {
      success: true,
      alreadyProcessed: false,
      message: `Póliza ${polizaLimpia} procesada exitosamente como: "${nuevoEstado}".`,
      solicitudes: obtenerBandejaOptimizado(ss),
      historial: obtenerHistorialOptimizado(ss)
    };
  } catch (error) {
    return { success: false, error: "Error en el servidor: " + error.message };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}


function validarPayloadSolicitud(datos) {
  if (!datos) return { valido: false, mensaje: 'No se recibieron datos para procesar.' };
  const idCliente = String(datos.identificacionCliente || '').trim();
  if (!/^\d{5,15}$/.test(idCliente)) {
    return { valido: false, mensaje: 'La identificación del cliente debe ser numérica y contener entre 5 y 15 dígitos.' };
  }
  const camposRequeridos = [
    { clave: 'fechaRecaudo', nombre: 'Fecha de Recaudo' },
    { clave: 'fechaAnulacion', nombre: 'Fecha de Anulación' },
    { clave: 'ramo', nombre: 'Ramo' },
    { clave: 'producto', nombre: 'Producto' },
    { clave: 'canal', nombre: 'Canal / Oficina' },
    { clave: 'nombreCliente', nombre: 'Nombre del Cliente' },
    { clave: 'inconsistencia', nombre: 'Inconsistencia / Observaciones' }
  ];
  for (const campo of camposRequeridos) {
    if (!datos[campo.clave] || String(datos[campo.clave]).trim() === '') {
      return { valido: false, mensaje: `El campo "${campo.nombre}" es obligatorio.` };
    }
  }
  const dateRecaudo = AppCore.Utilidades.parsearFechaISO(String(datos.fechaRecaudo).trim());
  const dateAnulacion = AppCore.Utilidades.parsearFechaISO(String(datos.fechaAnulacion).trim());
  if (!dateRecaudo || !dateAnulacion) {
    return { valido: false, mensaje: 'Las fechas ingresadas no tienen un formato válido (YYYY-MM-DD).' };
  }
  if (dateRecaudo.getTime() > dateAnulacion.getTime()) {
    return { valido: false, mensaje: 'La Fecha de Recaudo no puede ser posterior a la Fecha de Anulación.' };
  }
  return { valido: true };
}


function esEstadoPendienteBandeja(estadoTexto) {
  if (!estadoTexto) return false;
  const sanitizado = AppCore.Utilidades.sanitizarTexto(estadoTexto);
  const estadoEnProcesoTarget = AppCore.Utilidades.sanitizarTexto(CONFIG.ESTADOS.EN_PROCESO);
  return sanitizado === estadoEnProcesoTarget;
}


function procesarRegistrosSolicitudesOptimizados_(data, timeZone) {
  if (!data || data.length <= 1) return { pendientes: [], procesados: [] };
  const headersSanitizados = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
 
  const buscarIndice = (aliasList) => {
    return headersSanitizados.findIndex(h => aliasList.some(alias => h.includes(alias) || h === alias));
  };
  const idxId = buscarIndice(['ID REHABILITACION', 'ID SOLICITUD', 'ID REHABILITAC', 'ID']);
  const idxPoliza = buscarIndice(['POLIZA', 'PÓLIZA']);
  const idxIdCliente = buscarIndice(['IDENTIFICACION CLIENTE', 'IDENTIFICACION', 'ID CLIENTE', 'IDENTIFICAC']);
  const idxNombreCliente = buscarIndice(['NOMBRE CLIENTE', 'CLIENTE', 'NOMBRE DEL CLIENTE']);
  const idxRamo = buscarIndice(['RAMO']);
  const idxProducto = buscarIndice(['PRODUCTO', 'PROD']);
  const idxRecaudo = buscarIndice(['FECHA RECAUDO', 'RECAUDO']);
  const idxAnulacion = buscarIndice(['FECHA DE ANULACION', 'FECHA ANULACION', 'ANULACION']);
  const idxCanal = buscarIndice(['CANAL / OFICINA', 'CANAL', 'OFICINA']);
  const idxInconsistencia = buscarIndice(['INCONSISTENCIA', 'INCONCISTENCIA', 'INCONCISTENCIAS']);
  const idxObservaciones = buscarIndice(['OBSERVACIONES', 'OBSERVACION']);
  const idxEstado = buscarIndice(['ESTADO DE REHABILITACION', 'ESTADO']);
  const idxFuncionario = buscarIndice(['NOMBRE FUNCIONARIO', 'FUNCIONARIO', 'SOLICITANTE', 'NOMBRE DEL FUNCIONARIO']);
  const idxProcesador = buscarIndice(['PROCESADO POR', 'APROBADO POR', 'APROBADOR', 'PROCESADO']);
  const idxFechaSolicitud = buscarIndice(['FECHA SOLICITUD', 'FECHA CREACION', 'REGISTRO', 'FECHA']);
  const idxFechaProceso = buscarIndice(['ACTUALIZACION', 'ACTUALIZACIONES', 'FECHA PROCESO', 'FECHA APROBACION']);
 
  const pendientes = [];
  const procesados = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const estadoRehab = String((idxEstado !== -1 ? row[idxEstado] : '') || CONFIG.ESTADOS.EN_PROCESO).trim();
    const fRecaudo = AppCore.Utilidades.normalizarFechaISO(idxRecaudo !== -1 ? row[idxRecaudo] : null, false, timeZone);
    const fAnulacion = AppCore.Utilidades.normalizarFechaISO(idxAnulacion !== -1 ? row[idxAnulacion] : null, false, timeZone);
    const fSolicitud = AppCore.Utilidades.normalizarFechaISO(idxFechaSolicitud !== -1 ? row[idxFechaSolicitud] : null, true, timeZone);
    const nombreFuncionarioRadicador = idxFuncionario !== -1 ? row[idxFuncionario] : null;
    const baseData = {
      id: (idxId !== -1 && row[idxId]) ? row[idxId] : `FILA_${i + 1}`,
      poliza: (idxPoliza !== -1 && row[idxPoliza]) ? row[idxPoliza] : '-',
      identificacionCliente: (idxIdCliente !== -1 && row[idxIdCliente]) ? row[idxIdCliente] : '-',
      nombreCliente: (idxNombreCliente !== -1 && row[idxNombreCliente]) ? row[idxNombreCliente] : '-',
      ramo: (idxRamo !== -1 && row[idxRamo]) ? row[idxRamo] : '-',
      producto: (idxProducto !== -1 && row[idxProducto]) ? row[idxProducto] : '-',
      fechaRecaudo: fRecaudo,
      fechaAnulacion: fAnulacion,
      fechaSolicitud: fSolicitud,
      canal: (idxCanal !== -1 && row[idxCanal]) ? row[idxCanal] : '-',
      inconsistencia: (idxInconsistencia !== -1 && row[idxInconsistencia]) ? row[idxInconsistencia] : 'Sin observaciones',
      observaciones: (idxObservaciones !== -1 && row[idxObservaciones]) ? row[idxObservaciones] : 'Sin observaciones',
      estadoRehab: estadoRehab,
      funcionario: nombreFuncionarioRadicador ? AppCore.Utilidades.formatearNombreUsuario(nombreFuncionarioRadicador) : 'Sin asignar',
      filaFisica: i + 1
    };
    if (esEstadoPendienteBandeja(estadoRehab)) {
      pendientes.push(baseData);
    } else if (estadoRehab) {
      const fProceso = AppCore.Utilidades.normalizarFechaISO(idxFechaProceso !== -1 ? row[idxFechaProceso] : null, true, timeZone);
      const usuarioProcesador = idxProcesador !== -1 ? row[idxProcesador] : null;
      const responsableFinal = usuarioProcesador || nombreFuncionarioRadicador || 'Funcionario Desconocido';
      procesados.push({
        ...baseData,
        procesadoPor: AppCore.Utilidades.formatearNombreUsuario(responsableFinal),
        fechaProceso: fProceso
      });
    }
  }
  return {
    pendientes: pendientes.sort((a, b) => b.filaFisica - a.filaFisica),
    procesados: procesados.sort((a, b) => b.filaFisica - a.filaFisica)
  };
}


function obtenerRegistrosSolicitudes_(ss) {
  const sheet = obtenerHojaRehab_(ss);
  if (!sheet) return { pendientes: [], procesados: [] };
  const data = sheet.getDataRange().getValues();
  return procesarRegistrosSolicitudesOptimizados_(data, ss.getSpreadsheetTimeZone());
}


function obtenerBandejaOptimizado(ss) {
  return obtenerRegistrosSolicitudes_(ss).pendientes;
}


function obtenerHistorialOptimizado(ss) {
  return obtenerRegistrosSolicitudes_(ss).procesados;
}


function getSolicitudesYHistorial() {
  try {
    const ss = obtenerSpreadsheetContexto_(CONFIG.BD_REHAB_ID);
    const email = Session.getActiveUser().getEmail();
    const cache = CacheService.getUserCache();
    const cacheKey = 'USR_AUTH_' + email.replace(/[^a-zA-Z0-9]/g, '_');
    const cachedAuth = cache.get(cacheKey);
    if (!cachedAuth) {
      const usuarioInfo = resolverOAutoRegistrarUsuario_(ss, email);
      if (!usuarioInfo || !usuarioInfo.isAuthorized) {
        return { success: false, unauthorized: true, userEmail: email };
      }
      cache.put(cacheKey, JSON.stringify({
        rol: usuarioInfo.rol,
        canal: usuarioInfo.canal,
        nombre: usuarioInfo.nombre
      }), 600);
    }
    const registros = obtenerRegistrosSolicitudes_(ss);
    return {
      success: true,
      solicitudes: registros.pendientes,
      historial: registros.procesados
    };
  } catch (error) {
    Logger.log("Error en getSolicitudesYHistorial: " + error.message);
    return { success: false, error: error.message, solicitudes: [], historial: [] };
  }
}
