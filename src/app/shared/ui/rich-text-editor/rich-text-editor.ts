import { Component, ElementRef, effect, forwardRef, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// Editor tipo Moodle: un modo visual (contenteditable + document.execCommand, la misma
// API detrás de la mayoría de los editores WYSIWYG livianos) y un modo "ver HTML" que
// expone el código fuente crudo para editarlo a mano.
@Component({
  selector: 'app-rich-text-editor',
  imports: [],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditor),
      multi: true,
    },
  ],
})
export class RichTextEditor implements ControlValueAccessor {
  // viewChild() en vez de @ViewChild: el div solo existe en el DOM cuando isSourceMode()
  // es false (vive detrás de un @if), así que necesitamos una señal que se actualice sola
  // cuando el elemento aparece/desaparece -- @ViewChild clásico queda desactualizado un
  // ciclo, justo cuando se vuelve del modo HTML al visual.
  private readonly editableRef = viewChild<ElementRef<HTMLDivElement>>('editable');

  protected readonly isSourceMode = signal(false);
  protected readonly sourceHtml = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly formatOptions = [
    { tag: 'p', label: 'Párrafo' },
    { tag: 'h2', label: 'Título' },
    { tag: 'h3', label: 'Subtítulo' },
    { tag: 'h4', label: 'Encabezado' },
  ];

  // Señal "de repuesto" que solo existe para forzar al effect de abajo a volver a
  // correr cuando cambia el HTML por una vía que no es que el propio div aparezca
  // (p.ej. writeValue() del formulario, o volver del modo HTML).
  private readonly syncTrigger = signal(0);
  private currentHtml = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const ref = this.editableRef();
      this.syncTrigger();
      if (ref) ref.nativeElement.innerHTML = this.currentHtml;
    });
  }

  writeValue(value: string | null): void {
    this.currentHtml = value ?? '';
    this.sourceHtml.set(this.currentHtml);
    this.syncTrigger.update((n) => n + 1);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  exec(command: string, value?: string): void {
    document.execCommand(command, false, value);
    this.emitChangeFromEditable();
    this.editableRef()?.nativeElement.focus();
  }

  setFormatBlock(tag: string): void {
    this.exec('formatBlock', `<${tag}>`);
  }

  onEditableInput(): void {
    this.emitChangeFromEditable();
  }

  onSourceInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.sourceHtml.set(value);
    this.currentHtml = value;
    this.onChange(value);
  }

  toggleSourceMode(): void {
    if (this.isSourceMode()) {
      this.currentHtml = this.sourceHtml();
      this.onChange(this.currentHtml);
      this.syncTrigger.update((n) => n + 1);
    } else {
      this.currentHtml = this.editableRef()?.nativeElement.innerHTML ?? '';
      this.sourceHtml.set(this.currentHtml);
    }
    this.isSourceMode.set(!this.isSourceMode());
  }

  private emitChangeFromEditable(): void {
    this.currentHtml = this.editableRef()?.nativeElement.innerHTML ?? '';
    this.onChange(this.currentHtml);
    this.onTouched();
  }
}
