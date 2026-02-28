import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { JsonTreeViewComponent } from '../../../../components/ui/json-tree-view/json-tree-view.component';
import { JsonTableViewComponent } from '../../../../components/ui/json-table-view/json-table-view.component';
import { SegmentedControlComponent, SegmentItem } from '../../../../components/ui/segmented-control/segmented-control.component';
import { EmptyStateComponent } from '../../../../components/ui/empty-state/empty-state.component';
import { buildBracketHighlightHtml } from '../../utils/bracket-utils';
import { LeftPanelMode } from '../../state/workbench.store';

const VIEW_MODES: SegmentItem[] = [
  { value: 'text', label: 'Text' },
  { value: 'tree', label: 'Tree' },
  { value: 'table', label: 'Table' }
];

@Component({
  selector: 'app-editor-panel',
  imports: [JsonTreeViewComponent, JsonTableViewComponent, SegmentedControlComponent, EmptyStateComponent],
  templateUrl: './editor-panel.component.html',
  styleUrl: './editor-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EditorPanelComponent {
  readonly rawText = input<string>('');
  readonly panelTitle = input<string>('RAW editor');
  readonly leftMode = input<LeftPanelMode>('text');
  readonly mismatchedIndexes = input<readonly number[]>([]);
  readonly jsonValue = input<unknown>(null);

  readonly rawTextChange = output<string>();
  readonly fileDropped = output<File>();
  readonly modeChange = output<LeftPanelMode>();

  @ViewChild('overlayRef', { static: true }) private overlayRef?: ElementRef<HTMLElement>;

  readonly viewModes = VIEW_MODES;
  readonly draggingFile = signal(false);

  readonly highlightedHtml = computed(() =>
    buildBracketHighlightHtml(this.rawText(), this.mismatchedIndexes())
  );

  readonly mismatchCount = computed(() => this.mismatchedIndexes().length);

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.rawTextChange.emit(textarea.value);
  }

  setMode(mode: string): void {
    this.modeChange.emit(mode as LeftPanelMode);
  }

  onScroll(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay) {
      return;
    }

    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);

    const file = event.dataTransfer?.files?.item(0);
    if (!file) {
      return;
    }

    this.fileDropped.emit(file);
  }
}
