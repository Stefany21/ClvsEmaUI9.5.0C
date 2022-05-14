import { Component, OnInit, ElementRef, ViewChild, DoCheck, Renderer2, Inject, } from '@angular/core';
import { AlertService } from '../../../services/alert.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription, Observable } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ItemService, PermsService, AuthenticationService, ExRateService, StorageService, CommonService, CompanyService } from 'src/app/services';
import { BusinessPartnerService } from '../../../services/business-partner.service';
import { debounceTime, map, distinctUntilChanged, filter } from 'rxjs/operators';
import { IItemModel } from '../../../models/i-item';
import { GoodsReciptService } from '../../../services/goods-recipt.service';
import { StoreService } from '../../../services/store.service';
import { ILine } from '../../../models/i-line';
import { TaxService } from '../../../services/tax.service';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { EventManager } from '@angular/platform-browser';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { timeStamp } from 'console';
import { Company, IBusinessPartner, IKValue } from 'src/app/models';
import { CompanyMargins } from 'src/app/models/company';
import { DOCUMENT } from '@angular/common';
// MODELOS
import { IUdf, IUdfTarget } from 'src/app/models/index';
import { CONFIG_VIEW, DOCUMENT_ALIAS } from 'src/app/models/constantes';
import { IudfValue } from 'src/app/models/iudf-value';
import { UdfsService } from 'src/app/services/udfs.service';
@Component({
  selector: 'app-inventory-return',
  templateUrl: './inventory-return.component.html',
  styleUrls: ['./inventory-return.component.scss']
})
export class InventoryReturnComponent implements OnInit, DoCheck {
  //VARBOX
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  udfs: IUdf[];
  whCode: string;
  isScanning: boolean;
  isProcessing: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  currentNgbIndex = 0;
  @ViewChild('scrollMe') private myScrollContainer: ElementRef; // Se usa para que la tabla haga autoscroll
  @ViewChild('name') inputEl: ElementRef; // Lo uso para mandarle el autofocus cuando se escanea el codigo de barras
  permisos = true; // Comprueba los permisos del usuario
  lines: ILine[]; // Representa la linea del producto que se ingresa
  itemsList: IItemModel[]; // Contiene el nombre de los productos, preformateados desde el api y el codigo de estos
  taxesList: any; // Contiene la lista de impuestos registrados en el sistema
  businessParters: any; // Contiene la lista de todos los proveedores
  @BlockUI() blockUI: NgBlockUI; // Usado para bloquear la interfaz de usuario
  currentUser: any; // variable para almacenar el usuario actual
  totalLines: number; // Guarda la sumatoria de todas las linea con (precio unitario * cantidad)
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  item: IItemModel; // Model para el typeahead, cuando se lecciona un item de la lista este lo almacena
  UnitPrice: number;
  Quantity: number;
  SubTotal: number; // Guarda
  //WareHouse: string; // Guarda el id del almacen del dropdown global
  Stores: any; // Guarda todos los almacenes de la empresa
  DiscountTotal: number;
  TaxesTotal: number;
  USTotal: number; // Total en dolares
  CRCTotal: number; // Total en colones
  barcodeModel: any; // Usando para sacar el codigo de barras de un producto, de la lista de codigos que este tiene
  // supplierModel: any; // Contiene el proveedor seleccionado
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  numAtCard: string; // Numero para la devolucion
  comments: string; // Comentarios para la nota de credito
  lockedButtton = false;
  ItemInfo: FormControl = new FormControl();
  exrate: number;
  canDrag: boolean;
  //001 - Variables que almacena el margenes aceptados
  AcceptedMargin: number;
  headerForm: FormGroup;
  modalReference: NgbModalRef
  MsgForExceededMargins: string;
  COMPANY: Company;
  TO_FIXED_PRICE: string;
  TO_FIXED_TOTALLINE: string;
  TO_FIXED_TOTALDOCUMENT: string;
  searchTypeManual: boolean; // Validación por 2ble petición en typeahead cuando se agrega ítem por búsqueda manual,sin scanner.

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

