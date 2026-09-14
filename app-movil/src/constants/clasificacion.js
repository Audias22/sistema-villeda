/**
 * Constantes de clasificación de expedientes notariales.
 *
 * Viven acá y no repetidas en cada pantalla porque ID_AREA_NOTARIAL estaba
 * duplicado en BusquedaScreen y ReportesScreen, y los ids de las clases del
 * modelo son el tipo de dato que no puede divergir entre archivos.
 */

// id_area del área Notarial. Los 390 expedientes del despacho son de esa área.
// Se usa para pedirle al catálogo solo sus tipos:
//   GET /catalogos/tipos-expediente?id_area=1
export const ID_AREA_NOTARIAL = 1

/**
 * Los cuatro tipos que el modelo de clasificación puede predecir.
 *
 * ⚠️ SON IDS, NO POSICIONES. Los ids del catálogo NO son consecutivos y NO
 * siguen el orden de las clases del modelo:
 *
 *      1  Compraventa          <- clase del modelo
 *      2  Mandato
 *      3  Testamento           (INACTIVO)
 *      4  Acta notarial        (INACTIVO)
 *     15  Donación             <- clase del modelo
 *     16  Declaración Jurada   <- clase del modelo
 *     17  Matrimonio
 *     18  Otro                 <- clase del modelo
 *
 * Filtrar por índice o por posición en el arreglo (0→1, 1→2, 2→3, 3→4) haría
 * coincidir la cuarta clase con "Acta notarial", que además está inactivo.
 * SIEMPRE comparar contra estos ids.
 */
export const IDS_CLASES_MODELO = [1, 15, 16, 18]

/**
 * Deja solo los tipos que el modelo puede predecir.
 *
 * Se usa ÚNICAMENTE en la pantalla de Búsqueda. El reparto es deliberado:
 *
 *   Búsqueda     refleja las CLASES DEL MODELO (4). Es la pantalla medida, la
 *                que registra TBR en la tabla busquedas, y ofrecer tipos que
 *                el modelo nunca asigna solo produce búsquedas vacías.
 *
 *   Expedientes  refleja el CATÁLOGO COMPLETO (6 activos), sin filtrar. No es
 *                una pantalla medida, y así un expediente corregido a Mandato o
 *                Matrimonio desde el modal de confirmación del panel sigue
 *                siendo encontrable desde el teléfono.
 */
export function soloClasesDelModelo(tipos) {
  return (tipos || []).filter((t) => IDS_CLASES_MODELO.includes(t.id_tipo))
}
