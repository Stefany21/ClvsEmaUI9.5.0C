import { Component, OnInit, ElementRef, ViewChild, Inject, ViewChildren, QueryList, DoCheck, HostListener, } from '@angular/core';
import { AlertService } from '../../../services/alert.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription, Observable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ItemService, PermsService, AuthenticationService, StorageService, CommonService } from 'src/app/services';
import { debounceTime, map, distinctUntilChanged, filter } from 'rxjs/operators';
import { IItemModel } from '../../../models/i-item';
import { GoodsReceiptStockService } from '../../../services/goodsReceiptStockService';
import { StoreService } from '../../../services/store.service';
import { ILine } from '../../../models/i-line';
import { TaxService } from '../../../services/tax.service';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { EventManager } from '@angular/platform-browser';
import { Renderer2 } from '@angular/core';

import { IPrice } from 'src/app/models/i-price';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Company, IKValue, IUdf, IUdfTarget } from 'src/app/models';
import { DOCUMENT_ALIAS } from 'src/app/models/constantes';
import { UdfsService } from 'src/app/services/udfs.service';
import { IudfValue } from 'src/app/models/iudf-value';
import { DOCUMENT } from '@angular/common';
@Component({
  selector: 'app-stock-goodissue',
  templateUrl: './stock-goodissue.component.html',
  styleUrls: ['./stock-goodissue.component.scss']
})
export class StockGoodissueComponent implements OnInit, DoCheck {

  //VARBOX
  whCode:string;
  isProcessing: boolean;
  isScanning: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  Comment: string;
  @ViewChild('scrollMe') private myScrollContainer: ElementRef; // Se usa para que la tabla haga autoscroll
  @ViewChild('name') inputEl: ElementRef; // Lo uso para mandarle el autofocus cuando se escanea el codigo de barras
  permisos = true; // Comprueba los permisos del usuario
  lines: ILine[]; // Representa la linea del producto que se ingresa
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  itemsList: IItemModel[]; // Contiene el nombre de los productos, preformateados desde el api y el codigo de estos
  taxesList: any; // Contiene la lista de impuestos registrados en el sistema
  @BlockUI() blockUI: NgBlockUI; // Usado para bloquear la interfaz de usuario
  currentUser: any; // variable para almacenar el usuario actual
  totalLines: number; // Guarda la sumatoria de todas las linea con (precio unitario * cantidad)
  item: IItemModel; // Model para el typeahead, cuando se lecciona un item de la lista este lo almacena
  UnitPrice: number;
  Quantity: number;
  SubTotal: number; // Guarda
  WareHouse: string; // Guarda el id del almacen del dropdown global
  unitPriceSelectBox: string; // Guarda el id del almacen del dropdown global
  Stores: any; // Guarda todos los almacenes de la empresa
  DiscountTotal: number;
  TaxesTotal: number;
  USTotal: number; // Total en dolares
  CRCTotal: number; // Total en colones
  barcodeModel: any; // Usando para sacar el codigo de barras de un producto, de la lista de codigos que este tiene
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  ListaPrecio: number; //Almacena lista precios
  QuantyList: number[] = [];
  x: number = 0;
  /**/
  priceListOld: IPrice[]; // Respaldo de la lista editada
  exitForm: FormGroup; // inputs salida de inventario

  COMPANY: Company;
  TO_FIXED_PRICE: string;
  TO_FIXED_TOTALLINE: string;
  TO_FIXED_TOTALDOCUMENT: string;
  isOnEditMode = false;
  canDrag: boolean;
  currentIndex: number;
  udfs: IUdf[];
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  uniqueDocumentID:string;
  ItemInfo: FormControl = new FormControl();
  searchTypeManual: boolean; // Validación por 2ble petición en typeahead cuando se agrega ítem por búsqueda manual,sin scanner.
  

  @ViewChild('editQuantityId') editQuantityId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  @ViewChild('editUnitPriceId') editUnitPriceyId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  @ViewChild('editTotalLineId') editTotalLineId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar

