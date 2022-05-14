import { Directive, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
  selector: '[ctrlKeys]',
})
export class CtrlKeysDirective  {
  @Output() ctrlB = new EventEmitter();

  @HostListener('keydown.control.b') onCtrlB() {
    this.ctrlB.emit();
  }
}