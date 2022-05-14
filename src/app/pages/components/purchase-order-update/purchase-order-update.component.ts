import { Component, OnInit, ElementRef, ViewChild, Inject, ViewChildren, QueryList, HostListener, DoCheck } from '@angular/core';
import { AlertService } from '../../../services/alert.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription, Observable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ItemService, PermsService, AuthenticationService, ExRateService, CommonService } from 'src/app/services';
import { BusinessPartnerService } from '../../../services/business-partner.service';
import { debounceTime, map, distinctUntilChanged, filter } from 'rxjs/operators';
import { IBarcode, IItemModel } from '../../../models/i-item';
import { GoodsReciptService } from '../../../services/goods-recipt.service';
import { StoreService } from '../../../services/store.service';
import { ILine } from '../../../models/i-line';
import { TaxService } from '../../../services/tax.service';
import swal from 'sweetalert2';
import { FormControl, FormGroup } from '@angular/forms';
import { DOCUMENT, EventManager } from '@angular/platform-browser';
import { Renderer2 } from '@angular/core';
import { IPrice, IPurchaseOrder, IBusinessPartner, Company, IUdfTarget } from 'src/app/models';
import { CompanyService } from '../../../services/company.service';
import { IViewGroup } from 'src/app/models';
import { StorageService } from '../../../services/storage.service';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-purchase-order-update',
  templateUrl: './purchase-order-update.component.html',
  styleUrls: ['./purchase-order-update.component.scss']
})

export class PurchaseOrderUpdateComponent implements OnInit, DoCheck {
  whCode: string;
  whName: string;
  //VARBOX
  isScanning: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  Comment: string
  @ViewChild('scrollMe') private myScrollContainer: ElementRef; // Se usa para que la tabla haga autoscroll
  @ViewChild('input1') inputEl: ElementRef; // Lo uso para mandarle el autofocus cuando se escanea el codigo de barras
  @ViewChild('barcodeEl') barcodeEl: ElementRef; // Lo uso para mandarle el autofocus cuando se escanea el codigo de barras
  permisos = true; // Comprueba los permisos del usuario
  lines: ILine[]; // Representa la linea del producto que se ingresa
  sourceLines: ILine[]; // Representa la linea del producto que se ingresa
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  itemsList: IItemModel[]; // Contiene el nombre de los productos, preformateados desde el api y el codigo de estos
  globalItem: IItemModel;
  barcodeList: IBarcode[] = []; // Contiene la lista de los codigo de barra
  taxesList: any; // Contiene la lista de impuestos registrados en el sistema
  businessParters: any; // Contiene la lista de todos los proveedores
  @BlockUI() blockUI: NgBlockUI; // Usado para bloquear la interfaz de usuario
  currentUser: any; // variable para almacenar el usuario actual
  COMPANY: Company; // Almacena la configuracion de los decimales que se usaran en la app
  DOCNUM: number;
  TO_FIXED_PRICE: string; // Cantidad de decimales que se usaran para mostrar el precio unitario
  TO_FIXED_TOTALLINE: string; // Cantidad de decimales que se usaran para mostrar el total de linea
  TO_FIXED_TOTALDOCUMENT: string; // Cantidad de decimales que se usaran para mostrar el total del document
  globalName: string; // Guarda el nombre del item seleccionado del typeahead
  modalTitleItem = 'Agregar producto al sistema';
  totalLines: number; // Guarda la sumatoria de todas las linea con (precio unitario * cantidad)
  totalLinesWithDiscount: number; // Guarda el subtotal con los decuentos aplicados
  item: IItemModel; // Model para el typeahead, cuando se lecciona un item de la lista este lo almacena
  priceList: IPrice[]; // Contiene la lista de precios del sistema, debe ser obtenida por request, por ahora se va quemada para mostrar funcionalidad
  UnitPrice: number; // Variable auxiliar para el calculo del precio unitario
  Quantity: number; // Almacena la cantidad que el usuario desea ingresar cuando se selecciona un item del typeahead
  SubTotal: number; // Guarda el subtotal solo con el total de linea menos el decuento
  WareHouse: string; // Guarda el id del almacen del dropdown global
  Stores: any; // Guarda todos los almacenes de la empresa
  DiscountTotal: number; // Guarda la sumatoria de todos los decuentos por linea
  TaxesTotal: number; // Guara el total de los impuestos aplicados a cada linea
  USTotal: number; // Total en dolares
  CRCTotal: number; // Total en colones
  currentIndex: number; // Muestra cual item de la tabla ha sido seleccionado
  exrate: number; // Guarda el tipo de cambio actual para realizar calculos dicha moneda
  barcodeModel: any; // Usando para sacar el codigo de barras de un producto, de la lista de codigos que este tiene
  supplierModel: any; // Contiene el proveedor seleccionado
  supplierModelDisplay: FormControl = new FormControl(); // Contiene el proveedor seleccionado
  globalBarcode: string; // Codigo de barras global para busqueda en el api de productos
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  lockedButtton = false; // Usado para bloquear ciertos botones de acciones
  ItemInfo: FormControl = new FormControl(); // Formulario simple para el typeahead
  hasBeenSend: boolean; // Es usado para evitar mandar documentos duplicados
  itemForm; // Formulario para la edicion de un item en caliente
  viewGroupList: IViewGroup[]; //contiene lista de agrupaciones en linea
  isOnEditMode = false; // Usada para comprobar si un item esta en modo edicion o creacion
  isOnGroupLine: boolean;//Agrupacion de lineas en documento
  isLineMode : boolean;//Orden de lineas en documento al inicio o final 
  purchaseOrder: IPurchaseOrder; // Contiene el model de orden de compra a editar
  isUpdatingBarcode: boolean; // Variable para ver si se actualiza el codigo de barras



