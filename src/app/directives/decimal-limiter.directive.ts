import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appDecimalLimiter]'
})
export class DecimalLimiterDirective {
  @Input()
  public decimalPlaces: number; // Lo uso para pasar la cantidad de decimales que quiero mostrar y limintar
  private regex: RegExp;

  // Teclas que pueden seguir siendo usadas luego aplicar el regex
  private specialKeys: Array<string> = [
    "Backspace",
    "Tab",
    "End",
    "Home",
    "-",
    "ArrowLeft",
    "ArrowRight",
    "Del",
    "Delete",
    "Enter",
    "."
  ];

  constructor(private el: ElementRef) {}

  @HostListener("keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    this.regex = this.RegexGenerator(this.decimalPlaces);

    if (this.regex === null) {
      throw new Error(`Decimales no definidos: ${this.decimalPlaces}`);
    }
    // Validacion para poder usar las teclas definidas en specialKeys
    if (this.specialKeys.indexOf(event.key) !== -1) {
      return;
    }
    let current: string = this.el.nativeElement.value;
    const position = this.el.nativeElement.selectionStart;
    const next: string = [
      current.slice(0, position),
      event.key == "Decimal" ? "." : event.key,
      current.slice(position)
    ].join("");
    if (next && !String(next).match(this.regex)) {
      event.preventDefault();
    }
  }
  /*
    Para poder indicar cuantos decimales se usaran, esto se puede mejorar
    pasando la variable a el regex, pero en el momento de implementar esta solucion
    no disponia de los conocimientos necesarios para realizar dicha maniobra
  */
  RegexGenerator(_decimalRange: number): RegExp {
    _decimalRange--;
    let regex: RegExp = new RegExp(`^\\d*\\.?\\d{0,${_decimalRange}}$`, 'g');
    return regex;
    // switch (_decimalRange) {
    //   case 1:
    //     regex = new RegExp(/^\d*\.?\d{0,1}$/g);
    //     break;
    //   case 2:
    //     regex = new RegExp(/^\d*\.?\d{0,2}$/g);
    //     break;
    //   case 3:
    //     regex = new RegExp(/^\d*\.?\d{0,3}$/g);
    //     break;
    //   case 4:
    //     regex = new RegExp(/^\d*\.?\d{0,4}$/g);
    //     break;
    //   case 5:
    //     regex = new RegExp(/^\d*\.?\d{0,5}$/g);
    //     break;
    //   case 6:
    //     regex = new RegExp(/^\d*\.?\d{0,6}$/g);
    //     break;
    // }
    // return regex;
  }
}
