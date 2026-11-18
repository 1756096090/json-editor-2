import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExplainModeService {
  readonly enabled = signal(false);

  describe(text: string): string {
    const value = text.toLowerCase();
    if (/resize|redimensionar/.test(value)) return 'Arrastra el separador hacia la izquierda o la derecha para dar más espacio a un panel. Haz doble clic para volver a 50/50. Con el separador enfocado, usa las flechas; Shift mueve en pasos mayores.';
    if (/schema|esquema/.test(value)) return 'Genera un JSON Schema a partir del documento actual: describe tipos, propiedades y campos requeridos. Lo abre en el panel contrario y crea una pestaña nueva si ya contiene datos. Necesitas un JSON válido.';
    if (/compare|comparación/.test(value)) return 'Compara los documentos de ambos paneles y resalta sus diferencias para revisar cambios. Ambos deben usar el mismo formato. Pulsa de nuevo para salir de la comparación.';
    if (/intercambiar|swap/.test(value)) return 'Intercambia los documentos de los dos paneles para cambiar su posición sin copiar y pegar manualmente.';
    if (/copiar el contenido de/.test(value)) return 'Transfiere todo el documento al otro panel. Revisa el contenido de destino antes de confirmar, porque esta acción lo reemplaza. No es una copia al portapapeles.';
    if (/format/.test(value)) return 'Organiza el documento con sangría y saltos de línea para leer su estructura. No cambia los valores. Usa Ctrl+Shift+F para hacerlo desde el teclado.';
    if (/minify/.test(value)) return 'Quita espacios y saltos de línea innecesarios para obtener un JSON compacto. Conserva los valores y resulta útil al preparar un payload. Atajo: Ctrl+M.';
    if (/clean/.test(value)) return 'Abre las opciones de limpieza para eliminar valores nulos, cadenas vacías y estructuras vacías de forma recursiva. Revisa las opciones antes de aplicarlas.';
    if (/sort/.test(value)) return 'Ordena alfabéticamente las claves de los objetos JSON para facilitar su lectura y comparación. El orden de los elementos de los arrays se conserva.';
    if (/url/.test(value)) return 'Importa un documento desde una URL al panel elegido. El servidor debe permitir el acceso desde el navegador; si la importación falla, puedes abrir un archivo local.';
    if (/open|disk/.test(value)) return 'Abre un archivo local en este panel. También puedes arrastrar un archivo sobre el editor para empezar a trabajar con su contenido.';
    if (/clipboard|copy/.test(value)) return 'Copia el contenido completo de la vista actual al portapapeles para pegarlo en tu proyecto. En YAML, CSV o XML se copia el formato que estás viendo.';
    return text;
  }
}