  uniqueDocumentID:string;

  @ViewChild('editQuantityId') editQuantityId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  @ViewChild('editUnitPriceId') editUnitPriceyId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  @ViewChild('editTotalLineId') editTotalLineId: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar

  barcodeForm = new FormGroup({
    barcodeModal: new FormControl(''),
    barcodeDescriptionModal: new FormControl('')
  }); // Formulario para la gestion de los codigos de barra de un producto

  fItemName = (x: { ItemName: string }) => x.ItemName; // Formateador para el nombre de los productos
  sItemName = (text$: Observable<string>) => text$.pipe( // Busca en el nombre de item la coincidencia por codigo de barras, nombre, codigo item
    debounceTime(5),
    distinctUntilChanged(),
    map(term => term === '' ? []
      : this.itemsList.filter(v => v.ItemName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 3)))

      searchItemCode = (text$: Observable<string>) =>
      text$.pipe(
        debounceTime(0),
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
                const ii = a.indexOf(b[c]);
                if (ii > -1) {
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
      )
  supplierNameformatter = (x: { CardName: string }) => x.CardName; // Formateador para el nombre de los proveedores
  supplierSearchName = (text$: Observable<string>) => text$.pipe( // Busca en el nombre del proveedor por cedula, codigo, nombre
    debounceTime(5),
    map(term => term === '' ? []
      : this.businessParters.filter(v => v.CardName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10)))

  constructor(private eventManager: EventManager,
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
    private commonService:CommonService,
    private taxesService: TaxService,
    @Inject(DOCUMENT) private _document: Document,
    private renderer: Renderer2,
    private elRef: ElementRef,
    private companyService: CompanyService,
    private router: Router,
    private exrateService: ExRateService,) {
    this.purchaseOrder = null;
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.lockedButtton = false;
    // const removeGlobalEventListener = this.eventManager.addGlobalEventListener(
    //   'document',
    //   'keypress',
    //   (ev) => {
    //     if (ev.key === 'Enter') {
    //       if ((<HTMLInputElement>document.getElementById('inputPro'))) {
    //         if ((<HTMLInputElement>document.getElementById('inputPro')).value !== null || (<HTMLInputElement>document.getElementById('inputPro')).value !== '') {
    //           if ((<HTMLInputElement>document.getElementById('inputPro')).value + '' !== '') {
    //             this.globalBarcode = (<HTMLInputElement>document.getElementById('inputPro')).value + '';
    //             this.suggestItemCreation();
    //           }
    //         }
    //       }
    //     }
    //   }
    // );
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

    if (this.isLockedByScanner && this.itemsTypeaheadList.find(x => x.indexOf(this.ItemInfo.value) > -1)) {
      try {
        let buttons = document.getElementsByClassName('dropdown-item');
        setTimeout(() => {
          if (buttons[0]) {
            let dynamicId = buttons[0].getAttribute('id');
            if (dynamicId) {
              if (dynamicId.indexOf('ngb-typeahead') < 0 || !(<HTMLButtonElement>document.getElementById(dynamicId))) {
                this.alertService.infoAlert('No se pudo identificar la generación dinámica del componente, por favor seleccione el producto manualmente');
              }
              else {
                (<HTMLButtonElement>document.getElementById(dynamicId)).click();
              }
            }
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

  @HostListener('contextmenu', ['$event'])
  onRightClick(event) {
    event.preventDefault();
    if ((<HTMLElement>event.target) && (<HTMLElement>event.target).getAttribute('ng-reflect-result')) {
      const CODE = (<HTMLElement>event.target).getAttribute('ng-reflect-result').split(' ')[0];
      this.ItemInfo.reset();
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
    this.DOCNUM = this.storeService.restorePurchaseOrderDocNum();
    if (this.DOCNUM === -1) this.router.navigate(['/', 'purchaseorder']);
    this.modalTitleItem = 'Agregar producto al sistema';

    this.lines = [];
    this.sourceLines = [];
    this.InitVariables();
    this.blockUI.start('Obteniendo la órden de compra');
    this.purchaseOrderService.GetPurchaseOrder(this.DOCNUM).subscribe(next => {
      // this.storeService.savePurchaseOrderDocNum(-1);
      if (next.Result) {
        this.purchaseOrder = next.PurchaseOrder;
        this.supplierModelDisplay = new FormControl(`${next.PurchaseOrder.BusinessPartner.CardCode} - ${next.PurchaseOrder.BusinessPartner.CardName}`);
        this.supplierModel = {} as IBusinessPartner;
        this.supplierModel.LicTradNum = next.PurchaseOrder.BusinessPartner.LicTradNum;
        this.supplierModel.CardName = next.PurchaseOrder.BusinessPartner.CardName;
        this.supplierModel.CardCode = next.PurchaseOrder.BusinessPartner.CardCode;
        this.lines = next.PurchaseOrder.Lines;
        this.Comment = next.PurchaseOrder.Comments;
        // Obtiene el tipo de cambio
        this.exrateService.getExchangeRate().subscribe((data: any) => {
          if (data.Result) {
            this.exrate = data.exRate
          } else {
            this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
          }

          this.lines.forEach(x => {
            x.UnitPrice = x.Discount > 0 ? (x.UnitPrice / (1 - (x.Discount / 100))) : x.UnitPrice;
            x.TotalLine = x.LineTotal;
          });

          this.recalculate();
          this.lines.forEach(x => this.sourceLines.push({ ...x }));
        }, (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al conectar con el servicio de tipo de cambio, Error: ${error.error.Message}`);
        }), () => {
          this.blockUI.stop();
        };
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

    setTimeout(() => this.inputEl.nativeElement.focus());
    this.resetItemForm();
    this.checkPermits(); // Verifica si el usuario tiene permisos para acceder a la pagina
    // Carga la lista de proveedores y la formatea para poder buscar codigo en este
    this.businessPartnerService.GetSuppliers().subscribe(response => {
      this.businessParters = response.BPS;
      for (let c = 0; c < this.businessParters.length; c++) {
        const bp = this.businessParters[c];
        this.businessParters[c].CardName = `${bp.CardCode} - ${bp.CardName} - ${bp.Cedula}`;
      }
    });

    // Obtiene la lista de almances de la compania, este lo hice nuevo porque el que estaba llamaba otro metodo, pero sigue exisitendo
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
    // Consulta si se hace agrupacion de lineas en esta vista
   
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

    }
   
  }
 

  raiseModalCreation(): void {
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

    (<HTMLInputElement>document.getElementById('raiseItemModal')).click();
  }

  raiseModalCreationFromRighClick(ItemCode: string): void {
    this.barcodeList = [];
    const item: IItemModel = {} as IItemModel;

    this.itemsService.GetItemByItemCode(ItemCode, 1).subscribe(next => {
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
            LINE.Quantity = this.Quantity > 0 ? this.Quantity : 1;
            LINE.TaxCode = next.Item.TaxCode;
            LINE.UnitPrice = +(Number(next.Item.LastPurchasePrice)).toFixed(4);
            LINE.Discount = next.Item.Discount;
            LINE.Tax_Rate = next.Item.TaxRate;
            LINE.TaxRate = next.Item.TaxRate;
            LINE.WareHouse = this.WareHouse;
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
            this.alertService.errorAlert(`Error al obtener los códigos de barra, Error: ${next1.errorInfo.message}`)
          }
        }, error => {
          this.alertService.errorAlert(`Error al conectar con el servidor, Error: ${error.error}`)
        });
      }
      else {
        this.alertService.errorAlert(`Error al obtener el producto, Error: ${next.errorInfo.message}`);
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
    this.ItemInfo.reset();
    setTimeout(() => this.inputEl.nativeElement.focus(), 300);
  }

  saveItem(): void {
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
      UdfTarget: []
    };
    console.log(mItem); 
    if (mItem.ItemName.length === 0 || this.barcodeList.length === 0) {
      this.alertService.infoInfoAlert('El producto debe tener un nombre y un código de barras al menos');
      return;
    }
    this.blockUI.start('Creando el ítem, espere por favor...');
    this.itemsService.CrateItem(mItem).subscribe(response => {
      this.blockUI.stop();
      if (response.Result) {
        this.alertService.successInfoAlert('Se ha creado correctamente el producto');
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

          this.ItemInfo.reset();
          setTimeout(() => this.inputEl.nativeElement.focus());
        });
      } else {
        console.error(response.errorInfo);
        this.alertService.errorAlert(`Error al crear el producto ${response.errorInfo.Message}`);
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
    console.log(this.globalItem);
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
        console.log(response.errorInfo);
        this.alertService.errorAlert(`Error al actualizar los códigos de barra ${response.errorInfo.Message}`);
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
  addItems(item: any): void {
    const ITEM_CODE = item.item.split(' ')[0];
    this.onThClick(ITEM_CODE);
    item.preventDefault();
    this.ItemInfo.reset();
  }
  // Funcion que recalcula el precio total, subtotal, descuentos, impuestos, sobre la lista de lineas
  recalculate(): void {
    const TO_FIX = 4;
    this.totalLines = +this.lines.reduce((a, b) => a + (((b.UnitPrice * b.Quantity)) || 0), 0).toFixed(TO_FIX);

    this.totalLinesWithDiscount = +this.lines.reduce((a, b) => a + (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) || 0), 0).toFixed(TO_FIX);

    this.TaxesTotal = +this.lines.reduce((a, b) => a + (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) * (+b.TaxRate / 100) || 0), 0).toFixed(TO_FIX);

    this.DiscountTotal = +this.lines.reduce((a, b) => a + ((b.UnitPrice * b.Quantity) * (b.Discount / 100) || 0), 0).toFixed(TO_FIX);

    this.CRCTotal = +this.lines.reduce((a, b) => a +
      (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) +
        (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) * (b.Tax_Rate / 100)) || 0), 0).toFixed(TO_FIX);

    this.CRCTotal = (this.totalLinesWithDiscount + this.TaxesTotal);

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
    this.ItemInfo.reset();
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
    this.recalculate();
  }
  // Evento para seleccionar un item del type ahead y cargarlo en la lista de lineas
  onThClick(_itemCode: string): void { 
    // if (item.constructor.name.toString() === 'Object') {
    this.blockUI.start('Obteniendo información del item');
    this.itemsService.GetItemByItemCode(_itemCode, 1).subscribe(response => {
      if (response.Result) {
        const LINE = {} as ILine;
        LINE.BarCode = response.Item.BarCode;
        LINE.ItemCode = response.Item.ItemCode;
        LINE.ItemName = response.Item.ItemName;
        LINE.Quantity = this.Quantity > 0 ? this.Quantity : 1;
        LINE.TaxCode = response.Item.TaxCode;
        // LINE.UnitPrice = +(Number(response.Item.LastPurchasePrice)).toFixed(this.DECS);
        LINE.UnitPrice = +(Number(response.Item.LastPurchasePrice)).toFixed(4);
        LINE.Discount = response.Item.Discount;
        LINE.Tax_Rate = response.Item.TaxRate;
        LINE.TaxRate = response.Item.TaxRate;
        LINE.WareHouse = this.WareHouse;
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
          this.isOnGroupLine ? this.summarize(LINE) :this.isLineMode ? this.lines.push(LINE) : this.lines.unshift(LINE);
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
        x.Quantity = x.Quantity + (this.Quantity > 0 ? this.Quantity : 1);
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

    switch (+field) {
      case 0:
        this.lines[i].Quantity = +(parseFloat((<HTMLInputElement>document.getElementById('quantity_' + i)).value).toFixed(4));
        this.lines[i].TotalLine = this.lines[i].Quantity * this.lines[i].UnitPrice;
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
    }
    this.recalculate();
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

    if (!this.supplierModel) {
      this.alertService.infoAlert('Debe seleccionar el proveedor');
      return;
    }

    if (this.lockedButtton) {
      this.alertService.infoAlert('Ya se ha generado la entrada, por favor presione borrar campos para agregar una nueva entrada');
      return;
    }

    let mappedUdfs: IUdfTarget[] = [];
    swal({
      type: 'warning',
      title: 'Se creará una entrada de inventario',
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then(next => {
      console.log(Object.keys(next));
      if (!(Object.keys(next)[0] === 'dismiss')) {
        this.blockUI.start('Agregando la entrada de inventario');
        this.goodsReciptService.CreateGoodsRecipt(
          this.lines, this.supplierModel.CardCode, this.supplierModel.CardName, this.supplierModel.Cedula, 'hardcoded',mappedUdfs,this.uniqueDocumentID 
        ).subscribe(response => {
          this.blockUI.stop();
          if (response.Result) {
            this.hasBeenSend = true;
            this.alertService.successAlert('Se ha creado correctamente la entrada de inventario');
            this.lockedButtton = true;
          } else {
            this.hasBeenSend = false;
            this.alertService.errorAlert('Error al agregar la entrada: ' + response.errorInfo.Message);
          }
        }, error => {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error en la solicitud para agregar la entrada de invetario: ${error.error}`);
        }, () => {
          this.blockUI.stop();
        });
      }
    });
  }

  updatePurchaseOrder(): void {
    let mappedUdfs: IUdfTarget[] = [];
    if (this.lines.length === 0) {
      this.alertService.infoAlert('Debe ingresar un artículo al menos');
      return;
    }

    if (!this.supplierModel) {
      this.alertService.infoAlert('Debe seleccionar el proveedor');
      return;
    }

    if (this.lockedButtton) {
      this.alertService.infoAlert('Ya se ha actualizado la órden de compra');
      return;
    }

    this.blockUI.start('Actualizando la órden de compra');
    this.purchaseOrderService.UpdatePurchaseOrder(this.lines, this.supplierModel.CardCode.toString(),
      this.supplierModel.CardName, '', this.Comment, '', this.DOCNUM,mappedUdfs).subscribe(response => {

        if (response.Result) {
          this.hasBeenSend = true;
          this.alertService.successAlert('Se ha actualizado correctamente la órden de compra');
          this.lockedButtton = true;
        } else {
          this.hasBeenSend = false;
          this.alertService.errorAlert('Error al actualizar la órden de compra: ' + response.Error.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorAlert(`Error en la solicitud para actualizar la órden de compra: ${error.error}`);
      },
        () => {
          this.blockUI.stop();
        });
  }

  createPurchaseOrder(): void {    
    let mappedUdfs: IUdfTarget[] = [];
    if (this.lines.length === 0) {
      this.alertService.infoAlert('Debe ingresar un artículo al menos');
      return;
    }

    if (!this.supplierModel) {
      this.alertService.infoAlert('Debe seleccionar el proveedor');
      return;
    }

    if (this.lockedButtton) {
      this.alertService.infoAlert('Ya se ha generado la órden de compra, por favor presione limpiar campos para agregar una nueva órden de compra');
      return;
    }

    swal({
      type: 'warning',
      title: 'Se creará órden de compra',
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then(next => {
      console.log(Object.keys(next));
      if (!(Object.keys(next)[0] === 'dismiss')) {
        this.blockUI.start('Agregando la órden de compra');

        this.purchaseOrderService.CreatePurchaseOrder(
          this.lines, this.supplierModel.CardCode, this.supplierModel.CardName, this.supplierModel.Cedula, 'hardcoded',mappedUdfs, this.uniqueDocumentID
        ).subscribe(response => {
          this.blockUI.stop();
          if (response.Result) {
            this.hasBeenSend = true;
            this.alertService.successAlert(`Se ha creado correctamente la órden de compra N° ${response.PurchaseOrder.DocNum}`);
            this.lockedButtton = true;
          } else {
            this.hasBeenSend = false;
            this.alertService.errorAlert('Error al agregar la órden de compra: ' + response.Error.Message);
          }
        }, error => {
          this.blockUI.stop();
          console.log(error);
          this.alertService.errorAlert(`Error en la solicitud para crear la órden de compra: ${error.error}`);
        }, () => {
          this.blockUI.stop();
        });
      }
    });
  }

  equals(x, y): boolean {
    let objectsAreSame = true;
    for (var propertyName in x) {
      // console.log();
      if (x[propertyName] !== y[propertyName]) {
        console.log(propertyName, "->", x[propertyName], " | " + y[propertyName]);
        objectsAreSame = false;
        break;
      }
    }
    return objectsAreSame;
  }

  // Resetea la intefaz usado por el boton de borrar campos
  resetGUI(): void {

    let islinesLenghtEqual = this.lines.length === this.sourceLines.length;

    if (!islinesLenghtEqual && !this.hasBeenSend) {
      swal({
        type: 'warning',
        title: 'El documento se ha modificado',
        text: '¿ Desea salir sin guardar los cambios ?',
        showCancelButton: true,
        confirmButtonColor: '#049F0C',
        cancelButtonColor: '#ff0000',
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      }).then(next => {
        if (!(Object.keys(next)[0] === 'dismiss')) {
          this.blockUI.start();
          this.InitVariables();
          this.blockUI.stop();
          this.router.navigate(['/purchaseorder']);
        }
      });
    }
    else {
      this.blockUI.start();
      this.InitVariables();
      this.blockUI.stop();
      this.router.navigate(['/purchaseorder']);
    }
  }


  // Incializa las variables a un estado por defecto
  InitVariables() {
    this.Comment = ``;
    this.COMPANY = this.storage.getCompanyConfiguration(); // Gets decimals configuration of the company

    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;


    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();

    this.lines = [];
    this.barcodeList = [];
    this.CRCTotal = 0.0;
    this.Quantity = 1;
    this.SubTotal = 0.0;
    this.totalLinesWithDiscount = 0.0;
    this.totalLines = 0.0;
    this.DiscountTotal = 0.0;
    this.TaxesTotal = 0.0;
    this.USTotal = 0.0;
    this.CRCTotal = 0.0;
    this.itemsService.UpdateLines([]);
    this.supplierModel = null;
    this.itemsService.hasLines = false;
    this.lockedButtton = false;
    this.hasBeenSend = false;
    this.ItemInfo.reset();
    this.companyService.GetViewGroupList().subscribe(next => {
      if (next.Result) {
        ((next.ViewGroupList) as IViewGroup[]).forEach(x => {
          if (x.CodNum === 1) this.isOnGroupLine = x.isGroup;
          if (x.CodNum === 1) this.isLineMode = x.LineMode;
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

  setWarehouseInfo() {
    let session = this.storage.getSession(navigator.onLine);
    if (session) {
      session = JSON.parse(session);

      this.whCode = session.WhCode;
      this.whName = session.WhName;
    }
  }
}