  fItemName = (x: { ItemName: string }) => x.ItemName; // Formateador para el nombre de los productos
  sItemName = (text$: Observable<string>) => text$.pipe( // Busca en el nombre de item la coincidencia por codigo de barras, nombre, codigo item
    debounceTime(5),
    distinctUntilChanged(),
    map(term => term === '' ? []
      : this.itemsList.filter(v => v.ItemName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 3)))

  supplierNameformatter = (x: { CardName: string }) => x.CardName; // Formateador para el nombre de los proveedores
  supplierSearchName = (text$: Observable<string>) => text$.pipe( // Busca en el nombre del proveedor por cedula, codigo, nombre
    debounceTime(5),
    map(term => term === '' ? []
      : this.businessParters.filter(v => v.CardName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10)))

  GoodsReceiptAccount: string;

  uniqueDocumentID: string;
  constructor(
    private storage: StorageService,
    private eventManager: EventManager,
    private modalService: NgbModal,
    private commonService: CommonService,
    private exrateService: ExRateService,
    private companyService: CompanyService,
    private itemsService: ItemService,
    private alertService: AlertService,
    private authenticationService: AuthenticationService,
    private sPerm: PermsService,
    private businessPartnerService: BusinessPartnerService,
    private goodsReciptService: GoodsReciptService,
    private storeService: StoreService,
    private taxesService: TaxService,
    private formBuilder: FormBuilder,
    private renderer: Renderer2,
    private udfService: UdfsService,
    @Inject(DOCUMENT) private _document: Document) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.lockedButtton = false;

    // const removeGlobalEventListener = this.eventManager.addGlobalEventListener(
    //   'document',
    //   'keyup',
    //   (ev) => {
    //     if (this.ItemInfo && this.ItemInfo.value) {
    //       if (Number(this.ItemInfo.value.toString())) {
    //         this.isScanning = true;
    //         this.buildedData = this.ItemInfo.value;
    //       }

    //       if (ev.key === 'Enter') {
    //         this.isLockedByScanner = true;
    //         this.isScanning = false;
    //       }
    //     }
    //   }
    // );

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

  //   if (this.isLockedByScanner && this.itemsTypeaheadList.find(x => x.indexOf(this.ItemInfo.value) > -1)) {
  //     try {
  //       let buttons = document.getElementsByClassName('dropdown-item');
  //       setTimeout(() => {
  //         if (buttons[0]) {
  //           let dynamicId = buttons[0].getAttribute('id');
  //           if (dynamicId) {
  //             if (dynamicId.indexOf('ngb-typeahead') < 0 || !(<HTMLButtonElement>document.getElementById(dynamicId))) {
  //               this.alertService.infoAlert('No se pudo identificar la generación dinámica del componente, por favor seleccione el producto manualmente');
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
  //     if (this.isLockedByScanner && !this.isScanning && !(this.itemsTypeaheadList.find(x => x.indexOf(this.ItemInfo.value) > -1))) {
  //       this.alertService.infoInfoAlert(`No existe ${this.ItemInfo.value}`);
  //       this.ItemInfo.setValue(``);
  //       this.isLockedByScanner = false;
  //     }
  //   }
  // }



