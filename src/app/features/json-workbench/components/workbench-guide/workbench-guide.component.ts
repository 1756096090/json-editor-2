import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { IconComponent } from '../../../../components/ui/icon/icon.component';

@Component({
  selector: 'app-workbench-guide',
  imports: [IconComponent],
  templateUrl: './workbench-guide.component.html',
  styleUrl: './workbench-guide.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchGuideComponent {
  readonly panelHeight = signal(180);
  private readonly content = viewChild<ElementRef<HTMLElement>>('guideContent');
  private drag: { y: number; height: number } | null = null;

  startResize(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.drag = { y: event.clientY, height: this.content()?.nativeElement.clientHeight ?? this.panelHeight() };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  resize(event: PointerEvent): void {
    if (this.drag) this.setHeight(this.drag.height + this.drag.y - event.clientY);
  }

  stopResize(event: PointerEvent): void {
    this.drag = null;
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  }

  resizeWithKeyboard(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.setHeight(this.panelHeight() + (event.key === 'ArrowUp' ? 20 : -20));
  }

  private setHeight(height: number): void {
    this.panelHeight.set(Math.max(80, Math.min(window.innerHeight * 0.5, height)));
  }

  readonly features = [
    { icon: 'open', title: 'Carga tus datos', tools: 'Open · Pegar · Arrastrar archivos', benefit: 'Abre un archivo local, arrástralo al editor o pega el contenido para empezar.' },
    { icon: 'format', title: 'De ilegible a claro', tools: 'Format · Minify · Sort', benefit: 'Da formato a una respuesta, compacta un payload y ordena claves sin editar línea por línea.' },
    { icon: 'repair', title: 'Encuentra y corrige errores', tools: 'Validación · Ubicación del error · Reparación', benefit: 'Salta a la línea del problema y revisa las reparaciones sugeridas antes de aplicarlas.' },
    { icon: 'clean', title: 'Prepara un payload', tools: 'Clean · Opciones de limpieza', benefit: 'Elimina valores nulos y estructuras vacías de forma recursiva sin recorrer cada objeto.' },
    { icon: 'compare', title: 'Detecta qué cambió', tools: 'Compare · Dos paneles · Intercambiar', benefit: 'Contrasta respuestas o configuraciones y localiza diferencias sin alternar entre ventanas.' },
    { icon: 'code', title: 'Cambia de formato', tools: 'JSON · YAML · CSV · XML', benefit: 'Reutiliza tus datos en otros formatos y exporta el resultado sin escribir un conversor.' },
    { icon: 'tree', title: 'Explora estructuras grandes', tools: 'Tree · Table · Rutas JSON · Buscar', benefit: 'Inspecciona objetos y copia la ruta de una propiedad para usarla en tu código.' },
    { icon: 'copy', title: 'Mantén el contexto', tools: 'Pestañas · Copiar · Transferir entre paneles', benefit: 'Trabaja con varios documentos y lleva el resultado a tu proyecto sin seleccionar todo a mano.' },
  ] as const;
}
