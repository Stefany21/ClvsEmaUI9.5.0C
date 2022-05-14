import { Component, OnInit, ElementRef, ViewChild, Inject, ViewChildren, QueryList, HostListener } from '@angular/core';
import { AlertService } from '../../../services/alert.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription, Observable } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ItemService, PermsService, AuthenticationService, ExRateService, CommonService } from 'src/app/services';
import { BusinessPartnerService } from '../../../services/business-partner.service';
import { debounceTime, map, distinctUntilChanged, filter } from 'rxjs/operators';
import { IBarcode, IItemModel } from '../../../models/i-item';
import { GoodsReciptService } from '../../../services/goods-recipt.service';
import { StoreService } from '../../../services/store.service';
import { ILine } from '../../../models/i-line';
import { TaxService } from '../../../services/tax.service';
import swal from 'sweetalert2';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { EventManager } from '@angular/platform-browser';
import { Renderer2 } from '@angular/core';
import { Company, IBusinessPartner, IKValue, IPrice, IPurchaseOrder } from 'src/app/models';
import { CompanyService } from '../../../services/company.service';
import { IViewGroup } from 'src/app/models';
import { StorageService } from '../../../services/storage.service';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { ThemeService } from 'ng2-charts';
import { DOCUMENT, formatDate } from '@angular/common';
import { IItemDetail } from 'src/app/models/i-itemDetail';
import { moveItemInArray, CdkDragDrop } from "@angular/cdk/drag-drop";
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { Router } from '@angular/router';
import { CompanyMargins } from 'src/app/models/company';
import { RouterExtServiceService } from 'src/app/services/router-ext-service.service';
import { UdfsService } from 'src/app/services/udfs.service';
import { DOCUMENT_ALIAS } from 'src/app/models/constantes';
import { IudfValue } from 'src/app/models/iudf-value';
// MODELOS
import { IUdf, IUdfTarget } from 'src/app/models/index';
import { KEY_CODE } from 'src/app/enum/enum';
// import { ConsoleReporter } from 'jasmine';
@Component({
  selector: 'app-inventory-entry',
  templateUrl: './inventory-entry.component.html',
  styleUrls: ['./inventory-entry.component.css']
})

export class InventoryEntryComponent implements OnInit {
  //VARBOX
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  mappedUdfsOPDN: IUdfTarget[];
  udfTargetsOPDN: IKValue[];
  udfs: IUdf[];
  udfsOPDN: IUdf[];
  isProcessing: boolean;
  canDrag: boolean
  //001 - Variables que almacena el margenes aceptados
  AcceptedMargin: number;
  MsgForExceededMargins: string;
  ShowColumm: boolean
  ShowItemDetail: boolean
  CommentarioActual: string
  modalReference: NgbModalRef
  ItemDetail: IItemDetail
  headerForm: FormGroup;
  isScanning: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  whCode: string;
  whName: string;
  Comment: string;
  @ViewChild('scrollMe') private myScrollContainer: ElementRef; // Se usa para que la tabla haga autoscroll
  @ViewChild('name') inputEl: ElementRef; // Lo uso para mandarle el autofocus cuando se escanea el codigo de barras
  @ViewChild('barcodeEl') barcodeEl: ElementRef; // Lo uso para mandarle el autofocus cuando se escanea el codigo de barras
  @ViewChild('file') inputVariableFileXml: ElementRef;
  permisos = true; // Comprueba los permisos del usuario
  lines: ILine[]; // Representa la linea del producto que se ingresa
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  itemsList: IItemModel[]; // Contiene el nombre de los productos, preformateados desde el api y el codigo de estos
  globalItem: IItemModel;
  barcodeList: IBarcode[] = []; // Contiene la lista de los codigo de barra
  taxesList: any; // Contiene la lista de impuestos registrados en el sistema
  businessParters: any; // Contiene la lista de todos los proveedores
  @BlockUI() blockUI: NgBlockUI; // Usado para bloquear la interfaz de usuario
  currentUser: any; // variable para almacenar el usuario actual
  COMPANY: Company;
  TO_FIXED_PRICE: string;
  TO_FIXED_TOTALLINE: string;
  TO_FIXED_TOTALDOCUMENT: string;
  globalName: string; // Guarda el nombre del item seleccionado del typeahead
  modalTitleItem = 'Agregar producto al sistema';
  totalLines: number; // Guarda la sumatoria de todas las linea con (precio unitario * cantidad)
  item: IItemModel; // Model para el typeahead, cuando se lecciona un item de la lista este lo almacena
  priceList: IPrice[]; // Contiene la lista de precios del sistema, debe ser obtenida por request, por ahora se va quemada para mostrar funcionalidad
  UnitPrice: number;
  SubTotal: number; // Guarda
  Stores: any; // Guarda todos los almacenes de la empresa
  DiscountTotal: number;
  totalLinesWithDiscount: number; // Guarda el total de linea aplicado el descuento de esta
  TaxesTotal: number;
  USTotal: number; // Total en dolares
  CRCTotal: number; // Total en colones
  currentIndex: number;
  exrate: number;
  barcodeModel: any; // Usando para sacar el codigo de barras de un producto, de la lista de codigos que este tiene
  globalBarcode: string; // Codigo de barras global para busqueda en el api de productos
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  lockedButtton = false;
  ItemInfo: FormControl = new FormControl();
  hasBeenSend: boolean;
  itemForm;
  viewGroupList: IViewGroup[] = []; //contiene lista de agrupaciones en linea
  isOnEditMode = false;
  isOnGroupLine: boolean;//Agrupacion de lineas en documento
  isLineMode: boolean;//Orden de lineas en documento al inicio o fina
  isUpdatingBarcode: boolean; // Variable para ver si se actualiza el codigo de barras
  flagForm: boolean; //Validacion flag para evitar reenvio de solicitudes al mismo tiempo
  isOnUpdatePurchase: boolean; // Editar orden o crear documento nuevo
  supplierModelDisplay: FormControl = new FormControl(); // Contiene el proveedor seleccionado
  supplierModel: any; // Contiene el proveedor seleccionado
  OpenModalComand: boolean;
  file: any = [];
  xmlName: string;
  IsXml = false; // Carga items con xml
  count = 0;
  SugSuplier = false;
  searchTypeManual: boolean; // Validación por 2ble petición en typeahead cuando se agrega ítem por búsqueda manual,sin scanner.