  setWarehouseInfo() {
    let session = this.storage.getSession(navigator.onLine);
    if (session) {
      session = JSON.parse(session);
      this.whCode = session.WhCode;
    }
  }





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
        this.ItemInfo.setValue('');
        this.isLockedByScanner = false;
      }
    }
  }

  ngOnInit() {
    this.isLockedByScanner = false;
    this.blockUI.start();
    setTimeout(() => this.inputEl.nativeElement.focus());
    this.setWarehouseInfo();
    this.InitVariables();
    this.blockUI.start('Obteniendo información, espere por favor...');
    // Carga la lista de proveedores y la formatea para poder buscar codigo en este
    this.GetSuppliers();
    // this.businessPartnerService.GetSuppliers().subscribe(response => {
    //   this.businessParters = response.BPS;
    //   for (let c = 0; c < this.businessParters.length; c++) {
    //     const bp = this.businessParters[c];
    //     this.businessParters[c].CardName = `${bp.CardCode} - ${bp.CardName} - ${bp.Cedula}`;
    //   }
    // });
    // Obtiene la lista de almances de la compania, este lo hice nuevo porque el que estaba llamaba otro metodo, pero sigue exisitendo
    this.storeService.getStoresv2().subscribe(response => {
      this.Stores = response.Stores;
      this.headerForm.patchValue({ WareHouse: this.Stores[0].StoreCode });
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
    // Obtiene la lista de impuestos registrados en el sistema
    this.taxesService.GetTaxes().subscribe(response => {
      this.taxesList = response.Taxes;
    }); // Consume los impuesto y los setea a dicha lista desde el api

    this.checkPermits(); // Verifica si el usuario tiene permisos para acceder a la pagina
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
    this.lockedButtton = false;
  }

  // addItems(_item: any, _isTriggerdByUser: boolean): void {
  //   const ITEM_CODE = _item.item.split(' ')[0];
  //   this.onThClick(ITEM_CODE, _isTriggerdByUser);
  //   _item.preventDefault();
  //   this.ItemInfo.reset();
  // }
  addItems(item: any, _isManualOverride = false): void {
    if (this.ItemInfo.value) {
      // let code = item.item.split(' COD. ')[0];

      let code = `harcodedCode`;
      let mobileNavigatorObject: any = window.navigator;
      if (_isManualOverride) {

        if (this.searchTypeManual) {
          this.headerForm.patchValue({ Quantity: 1 });
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
        this.headerForm.patchValue({ Quantity: 1 });
        // this.headerForm.patchValue({ ItemInfo: '' });
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
                LINE.Quantity = +this.headerForm.controls.Quantity.value > 0 ? +this.headerForm.controls.Quantity.value : 1;
                LINE.TaxCode = response.Item.TaxCode;

                LINE.Discount = response.Item.Discount;
                LINE.Tax_Rate = response.Item.TaxRate;
                LINE.TaxRate = response.Item.TaxRate;
                LINE.WareHouse = this.headerForm.controls.WareHouse.value;

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


                this.ItemInfo.setValue('');
                this.headerForm.patchValue({ Quantity: 1 });
                // this.headerForm.patchValue({ ItemInfo: '' });
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
            this.isProcessing = false;
            this.searchTypeManual = false;
            this.blockUI.stop();
          });
      }

    }
  }
  // Funcion que recalcula el precio total, subtotal, descuentos, impuestos, sobre la lista de lineas
  recalculate(): void {
    this.totalLines = 0;
    this.TaxesTotal = 0;
    this.DiscountTotal = 0;


    this.lines.forEach(x => {
      const FIRST_SUBTOTAL = (x.Quantity * x.UnitPrice);
      const LINE_DISCOUNT = FIRST_SUBTOTAL * (x.Discount / 100);

      const SUBTOTAL_WITH_LINE_DISCOUNT = Math.round(((FIRST_SUBTOTAL - LINE_DISCOUNT) + Number.EPSILON) * 100) / 100;

      const HEADER_DISCOUNT = 0; // eaguilar deja esta variable por si en un futuro se desea usar descuento de cabecera en el proyecto

      const TOTAL_HEADER_DISCOUNT = (SUBTOTAL_WITH_LINE_DISCOUNT * HEADER_DISCOUNT);

      const SUBTOTAL_WITH_HEADER_DISCOUNT = SUBTOTAL_WITH_LINE_DISCOUNT - TOTAL_HEADER_DISCOUNT;



      const CURRENT_TAX_RATE = x.Tax_Rate / 100;

      const TOTAL_TAX = Math.round(((SUBTOTAL_WITH_HEADER_DISCOUNT * CURRENT_TAX_RATE) + Number.EPSILON) * 100) / 100;

      this.totalLines  += Math.round((SUBTOTAL_WITH_HEADER_DISCOUNT * (+!x.TaxOnly) + Number.EPSILON) * 100) / 100;

      this.DiscountTotal += LINE_DISCOUNT;

      this.TaxesTotal += TOTAL_TAX;

    });


    this.CRCTotal = +((this.totalLines + this.TaxesTotal));
    this.USTotal = this.CRCTotal / this.exrate;

    this.USTotal = this.CRCTotal / this.exrate;
    if (this.lines.length > 0) {
      this.itemsService.hasLines = true;
      this.itemsService.UpdateLines(this.lines);
    } else {
      this.itemsService.hasLines = false;
      this.itemsService.UpdateLines([]);
    }
  }
  // Saca un item de la lista de lineas basado en su indice
  removeItem(index: number) {
    this.lines = this.lines.filter((x, i) => i !== index);
    this.recalculate();
  }
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
  // onSelectBoxLineChangeTax(event: any, index: number): void {
  //   const TAX_CODE = event.target.value;
  //   const TAX = this.taxesList.filter(x => x.TaxCode === TAX_CODE)[0];
  //   this.lines[index].TaxCode = TAX.TaxCode;
  //   this.lines[index].Tax_Rate = +TAX.TaxRate;
  //   this.recalculate();
  //   // console.log(event.target.value, this.taxesList.filter(x=> {x.TaxCode === event.target.value}));
  // }
  //001 - Metodo que viene de la vista de entrada de mercaderia el de arriba es el original de esta vista.
  onSelectBoxLineChangeTax(event: any, index: number): void {
    const TAX_CODE = event.target.value;
    const TAX = this.taxesList.filter(x => x.TaxCode === TAX_CODE)[0];

    this.lines[index].TaxCode = TAX.TaxCode;
    this.lines[index].Tax_Rate = +TAX.TaxRate;
    this.lines[index].TaxRate = TAX.TaxRate;
    this.lines[index].TotalLineWithTax = Number(((this.lines[index].UnitPrice * this.lines[index].Quantity) + ((this.lines[index].UnitPrice * this.lines[index].Quantity) * (Number(this.lines[index].TaxRate) / 100))).toFixed(2))
    this.recalculate();
  }
  // Evento para seleccionar un item del type ahead y cargarlo en la lista de lineas
  // onThClick(_itemCode: string, _isTriggerdByUser = false): void {
  //   if (this.isScanning && !_isTriggerdByUser) {
  //     this.isScanning = false;
  //     const ITEM = this.itemsTypeaheadList.find(x => x.includes(this.buildedData));
  //     this.buildedData = ``;
  //     if (!ITEM) {
  //       setTimeout(() => {
  //         this.ItemInfo.setValue('');
  //         this.Quantity = 1;
  //         this.item = {} as IItemModel;
  //       });

  //       let oldone = this.ItemInfo.value;
  //       this.alertService.infoInfoAlert(`No existe ${oldone}`);
  //       setTimeout(() => this.inputEl.nativeElement.focus());

  //       return;
  //     }
  //     _itemCode = ITEM.split(' COD. ')[0];
  //   }

  //   this.blockUI.start('Obteniendo información del item');
  //   this.itemsService.GetItemByItemCode(_itemCode, 1).subscribe(response => {
  //     if (response.result) {
  //       const LINE = {} as ILine;
  //       LINE.BarCode = response.Item.BarCode;
  //       LINE.ItemCode = response.Item.ItemCode;
  //       LINE.ItemName = response.Item.ItemName;
  //       LINE.Quantity = this.Quantity;
  //       LINE.TaxCode = response.Item.TaxCode;
  //       LINE.UnitPrice = response.Item.UnitPrice;
  //       LINE.Discount = response.Item.Discount;
  //       LINE.Tax_Rate = response.Item.TaxRate;
  //       LINE.TaxRate = response.Item.TaxRate;
  //       LINE.TaxCode = response.Item.TaxCode;
  //       LINE.WareHouse = this.WareHouse;
  //       //001
  //       LINE.LockedUnitPrice = LINE.UnitPrice;
  //       LINE.TotalLine = LINE.UnitPrice * LINE.Quantity;
  //       LINE.TotalLineWithTax = Number(((LINE.UnitPrice * LINE.Quantity) + ((LINE.UnitPrice * LINE.Quantity) * (Number(LINE.TaxRate) / 100))));



  //       if (this.lines.some(x => x.ItemCode === '----')) {
  //         this.lines[this.lines.findIndex(x => x.ItemCode === '----')] = LINE;
  //       } else {
  //         this.lines.push(LINE);
  //       }





  //       this.Quantity = 1;
  //       this.item = {} as IItemModel;
  //       setTimeout(() => this.inputEl.nativeElement.focus());
  //       this.recalculate();
  //       this.blockUI.stop();
  //     } else {
  //       this.blockUI.stop();
  //       this.alertService.errorAlert(response.Message);
  //     }
  //   });
  // }
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

    this.lines[i].IsExeeded = this.ValidateUnitPriceMargins(this.lines[i]);
    this.lines[i].TotalLineWithTax = Number(((this.lines[i].TotalLine) + ((this.lines[i].TotalLine) * (Number(this.lines[i].TaxRate) / 100))).toFixed(2))
    this.recalculate();

  }

  addLine(i: number): void {
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
    // LINE.WareHouse = this.whCode;
    LINE.TotalLine = 0;
    LINE.TotalLineWithTax = 0;
    let auxiliarList = this.lines;

    const lista = auxiliarList.slice(0, i);
    const listb = auxiliarList.slice(i, auxiliarList.length);

    lista.push(LINE);

    listb.forEach(x => lista.push(x));
    this.lines = lista;

    setTimeout(() => this.inputEl.nativeElement.focus());
  }

  ValidateUnitPriceMargins(line: ILine): boolean {
    this.MsgForExceededMargins = '';
    let MAX = line.LockedUnitPrice + (line.LockedUnitPrice * (this.AcceptedMargin / 100));
    let MIN = line.LockedUnitPrice - (line.LockedUnitPrice * (this.AcceptedMargin / 100));

    if (MAX < line.UnitPrice) {
      return true;
    }

    if (line.UnitPrice < MIN) {
      return true;
    }
    return false;
  }

  CloseModal(): void {
    this.modalReference.close();
  }

  OpenModalMaginsExceed(content: any, line: ILine) {
    this.MsgForExceededMargins = '';
    let MAX = line.LockedUnitPrice + (line.LockedUnitPrice * (this.AcceptedMargin / 100));
    let MIN = line.LockedUnitPrice - (line.LockedUnitPrice * (this.AcceptedMargin / 100));

    if (MAX < line.UnitPrice) {
      this.MsgForExceededMargins = 'Margen en precio unitario excedido, margen aceptado de  ' + this.AcceptedMargin + '%, diferencia de ₡' + (line.UnitPrice - MAX).toFixed(Number(this.TO_FIXED_PRICE));
    }

    if (line.UnitPrice < MIN) {
      this.MsgForExceededMargins = 'Margen en precio unitario excedido, margen aceptado de ' + this.AcceptedMargin + '%, diferencia de ₡' + (line.UnitPrice - MIN).toFixed(Number(this.TO_FIXED_PRICE));
    }

    this.modalReference = this.modalService.open(content,
      {
        centered: true,
        backdrop: 'static'
      });
  }

  GetSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.OIGN).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);;
        //this.CommentInv = result.Comments;
        this.GoodsReceiptAccount = result.GoodsReceiptAccount;
      } else {
        this.alertService.errorAlert('Ócurrio un error obteniendo configuración de ajuste de inventario ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ócurrio un error obteniendo configuración de ajuste de inventario ' + err);
    });
  }

  //001
  GetMargins(): void {
    this.AcceptedMargin = 0;
    if (this.COMPANY.AcceptedMargins) {
      let CompanyMargins: CompanyMargins[] = JSON.parse(this.COMPANY.AcceptedMargins);
      let MarginForView = CompanyMargins.find(i => i.Code === '02');
      if (MarginForView) this.AcceptedMargin = MarginForView.Value;
    }

  }
  // Crea la devolucion del inventario
  createGoodsReciptReturn(): void {
    if (this.lines.length === 0) {
      this.alertService.infoAlert('Debe ingregar un artículo al menos');
      return;
    }
    const CORRUPTED_QUANTITY = this.lines.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.ItemCode}  - ${CORRUPTED_QUANTITY.ItemName}, debe ser mayor a 0`);
      return;
    }

    if (this.headerForm.controls.Supplier.value === '') {
      this.alertService.infoAlert('Debe seleccionar el proveedor');
      return;
    }

    if (!this.UdfValidation()) {
      this.blockUI.stop();
      return;
    }

    let SUPPLIER = this.headerForm.controls.Supplier.value as IBusinessPartner;

    if (!SUPPLIER.CardName) {
      const CLEANED_INPUT = this.headerForm.controls.Supplier.value.replace(/\s/g, '');
      const SPLITTED_INPUT = CLEANED_INPUT.split('-');

      if (SPLITTED_INPUT.length === 0 || !(SUPPLIER = this.businessParters.find(x => x.CardCode === SPLITTED_INPUT[0]))) {
        this.alertService.infoInfoAlert('Por favor vuelva a seleccionar el proveedor');
        return;
      }
    }

    if (this.lockedButtton) {
      this.alertService.infoAlert('Ya se ha generado la entrada, por favor presione borrar campos para agregar una nueva entrada');
      return;
    }

    this.lockedButtton = true;
    this.blockUI.start('Realizando la devolucion de mercadería');
    this.goodsReciptService.CreateGoodsReciptReturn(
      this.lines, SUPPLIER.CardCode.toString(), SUPPLIER.CardName, SUPPLIER.Cedula, this.comments, this.numAtCard, this.mappedUdfs, this.uniqueDocumentID,this.GoodsReceiptAccount
    ).subscribe(response => {
      this.blockUI.stop();
      this.lockedButtton = response.Result;
      if (response.Result) {
        this.alertService.successAlert(`Se ha creado correctamente la devolución de mercadería N°${response.DocNum}`);
      }
      else {
        console.log(response);
        this.alertService.errorAlert('Error' + response.errorInfo.Message);
      }
    }, error => {
      this.lockedButtton = false;
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
    this.headerForm.patchValue({ WareHouse: this.Stores[0].StoreCode });
    this.blockUI.stop();
  }

  // Incializa las variables a un estado por defecto
  InitVariables() {
    this.isLockedByScanner = false;
    this.ItemInfo.setValue('');
    this.udfTargets = [];
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.GOODSRETURN);
    this.lines = [];
    this.CRCTotal = 0.0;
    this.Quantity = 1;
    this.SubTotal = 0.0;
    this.totalLines = 0.0;
    this.DiscountTotal = 0.0;
    this.TaxesTotal = 0.0;
    this.USTotal = 0.0;
    this.CRCTotal = 0.0;
    this.itemsService.UpdateLines([]);
    this.itemsService.hasLines = false;
    this.comments = '';
    this.numAtCard = '';
    this.lockedButtton = false;
    this.searchTypeManual = false;
    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();
    this.GetSettings();
    //this.supplierModel = '';
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.GetExchangeRate();
    // 001 - Obtencion del valor de los margenes aceptados para esta vista.
    this.GetMargins();
    this.ResetHeaderForm();
    this.isProcessing = false;
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

  //001 D&D

  ResetHeaderForm(): void {
    this.headerForm = this.formBuilder.group({
      Quantity: [1],
      // ItemInfo: [''],
      WareHouse: [''],
      Supplier: [''],
    });
  }
  onDrop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.lines, event.previousIndex, event.currentIndex);

  }
  onMouseEnterColumn() {
    this.canDrag = true;

  }
  onMouseLeaveColumn() {
    this.canDrag = false;
  }

  GetSuppliers(): void {
    this.blockUI.start(`Actualizando lista de proveedores, espere por favor`);
    this.businessPartnerService.GetSuppliers().subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.businessParters = [];
        this.businessParters = next.BPS;
        for (let c = 0; c < this.businessParters.length; c++) {
          const bp = this.businessParters[c];
          this.businessParters[c].FullCardName = `${bp.CardCode} - ${bp.CardName} - ${bp.Cedula}`;
        }
      }
      else {
        console.log(next);
        this.alertService.infoAlert(`Error: ${next.errorInfo ? next.errorInfo.Message : 'No se pudo refrescar los proveedores, vuelva a intentarlo por favor'}`);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }


  GetExchangeRate(): void {
    this.blockUI.start();
    this.exrateService.getExchangeRate().subscribe(data => {
      this.blockUI.stop();
      if (data.Result) {
        this.exrate = data.exRate
      } else {
        this.alertService.errorAlert(`Error: ${data.errorInfo ? data.errorInfo.Message : 'No se pudo obtener el tipo de cambio'}`);
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorInfoAlert(`Error: ${error.error}`);
    });
  }

  //#region UDFS

  GetConfiguredUdfs(_documentAlias: string): void {

    this.blockUI.start(`Obteniendo datos, espere por favor`);
    this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.udfs = next.Udfs;

        this.udfs.filter(x => x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));

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
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.GOODSRETURN).forEach(x => {
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