  fItemName = (x: { ItemName: string }) => x.ItemName; // Formateador para el nombre de los productos
  sItemName = (text$: Observable<string>) => text$.pipe( // Busca en el nombre de item la coincidencia por codigo de barras, nombre, codigo item
    debounceTime(5),
    distinctUntilChanged(),
    map(term => term === '' ? []
      : this.itemsList.filter(v => v.ItemName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 3)));

            
searchItemCode = this.IS();

IS() {
  return (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(15),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.itemsTypeaheadList.filter(v => {

          let a = v.toLowerCase();

          const stringSize = a.length;

          const t = term.toLowerCase();

          if (this.itemsTypeaheadList.find(r => r === t)) return true;

          const b = t.split('*').filter(x => x !== '');

          const size = b.length;

          let isSorted = true;

          if (size > 1) {

            let indexes = [];

            for (let c = 0; c < size; c++) {
              b[c] = b[c].replace(' ', '');
              let ii = a.indexOf(b[c]);
              if (ii > -1) {
                ii++;
                a = a.slice(ii, stringSize);
                if (indexes.length > 0) indexes.push(indexes[indexes.length - 1] + ii);
                else indexes.push(ii);
              }
            }

            let sizeIndexes = indexes.length;

            if (sizeIndexes === size) {
              for (let c = 0; c < sizeIndexes - 1; c++) {
                if (indexes[c] > indexes[c + 1]) {
                  isSorted = false;
                  c = sizeIndexes;
                }
              }
              return isSorted;
            }
          }
          return v.toLowerCase().indexOf(term.toLowerCase()) > -1;
        }).sort((x, y) => x.toLowerCase().indexOf(term.toLowerCase()) - y.toLowerCase().indexOf(term.toLowerCase())).slice(0, 50))
    );
}

  // searchItemCode = (text$: Observable<string>) =>
  //   text$.pipe(
  //     debounceTime(15),
  //     distinctUntilChanged(),
  //     map(term => term.length < 1 ? []
  //       : this.itemsTypeaheadList.filter(v => {

  //         let a = v.toLowerCase();

  //         const stringSize = a.length;

  //         const t = term.toLowerCase();

  //         if (this.itemsTypeaheadList.find(r => r === t)) return true;

  //         const b = t.split('*').filter(x => x !== '');

  //         const size = b.length;

  //         let isSorted = true;

  //         if (size > 1) {

  //           let indexes = [];

  //           for (let c = 0; c < size; c++) {
  //             b[c] = b[c].replace(' ', '');
  //             // const invalid = /[°"§%()\[\]{}=\\?´`'#<>|,;.:+_-]+/g;
  //             // b[c] = b[c] .replace(invalid, '');
  //             let ii = a.indexOf(b[c]);
  //             if (ii > -1) {
  //               ii++;
  //               a = a.slice(ii, stringSize);
  //               if (indexes.length > 0) indexes.push(indexes[indexes.length - 1] + ii);
  //               else indexes.push(ii);
  //             }
  //           }

  //           let sizeIndexes = indexes.length;

  //           if (sizeIndexes === size) {
  //             for (let c = 0; c < sizeIndexes - 1; c++) {
  //               if (indexes[c] > indexes[c + 1]) {
  //                 isSorted = false;
  //                 c = sizeIndexes;
  //               }
  //             }
  //             return isSorted;
  //           }
  //         }
  //         return v.toLowerCase().indexOf(term.toLowerCase()) > -1;
  //       }).sort((x, y) => x.toLowerCase().indexOf(term.toLowerCase()) - y.toLowerCase().indexOf(term.toLowerCase())).slice(0, 50))
  //   )

  constructor(private eventManager: EventManager,
    private modalService: NgbModal,
    private storage: StorageService,
    private itemsService: ItemService,
    private alertService: AlertService,
    private authenticationService: AuthenticationService,
    private sPerm: PermsService,
    private goodsReciptStockService: GoodsReceiptStockService,
    private storeService: StoreService,
    private fb: FormBuilder,
    private commonService:CommonService,
    private taxesService: TaxService,
    private formBuilder: FormBuilder,
    @Inject(DOCUMENT) private _document: Document,
    private renderer: Renderer2,
    private elRef: ElementRef,
    private udfService: UdfsService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });


    const removeGlobalEventListener = this.eventManager.addGlobalEventListener(
      'document',
      'keyup',
      (ev) => {
        if (this.ItemInfo && this.ItemInfo.value) {
          if (Number(this.ItemInfo.value.toString())) {
            this.isScanning = true;
            this.buildedData = this.ItemInfo.value;
          }
          if (ev.key === 'Enter') {
            if (this._document && this._document.activeElement && this._document.activeElement.id && this._document.activeElement.id == 'ItemCodeManualTrigger') {
              this.isLockedByScanner = true;
              this.isScanning = false;
            }
          }
        }
      }
    );

  }


  // @HostListener('window:keyup', ['$event'])
  // keyEvent(ev: KeyboardEvent) {
  //   if (this.exitForm.value.ItemInfo && this.exitForm.value.ItemInfo.value) {
  //     if (Number(this.exitForm.value.ItemInfo.value.toString())) {
  //       this.isScanning = true;
  //       this.buildedData = this.exitForm.value.ItemInfo.value;
  //     }
  //     console.log(ev);

  //     if (ev.key === 'Enter') {
  //       this.isLockedByScanner = true;
  //       this.isScanning = false;
  //     }
  //   }
  // }

  // ngDoCheck(): void {
  //   const parent: HTMLElement = document.getElementById('scrollable-dropdown-menu');
  //   if (parent) {
  //     if (parent.children.length > 0) {
  //       const child = parent.children[1];
  //       if (child) {
  //         this.renderer.setStyle(child, 'max-height', '300px');
  //         this.renderer.setStyle(child, 'overflow-y', 'auto');
  //       }
  //     }
  //   }

  //   if (this.isLockedByScanner && this.itemsTypeaheadList.find(x => x.indexOf(this.exitForm.value.ItemInfo) > -1)) {
  //     try {
  //       let buttons = document.getElementsByClassName('dropdown-item');
  //       setTimeout(() => {
  //         if (buttons[0]) {
  //           let dynamicId = buttons[0].getAttribute('id');
  //           if (dynamicId) {
  //             if (dynamicId.indexOf('ngb-typeahead') < 0 || !(<HTMLButtonElement>document.getElementById(dynamicId))) {
  //               this.alertService.infoAlert('No se pudo identificar identificar la generación dinámica del componente, por favor seleccione el producto manualmente');
  //             }
  //             else {
  //               (<HTMLButtonElement>document.getElementById(dynamicId)).click();
  //             }
  //           }
  //         }
  //       });
  //       this.isLockedByScanner = false;
  //     }
  //     catch (error) {
  //       this.alertService.infoAlert(`Error: ${error}`);
  //       this.isLockedByScanner = false;
  //     }
  //   }
  //   else {
  //     if (this.isLockedByScanner && !this.isScanning && !(this.itemsTypeaheadList.find(x => x.indexOf(this.exitForm.value.ItemInfo) > -1))) {
  //       this.alertService.infoInfoAlert(`No existe ${this.exitForm.value.ItemInfo}`);
  //       this.exitForm.patchValue({ ItemInfo: '' });
  //       this.isLockedByScanner = false;
  //     }
  //   }
  // }

  ngDoCheck(): void {
    const parent: HTMLElement = document.getElementById('scrollable-dropdown-menu');
    if (parent) {
      if (parent.children.length > 0) {
        const child = parent.children[1];
        if (child) {
          this.renderer.setStyle(child, 'max-height', '300px');
          this.renderer.setStyle(child, 'overflow-y', 'auto');
        }
      }
    }


    if (this.isLockedByScanner && this.itemsTypeaheadList.find(x => x.indexOf(this.buildedData) > -1)) {
      try {
        let buttons = document.getElementsByClassName('dropdown-item');
        setTimeout(() => {
          let dynamicId = `hardcodedId`;
          if (buttons[0]) {
            dynamicId = buttons[0].getAttribute('id');
            // if (dynamicId) {
              if (dynamicId.indexOf('ngb-typeahead') < 0 || !(<HTMLButtonElement>document.getElementById(dynamicId))) {
                this.alertService.infoAlert('No se pudo identificar la generación dinámica del componente, por favor seleccione el producto manualmente');
              }
              else {
                (<HTMLButtonElement>document.getElementById(dynamicId)).click();
              }
            // }
            // else {
            //   (<HTMLButtonElement>document.getElementById('demoDrop')).focus();
            //   (<HTMLButtonElement>document.getElementById('demoDrop')).click();
            //   (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).focus();
            //   (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).click();
            //   this.isScanning = false;
            //   this.addItems(null, true);
            // }
          }
          else {
            (<HTMLButtonElement>document.getElementById('demoDrop')).focus();
            (<HTMLButtonElement>document.getElementById('demoDrop')).click();
            (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).focus();
            (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).click();
            this.isScanning = false;
            console.log(`dammit`);
            this.addItems(null, true);
          }
        }, 0);
        this.isLockedByScanner = false;
      }
      catch (error) {
        this.alertService.infoAlert(`Error: ${error}`);
        this.isLockedByScanner = false;
      }
    }
    else {
      if (this.isLockedByScanner && !this.isScanning && !(this.itemsTypeaheadList.find(x => x.indexOf(this.ItemInfo.value) > -1))) {
        this.alertService.infoInfoAlert(`No existe ${this.ItemInfo.value}`);
        this.isLockedByScanner = false;
      }
    }
  }


  setWarehouseInfo() {
    let session = this.storage.getSession(navigator.onLine);
    if (session) {
      session = JSON.parse(session);

      this.whCode = session.WhCode;
      
    }
  }




  ngOnInit() {
    this.setWarehouseInfo();
    this.checkPermits(); // Verifica si el usuario tiene permisos para acceder a la pagina
    this.blockUI.start();
    this.InitVariables();
    this.blockUI.start('Obteniendo información, espere por favor...');

    this.exitForm = this.fb.group({
      Quantity: [1],
      // ItemInfo: [''],
      unitPriceSelectBox: [''],
      WareHouse: ['']

    });

    // Obtiene la lista de almances de la compania
    this.storeService.getStoresv2().subscribe(response => {
      this.Stores = response.Stores;
      this.WareHouse = this.Stores[0].StoreCode;
    }, error => {   
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
    // Obtiene la lista de impuestos registrados en el sistema
    this.taxesService.GetTaxes().subscribe(response => {
      this.taxesList = response.Taxes;
    }); // Consume los impuesto y los setea a dicha lista desde el api

    // Obtiene los items para ser usados en el typeahead
    this.itemsService.GetItems().subscribe(response => {
      this.itemsList = [];
      this.itemsTypeaheadList = response.ItemList.ItemCompleteName;
      for (let c = 0; c < response.ItemList.ItemCompleteName.length; c++) {
        const NAME = response.ItemList.ItemCompleteName[c];
        const ITEM_CODE = response.ItemList.ItemCode[c];
        const tmpItem = {} as IItemModel;
        tmpItem.ItemName = NAME;
        tmpItem.ItemCode = ITEM_CODE;
        this.itemsList.push(tmpItem);
      }
      this.blockUI.stop();
    });

    if (this.itemsService.hasLines) {
      this.lines = this.itemsService.GetLines(this);
      this.recalculate();
    } else {
      console.log(this.itemsService.GetLines(this));
    }
    //Obtener lista de Precios
    this.goodsReciptStockService.GetAllPriceList().subscribe(response => {
      this.priceListOld = response.priceList;
      this.unitPriceSelectBox = response.priceList[9].ListNum;
      this.ListaPrecio = response.priceList[9].ListNum;

    });
    //this.unitPriceSelectBox.patchValue({ unitPriceSelectBox: this.priceListOld[0].ListName });
    // this.itemsService.GetPriceList().subscribe(response => {
    //   if (response.result) {
    //     this.priceListOld = [];
    //     //this.priceList = [];
    //     for (let c = 0; c < response.priceList.length; c++) {
    //       console.log('2')
    //       this.priceListOld.push({
    //         ListName: response.priceList[c].ListName,
    //         ListNum: response.priceList[c].ListNum,
    //         Price: 0,
    //       });
    //     }
    //    //this.priceList = this.priceListOld;
    //   }
    //   // console.log(response.priceList);
    // });
  }

  // addItems(item: any, _isTriggerdByUser: boolean): void {
  //   const ITEM_CODE = item.item.split(' ')[0];
  //   this.onThClick(ITEM_CODE, _isTriggerdByUser);
  //   item.preventDefault();
  //   //  this.ItemInfo.reset();
  //   this.exitForm.patchValue({ ItemInfo: '' });
  // }
  addItems(item: any, _isManualOverride = false): void {
    if (this.ItemInfo.value) {
      // let code = item.item.split(' COD. ')[0];

      let code = `harcodedCode`;
      let mobileNavigatorObject: any = window.navigator;  
      if (_isManualOverride) {

        if (this.searchTypeManual) {
          this.ItemInfo.setValue('');
          this.buildedData = ``;  
          return;
        }  

        for (let c = 0; c < this.itemsTypeaheadList.length; c++) {
          const BARCODE = this.itemsTypeaheadList[c].split(' COD. ')[1];
          if (BARCODE === this.ItemInfo.value || BARCODE === this.ItemInfo.value.split(' COD. ')[1]) {
            code = this.itemsTypeaheadList[c].split(' COD. ')[0];
          }
        }
        if (code == `harcodedCode`) {
          const ITEM = this.itemsTypeaheadList.find((x) => x.includes(this.ItemInfo.value));
          if (!ITEM) {
            this.alertService.infoInfoAlert(`No existe coincidencia para ${this.ItemInfo.value}`);
            this.ItemInfo.setValue('');
            this.inputEl.nativeElement.focus();
            return;
          }
          code = ITEM.split(" COD. ")[0];
        }

        if (code == `harcodedCode` && item && item.item) {
          code = item.item.split(' COD. ')[0];
        }
        this.searchTypeManual = false;
      }
      else {
        code = item.item.split(' COD. ')[0];
        this.searchTypeManual = true;
      }

      if (this.isProcessing) {
        this.exitForm.patchValue({ Quantity: 1 });
        // this.exitForm.patchValue({ ItemInfo: '' });
        this.ItemInfo.setValue('');

        this.buildedData = ``;
        return;
      }

      this.isProcessing = true;

      if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
        mobileNavigatorObject.clipboard.readText()
          .then(text => {
            this.blockUI.start('Obteniendo información del item');
            this.itemsService.GetItemByItemCode(code, 1).subscribe(response => {
              this.isProcessing = false;
              this.searchTypeManual = false;
              if (response.Result) {
                const LINE = {} as ILine;

                LINE.BarCode = response.Item.BarCode;
                LINE.ItemCode = response.Item.ItemCode;
                LINE.ItemName = response.Item.ItemName;
                LINE.Quantity = +this.exitForm.controls.Quantity.value > 0 ? +this.exitForm.controls.Quantity.value : 1;
                LINE.TaxCode = response.Item.TaxCode;

                LINE.Discount = response.Item.Discount;
                LINE.Tax_Rate = response.Item.TaxRate;
                LINE.TaxRate = response.Item.TaxRate;
                LINE.WareHouse = this.exitForm.controls.WareHouse.value;

                LINE.TotalLine = response.Item.LastPurchasePrice * LINE.Quantity;

                LINE.UnitPrice = +(Number(response.Item.LastPurchasePrice)).toFixed(4);


                //001
                LINE.LockedUnitPrice = LINE.UnitPrice;

                LINE.TotalLineWithTax = Number(((LINE.UnitPrice * LINE.Quantity) + ((LINE.UnitPrice * LINE.Quantity) * (Number(LINE.TaxRate) / 100))));


                if (this.lines.some(x => x.ItemCode === '----')) {
                  // if (this.isOnGroupLine) {
                  //   this.summarize(LINE);
                  // }
                  // else {
                  this.lines[this.lines.findIndex(x => x.ItemCode === '----')] = LINE;
                  // }
                }
                else {

                  this.lines.push(LINE);
                  //this.isOnGroupLine ? this.summarize(LINE) : this.isLineMode ? this.lines.push(LINE) : this.lines.unshift(LINE);
                }

                this.exitForm.patchValue({ Quantity: 1 });
                this.ItemInfo.setValue('');
                // this.exitForm.patchValue({ ItemInfo: '' });
                this.item = {} as IItemModel;
                setTimeout(() => this.inputEl.nativeElement.focus());
                this.recalculate();
                this.blockUI.stop();
              } else {
                this.blockUI.stop();
                this.alertService.errorAlert(`Ha ocurrido un error al obtener el producto. Código ${response.errorInfo.Code}, mensaje: ${response.errorInfo.Message}`);
              }   
            }, error => {
              this.isProcessing = false;
              this.searchTypeManual = false;
              this.blockUI.stop();
              this.alertService.errorAlert(`Ha ocurrido un error al obtener el producto. Código ${error.status}, mensaje: ${error.error}`);
              console.log(error);
            });

          })
          .catch(err => {
            console.log(err);
            this.searchTypeManual = false;
            this.isProcessing = false;
            this.blockUI.stop();
          });
      }

    }
  }
  // Funcion que recalcula el precio total, subtotal, descuentos, impuestos, sobre la lista de lineas
  recalculate(): void {
    this.totalLines = +this.lines.reduce((a, b) => a + ((b.UnitPrice * b.Quantity) || 0), 0).toFixed(2);
    this.TaxesTotal = +this.lines.reduce((a, b) => a + ((b.UnitPrice * b.Quantity) * (b.Tax_Rate / 100) || 0), 0).toFixed(2);
    this.DiscountTotal = +this.lines.reduce((a, b) => a + ((b.UnitPrice * b.Quantity) * (b.Discount / 100) || 0), 0).toFixed(2);
    this.CRCTotal = +this.lines.reduce((a, b) => a +
      (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) +
        (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) * (b.Tax_Rate / 100)) || 0), 0).toFixed(2);
    if (this.lines.length > 0) {
      this.itemsService.hasLines = true;
      this.itemsService.UpdateLines(this.lines);
    } else {
      this.itemsService.hasLines = false;
      this.itemsService.UpdateLines([]);
    }
  }
  ResetExitForm(): void {
    this.exitForm = this.formBuilder.group({
      Quantity: [1],
      // ItemInfo: [''],
      WareHouse: ['']
    });
  }
  onFocusOutEvent(event: any, type: string) {
    switch (+type) {
      case 0:
        this.inputs.toArray()[+event].nativeElement.focus();
        break;
      case 1:
        this.unitPrices.toArray()[+event].nativeElement.focus();
        break;
    }
  }
  isOnEditMode_ = false;

  @ViewChildren('quantities') inputs: QueryList<ElementRef>;
  @ViewChildren('unitPrices') unitPrices: QueryList<ElementRef>;
  @ViewChildren('totalLine') totalLine: QueryList<ElementRef>;
  // (blur)="onFocusOutEvent(i, '0')"
  lostFocus(index: number, type: number) {
    console.log(index);
    switch (+type) {
      case 0:
        this.inputs.toArray()[+index].nativeElement.focus();
        break;
      case 1:
        this.unitPrices.toArray()[+index].nativeElement.focus();
        break;
      case 2:
        this.totalLine.toArray()[+index].nativeElement.focus();
        break;
    }
  }

  lostEditFocus(): void {
    console.log('lost on edit ->');
    this.isOnEditMode = false;
  }

  toggleEdition(index: string, type: string): void {
    console.log('click' + index);
    this.isOnEditMode = true;
  }

  onFocusOutEdit(i: string) {
    console.log('lost on edit');
    this.isOnEditMode = false;
  }

  // Saca un item de la lista de lineas basado en su indice
  // removeItem(index: number) {
  //   this.lines = this.lines.filter((x, i) => i !== index);
  //   this.recalculate();
  // }
  // Evento para actualizar todos los almacenes con el dropdown global
  onSelectBoxChange(event: any): void {
    for (let c = 0; c < this.lines.length; c++) {
      this.lines[c].WareHouse = event.target.value;
    }
  }
  // Evento para actualizar el almacen de cada linea, basado en su indice
  onSelectBoxLineChange(event: any, index: number): void {
    this.lines[index].WareHouse = event.target.value;
  }
  // Evento para actulizar el impuesto de cada producto, basado en su indice
  onSelectBoxLineChangeTax(event: any, index: number): void {
    const TAX_CODE = event.target.value;
    const TAX = this.taxesList.filter(x => x.TaxCode === TAX_CODE)[0];
    this.lines[index].TaxCode = TAX.TaxCode;
    this.lines[index].Tax_Rate = +TAX.TaxRate;
    this.recalculate();
    // console.log(event.target.value, this.taxesList.filter(x=> {x.TaxCode === event.target.value}));
  }

  // Evento para seleccionar un item del type ahead y cargarlo en la lista de lineas
  onThClick(_itemCode: string, _isTriggerdByUser = false): void {
    if (this.isScanning && !_isTriggerdByUser) {
      this.isScanning = false;
      const ITEM = this.itemsTypeaheadList.find(x => x.includes(this.buildedData));
      this.buildedData = ``;
      if (!ITEM) {
        setTimeout(() => {
          this.ItemInfo.setValue('');
          // this.exitForm.patchValue({ ItemInfo: '' });
          this.Quantity = 1;
          this.item = {} as IItemModel;
        });

        let oldone = this.exitForm.value.ItemInfo;
        this.alertService.infoInfoAlert(`No existe ${oldone}`);

        return;
      }
      _itemCode = ITEM.split(' COD. ')[0];
    }
    this.blockUI.start('Obteniendo información del item');
    this.itemsService.GetItemByItemCode(_itemCode, 1).subscribe(response => {
      if (response.Result) {
        const LINE = {} as ILine;
        LINE.BarCode = response.Item.BarCode;
        LINE.ItemCode = response.Item.ItemCode;
        LINE.ItemName = response.Item.ItemName;
        LINE.Quantity = this.Quantity > 0 ? this.Quantity : 1;
        LINE.TaxCode = response.Item.TaxCode;
        LINE.UnitPrice = +(Number(response.Item.LastPurchasePrice)).toFixed(4);
        LINE.Discount = response.Item.Discount;
        LINE.Tax_Rate = response.Item.TaxRate;
        LINE.TaxRate = response.Item.TaxRate;
        LINE.WareHouse = this.WareHouse;
        LINE.TotalLine = response.Item.LastPurchasePrice * LINE.Quantity;

        if (this.lines.some(x => x.ItemCode === '----')) {
          this.lines[this.lines.findIndex(x => x.ItemCode === '----')] = LINE;
        }
        else {
          this.lines.push(LINE);
        }

        this.Quantity = 1;
        this.item = {} as IItemModel;
        setTimeout(() => this.inputEl.nativeElement.focus());
        this.recalculate();
        this.blockUI.stop();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert(response.Message);
      }
    });
    // }
  }
  // Evento para actualizar los diferentes datos de un item en la linea, segun su indice
  onKeyUp(i: number, event: any, field: string): void {
    if (event.target.value !== '') {
      switch (+field) {
        case 0:
          this.lines[i].Quantity = +event.target.value;
          break;
        case 1:
          this.lines[i].UnitPrice = +event.target.value;
          break;
        case 2:
          this.lines[i].Discount = +event.target.value;
          break;
        case 4:
          this.lines[i].UnitPrice = +event.target.value / this.lines[i].Quantity;
          break;
      }
      this.recalculate();
    }
  }

  //001 Metodo para los cambios en los inputs de la tabla de items
  focusOut(event: any, i: number, field: string): void {

   
    switch (+field) {
      case 0:
        this.lines[i].Quantity = +(parseFloat((<HTMLInputElement>document.getElementById('quantity_' + i)).value).toFixed(4));
        // this.lines[i].TotalLine = this.lines[i].Quantity * this.lines[i].UnitPrice;
        this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].UnitPrice).toFixed(4);
        break;
      case 1:
        this.lines[i].UnitPrice = +(parseFloat((<HTMLInputElement>document.getElementById('unitPrice_' + i)).value).toFixed(4));
        this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].UnitPrice).toFixed(4);
        break;
      case 2:
        this.lines[i].Discount = +(parseFloat((<HTMLInputElement>document.getElementById('discount_' + i)).value).toFixed(4));
        this.lines[i].TotalLine = (this.lines[i].Quantity * this.lines[i].UnitPrice) - ((this.lines[i].Quantity * this.lines[i].UnitPrice) * (+(parseFloat((<HTMLInputElement>document.getElementById('discount_' + i)).value).toFixed(4)) / 100));
        this.lines[i].Discount = +this.lines[i].Discount.toFixed(4);
        this.lines[i].TotalLine = +this.lines[i].TotalLine.toFixed(4);
        break;
      case 3:
        this.lines[i].UnitPrice = +(parseFloat((<HTMLInputElement>document.getElementById('totalLine_' + i)).value).toFixed(4)) / this.lines[i].Quantity;
        this.lines[i].UnitPrice = +this.lines[i].UnitPrice.toFixed(4);
        this.lines[i].TotalLine = +(parseFloat((<HTMLInputElement>document.getElementById('totalLine_' + i)).value).toFixed(4));
        break;
      case 4:
        let totalPlusTax = Number(parseFloat((<HTMLInputElement>document.getElementById('totalLineWhTax_' + i)).value).toFixed(4));
        let taxLine = +this.lines[i].TaxRate;
        this.lines[i].TotalLine = +(totalPlusTax / (1 + (taxLine / 100))).toFixed(4)
        this.lines[i].UnitPrice = this.lines[i].TotalLine / this.lines[i].Quantity;
        break;
    }

    //this.lines[i].IsExeeded = this.ValidateUnitPriceMargins(this.lines[i]);
    // this.lines[i].TotalLineWithTax = Number(((this.lines[i].TotalLine) + ((this.lines[i].TotalLine) * (Number(this.lines[i].TaxRate) / 100))).toFixed(2))
    this.recalculate();

  }




  // Crea la salida de mercancias
  createGoodsIssue(): void {
    if (this.lines.length === 0) {
      this.alertService.infoAlert('Debe ingregar un artículo al menos');
      return;
    }

    if (this.lines.some(x => x.ItemCode === '----')) {
      this.alertService.infoAlert('Existen líneas que no han sido completadas');
      return;
    }
    const CORRUPTED_PRICE = this.lines.find(x => x.UnitPrice == 0);
    if (CORRUPTED_PRICE) {
      this.alertService.errorAlert(`El precio  del producto  ${CORRUPTED_PRICE.ItemCode}  - ${CORRUPTED_PRICE.ItemName}, no puede ir en  0`);
      return;
    } 
   
    const CORRUPTED_QUANTITY = this.lines.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.ItemCode}  - ${CORRUPTED_QUANTITY.ItemName}, debe ser mayor a 0`);
      return;
    }
    if (!this.UdfValidation()) {
      this.blockUI.stop();  
      return;
    }
    this.blockUI.start('Creando salida de inventario');
    this.goodsReciptStockService.CreateGoodsIssueStock(
      this.lines, this.ListaPrecio, this.Comment, this.mappedUdfs,this.uniqueDocumentID
    ).subscribe(response => {
      this.blockUI.stop();
      if (response.Result) {
        this.alertService.successAlertHtml(`Se ha creado correctamente la salida de inventario N°${response.DocNum}`);
        this.resetGUI();
      } else {
        console.log(response);
        this.alertService.errorAlert('Error' + response.errorInfo.Message);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      if (error.error && error.error.errorInfo) {
        this.alertService.errorAlert(`Error: Código ${error.error.errorInfo.Code}. Detalle: ${error.error.errorInfo.Message}`);
      }
      else {
        this.alertService.errorAlert(`Error: ${error}`);
      }
    });
  }
 
  // Resetea la intefaz usado por el boton de borrar campos
  resetGUI() {
    this.blockUI.start();
    this.InitVariables();
    this.blockUI.stop();
  }

  // Incializa las variables a un estado por defecto
  InitVariables() {
    this.searchTypeManual = false;
    this.isLockedByScanner = false;
    this.isScanning = false;  
    this.udfs = [];
    this.udfTargets = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.GOODSISSUE);
    this.Comment = ``;
    this.lines = [];
    this.CRCTotal = 0.0;
    this.Quantity = 1;
    this.SubTotal = 0.0;
    this.totalLines = 0.0;
    this.DiscountTotal = 0.0;
    this.TaxesTotal = 0.0;
    this.USTotal = 0.0;
    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();
    this.CRCTotal = 0.0;
    this.itemsService.UpdateLines([]);
    this.itemsService.hasLines = false;
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.isProcessing = false;
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.ResetExitForm();
    this.storeService.getStoresv2().subscribe(response => {
      this.Stores = response.Stores;
      this.WareHouse = this.Stores[0].StoreCode;
      this.exitForm.patchValue({WareHouse:this.WareHouse});
    }, error => {   
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });

    
    setTimeout(() => this.inputEl.nativeElement.focus());
  }
  // Verifica si el usuario tiene permisos para acceder a la pagina
  checkPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_Inven') {
            this.permisos = Perm.Active;
          }
        });
      } else {
        this.permisos = false;
      }
    }, error => {
      this.permisos = false;
      this.blockUI.stop();
    });
  }
  updateIndex(event: any): void {
    this.ListaPrecio = event;
    this.blockUI.start('Obteniendo precios de los Items');
    this.goodsReciptStockService.GetItemChangePrice(this.lines, this.ListaPrecio).subscribe(response => {
      if (response.Result) {
        this.lines.forEach(i => {
          this.QuantyList.push(i.Quantity);
        });
        this.lines.length = 0;
        response.ItemList.forEach(item => {
          const LINE = {} as ILine;
          // LINE.BarCode = response.Item.BarCode;
          LINE.ItemCode = item.ItemCode;
          LINE.ItemName = item.ItemName;
          LINE.Quantity = this.QuantyList[this.x];
          LINE.TaxCode = item.TaxCode;
          LINE.UnitPrice = item.UnitPrice;
          LINE.Discount = item.Discount;
          LINE.Tax_Rate = item.TaxRate;
          LINE.WareHouse = this.WareHouse;
          this.x++;
          this.lines.push(LINE);
        });


        //LINE.WareHouse = this.WareHouse;

        // this.lines.push(LINE);
        //this.Quantity = 1;
        this.item = {} as IItemModel;
        setTimeout(() => this.inputEl.nativeElement.focus());
        this.recalculate();
        this.blockUI.stop();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert(response.Message);
      }
    });
  }

  setCurrentIndex(index: number): void {
    this.currentIndex = index;
  }

  addLine(): void {
    if (this.lines.some(x => x.ItemCode === '----')) {
      this.alertService.infoInfoAlert('Por favor complete la línea recién agregada');
      return;
    }
    const LINE = {} as ILine;
    LINE.BarCode = '';
    LINE.ItemCode = '----';
    LINE.ItemName = '';
    LINE.Quantity = 1;
    LINE.TaxCode = '13IVA';
    LINE.UnitPrice = 0;
    LINE.Discount = 0;
    LINE.Tax_Rate = 0;
    LINE.TaxRate = '';
    LINE.WareHouse = this.WareHouse;
    LINE.TotalLine = 0;
    let auxiliarList = this.lines;

    const lista = auxiliarList.slice(0, this.currentIndex);
    const listb = auxiliarList.slice(this.currentIndex, auxiliarList.length);

    lista.push(LINE);

    listb.forEach(x => lista.push(x));
    this.lines = lista;

    setTimeout(() => this.inputEl.nativeElement.focus());
  }

  upLine(): void {
    if (this.currentIndex > 0) {
      let auxiliarList = this.lines;

      const itemup = auxiliarList.slice(this.currentIndex, auxiliarList.length);
      const itemmove = auxiliarList.slice(this.currentIndex - 1, auxiliarList.length);

      auxiliarList[this.currentIndex - 1] = itemup[0];
      auxiliarList[this.currentIndex] = itemmove[0];

      this.lines = auxiliarList;
    }

  }

  downLine(): void {
    if ((this.currentIndex + 1) != this.lines.length) {
      let auxiliarList = this.lines;

      const itemup = auxiliarList.slice(this.currentIndex, auxiliarList.length);
      const itemmove = auxiliarList.slice(this.currentIndex + 1, auxiliarList.length);

      auxiliarList[this.currentIndex + 1] = itemup[0];
      auxiliarList[this.currentIndex] = itemmove[0];
      this.lines = auxiliarList;
    }
  }

  removeItem(): void {
    if (this.currentIndex !== -1) {
      this.lines.splice(this.currentIndex, 1);
      this.recalculate();
      this.currentIndex = -1;
      setTimeout(() => this.inputEl.nativeElement.focus());
    }
  }

  //001 D&D
  onDrop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.lines, event.previousIndex, event.currentIndex);

  }
  onMouseEnterColumn() {
    this.canDrag = true;

  }
  onMouseLeaveColumn() {
    this.canDrag = false;
  }

 //#region  UDDF
 
 GetConfiguredUdfs(_documentAlias: string): void {

  this.blockUI.start(`Obteniendo datos, espere por favor`);
  this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
    this.blockUI.stop();
    if (next.Result) {
      this.udfs = next.Udfs;

      this.udfs.filter(x=> x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));       

      this.GetUdfDevelopment();

    }
    else {
      console.log(next);
    }
  }, error => {
    this.blockUI.stop();
    console.log(error);
    this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);  
  });


}

GetUdfDevelopment(): void {
  this.udfService.GetUdfDevelopment().subscribe(next => {
    if (next.Result) {
      next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.GOODSISSUE).forEach(x => {
        this.udfTargets.push({
          Key: x.Description,
          Value: ''
        });
      });
      this.IsUdfIntegrityValid();
    }
  });
}

  // Verifica si los udfs a usar por desarrollo no han sido eliminados de la configuracion general
  IsUdfIntegrityValid(): boolean {
    let isValid = true;
    this.udfTargets.forEach(x => {
      if (!this.udfs.find(y => y.Name === x.Key)) {
        this.alertService.errorAlert(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
        agreguelo en la configuración`);
        isValid = false;
        return;
      }
    });

    return isValid;
  }

  UdfValidation(): boolean {
    try {
      if (!this.IsUdfIntegrityValid()) return false;

      this.UdfSetter(this.udfTargets);

      this.mappedUdfs = [];
      this.udfs.forEach(x => {
        let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;

        if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();

        this.mappedUdfs.push({
          Name: x.Name,
          Value: parsedValue,
          FieldType: x.FieldType
        } as IUdfTarget);
      });


      let udfName = '';
      let isValid = true;
      this.udfs.forEach(x => {
        if (x.IsRequired && (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value == '') {
          udfName = x.IsRendered ? x.Description : `${x.Description}, no está renderizado pero `;
          isValid = false;
          return;
        }
      });

      if (!isValid) {
        this.alertService.infoInfoAlert(`El campo ${udfName} es requerido`);
        return;
      }

      return true;
    }
    catch (error) {
      this.alertService.errorAlert(error);
      return false;
    }
  }
  UdfSetter(_udfTargets: IKValue[]): void {
    _udfTargets.forEach(x => {
      const NOT_REDERED_UDF = <HTMLSelectElement>document.getElementById(`dynamicRender_${x.Key}`);
      if (!NOT_REDERED_UDF) throw new Error(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
      agreguelo en la configuración`);
    });
  }
  MapDataType(_dataType): string {
    let mappedDataType = 'No definido';

    switch (_dataType) {
      case 'String':
        mappedDataType = "text";
        break;
      case 'Int32':
        mappedDataType = "number";
        break;
      case 'DateTime':
        mappedDataType = "date";
        break;
    }
    return mappedDataType;
  }
 //#endregion
}
