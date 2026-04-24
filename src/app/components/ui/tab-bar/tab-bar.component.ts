import { ChangeDetectionStrategy, Component, input, output, signal, viewChild, AfterViewInit, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Tab } from '../../../core/tabs.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tab-bar.component.html',
  styleUrl: './tab-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TabBarComponent implements AfterViewInit {
  readonly tabs = input.required<Tab[]>();
  readonly activeTabId = input.required<string>();
  readonly panelLabel = input<string>('');
  readonly tabClicked = output<string>();
  readonly tabClosed = output<string>();
  readonly addTab = output<void>();
  readonly panelLabelChanged = output<string>();

  readonly isEditingLabel = signal(false);
  readonly editingLabelValue = signal('');
  private readonly labelInput = viewChild<ElementRef>('labelInput');
  
  private lastClickTime = 0;
  private readonly doubleClickDelay = 300;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    // Sin necesidad de hacer nada aquí
  }

  onLabelClick(): void {
    const now = Date.now();
    const isDoubleClick = (now - this.lastClickTime) < this.doubleClickDelay;
    this.lastClickTime = now;
    
    console.log('Click en label:', { isDoubleClick, lastClickTime: this.lastClickTime, now });
    
    if (isDoubleClick) {
      this.startEditingLabel();
    }
  }

  startEditingLabel(): void {
    console.log('Iniciando edición del label');
    this.editingLabelValue.set(this.panelLabel());
    this.isEditingLabel.set(true);
    this.cdr.markForCheck();
    
    // Asegurar enfoque después de que el template se actualice
    setTimeout(() => {
      const input = this.labelInput()?.nativeElement;
      console.log('Input element:', input);
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }

  onLabelEditFinish(): void {
    console.log('Finalizando edición del label');
    const newLabel = this.editingLabelValue().trim();
    const currentLabel = this.panelLabel().trim();
    
    console.log('Comparando labels:', { newLabel, currentLabel, igual: newLabel === currentLabel });
    
    if (newLabel && newLabel !== currentLabel) {
      console.log('Emitiendo cambio:', newLabel);
      this.panelLabelChanged.emit(newLabel);
    }
    this.isEditingLabel.set(false);
    this.lastClickTime = 0; // Reset para siguiente doble click
    this.cdr.markForCheck();
  }
}