  @ViewChild('editQuantityId') editQuantityId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  @ViewChild('editUnitPriceId') editUnitPriceyId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  @ViewChild('editTotalLineId') editTotalLineId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  @ViewChild('closebuttonCreateItem') closebuttonCreateItem;
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.F9) {
      this.OpenModalComand = false;
      (<HTMLInputElement>document.getElementById('raiseItemModal')).click();
    }
  };

  barcodeForm = new FormGroup({
    barcodeModal: new FormControl(''),
    barcodeDescriptionModal: new FormControl('')
  });

  fItemName = (x: { ItemName: string }) => x.ItemName; // Formateador para el nombre de los productos
  sItemName = (text$: Observable<string>) => text$.pipe( // Busca en el nombre de item la coincidencia por codigo de barras, nombre, codigo item
    debounceTime(5),
    distinctUntilChanged(),
    map(term => term === '' ? []
      : this.itemsList.filter(v => v.ItemName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 3)))

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

    // return (text$: Observable<string>) =>
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
    //   );
  }
  supplierNameformatter = (x: { FullCardName: string }) => x.FullCardName; // Formateador para el nombre de los proveedores

  supplierSearchName = (text$: Observable<string>) => text$.pipe( // Busca en el nombre del proveedor por cedula, codigo, nombre
    debounceTime(5),
    map(term => term === '' ? []
      : this.businessParters.filter(v => v.FullCardName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10)))


  uniqueDocumentID: string;



  constructor(private eventManager: EventManager,
    private ExtRouterService: RouterExtServiceService,
    private modalService: NgbModal,
    private itemsService: ItemService,
    private alertService: AlertService,
    private authenticationService: AuthenticationService,
    private sPerm: PermsService,
    private businessPartnerService: BusinessPartnerService,
    private goodsReciptService: GoodsReciptService,
    private purchaseOrderService: PurchaseOrderService,
    private storeService: StoreService,
    private storage: StorageService,
    private taxesService: TaxService,
    @Inject(DOCUMENT) private _document: Document,
    private renderer: Renderer2,
    private elRef: ElementRef,
    private companyService: CompanyService,
    private exrateService: ExRateService,
    private formBuilder: FormBuilder,
    private commonService: CommonService,
    private router: Router,
    private udfService: UdfsService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.lockedButtton = false;

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
  @HostListener('contextmenu', ['$event'])
  onRightClick(event) {
    event.preventDefault();
    if ((<HTMLElement>event.target) && (<HTMLElement>event.target).getAttribute('ng-reflect-result')) {
      const CODE = (<HTMLElement>event.target).getAttribute('ng-reflect-result').split(' ')[0];
      //this.ItemInfo.reset();
      console.log(CODE);
      this.raiseModalCreationFromRighClick(CODE);
      setTimeout(() => {
        // (<HTMLButtonElement>document.getElementById('auxClickBarcode')).click();
        this.barcodeEl.nativeElement.focus();
      }, 100);
    }
  }

  globalCode: string;
  ngOnInit() {
    //Edicion orden de compra
    const DOC_ENTRY = this.storage.getPurchaseOrder();
    this.blockUI.reset();
    this.buildedData = '';
    this.isScanning = false;
    this.isLockedByScanner = false;
    this.modalTitleItem = 'Agregar producto al sistema';
    setTimeout(() => this.inputEl.nativeElement.focus());
    this.resetItemForm();
    this.checkPermits();
    this.InitVariables();


    if (this.itemsService.hasLines) {
      this.lines = this.itemsService.GetLines(this);
      this.recalculate();
    } else {

    }

    if (DOC_ENTRY > 0) {
      this.isOnUpdatePurchase = true;
      this.GetPurchaseOrder(DOC_ENTRY);
    }
  }


  raiseModalCreation(): void {
    if (this.OpenModalComand) {
      this.barcodeList = [];
      const item: IItemModel = {} as IItemModel;
      item.BarCode = this.globalBarcode;
      this.itemForm.patchValue({
        ItemName: '',
        ForeingName: '',
        BarCode: item.BarCode,
        TaxCode: '13IVA',
        Price: 0
      });
      this.barcodeList.push({
        BcdCode: this.globalBarcode,
        BcdName: '',
        BcdEntry: -1,
        UomEntry: -1
      });
    } else {
      this.itemForm.patchValue({
        ItemName: '',
        ForeingName: '',
        BarCode: '',
        TaxCode: '13IVA',
        Price: 0
      });
    }
    (<HTMLInputElement>document.getElementById('raiseItemModal')).click();
  }

  raiseModalCreationFromRighClick(ItemCode: string): void {
    this.barcodeList = [];
    const item: IItemModel = {} as IItemModel;

    this.itemsService.GetItemByItemCode(ItemCode, 1, 'hardcoded').subscribe(next => {
      if (next.Result) {
        this.itemsService.GetBarcodesByItem(ItemCode).subscribe(next1 => {
          if (next1.Result) {
            this.barcodeList = next1.Item === null ? [] : next1.Item.Barcodes;
            this.barcodeForm.patchValue({
              barcodeDescriptionModal: '',
              barcodeModal: ''
            });

            const LINE = {} as ILine;

            LINE.BarCode = next.Item.BarCode;
            LINE.ItemCode = next.Item.ItemCode;
            LINE.ItemName = next.Item.ItemName;
            LINE.Quantity = +this.headerForm.controls.Quantity.value > 0 ? +this.headerForm.controls : 1;
            LINE.TaxCode = next.Item.TaxCode;
            LINE.UnitPrice = +(Number(next.Item.LastPurchasePrice)).toFixed(4);
            LINE.Discount = next.Item.Discount;
            LINE.Tax_Rate = next.Item.TaxRate;
            LINE.TaxRate = next.Item.TaxRate;
            LINE.WareHouse = this.headerForm.controls.WareHouse.value;
            LINE.TotalLine = next.Item.LastPurchasePrice * LINE.Quantity;

            this.globalItem = LINE;
            this.barcodeList = next1.Item === null ? [] : next1.Item.Barcodes;
            this.globalName = LINE.ItemName;
            this.itemForm.patchValue({
              ItemName: LINE.ItemName,
              ForeingName: LINE.ForeingName,
              BarCode: '',
              TaxCode: LINE.TaxCode,
              Price: LINE.UnitPrice
            });

            (<HTMLInputElement>document.getElementById('raiseBarcodesModal')).click();
          }
          else {
            console.log(next1);
            this.alertService.errorAlert(`Error al obtener los códigos de barra, Error: ${next1.Error.message}`)
          }
        }, error => {
          this.alertService.errorAlert(`Error al conectar con el servidor, Error: ${error.error}`)
        });
      }
      else {
        this.alertService.errorAlert(`Error al obtener el producto, Error: ${next.Error.message}`);
      }
    }, error => {
      console.log(error);
      this.alertService.errorAlert(`Error al conectar con el servidor ${error.error}`);
    });
  }
  // Agrega el codigo de barras de manera preeliminar
  addBarcode(): void {
    this.barcodeList.push({
      BcdCode: this.barcodeForm.value.barcodeModal,
      BcdName: this.barcodeForm.value.barcodeDescriptionModal,
      BcdEntry: -1,
      UomEntry: -1
    });
    let lookup = new Set();
    this.barcodeList = this.barcodeList.filter(obj => !lookup.has(obj['BcdCode']) && lookup.add(obj['BcdCode']));
    if (this.isUpdatingBarcode) {
      for (let c = 0; c < this.barcodeList.length; c++) {
        if (this.barcodeList[c].BcdCode === this.barcodeForm.value.barcodeModal) {
          this.barcodeList[c].BcdName = this.barcodeForm.value.barcodeDescriptionModal;
        }
      }
    }

    this.barcodeForm.patchValue({
      barcodeModal: '',
      barcodeDescriptionModal: ''
    });

    this.alertService.successInfoAlert(`Código ${this.isUpdatingBarcode ? 'actualizado' : ' agregado'}. Presione actualizar para confirmar los cambios`);
    this.isUpdatingBarcode = false;
    // this.barcodeForm.value.barcodeModal.enable();
  }
  updateBarcodeDesctiption(_index: number): void {
    this.isUpdatingBarcode = true;
    // this.barcodeForm.value.barcodeModal.disabled();
    this.barcodeForm.patchValue({
      barcodeModal: this.barcodeList[_index].BcdCode,
      barcodeDescriptionModal: this.barcodeList[_index].BcdName
    });
  }
  // Limpieza de los códigos de barra
  clearBarcode(): void {
    this.barcodeForm.patchValue({
      barcodeModal: '',
      barcodeDescriptionModal: ''
    });
    // this.isUpdating = false;
  }
  // Levanta la modal de pregunta para la creación del producto en caso de no existir
  suggestItemCreation(): void {
    (<HTMLInputElement>document.getElementById('raiseModalItemCreation')).click();
  }
  // Establece el indice de la linea seleccionada
  setCurrentIndex(index: number): void {
    this.currentIndex = index;
  }
  // Agrega una linea arriba de la linea seleccionada
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
    LINE.WareHouse = this.whCode;
    LINE.TotalLine = 0;
    let auxiliarList = this.lines;

    const lista = auxiliarList.slice(0, this.currentIndex);
    const listb = auxiliarList.slice(this.currentIndex, auxiliarList.length);

    lista.push(LINE);

    listb.forEach(x => lista.push(x));
    this.lines = lista;

    setTimeout(() => this.inputEl.nativeElement.focus());
  }
  // Sube una posicion la linea seleccionada
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

  // Baja una posicion la linea seleccionada
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

  clearItemForm(): void {

  }

  clearInputSeach(): void {
    this.OpenModalComand = true;
    this.udfs = [];
    this.udfsOPDN = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.ITEMS);
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.GOODSRECEIPTPO);
    this.headerForm.patchValue({ Quantity: 1 });
    // this.headerForm.patchValue({ ItemInfo: '' });
    this.ItemInfo.setValue(``);
    this.headerForm.patchValue({ WareHouse: this.Stores[0].Code });
    this.itemForm.patchValue({ BarCode: '' });
    this.itemForm.controls.BarCode.setValue('');

    setTimeout(() => this.inputEl.nativeElement.focus(), 300);
  }

  saveItem(): void {

    if (!this.itemForm.value.ItemName) {
      this.alertService.infoInfoAlert('El campo Nombre Item es requerido');
      return;
    }
    if (!this.itemForm.value.BarCode) {
      this.alertService.infoInfoAlert(`El campo Código de Barras es requerido`);
      return;
    }
    if (!this.UdfOITMValidation()) {
      this.blockUI.stop();

      return;
    }

    this.barcodeList = [];
    const item: IItemModel = {} as IItemModel;
    item.BarCode = this.itemForm.controls.BarCode.value;
    this.barcodeList.push({
      BcdCode: item.BarCode,
      BcdName: '',
      BcdEntry: -1,
      UomEntry: -1
    });

    this.priceList = [];
    this.priceList.push({
      ListName: '',
      ListNum: 1,
      Price: +this.itemForm.value.Price
    });

    const mItem: IItemModel = {
      ItemNameXml: '',
      ItemCode: '',
      ItemBarCode: '',
      ItemName: this.itemForm.value.ItemName,
      PriceListId: this.priceList,
      TaxCode: this.itemForm.value.TaxCode,
      TaxRate: '',
      BarCode: '',
      Frozen: false,
      Discount: 0,
      ForeingName: this.itemForm.value.ForeingName,
      UnitPrice: 0,
      PriceList: this.priceList,
      Barcodes: this.barcodeList,
      UdfTarget: this.mappedUdfs
    };

    this.blockUI.start('Creando el ítem, espere por favor...');
    this.itemsService.CrateItem(mItem).subscribe(response => {
      this.blockUI.stop();
      if (response.Result) {
        this.alertService.successInfoAlert('Se ha creado correctamente el producto');
        this.udfs = [];
        this.GetConfiguredUdfs(DOCUMENT_ALIAS.ITEMS);
        this.closebuttonCreateItem.nativeElement.click();
        this.headerForm.patchValue({ Quantity: 1 });
        // this.headerForm.patchValue({ ItemInfo: '' });
        this.ItemInfo.setValue(``);

        this.blockUI.start();
        this.itemsService.GetItems().subscribe(response => {
          this.blockUI.stop();
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
          setTimeout(() => this.inputEl.nativeElement.focus());
        }, error => {
          this.blockUI.stop();
          console.log(error);
        });
      } else {
        console.error(response);
        this.alertService.errorAlert(`Error al crear el producto ${response.Error.Message}`);
      }
    }, error => {
      console.error(error);
      this.alertService.errorAlert(`Detalle error ${error}`);
      this.blockUI.stop();
    });
  }
  // Methodo para actualizar principalmente los codigos de barra del producto seleccionado del typeahead
  updateItem(): void {
    this.globalItem.Barcodes = this.barcodeList;
    this.blockUI.start('Actualizando códigos de barra, espere Por Favor...');
    this.itemsService.UpdateItem(this.globalItem).subscribe(response => {
      this.blockUI.stop();
      if (response.Result) {
        this.alertService.successAlert('Se han actualizado correctamente los códigos de barra');
        this.itemsService.GetItems().subscribe(next => {
          if (next.Result) {
            for (let c = 0; c < next.ItemList.ItemCompleteName.length; c++) {
              const name = next.ItemList.ItemCompleteName[c];
              this.itemsTypeaheadList = next.ItemList.ItemCompleteName;
              this.itemsList.push({
                ItemNameXml: '',
                PriceListId: this.priceList,
                ItemCode: next.ItemList.ItemCode[c],
                ItemName: next.ItemList.ItemCompleteName[c],
                ItemBarCode: name.substring(name.lastIndexOf('COD. ') + 1, name.lastIndexOf(' COD.')),
                Frozen: true,
                TaxCode: '',
                TaxRate: '',
                BarCode: '',
                Discount: 0,
                ForeingName: '',
                UnitPrice: 0,
                PriceList: [],
                Barcodes: [],
                UdfTarget: []
              });
            }
          }
        });
      } else {
        console.log(response.Error);
        this.alertService.errorAlert(`Error al actualizar los códigos de barra ${response.Error.Message}`);
      }
    }, error => {
      console.log(error);
      this.alertService.errorAlert(`Error al conectar con el servidor al intentar actualizar los códigos de barra, Error: ${error.error}`);
    });
  }
  // Restablece el formulario de creacion de item en sugerencia al no existir
  resetItemForm(): void {
    this.itemForm = new FormGroup({
      ItemName: new FormControl(''),
      ForeingName: new FormControl(''),
      BarCode: new FormControl(''),
      Price: new FormControl(''),
      TaxCode: new FormControl('')
    }); // Es el formulario para el item
  }
  // Agrega un item a la lista de lineas de la entrada
  addItems(item: any, _isManualOverride = false): void {
    if (this.ItemInfo.value) {
      // let code = item.item.split(' COD. ')[0];

      let code = `harcodedCode`;
      let mobileNavigatorObject: any = window.navigator;
      if (_isManualOverride) {
        if (this.searchTypeManual) {
          this.headerForm.patchValue({ Quantity: 1 });
          this.ItemInfo.setValue('');
          // this.headerForm.patchValue({ ItemInfo: '' });
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

      if (this.ShowItemDetail) {
        this.RiseItemDetails(code, false);
      } else {
        if (this.isProcessing) {
          this.headerForm.patchValue({ Quantity: 1 });
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
                  //# Semana 38
                  LINE.TaxOnly = false;

                  LINE.LockedUnitPrice = LINE.UnitPrice;

                  LINE.TotalLineWithTax = Number(((LINE.UnitPrice * LINE.Quantity) + ((LINE.UnitPrice * LINE.Quantity) * (Number(LINE.TaxRate) / 100))));


                  if (this.lines.some(x => x.ItemCode === '----')) {
                    if (this.isOnGroupLine) {
                      this.ItemInfo.setValue('');
                      this.summarize(LINE);

                    }
                    else {
                      this.lines[this.lines.findIndex(x => x.ItemCode === '----')] = LINE;

                    }

                  }
                  else if (this.lines.some(x => x.IsFocus == true)) {
                    const INDEX = this.lines.findIndex(x => x.IsFocus == true);

                    const LINEXML = {} as ILine;

                    LINEXML.ItemNameXml = this.lines[INDEX].ItemNameXml;
                    LINEXML.BarCode = response.Item.BarCode;
                    LINEXML.ItemCode = response.Item.ItemCode;
                    LINEXML.ItemName = response.Item.ItemName;
                    LINEXML.Quantity = this.lines[INDEX].Quantity;// +this.headerForm.controls.Quantity.value > 0 ? +this.headerForm.controls.Quantity.value : 1;
                    LINEXML.TaxCode = this.lines[INDEX].TaxCode;

                    LINEXML.Discount = this.lines[INDEX].Discount;
                    LINEXML.Tax_Rate = response.Item.TaxRate;
                    LINEXML.TaxRate = this.lines[INDEX].TaxRate;
                    LINEXML.WareHouse = this.headerForm.controls.WareHouse.value;

                    LINEXML.TotalLine = this.lines[INDEX].TotalLine;

                    LINEXML.UnitPrice = this.lines[INDEX].UnitPrice;

                    LINEXML.TaxOnly = false;

                    LINEXML.LockedUnitPrice = LINEXML.UnitPrice;

                    LINEXML.TotalLineWithTax = this.lines[INDEX].TotalLineWithTax;// Number(((LINEXML.UnitPrice * LINEXML.Quantity) + ((LINEXML.UnitPrice * LINEXML.Quantity) * (Number(LINEXML.TaxRate) / 100))));

                    this.lines[this.lines.findIndex(x => x.IsFocus == true)] = LINEXML;

                    this.ChangeFocusIndex(-1);
                  }
                  else {

                    this.isOnGroupLine ? this.summarize(LINE) : this.isLineMode ? this.lines.push(LINE) : this.lines.unshift(LINE);
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
                  this.alertService.errorAlert(`Ha ocurrido un error al obtener el producto. Código ${response.Error.Code}, mensaje: ${response.Error.Message}`);
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
  }

  // Metodo original  de recalculo de totales
  // Funcion que recalcula el precio total, subtotal, descuentos, impuestos, sobre la lista de lineas
  recalculate2(): void {

    this.totalLines = +this.lines.reduce((a, b) => a + (((b.UnitPrice * b.Quantity)) || 0), 0).toFixed(4);

    this.totalLinesWithDiscount = +this.lines.reduce((a, b) => a + (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) || 0), 0).toFixed(4);

    this.TaxesTotal = +this.lines.reduce((a, b) => a + (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) * (b.Tax_Rate / 100) || 0), 0).toFixed(4);

    this.DiscountTotal = +this.lines.reduce((a, b) => a + ((b.UnitPrice * b.Quantity) * (b.Discount / 100) || 0), 0).toFixed(4);

    // this.CRCTotal = +this.lines.reduce((a, b) => a +
    //   (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) +
    //     (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) * (b.Tax_Rate / 100)) || 0), 0).toFixed(4);


    this.CRCTotal = +((this.totalLinesWithDiscount + this.TaxesTotal));

    console.table([{ 'Total': this.CRCTotal, 'SubTotal': this.totalLinesWithDiscount, 'Impuestos': this.TaxesTotal }]);

    // this.CRCTotal = +(Math.floor(100 * this.CRCTotal) / 100).toFixed(2);

    // this.CRCTotal = Math.round((this.CRCTotal + Number.EPSILON) * 100) / 100;

    this.USTotal = this.CRCTotal / this.exrate;

    if (this.lines.length > 0) {
      this.itemsService.hasLines = true;
      this.itemsService.UpdateLines(this.lines);
    } else {
      this.itemsService.hasLines = false;
      this.itemsService.UpdateLines([]);
    }

  }
  // Metodo que calcula los totales, se usa en facturacion
  recalculate(): void {
    this.CRCTotal = 0;
    this.DiscountTotal = 0;
    this.TaxesTotal = 0;
    this.totalLinesWithDiscount = 0;

    // Recorre toda la lista de items agregados a facturar.
    this.lines.forEach(x => {
      const FIRST_SUBTOTAL = (x.Quantity * x.UnitPrice);
      const LINE_DISCOUNT = FIRST_SUBTOTAL * (x.Discount / 100);

      const SUBTOTAL_WITH_LINE_DISCOUNT = Math.round(((FIRST_SUBTOTAL - LINE_DISCOUNT) + Number.EPSILON) * 100) / 100;

      const HEADER_DISCOUNT = 0; // eaguilar deja esta variable por si en un futuro se desea usar descuento de cabecera en el proyecto

      const TOTAL_HEADER_DISCOUNT = (SUBTOTAL_WITH_LINE_DISCOUNT * HEADER_DISCOUNT);

      const SUBTOTAL_WITH_HEADER_DISCOUNT = SUBTOTAL_WITH_LINE_DISCOUNT - TOTAL_HEADER_DISCOUNT;



      const CURRENT_TAX_RATE = x.Tax_Rate / 100;

      const TOTAL_TAX = Math.round(((SUBTOTAL_WITH_HEADER_DISCOUNT * CURRENT_TAX_RATE) + Number.EPSILON) * 100) / 100;

      this.totalLinesWithDiscount  += Math.round((SUBTOTAL_WITH_HEADER_DISCOUNT * (+!x.TaxOnly) + Number.EPSILON) * 100) / 100;

      this.DiscountTotal += LINE_DISCOUNT;

      this.TaxesTotal += TOTAL_TAX;

    });


    this.CRCTotal = +((this.totalLinesWithDiscount + this.TaxesTotal));
    this.USTotal = this.CRCTotal / this.exrate;

    if (this.lines.length > 0) {
      this.itemsService.hasLines = true;
      this.itemsService.UpdateLines(this.lines);
    } else {
      this.itemsService.hasLines = false;
      this.itemsService.UpdateLines([]);
    }

  }
  onFocusOutEvent(event: any, type: string) {
    //this.ItemInfo.reset();
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
    //this.isOnEditMode = false;
  }

  toggleEdition(index: string, type: string): void {
    this.isOnEditMode = true;
  }

  onFocusOutEdit(i: string) {
    this.isOnEditMode = false;
  }

  // Saca un item de la lista de lineas basado en su indice
  removeItem(): void {
    if (this.currentIndex !== -1) {

      this.alertService.successInfoAlert(`Se ha eliminado ${this.lines.filter((x, i) => i === this.currentIndex)[0].ItemName}`);
      this.lines = this.lines.filter((x, i) => i !== this.currentIndex);
      this.recalculate();

      this.currentIndex = -1;
      const INDEXXML = this.lines.find(x => x.IsFocus == true);
      if (!INDEXXML) {
        this.ChangeFocusIndex(-1);
      }
      setTimeout(() => this.inputEl.nativeElement.focus());
    }
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
  onThClick(_itemCode: string, _isTriggerdByUser = false): void {
    // if (item.constructor.name.toString() === 'Object') {

    if (this.isScanning && !_isTriggerdByUser) {
      this.isScanning = false;
      const ITEM = this.itemsTypeaheadList.find(x => x.includes(this.buildedData));
      this.buildedData = ``;
      if (!ITEM) {
        setTimeout(() => {
          //this.ItemInfo.setValue('');
          //this.Quantity = 1;
          this.item = {} as IItemModel;
        });

        this.globalBarcode = (<HTMLInputElement>document.getElementById('inputPro')).value + '';
        this.suggestItemCreation();

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
        LINE.Quantity = +this.headerForm.controls.Quantity.value > 0 ? +this.headerForm.controls.Quantity.value : 1;
        LINE.TaxCode = response.Item.TaxCode;
        // LINE.UnitPrice = +(Number(response.Item.LastPurchasePrice)).toFixed(this.DECS);
        LINE.UnitPrice = +(Number(response.Item.LastPurchasePrice)).toFixed(4);
        LINE.Discount = response.Item.Discount;
        LINE.Tax_Rate = response.Item.TaxRate;
        LINE.TaxRate = response.Item.TaxRate;
        LINE.WareHouse = this.headerForm.controls.WareHouse.value;
        LINE.TotalLine = response.Item.LastPurchasePrice * LINE.Quantity;
        if (this.lines.some(x => x.ItemCode === '----')) {
          if (this.isOnGroupLine) {
            this.summarize(LINE);
          }
          else {
            this.lines[this.lines.findIndex(x => x.ItemCode === '----')] = LINE;
          }
        }
        else {
          this.isOnGroupLine ? this.summarize(LINE) : this.isLineMode ? this.lines.push(LINE) : this.lines.unshift(LINE);
        }

        this.headerForm.patchValue({ Quantity: 1 });
        // this.headerForm.patchValue({ ItemInfo: '' });
        this.ItemInfo.setValue('');

        this.item = {} as IItemModel;
        setTimeout(() => this.inputEl.nativeElement.focus());
        this.recalculate();
        this.blockUI.stop();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert(response.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorAlert(`Ha ocurrido un error al obtener el producto. Código ${error.status}, mensaje: ${error.error}`);
      console.log(error);
    });
  }

  summarize(_line: ILine): void {
    let isFound = false;
    this.lines.forEach(x => {
      if (x.ItemCode === _line.ItemCode) {
        x.Quantity = x.Quantity + (+this.headerForm.controls.Quantity.value > 0 ? +this.headerForm.controls.Quantity.value : 1);
        x.TotalLine = x.UnitPrice * x.Quantity - (x.UnitPrice * x.Quantity) * (x.Discount) / 100;
        isFound = true;
        if (this.lines.some(x => x.ItemCode === '----')) {
          this.alertService.infoInfoAlert(`Se agregado el producto en la linea ${this.lines.findIndex(x => x.ItemCode === _line.ItemCode) + 1}, pero sigue incompleta la linea ${this.lines.findIndex(x => x.ItemCode === '----') + 1}`);
        }
        this.recalculate();
      }
    });

    if (!isFound) {
      if (this.lines.some(x => x.ItemCode === '----')) this.lines[this.lines.findIndex(x => x.ItemCode === '----')] = _line;
      else this.isLineMode ? this.lines.push(_line) : this.lines.unshift(_line);
    }
  }

  currencyInputChanged(value) {
    // var num = value.replace(/[$,]/g, "");
    // return Number(num);
  }


  focusOut(event: any, i: number, field: string): void {


    if (event.target.value && event.target.value < 0) {
      event.target.value = 0;
    }




    switch (+field) {
      case 0:
        this.lines[i].Quantity = event.target.value ? +(parseFloat((<HTMLInputElement>document.getElementById('quantity_' + i)).value).toFixed(4)) : 0;
        // this.lines[i].TotalLine = this.lines[i].Quantity * this.lines[i].UnitPrice;
        this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].UnitPrice).toFixed(4);
        break;
      case 1:
        let inputUnitPriceValue = event.target.value ? +(parseFloat((<HTMLInputElement>document.getElementById('unitPrice_' + i)).value).toFixed(4)) : 0;
        this.lines[i].UnitPrice = inputUnitPriceValue;
        this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].UnitPrice).toFixed(4);
        break;
      case 2:

        let inputDiscount = event.target.value ? +(parseFloat((<HTMLInputElement>document.getElementById('discount_' + i)).value).toFixed(4)) : 0;
        this.lines[i].Discount = inputDiscount;
        this.lines[i].TotalLine = (this.lines[i].Quantity * this.lines[i].UnitPrice) - ((this.lines[i].Quantity * this.lines[i].UnitPrice) * (inputDiscount / 100));
        this.lines[i].Discount = +this.lines[i].Discount.toFixed(4);
        this.lines[i].TotalLine = +this.lines[i].TotalLine.toFixed(4);
        break;
      case 3:
        let inputTotalLine = event.target.value ? +(parseFloat((<HTMLInputElement>document.getElementById('totalLine_' + i)).value).toFixed(4)) : 0;
        this.lines[i].UnitPrice = inputTotalLine / this.lines[i].Quantity;
        this.lines[i].UnitPrice = +this.lines[i].UnitPrice.toFixed(4);
        this.lines[i].TotalLine = inputTotalLine;
        break;
      case 4:
        let totalPlusTax = event.target.value ? Number(parseFloat((<HTMLInputElement>document.getElementById('totalLineWhTax_' + i)).value).toFixed(4)) : 0;
        let taxLine = +this.lines[i].TaxRate;
        this.lines[i].TotalLine = +(totalPlusTax / (1 + (taxLine / 100))).toFixed(4)
        this.lines[i].UnitPrice = this.lines[i].TotalLine / this.lines[i].Quantity;
        break;
    }

    this.lines[i].IsExeeded = this.ValidateUnitPriceMargins(this.lines[i]);
    this.lines[i].TotalLineWithTax = Number(((this.lines[i].TotalLine) + ((this.lines[i].TotalLine) * (Number(this.lines[i].TaxRate) / 100))).toFixed(2))
    this.recalculate();

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

  // Evento para actualizar los diferentes datos de un item en la linea, segun su indice
  onKeyUp(i: number, event: any, field: string): void {
    if (event.key === 'Escape') {
      this.isOnEditMode = false;
      setTimeout(() => {
        this.inputEl.nativeElement.focus();
      }, 0);
      switch (+field) {
        case 0:
          this.inputs.toArray()[+i].nativeElement.value = this.lines[i].Quantity;
          break;
        case 1:
          this.unitPrices.toArray()[+i].nativeElement.value = this.lines[i].UnitPrice;
          break;
        case 2:
          this.totalLine.toArray()[+i].nativeElement.value = this.lines[i].Discount;
          break;
        case 4:
          this.inputs.toArray()[+i].nativeElement.value = this.lines[i].UnitPrice;
          break;
      }
      return;
    }

    if (event.target.value !== '' && (event.key === 'Enter' || event.key === 'Tab')) {
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
      this.isOnEditMode = false;
      setTimeout(() => {
        this.inputEl.nativeElement.focus();
      }, 0);
      this.recalculate();
    }
  }
  // Crea la entrada del inventario
  createGoodsRecipt(): void {

    if (this.lines.length === 0) {
      this.alertService.infoAlert('Debe ingresar un artículo al menos');
      return;
    }

    if (this.lines.some(x => x.ItemCode === '----')) {
      this.alertService.infoAlert('Existen líneas que no han sido completadas');
      return;
    }

    if (this.headerForm.controls.Supplier.value === '') {
      this.alertService.infoAlert('Debe seleccionar el proveedor');
      return;
    }
    const CORRUPTED_QUANTITY = this.lines.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.ItemCode}  - ${CORRUPTED_QUANTITY.ItemName}, debe ser mayor a 0`);
      return;
    }
    if (this.IsXml) {
      const LOADXML = this.lines.find(x => x.ItemCode === "" || x.ItemName === "" || x.ItemCode === "++");
      if (LOADXML) {
        this.alertService.errorAlert(`Debe escanear ítem  ${LOADXML.ItemNameXml}`);
        return;
      }
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
      this.alertService.infoAlert('Ya se ha generado la entrada');
      return;
    }
    let udfName = '';
    let isValid = true;
    this.udfsOPDN.forEach(x => {
      if (x.IsRequired && (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value == '') {
        udfName = x.Description;
        isValid = false;
        return;
      }
    });

    if (!this.UdfOPDNValidation()) {
      this.blockUI.stop();
      return;
    }
    swal({
      type: 'warning',
      title: 'Se creará una entrada de inventario',
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Continuar',
      cancelButtonText: 'No'
    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {
        if (this.flagForm) {
          this.alertService.infoAlert('Intento duplicación documento');
          return;
        }
        this.blockUI.start('Agregando la entrada de inventario');
        this.flagForm = true;
        this.goodsReciptService.CreateGoodsRecipt(this.lines, SUPPLIER.CardCode.toString(), SUPPLIER.CardName, SUPPLIER.LicTradNum, this.Comment, this.mappedUdfsOPDN, this.uniqueDocumentID).subscribe(response => {
          this.blockUI.stop();
          this.hasBeenSend = response.Result;
          if (response.Result) {
            this.alertService.successAlert(`Se ha creado correctamente la entrada de inventario N°${response.DocNum}`);
            this.lockedButtton = true;
            this.flagForm = false;
          } else {
            this.flagForm = false;
            console.log(response);
            this.alertService.errorAlert('Error' + response.Error.Message);
          }
        }, error => {
          this.flagForm = false;
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
    });
  }

  createPurchaseOrder(): void {
    if (this.lines.length === 0) {
      this.alertService.infoAlert('Debe ingresar un artículo al menos');
      return;
    }
    if (this.headerForm.controls.Supplier.value === '') {
      this.alertService.infoAlert('Debe seleccionar el proveedor');
      return;
    }
    const CORRUPTED_QUANTITY = this.lines.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.ItemCode}  - ${CORRUPTED_QUANTITY.ItemName}, debe ser mayor a 0`);
      return;
    }
    if (this.IsXml) {
      const LOADXML = this.lines.find(x => x.ItemCode === "" || x.ItemName === "" || x.ItemCode === "++");
      if (LOADXML) {
        this.alertService.errorAlert(`Debe escanear ítem  ${LOADXML.ItemNameXml}`);
        return;
      }
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
      this.alertService.infoAlert('Ya se ha generado la órden de compra');
      return;
    }

    if (this.flagForm) {
      this.alertService.infoAlert('Intento duplicación documento');
      return;
    }

    if (!this.UdfOPDNValidation()) {
      this.blockUI.stop();
      return;
    }
    swal({
      type: 'warning',
      title: 'Se creará una orden de compra',
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Continuar',
      cancelButtonText: 'No'
    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {
        if (this.flagForm) {
          this.alertService.infoAlert('Intento duplicación documento');
          return;
        }
        this.blockUI.start('Agregando la órden de compra');
        this.flagForm = true;
        this.purchaseOrderService.CreatePurchaseOrder(this.lines, SUPPLIER.CardCode.toString(), SUPPLIER.CardName, SUPPLIER.Cedula, this.Comment, this.mappedUdfsOPDN, this.uniqueDocumentID).subscribe(response => {
          this.blockUI.stop();
          if (response.Result) {
            this.hasBeenSend = true;
            this.alertService.successAlert(`Se ha creado correctamente la órden de compra N° ${response.PurchaseOrder.DocNum}`);
            this.lockedButtton = true;
            this.flagForm = false;
            this.ExtRouterService.fromGoodReceipt = true;
            this.router.navigateByUrl('/purchaseorderList');
          } else {
            this.flagForm = false;
            this.hasBeenSend = false;
            this.alertService.errorAlert('Error al agregar la órden de compra: ' + response.Error.Message);
          }
        }, error => {
          this.flagForm = false;
          this.blockUI.stop();
          console.log(error);
          this.alertService.errorAlert(`Error en la solicitud para crear la orden de compra: ${error.error}`);
        });
      }
    });
  }

  // Resetea la intefaz usado por el boton de borrar campos
  resetGUI(): void {
    this.Comment = '';
    this.xmlName = '';
    this.file = '';

    if (!this.isOnUpdatePurchase) { this.inputVariableFileXml.nativeElement.value = ''; }


    if (this.lines.length > 0 && !this.hasBeenSend) {
      swal({
        type: 'warning',
        title: 'No se ha guardado el documento',
        text: '¿ Desea limpiar los campos ?',
        showCancelButton: true,
        confirmButtonColor: '#049F0C',
        cancelButtonColor: '#ff0000',
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      }).then(next => {
        if (!(Object.keys(next)[0] === 'dismiss')) {
          this.blockUI.start();
          this.CreateNew();
          this.blockUI.stop();
        }
      });
    }
    else {
      this.blockUI.start();
      this.CreateNew();
      this.blockUI.stop();
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
        this.globalBarcode = (<HTMLInputElement>document.getElementById('ItemCodeManualTrigger')).value + '';
        this.suggestItemCreation();
        this.isLockedByScanner = false;
      }
    }
  }

  // Incializa las variables a un estado por defecto
  InitVariables() {
    this.ItemInfo.setValue('');
    this.SugSuplier = false;
    this.OpenModalComand = true;
    this.udfs = [];
    this.udfTargets = [];
    this.udfTargetsOPDN = []
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.ITEMS);
    this.udfsOPDN = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.GOODSRECEIPTPO);
    this.isProcessing = false;
    this.ItemDetail = {} as IItemDetail;
    this.ResetHeaderForm();
    this.buildedData = '';
    this.isScanning = false;
    this.isLockedByScanner = false;
    this.lines = [];
    this.IsXml = false;
    this.barcodeList = [];
    this.CRCTotal = 0.0;
    this.SubTotal = 0.0;
    this.totalLines = 0.0;
    this.totalLinesWithDiscount = 0.0;
    this.DiscountTotal = 0.0;
    this.TaxesTotal = 0.0;
    this.USTotal = 0.0;
    this.CRCTotal = 0.0;
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.ShowColumm = false;
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.itemsService.UpdateLines([]);
    this.itemsService.hasLines = false;
    this.lockedButtton = false;
    this.hasBeenSend = false;
    this.flagForm = false;
    this.isOnUpdatePurchase = false;
    this.searchTypeManual = false;
    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();
    // 001 - Obtencion del valor de los margenes aceptados para esta vista.
    this.GetMargins();
    this.GetItems();
    this.GetWareHouses();
    this.GetExchangeRate();
    this.GetTaxes();
    this.GetViewGroupList();
    this.GetSuppliers();
    // this.storage.SaveBreadCrum(``);
    // this.storage.setPurchaseOrder(-1);
    this.setWarehouseInfo();

    setTimeout(() => this.inputEl.nativeElement.focus());

  }
  CreateNew() {
    const DOC_ENTRY = this.storage.getPurchaseOrder();
    if (DOC_ENTRY > 0) {
      this.router.navigate(['/', 'purchaseorderList']);
    } else {
      this.headerForm.controls['Supplier'].enable();
      this.storeService.SaveBreadCrum(``);
      this.commonService.hasDocument.next(``);
      this.storage.setPurchaseOrder(-1);
      this.InitVariables();
    }
  }
  GetViewGroupList() {
    // Consulta si se hace agrupacion de lineas en esta vista
    this.companyService.GetViewGroupList().subscribe(next => {
      if (next.Result) {
        ((next.ViewGroupList) as IViewGroup[]).forEach(x => {
          if (x.CodNum === 2) this.isOnGroupLine = x.isGroup;//Entrada de inventario
          if (x.CodNum === 2) { this.isLineMode = x.LineMode; }
        });
      }
    });
  }
  // Abre la modal de los codigos de barra
  open(content) {
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg' }).result.then((result) => {
      // this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      // this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
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



  //001
  GetMargins(): void {
    this.AcceptedMargin = 0;
    if (this.COMPANY.AcceptedMargins) {
      let CompanyMargins: CompanyMargins[] = JSON.parse(this.COMPANY.AcceptedMargins);
      let MarginForView = CompanyMargins.find(i => i.Code === '01');
      if (MarginForView) this.AcceptedMargin = MarginForView.Value;
    }

  }


  setWarehouseInfo() {
    let session = this.storage.getSession(navigator.onLine);
    if (session) {
      session = JSON.parse(session);

      this.whCode = session.WhCode;
      this.whName = session.WhName;
    }
  }

  ResetHeaderForm(): void {
    this.headerForm = this.formBuilder.group({
      Quantity: [1],
      // ItemInfo: [''],
      WareHouse: [''],
      Supplier: [''],
    });
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
        this.alertService.infoAlert(`Error: ${next.Error ? next.Error.Message : 'No se pudo refrescar los proveedores, vuelva a intentarlo por favor'}`);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  GetItems(): void {
    this.blockUI.start(`Obteniendo items, espere por favor`);
    this.itemsService.GetItems().subscribe(response => {
      this.blockUI.stop();
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
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.errorAlert(`Error: ${error.error}`);
    });
  }

  GetWareHouses(): void {
    this.blockUI.start();
    this.storeService.getStoresv2().subscribe(response => {
      this.blockUI.stop();
      this.Stores = response.Stores;
      this.headerForm.patchValue({ WareHouse: this.Stores[0].StoreCode });

    }, error => {
      this.blockUI.stop();
      console.log(error);
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
        this.alertService.errorAlert(`Error: ${data.Error ? data.Error.Message : 'No se pudo obtener el tipo de cambio'}`);
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorInfoAlert(`Error: ${error.error}`);
    });
  }

  GetTaxes(): void {
    this.blockUI.start();
    this.taxesService.GetTaxes().subscribe(response => {
      this.blockUI.stop();
      this.taxesList = response.Taxes;
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }


  //----------------------
  RiseItemDetails(indexOrCode: any, from: boolean) {
    let itemCode = from ? this.lines[indexOrCode].ItemCode : indexOrCode;
    if ((!itemCode && this.IsXml) || (itemCode == "++" && this.IsXml)) {
      this.alertService.infoInfoAlert(`Debe escanear ítem para consulta de históricos`);
      return;
    }

    this.blockUI.start('Obteniendo la información del articulo...');
    this.itemsService.GetItemDetails(itemCode, 3, 1).subscribe(data => {
      if (data.Result) {
        this.blockUI.stop();
        this.ItemDetail = data.Item;
        (<HTMLElement>document.getElementById('raiseModalConsult')).click();
        (<HTMLInputElement>document.getElementById("GoodReciptNumber")).value = '3';
      } else {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error:${data.Error.Message}`);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error: ${error.error}`);
    });
  }

  GetGoodReceptsForItemDetail() {
    let EntryNumbers = Number((<HTMLInputElement>document.getElementById("GoodReciptNumber")).value);
    this.blockUI.start('Obteniendo las entradas del artículo...')
    this.itemsService.GetItemDetails(this.ItemDetail.ItemCode, EntryNumbers, 1).subscribe(data => {
      if (data.Result) {
        this.blockUI.stop();
        this.ItemDetail = data.Item;
      } else {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error:${data.Error.Message}`);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error: ${error.error}`);
    });
  }

  OpenModalComent(content: any, Comment: string) {
    this.CommentarioActual = Comment;
    this.modalReference = this.modalService.open(content,
      {
        centered: true,
        backdrop: 'static'
      });

  }
  OnCloseItemDetailModal() {
    this.ItemInfo.setValue('');

    setTimeout(() => {
      this.inputEl.nativeElement.focus();
    }, 0);

  }

  CloseModal(): void {
    this.modalReference.close();
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


  OnClickCheckCons(): void {
    setTimeout(() => {
      this.inputEl.nativeElement.focus();
    }, 0);
  }

  ResetSearchValues(): void {
    try {
      this.headerForm.patchValue({ Quantity: 1, });
      // this.headerForm.patchValue({ ItemInfo: '' });
      this.ItemInfo.setValue('');


      this.buildedData = ``;
    }
    catch (error) {
      console.info(error);
    }
  }
  // Edicion orden de compra
  GetPurchaseOrder(purchaseDocEntry: number) {

    this.purchaseOrderService.GetPurchaseOrder(purchaseDocEntry).subscribe(next => {
      if (next.Result) {
        this.lines = [];
        this.Comment = next.PurchaseOrder.Comments;

        this.supplierModelDisplay = new FormControl(`${next.PurchaseOrder.BusinessPartner.CardCode} - ${next.PurchaseOrder.BusinessPartner.CardName}`);
        this.supplierModel = {} as IBusinessPartner;
        this.supplierModel.CardName = next.PurchaseOrder.BusinessPartner.CardName;
        this.supplierModel.CardCode = next.PurchaseOrder.BusinessPartner.CardCode;

        next.PurchaseOrder.Lines.forEach(x => {
          let itemAux = {
            'ItemNameXml': null,
            'Barcodes': null,
            'BarCode': null,
            'PriceListId': null,
            'ItemBarCode': '',
            'ForeingName': '',
            'ItemCode': `${x.ItemCode}`,
            'ItemName': `${x.ItemName}`,
            'UnitPrice': x.UnitPrice,
            'TaxCode': x.TaxCode,
            'Quantity': x.Quantity,
            'Tax_Rate': (Number(x.TaxRate)),
            'TaxRate': x.TaxRate,
            'Discount': x.Discount,
            'Frozen': null,
            'PriceList': null,
            'WareHouse': x.WareHouse,
            'TotalLine': x.LineTotal,
            'TotalLineWithTax': Number((x.LineTotal) + (Number(x.LineTotal) * (Number(x.TaxRate) / 100))),
            'LockedUnitPrice': x.UnitPrice,
            'IsExeeded': false,
            'UdfTarget': [],
            'TaxOnly': x.TaxOnly,
            'IsFocus': false
          }
          this.lines.push(itemAux);
        });

        this.recalculate();

      }
      else {
        console.log(next.Error);
        this.alertService.errorAlert(`Error al obtener la órden de compra: ${next.Error.Message}`);
        this.lockedButtton = true;
      }
    }, error => {
      this.alertService.errorAlert(`Error en la petición para obtener la órden de compra: ${error}`);
      console.log(error);
    }, () => {
      this.blockUI.stop();
    });

  }



  updatePurchaseOrder() {
    if (this.lines.length === 0) {
      this.alertService.infoAlert('Debe ingresar un artículo al menos');
      return;
    }

    const CORRUPTED_QUANTITY = this.lines.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.ItemCode}  - ${CORRUPTED_QUANTITY.ItemName}, debe ser mayor a 0`);
      return;
    }
    if (!this.supplierModel) {
      this.alertService.infoAlert('Debe seleccionar el proveedor');
      return;
    }


    if (this.lockedButtton) {
      this.alertService.infoAlert('Ya se ha actualizado la orden de compra');
      return;
    }

    if (!this.UdfOPDNValidation()) {
      this.blockUI.stop();
      return;
    }
    swal({
      type: 'warning',
      title: 'Se actualizará una órden de compra',
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Continuar',
      cancelButtonText: 'No'
    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {
        if (this.flagForm) {
          this.alertService.infoAlert('Intento duplicación documento');
          return;
        }
        this.blockUI.start('Actualizando la órden de compra');
        this.purchaseOrderService.UpdatePurchaseOrder(this.lines, this.supplierModel.CardCode.toString(), this.supplierModel.CardName, '', this.Comment, '', this.storage.getPurchaseOrder(), this.mappedUdfsOPDN).subscribe(response => {

          if (response.Result) {
            this.hasBeenSend = true;
            this.alertService.successAlert(`Se ha actualizado correctamente la orden de compra N° ${response.PurchaseOrder.DocNum}`);
            this.lockedButtton = true;
          } else {
            this.hasBeenSend = false;
            this.alertService.errorAlert('Error al actualizar la órden de compra: ' + response.Error.Message);
          }
        }, error => {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error en la solicitud para actualizar la orden de compra: ${error.error}`);
        },
          () => {
            this.blockUI.stop();
          });
      }
    });
  }


  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    this.storage.setPurchaseOrder(-1);


  }


  //# Semana 38
  OnclickTaxOnly(item: ILine): void {
    this.recalculate();
  }
  //#region UDFS OPDN
  GetConfiguredUdfs(_documentAlias: string): void {
    this.blockUI.start(`Obteniendo datos, espere por favor`);
    this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        switch (_documentAlias) {
          case 'OITM':
            this.udfs = next.Udfs;
            this.udfs.filter(x => x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));
            break;
          case 'OPDN':
            this.udfsOPDN = next.Udfs;
            this.udfsOPDN.filter(x => x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));
            const DOC_ENTRY = this.storage.getPurchaseOrder();
            if (DOC_ENTRY > 0 && this.udfsOPDN.length > 0) {
              this.GetUdfsData(this.udfsOPDN, DOCUMENT_ALIAS.PURCHASEORDER, DOC_ENTRY);
            }

            break;
        }

        this.GetUdfDevelopmentOITM();
        this.GetUdfDevelopmentOPDN();
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
  GetUdfsData(_udfs: IUdf[], _category: string, _docEntry): void {
    this.blockUI.start(`Obteniendo datos de udfs, espere por favor`);
    this.udfService.GetUdfsData(_udfs, _docEntry, _category).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        next.UdfsTarget.forEach(x => {
          if (x.FieldType === 'DateTime') {
            if (x.Value !== '') (<HTMLInputElement>document.getElementById(`dynamicRender_${x.Name}`)).value = formatDate(x.Value, 'yyyy-MM-dd', 'en');
          }
          else {
            (<HTMLInputElement>document.getElementById(`dynamicRender_${x.Name}`)).value = x.Value;
          }
        });
      }
      else {
        console.log(next);
        this.alertService.errorAlert(`Error ${next.Error ? next.Error.Message : JSON.stringify(next)}`);
      }
    }, error => {
      console.log(error);
    });
  }

  GetUdfDevelopmentOPDN(): void {
    this.udfService.GetUdfDevelopment().subscribe(next => {
      if (next.Result) {
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.GOODSRECEIPTPO).forEach(x => {
          this.udfTargetsOPDN.push({
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
    this.udfTargetsOPDN.forEach(x => {
      if (!this.udfsOPDN.find(y => y.Name === x.Key)) {
        this.alertService.errorAlert(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
            agreguelo en la configuración`);
        isValid = false;
        return;
      }
    });

    return isValid;
  }

  UdfOPDNValidation(): boolean {
    try {
      if (!this.IsUdfIntegrityValid()) return false;

      this.UdfSetter(this.udfTargetsOPDN);

      this.mappedUdfsOPDN = [];
      this.udfsOPDN.forEach(x => {
        let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;

        if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();

        this.mappedUdfsOPDN.push({
          Name: x.Name,
          Value: parsedValue,
          FieldType: x.FieldType
        } as IUdfTarget);
      });


      let udfName = '';
      let isValid = true;
      this.udfsOPDN.forEach(x => {
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

  //#region UDFS OITM

  UdfOITMValidation(): boolean {
    try {
      if (!this.IsUdfIntegrityValidOITM()) return false;

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
  GetUdfDevelopmentOITM(): void {
    this.udfService.GetUdfDevelopment().subscribe(next => {
      if (next.Result) {
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.ITEMS).forEach(x => {
          this.udfTargets.push({
            Key: x.Description,
            Value: ''
          });
        });
        this.IsUdfIntegrityValid();
      }
    });
  }
  IsUdfIntegrityValidOITM(): boolean {
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
  //#endregion

  //#region CREACION ENTRADA DESDE XML
  UploadFileXML(file): void {
    this.headerForm.patchValue({ Supplier: null });
    this.SugSuplier = false;

    if (!this.headerForm.value.WareHouse) {
      this.alertService.infoInfoAlert(`Seleccione almacén para cargar xml`);
      return;
    }
    if (file.length > 0) {
      let FileExtention: string = file[0].name.split('.').pop();
      if (FileExtention.toUpperCase() === 'XML') {

        this.file = file;
        this.xmlName = this.file[0].name;

        if (this.file != null) {
          this.lines = [];
          this.SaveXML();
        }
      } else {
        this.alertService.errorAlert(`El tipo de archivo debe ser xml`);
      }
    }
  }


  SaveXML(): void {
    if (this.file.length === 0) {
      this.alertService.infoInfoAlert(`Seleccione un archivo al menos`);
      return;
    }
    this.blockUI.start(`Procesando xml`);
    let formData = new FormData();

    if (this.file != null) {
      formData.append('file', this.file[0]);
      formData.append(`WhsCode`, this.headerForm.value.WareHouse);
      formData.append(`UserId`, JSON.parse(this.storage.getCurrentSession()).userId);
    }

    this.goodsReciptService.CreateGoodsReciptXml(formData).subscribe(next => {
      this.blockUI.stop();

      if (next.Result) {
        this.lines = [];
        this.IsXml = true;
        this.commonService.hasDocument.next(`${this.xmlName}`);
        this.storeService.SaveBreadCrum(`${this.xmlName}`);
        if (next.GoodsReceipt.BusinessPartner.CardCode != null && next.GoodsReceipt.BusinessPartner.CardName != null) {
          this.SugSuplier = true;
          this.headerForm.patchValue({ Supplier: `${next.GoodsReceipt.BusinessPartner.CardCode} - ${next.GoodsReceipt.BusinessPartner.CardName} - ${next.GoodsReceipt.BusinessPartner.Cedula}` });
        }

        next.GoodsReceipt.Lines.forEach(x => {
          let itemAux = {
            'ItemNameXml': `${x.ItemNameXml}`,
            'Barcodes': null,
            'BarCode': null,
            'PriceListId': null,
            'ItemBarCode': '',
            'ForeingName': '',
            'ItemCode': `${x.ItemCode}`,
            'ItemName': `${x.ItemName}`,
            'UnitPrice': x.UnitPrice,
            'TaxCode': x.TaxCode,//this.ImpTaxRate(Number(x.TaxRate)),
            'Quantity': x.Quantity,
            'Tax_Rate': (Number(x.TaxRate)),
            'TaxRate': x.TaxRate,
            'Discount': +(Number(x.Discount)).toFixed(2),
            'Frozen': null,
            'PriceList': null,
            'WareHouse': x.WareHouse,
            'TotalLine': x.LineTotal,
            'TotalLineWithTax': Number((x.LineTotal) + (Number(x.LineTotal) * (Number(x.TaxRate) / 100))),
            'LockedUnitPrice': x.UnitPrice,
            'IsExeeded': false,
            'UdfTarget': [],
            'TaxOnly': x.TaxOnly,
            'IsFocus': false
          }
          this.lines.push(itemAux);
        });
        setTimeout(() => {
          this.inputEl.nativeElement.focus();
        }, 0);

        this.recalculate();
        this.ChangeFocusIndex(-1);
      }
      else {
        this.alertService.errorAlert('Error: ' + next.Error.Message);
        this.xmlName = '';
        this.file = '';
        this.lines = [];
        this.inputVariableFileXml.nativeElement.value = ''
        this.storeService.SaveBreadCrum(``);
        this.commonService.hasDocument.next(``);
        this.recalculate();

      }
    }, error => {
      this.blockUI.Stop();
      console.log(error);
      this.storeService.SaveBreadCrum(``);
      this.commonService.hasDocument.next(``);
      this.inputVariableFileXml.nativeElement.value = ''
      this.alertService.errorAlert('Error:' + error);
      this.xmlName = '';
      this.file = '';
      this.lines = [];
      this.recalculate();
    });

  }
  //Xml unicamente indica tarifa
  ImpTaxRate(_taxCode: number): string {
    const TAXRATE = this.taxesList.find(y => y.TaxRate == Number(_taxCode));
    if (TAXRATE) {
      return TAXRATE.TaxCode;
    } else {
      console.log("Taxcode no encontrado en lista de impuestos " + _taxCode);
    }
  }


  //Cambiar orden de escaneo items
  ChangeFocusIndex(index: number): void {
    if (this.IsXml) {
      const INDEXANTERIOR = this.lines.findIndex(x => x.IsFocus == true);

      if (INDEXANTERIOR != -1) {
        if (this.lines[INDEXANTERIOR].IsFocus === this.lines[index].IsFocus) {
          this.lines[index].IsFocus = false;
        } else {
          this.lines.forEach(X => {
            X.IsFocus = false;
          });
          if (this.lines[index].ItemNameXml) {
            this.lines[index].IsFocus = true;
          }
        }
        setTimeout(() => this.inputEl.nativeElement.focus());
      } else {
        if (index != -1) {
          if (this.lines[index].ItemNameXml) {
            this.lines[index].IsFocus = true;
            setTimeout(() => this.inputEl.nativeElement.focus());
          }
        } else {
          const NEXT_INDEX = this.lines.findIndex(x => x.ItemCode === "");
          if (NEXT_INDEX != -1) {
            this.lines[NEXT_INDEX].IsFocus = true;
          }
        }
      }

    }

  }


  //#endregion
}
