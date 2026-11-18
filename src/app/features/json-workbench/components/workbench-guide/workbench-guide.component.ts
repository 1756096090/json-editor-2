import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { IconComponent } from '../../../../components/ui/icon/icon.component';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-workbench-guide',
  imports: [TranslatePipe, IconComponent],
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
    { icon: 'open', title: 'guide.f1.title', tools: 'guide.f1.tools', benefit: 'guide.f1.benefit' },
    { icon: 'format', title: 'guide.f2.title', tools: 'guide.f2.tools', benefit: 'guide.f2.benefit' },
    { icon: 'repair', title: 'guide.f3.title', tools: 'guide.f3.tools', benefit: 'guide.f3.benefit' },
    { icon: 'clean', title: 'guide.f4.title', tools: 'guide.f4.tools', benefit: 'guide.f4.benefit' },
    { icon: 'compare', title: 'guide.f5.title', tools: 'guide.f5.tools', benefit: 'guide.f5.benefit' },
    { icon: 'code', title: 'guide.f6.title', tools: 'guide.f6.tools', benefit: 'guide.f6.benefit' },
    { icon: 'tree', title: 'guide.f7.title', tools: 'guide.f7.tools', benefit: 'guide.f7.benefit' },
    { icon: 'copy', title: 'guide.f8.title', tools: 'guide.f8.tools', benefit: 'guide.f8.benefit' },
  ] as const;
}
