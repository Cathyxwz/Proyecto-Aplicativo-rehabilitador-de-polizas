/**
 * ============================================================================
 * SISTEMA DE GESTIÓN DE REHABILITACIÓN DE PÓLIZAS - ARQUITECTURA CORE & DAL
 * Archivo: globales.gs
 * Responsabilidad: Namespace Global (AppCore), Configuración Inmutable,
 *                  Utilidades de Fechas/IDs, Capa de Datos (DAL) con Caché.
 * ============================================================================
 */
(function inicializarCoreGlobal() {
  if (globalThis.AppCore) return;
  /**
   * Namespace principal de la aplicación.
   * @namespace AppCore
   */
  globalThis.AppCore = {
    CONFIG: Object.freeze({
      BD_REHAB_ID: 'Coloque su ID',
      SHEET_REHAB: 'Rehabilitaciones',
      SHEET_USUARIOS: 'Usuarios',
      SHEET_PRODUCTOS: 'Productos',
      ESTADOS: {
        REHABILITADA: 'Rehabilitada',
        RECHAZADA: 'Rechazada',
        EN_PROCESO: 'En proceso',
        TRAMITAR_OPERACIONES: 'Tramitar con operaciones',
        SIN_RECAUDO: 'Sin recaudo'
      },
      ROLES: {
        APROBADOR: 'Aprobador',
        SOLICITANTE: 'Solicitante'
      },
      ESTADOS_USUARIO: {
        ACTIVO: 'ACTIVO',
        INACTIVO: 'INACTIVO'
      },
      ESTADOS_FINALIZADOS: [
        'REHABILITADA',
        'RECHAZADA',
        'TRAMITAR CON OPERACIONES'
      ]
    }),
    Utilidades: {
      formatearAFechaISO: function (fecha, incluirHora = false, timeZone = null) {
        if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '';
        const tz = timeZone || Session.getScriptTimeZone();
        const patron = incluirHora ? "yyyy-MM-dd HH:mm:ss" : "yyyy-MM-dd";
        return Utilities.formatDate(fecha, tz, patron);
      },
      parsearFechaISO: function (fechaISO) {
        if (!fechaISO || typeof fechaISO !== 'string') return null;
        const cadenaLimpia = fechaISO.trim().split('T')[0];
        const partes = cadenaLimpia.split('-');
        if (partes.length !== 3) return null;
        const anio = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const dia = parseInt(partes[2], 10);
        if (isNaN(anio) || isNaN(mes) || isNaN(dia)) return null;
        const fecha = new Date(anio, mes, dia);
        return (fecha.getFullYear() === anio && fecha.getMonth() === mes && fecha.getDate() === dia) ? fecha : null;
      },
      normalizarFechaISO: function (valorFecha, incluirHora = false, timeZone = null) {
        if (valorFecha === undefined || valorFecha === null) return '-';
        if (valorFecha instanceof Date) {
          return this.formatearAFechaISO(valorFecha, incluirHora, timeZone);
        }
        const str = String(valorFecha).trim();
        if (str === '' || str === '-') return '-';
        const objetoFecha = this.parsearFechaISO(str);
        if (objetoFecha) {
          return this.formatearAFechaISO(objetoFecha, incluirHora, timeZone);
        }
        const parsedNative = new Date(str);
        if (!isNaN(parsedNative.getTime())) {
          return this.formatearAFechaISO(parsedNative, incluirHora, timeZone);
        }
        return str;
      },
      generarUUIDCorto: function (prefijo = '') {
        const bloqueUuid = Utilities.getUuid().split('-')[0].toUpperCase();
        return `${prefijo}${bloqueUuid}`;
      },
      formatearNombreUsuario: function (input) {
        if (!input || typeof input !== 'string') return 'Sistema';
        let texto = input.trim();
        if (texto.includes('@')) {
          texto = texto.split('@')[0];
        }
        texto = texto.replace(/[\._\-]+/g, ' ');
        return texto
          .split(/\s+/)
          .filter(word => word.length > 0)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      },
      sanitizarTexto: function (val) {
        if (val === undefined || val === null) return '';
        return String(val)
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
      },
      obtenerValorCampo: function (objeto, clavesPosibles) {
        if (!objeto || typeof objeto !== 'object') return '';
        for (const clave of clavesPosibles) {
          const claveSanitizada = this.sanitizarTexto(clave);
          if (objeto[claveSanitizada] !== undefined && objeto[claveSanitizada] !== null && String(objeto[claveSanitizada]).trim() !== '') {
            return objeto[claveSanitizada];
          }
        }
        return '';
      }
    },
    Datos: (function () {
      const memoryCache = {};
      function leerHojaComoObjetos(spreadsheetId, sheetName) {
        const cacheKey = `${spreadsheetId}_${sheetName}`;
        if (memoryCache[cacheKey]) return memoryCache[cacheKey];
        try {
          const ss = spreadsheetId && String(spreadsheetId).trim() !== ''
            ? SpreadsheetApp.openById(spreadsheetId)
            : SpreadsheetApp.getActiveSpreadsheet();
          const sheet = ss.getSheetByName(sheetName);
          if (!sheet) return [];
          const data = sheet.getDataRange().getValues();
          if (data.length <= 1) return [];
          const headers = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
          const rows = data.slice(1);
          const resultado = rows.map((row, index) => {
            const obj = { _filaFisica: index + 2 };
            headers.forEach((header, i) => {
              if (header) obj[header] = row[i];
            });
            return obj;
          });
          memoryCache[cacheKey] = resultado;
          return resultado;
        } catch (e) {
          console.error(`❌ [AppCore.Datos] Error leyendo hoja ${sheetName}: ${e.message}`);
          return [];
        }
      }
      return {
        obtenerDatosHoja: function (spreadsheetId, sheetName) {
          return leerHojaComoObjetos(spreadsheetId, sheetName);
        },
        get CANALES_DINAMICOS() {
          const config = globalThis.AppCore.CONFIG;
          const data = leerHojaComoObjetos(config.BD_REHAB_ID, config.SHEET_USUARIOS);
          const canalesSet = new Set();
          data.forEach(row => {
            const valCanal = AppCore.Utilidades.obtenerValorCampo(row, ["Canales", "Nombre canal", "Canal"]);
            if (valCanal && String(valCanal).trim() !== "") {
              canalesSet.add(String(valCanal).trim());
            }
          });
          return Array.from(canalesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        },
        limpiarCache: function () {
          for (const k in memoryCache) delete memoryCache[k];
        }
      };
    })(),
    Logs: {
      buffer: [],
      info: function (msg) {
        const logItem = `[INFO] [${new Date().toISOString()}] ${msg}`;
        console.log(logItem);
        this.buffer.push(logItem);
      },
      error: function (msg, err) {
        const logItem = `[ERROR] [${new Date().toISOString()}] ${msg} | ${err ? err.stack || err.message : ''}`;
        console.error(logItem);
        this.buffer.push(logItem);
      },
      obtenerBuffer: function () { return this.buffer; }
    }
  };
})();


// ALIAS DE COMPATIBILIDAD RETROACTIVA
const CONFIG = AppCore.CONFIG;
function formatearAFechaISO(fecha, incluirHora, timeZone) { return AppCore.Utilidades.formatearAFechaISO(fecha, incluirHora, timeZone); }
function parsearFechaISO(fechaISO) { return AppCore.Utilidades.parsearFechaISO(fechaISO); }
function normalizarFechaISO(valorFecha, incluirHora, timeZone) { return AppCore.Utilidades.normalizarFechaISO(valorFecha, incluirHora, timeZone); }
function generarSiguienteIdSolicitud() { return AppCore.Utilidades.generarUUIDCorto('REH-'); }
function generarSiguienteIdUsuario() { return AppCore.Utilidades.generarUUIDCorto('USR-'); }
function obtenerCincoDigitosNumericosAleatorios() { return String(Math.floor(Math.random() * 100000)).padStart(5, '0'); }
function formatearNombreUsuario(input) { return AppCore.Utilidades.formatearNombreUsuario(input); }
function sanitizarTexto(val) { return AppCore.Utilidades.sanitizarTexto(val); }
function getSheetDataAsObjects(spreadsheetId, sheetName) { return AppCore.Datos.obtenerDatosHoja(spreadsheetId, sheetName); }
function getCanalesDinamicos() { return AppCore.Datos.CANALES_DINAMICOS; }


/**
 * Función bajo demanda para asignar IDs a los usuarios agregados manualmente
 * que no cuenten con uno en la hoja de USUARIOS.
 * Ejecutar desde el editor de Apps Script cuando sea necesario (no en cada carga).
 */
function completarIdsUsuariosManuales() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.BD_REHAB_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_USUARIOS);


    if (!sheet) {
      AppCore.Logs.error("Hoja de usuarios no encontrada para autocompletar IDs.");
      return;
    }


    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;


    const headers = data[0].map(h => AppCore.Utilidades.sanitizarTexto(h));
    const colIdIndex = headers.findIndex(h => h.includes('ID USUARIO') || h === 'ID');


    if (colIdIndex === -1) {
      AppCore.Logs.error("Columna de ID de usuario no encontrada.");
      return;
    }


    let actualizados = 0;
    for (let i = 1; i < data.length; i++) {
      const celdaId = data[i][colIdIndex];
      if (!celdaId || String(celdaId).trim() === '') {
        const nuevoId = generarSiguienteIdUsuario();
        sheet.getRange(i + 1, colIdIndex + 1).setValue(nuevoId);
        actualizados++;
      }
    }


    AppCore.Logs.info(`Ids manuales autocompletados con éxito: ${actualizados} registros actualizados.`);
  } catch (e) {
    AppCore.Logs.error("Error en completarIdsUsuariosManuales: ", e);
  }
}
