import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, HostListener, Inject, DoCheck, Renderer2 } from "@angular/core";
import { FormBuilder, FormGroup, Validators, FormControl } from "@angular/forms";
import { BlockUI, NgBlockUI } from "ng-block-ui";
import { Observable, Subject, Subscription, fromEvent } from "rxjs";
import { debounceTime, distinctUntilChanged, map, first } from "rxjs/operators";
import { DecimalPipe, CurrencyPipe, DatePipe, DOCUMENT } from "@angular/common";
import { NgbModal, ModalDismissReasons, NgbModalOptions } from "@ng-bootstrap/ng-bootstrap";
import { formatDate } from '@angular/common';
import swal from 'sweetalert2';
// MODELOS
import { Params, UserAssigns, IdentificationType, PayTermsEnum, CONFIG_VIEW, IViewGroup, IPPTransaction, Company, IPrinter, ITerminal, ITerminalByUser, IInvoiceType, IUdf, IUdfTarget, IKValue, IDocumentToSync, IDocumentLine } from "./../../../models/index";
import { ReportType, SOAndSQActions, PaymentResults, BoRcptInvTypes, BaseTypeLines, BoDocumentTypes, ItemsClass } from "../../../enum/enum";
// CONSTANTS
const printJS = require("print-js");

// SERVICIOS
import { Router, ActivatedRoute } from '@angular/router';
import {
  CompanyService, UserService, ItemService, BusinessPartnerService, DocumentService, TaxService, PermsService, AuthenticationService, ParamsService, ReportsService,
  AccountService, ExRateService, CardService, BankService, AlertService, SalesManService, JsonDataService, StorageService, PaymentService, CommonService
} from "../../../services/index";

import { SOAndSQService } from 'src/app/services/soand-sq.service';
// Electron renderer service
import { ElectronRendererService } from '../../../electronrenderer.service';
import { ITransactionPrint } from "src/app/models/i-transaction-print";
import { UdfsService } from "src/app/services/udfs.service";
import { DOCUMENT_ALIAS } from "src/app/models/constantes";
import { IudfValue } from "src/app/models/iudf-value";
import { EventManager } from "@angular/platform-browser";
import { DocumentsToSyncService } from "src/app/services/documents-to-sync-service.service";
import { GoodsReceiptStockService } from "src/app/services/goodsReceiptStockService";
import { IMemoryInvoice } from "src/app/models/i-memory-invoice";
import { MemoryInvoiceService } from "src/app/services/memory-invoice.service";
import { PaymentComponent } from "src/app/components/payment/payment.component";
import { IInvoiceInfoForPayment, IOnPaymentFail } from "src/app/models/i-payment-data";
import { CreateInvoice, DocumentModel } from "src/app/models/i-invoice-document";
import { BasePayment, PaymentLines } from "src/app/models/i-payment-document";
// import { ConsoleReporter } from "jasmine";

// PIPES

export enum KEY_CODE {
  F4 = 115,
  F7 = 118,
  F8 = 119
}

import { Currency } from 'src/app/models/i-currency';
import { RouterExtServiceService } from "src/app/services/router-ext-service.service";
import { IDocument, IQuotDocument, ISaleDocument } from "src/app/models/i-document";
import { IContableAccounts } from "src/app/models/i-contableaccounts";
import { BusinessPartnerModel } from "src/app/models/i-business-partner-model";
import { timingSafeEqual } from "crypto";



@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
  providers: [DecimalPipe, CurrencyPipe, DatePipe]
})
export class DocumentsComponent implements OnInit, OnDestroy, AfterViewInit, DoCheck {
  //varbox
  ppbackup: any;
  requiredCardAccount: string;
  requiredCashAccount: string;
  requiredTransferAccount: string;
  defaultCardNumber: string;
  isAllowedToEditCardNumber: boolean;
  searchTypeManual: boolean; // Validación por 2ble petición en typeahead cuando se agrega ítem por búsqueda manual,sin scanner.
  isProcessing: boolean;
  modalInvoiceContent: boolean;
  isScanning: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  currentNgbIndex = 0;
  documentTitle: string; //Titulo boton accion documento
  permisos: boolean = true;
  isBilling: boolean;//Validacion flag para evitar reenvio de solicitudes pago al mismo tiempo
  attemptsWhileBilling: number = 0;
  lastInvoice: number;
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  $requestViewer: Subject<number>;
  currentUser: any;
  currentRequest: number;
  subscriptions: Subscription;//Contiene la lista de todas las subscriptions
  subscriptionsf: Subscription[] = []; // Contiene la lista de todas las subscriptions
  requestToAwait: number;

  submitted = false; // variable para reconcer si se envio una peticion o no

  isEditable: boolean;



  isAllowedPriceListChange: boolean; // Controla el cambio de lista por parte del usuario
  isAllowedGoodReceipt: boolean; // Permiso para realizar ajuste de inventario
  isChangeTax = false; //permiso para cambiar impuesto a item
  isPermBonus = false; //permiso facturar items bonificados
  isAllowedWHChange: boolean; //Permiso cambiar almacen al item
  DEFAULT_BUSINESS_PARTNER: string; //Creacion carga cliente configurado en consola, edicion de documento
  // invoiceType: string; // contiene el valor definido en un JSON para el tipo de Factura
  @BlockUI() blockUI: NgBlockUI;
  TotalCol: FormControl = new FormControl();
  TotalUSD: FormControl = new FormControl();
  Cant: FormControl = new FormControl();
  ItemInfo: FormControl = new FormControl();
  documentForm: FormGroup; // formulario para la orden de venta
  feForm: FormGroup;//Formulario datos factura electronica
  typeArrow: boolean; // Hace toggle al darle click
  typesInvoice: IInvoiceType[] = [];
  viewParamList: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListHeader: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListTotales: any[] = []; // llena la lista con los componentes parametrizados
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  MapWidth: any;//Configuracion tabla
  tableLength: number;//Tamano tabla
  // --------Campos Parametrizados cabezera
  lbCardCode: Params = new Params(); // etiqueta para CardCode
  txtCardCode: Params = new Params(); // campo para CardCode
  lbCardName: Params = new Params(); // etiqueta para CardName
  txtCardName: Params = new Params(); // campo para CardName
  lbCurrency: Params = new Params(); // etiqueta para CardName
  txtCurrency: Params = new Params(); // campo para CardName
  txtPayTerms: Params = new Params(); // campo para Terminos de pagos
  lbPayTerms: Params = new Params(); // etiqueta para Terminos de pagos
  txtPriceList: Params = new Params(); // campo para Listas de precios
  lbPriceList: Params = new Params(); // etiqueta para Listas de precios
  txtComments: Params = new Params(); // campo para el comentario
  lbComments: Params = new Params(); // etiqueta para el comentario
  lbSLP: Params = new Params(); // etiqueta para el vendedor
  txtSLP: Params = new Params(); // campo para el vendedor
  // -------- Campos para metrizables de totales
  lbTotalExe: Params = new Params(); // etiqueta para Total sin impuestos
  txtTotalExe: Params = new Params(); // campo para Total sin impuestos
  lbDiscount: Params = new Params(); // etiqueta para descuentos
  txtDiscount: Params = new Params(); // campo para descuentos
  lbTaxes: Params = new Params(); // etiqueta para Impuestos
  txtTaxes: Params = new Params(); // campo para Impuestos
  lbTotal: Params = new Params(); // etiqueta para Total
  txtTotal: Params = new Params(); // campo para Total

  bpList: BusinessPartnerModel[] = []; // lista de clientes
  bpCodeList: string[] = []; // lista de los Códigos de clientes
  bpNameList: string[] = []; // lista de los nombres de clientes
  PayTermsList: any[] = []; // lista de los Terminos de pagos
  PriceList: any[] = []; // lista de las listas de precios
  defaultSlpCode: number = -1;
  defaultSlpCodeStr: number;
  defaultGroupNum: string;
  defaultListNum: string;
  defaultContado: string;

  identificationTypeList: any[] = [];

  setCurr: string; // tipo de moneda escogida en simbolo
  currencyList: Currency[] = []; // lista de tipos de cambio
  allCurrencyList: Currency[] = []; // lista de todos los tipos de cambio existentes en la aplicacion
  userCurrency: string; // Usado para precargar el tipo de moneda que usara el usuario
  currencyPayment: string; // moneda selecionada al buscar los anticipos
  currencyChange: number; // monto del tipo de cambio
  DailyExRate: number;//monto del tipo de cambio

  maxDiscuont: number;
  hasLines: boolean = false; //dice si el pago se realizo correctamente

  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  itemsCodeList: string[] = []; // lista de los Códigos de items
  itemsNameList: string[] = []; // lista de los nombres de items
  userAssignsList: UserAssigns[] = [];
  paymentTypes: any[] = [
    { id: '1', name: "A30Dias" },
    { id: '2', name: "Contado" },
  ];

  conta: number; // variable contador para colocar un 'id' a la lista de items
  total: number; // variable para almacenar el total de la factura
  totalUSD: number;
  tax: number; // variable para almacenar el total de impuestos
  discount: number; // variable para almacenar el total de descuento
  totalWithoutTax: number; // variable para almacenar el total sin impuesto
  taxesList: any[] = []; // lista de los impuestos
  companiesList: any[] = []; // lista de las compannias
  uniqueInvCode: string;
  SlpsList: any[] = []; // lista de los vendedores
  itemsList: IDocumentLine[] = []; // lista de items
  baseLines: IDocumentLine[]; // lista de items
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  udfs: IUdf[];

  isOnCreateUpdateMode: boolean; //Creacion edicion documento, manejo documento en memoria  currentMemoryInvoice: IMemoryInvoice;
  InvoicesInMemoryAccepted: number;
  addMemoryInvoiceSubscription: Subscription;
  loadMemoryInvoiceSubscription: Subscription;
  currentMemoryInvoice: IMemoryInvoice;
  public expandedIndex: number; // variable para manejar el collapse de los items y reconocer sobre cual se va a trabajar

  DeviationMessage: string = '';

  maxWeightTo0: number = 0.01;
  isOnGroupLine: boolean;//Agrupacion de lineas en documento
  isLineMode: boolean;//Orden de lineas en documento al inicio o final
  isRequestinBacPayment: boolean;
  @ViewChild('editUnitPrice') editUnitPrice: ElementRef; // Referencia al input de edicion de precio por linea, para poder setear el focus cuando se va a editar
  onlineEvent: Observable<Event>; // Permite detectar el evento de la conexion cuando se recupera
  offlineEvent: Observable<Event>;// Permite detectar el evento de la conexion cuanod se pierde
  COMPANY: Company; // Usada para guardar las configuraciones del a compania
  usersCredentials: string;
  TO_FIXED_PRICE: string; // Contiene la cantidad de decimales a usar en el precio unitario
  TO_FIXED_TOTALLINE: string; // Contiene la cantidad de decimales a usar en el total de linea
  TO_FIXED_TOTALDOCUMENT: string; // Contiene la cantidad de decimales a usar en el total del documento
  documents: IDocumentToSync[];//ref Offline view
  documentPendingSync: number;//ref Offline view
  flagForm: boolean; //Validacion flag para evitar reenvio de solicitudes al mismo tiempo, facturas credito
  lines: any[] = []; // Modelo para ajuste de inventario
  CommentInv: string;
  GoodsReceiptAccount: string;
  CRCTotal: number; // Total en colones
  whName: string;
  whCode: string;
  priceEditable: boolean = false;
  isOnSubmit: boolean = false;

  WHAvailableItemList: any[] = []; // lista de los items disponibles por almacen
  indexAvaItem: number; // indice de la lista del item seleccionado para la disponibilidad
  itemCode: string; // variable para almacenar el Código del ite seleccionado para buscar la disponibilidad
  seriesList: any[] = []; // lista de las series de un item po almacen
  closeResult: string; // variable para saber porque se cerro la modal
  modalReference: any; // instancia de la modal de terminal y sucursal
  saleDocumentModel: IDocument;
  NameActionDocument: string;

  terminalsByUser: ITerminalByUser[];
  terminals: ITerminal[];
  pPTransaction: IPPTransaction;
  // pinPadCard: IPPTransaction;
  pinPadCards: IPPTransaction[];
  accountList: IContableAccounts; // lista de cuentas
  cardsList: any[] = []; // lista de tarjetas
  banksList: any[] = []; // lista de bancos
  salesManList: any[] = []; // lista de vendedores
  modalPay: any; // instancia de la modal de pagos
  // modalChange: any; // instancia de la modal de vueltos
  TotalG: number; // monto total del pago

  TotalCash: number; // monto total del pago en efectivo
  TotalCards: number; // monto total del pago en tarjetas
  TotalTransfer: number; // monto total del pago en transferencia
  TotalCheck: number; // monto total del pago en cheque
  V_CreditCards: any[] = []; // lista de pagos registrados con tarjetas de credito
  CardName: string; // nombre de la tarjeta seleccionada para el pago con tarjeta
  V_Checks: any[] = []; // lista de pagos registrados con cheques
  isPagoCuenta: boolean;
  unamePattern = "^d{2}/d{2}$";
  btnVisibleBool: boolean;

  udfsOIGN: IUdf[];
  mappedUdfsOIGN: IUdfTarget[];
  udfTargetsOIGN: IKValue[];

  InvalidCardName: boolean;
  returnedDocEntry: number;
  returnedDocNum: number;
  returnedNumFE: number;


  isOnOrderMode: boolean;
  isOnInvoiceDocument: boolean;//Mostrar data fe en modal

  @ViewChild('closebuttonInvSetting') closebuttonInvSetting;
  SettingOIGNJson: any;
  //#Pagos, variables requeridas para cuando falla creando el documento al que se le realizaron pagos.
  IsPaymentFail: boolean = false;
  PaymentFail: IOnPaymentFail;

  title: string; // titulo de la vista
  feOpen: boolean = false; // dice si la pestana de datos de fe esta abierta
  _timeout: any = null;
  changeColones: number; // vuelto en colones
  changeDolares: number; // vuelto en dolares

  lastSO: number;  // guarda el id de la ultima orden de venta generada, se usa para imprimir
  lastQuotation: number; // guarda el id de la ultima oferta de venta generada, se usa para imprimir

  priceList: number;
  DefaultCardValid: String;
  ProcessingScanning: boolean;
  @ViewChild("name") nameField: ElementRef;
  // Permite cambiar entre los inpus de lectura y edicion para el precio unitario
  toggleEdition(): void {
    if (this.priceEditable) {
      setTimeout(() => {
        this.editUnitPrice.nativeElement.focus();
      }, 0);
      // this.isOnEditMode = true;49
    }
  }
  // Si el input de editar el precio pierde el foco, se restablece el contenido al valor previo que tenia
  onFocusOutEvent($event: any) {
    // this.isOnEditMode = false;49
  }

  onkeyUp(event: any, index: number): void {
    if (this.priceEditable) {
      if (event.key === 'Enter') {
        this.itemsList[index].UnitPrice = +event.target.value;
        // this.isOnEditMode = false;49
        this.LineTotalCalculateExt(index);
      }
      if (event.key === 'Escape') {
        // this.isOnEditMode = false;
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (!event.ctrlKey && event.altKey && !event.shiftKey && event.keyCode === 73) {


      console.log('ALT + I');
    }
    if (!event.ctrlKey && event.altKey && !event.shiftKey && event.keyCode === 79) {
      console.log('ALT + O');
    }
    if (!event.ctrlKey && event.altKey && !event.shiftKey && event.keyCode === 80) {
      console.log('ALT + P');
    }
    switch (event.keyCode) {
      case KEY_CODE.F4: {
        this.nameField.nativeElement.focus();
        break;
      }
      case KEY_CODE.F7: {
        if (!this.isOnSubmit) {
          this.isOnSubmit = true;
          this.onSubmit();
          break;
        }

      }
      case KEY_CODE.F8: {
        if (!this.isOnSubmit) {
          this.CreateNew();
          break;
        }

      }
    }
  };

  constructor(
    private memoryInvoiceService: MemoryInvoiceService,
    private eventManager: EventManager,
    private renderer: Renderer2,
    private fb: FormBuilder,
    private itemService: ItemService,
    private cdr: ChangeDetectorRef,
    private bpService: BusinessPartnerService,
    private sPerm: PermsService,
    private decimalPipe: DecimalPipe,
    private documentService: DocumentService,
    private taxService: TaxService,
    private authenticationService: AuthenticationService,
    private modalService: NgbModal,
    private paramsService: ParamsService,
    private companyService: CompanyService,
    private uService: UserService,
    private reportsService: ReportsService,
    private accountService: AccountService,
    private exRateService: ExRateService,
    private exrate: ExRateService,
    private cardService: CardService,
    private bankService: BankService,
    private alertService: AlertService,
    private jsonDataService: JsonDataService,
    private smService: SalesManService,
    private cp: CurrencyPipe,
    private electronRendererService: ElectronRendererService,
    private storage: StorageService,
    private paymentService: PaymentService,
    private datePipe: DatePipe,
    private storageService: StorageService,
    private commonService: CommonService,
    private soAdnSQService: SOAndSQService,
    private udfService: UdfsService,
    private goodsReciptStockService: GoodsReceiptStockService,
    private documentsToSyncService: DocumentsToSyncService,
    private activatedRoute: ActivatedRoute,
    private extRuterService: RouterExtServiceService,
    @Inject(DOCUMENT) private _document: Document,
    private router: Router) {
    this.$requestViewer = new Subject();
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.expandedIndex = -1;
    // La variable no se usa para agrega el listener para poder reconocer los caracteres de la pistola
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

    this.loadMemoryInvoiceSubscription = this.memoryInvoiceService.loadInvoice.subscribe(next => { this.LoadMemoryInvoice(next); });
    this.addMemoryInvoiceSubscription = this.memoryInvoiceService.AddInvoice.subscribe(next => { this.AddMemoryInvoice(); });
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

    if ((this.isLockedByScanner && this.itemsTypeaheadList.find(x => x.indexOf(this.buildedData) > -1))) {
      try {

        let buttons = document.getElementsByClassName('dropdown-item');
        setTimeout(() => {
          let dynamicId = `hardcodedId`;
          if (buttons[0]) {
            dynamicId = buttons[0].getAttribute('id');
            if (dynamicId.indexOf('ngb-typeahead') < 0 || !(<HTMLButtonElement>document.getElementById(dynamicId))) {
              this.alertService.infoAlert('No se pudo identificar la generación dinámica del componente, por favor seleccione el producto manualmente');
            }
            else {
              (<HTMLButtonElement>document.getElementById(dynamicId)).click();
            }
          }
          else {
            (<HTMLButtonElement>document.getElementById('helperClick')).focus();
            (<HTMLButtonElement>document.getElementById('helperClick')).click();
            (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).focus();
            (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).click();
            this.isScanning = false;
            this.addItems(null, true);


            //this.ItemInfo.setValue(``);
          }
        }, 0);
        this.isLockedByScanner = false;
      }
      catch (error) {
        this.alertService.infoAlert(`Error: ${error}`);
        this.isLockedByScanner = false;
        console.log(error);
      }
    }
    else {
      if (this.isLockedByScanner && !this.isScanning && !(this.itemsTypeaheadList.find(x => x.indexOf(this.ItemInfo.value) > -1))) {
        this.alertService.infoInfoAlert(`No existe ${this.ItemInfo.value}`);
        this.ItemInfo.setValue(``);
        this.isLockedByScanner = false;
      }
    }
  }
  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks

    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    this.currentUserSubscription.unsubscribe();
    this.storage.SaveDocEntry(-1);
    this.storage.SaveDocumentType(-1);
    this.storage.SaveCustomerData('{}');
    if (this.subscriptions) this.subscriptions.unsubscribe();
    localStorage.removeItem("SOAndSQAction");

    const STATUS = {
      documentInformationSync: false,
      connectionType: false
    };
    this.commonService.offlineInformationPending.next(STATUS);



    if (this.addMemoryInvoiceSubscription)
      this.addMemoryInvoiceSubscription.unsubscribe();
    if (this.loadMemoryInvoiceSubscription)
      this.loadMemoryInvoiceSubscription.unsubscribe();


  }
  ngOnInit() {

    this.storage.SaveDocumentType(parseInt(this.activatedRoute.snapshot.paramMap.get('id')));

    this.DefineTitleDocument();

    this.initVarialbles();
  }

  ngAfterViewInit() { }

  initVarialbles(): void {
    this.ProcessingScanning = false;
    this.isEditable = true;
    this.userCurrency = '';
    this.isChangeTax = false;
    this.isPermBonus = false;
    this.NameActionDocument = ''
    this.isOnOrderMode = false;
    this.isOnInvoiceDocument = false;
    this.currentMemoryInvoice as IMemoryInvoice;
    this.buildedData = '';
    this.isScanning = false;
    this.isProcessing = false;
    this.searchTypeManual = false;
    this.isLockedByScanner = false;
    this.isAllowedPriceListChange = false;
    this.isAllowedGoodReceipt = false;
    this.isAllowedWHChange = false;
    this.currentRequest = 0;
    this.typeArrow = false;
    this.isOnCreateUpdateMode = false;
    this.pinPadCards = [];
    this.terminals = [];
    this.identificationTypeList = IdentificationType;
    this.itemsList = [];
    this.udfTargets = [];
    this.udfs = [];
    this.udfsOIGN = [];
    this.udfTargetsOIGN = [];
    this.isRequestinBacPayment = false;
    this.pinPadCards = [];
    this.terminals = [];
    this.InvalidCardName = false;
    this.GetDefaultBussinesPartnerSettings();
    this.GetDefaultPaymentSettings();
    this.documentForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      // currency: ['', Validators.required],
      PayTerms: ['', Validators.required],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      paymentType: [''],
      Comment: '',
    });


    this.GetPriceList();
    const DOC_ENTRY = this.storage.GetDocEntry();
    if (DOC_ENTRY > 0) {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.GetCustomerData()).CardCode;
    } else {
      this.GetDefaultBussinesPartnerSettings();
      // this.DEFAULT_BUSINESS_PARTNER = this.storage.GetDefaultBussinesPartner();

    }
    //#region endpoint comun documentos de ventas

    this.checkPermits();
    this.SetWarehouseInfo();
    this.GetParamsViewList();
    this.TypesInvoice();
    this.getCustomers();
    this.CreateFEForm();
    this.getMaxDiscout();
    this.getExRate();
    this.GetItems();
    this.GetTaxes();
    this.GetCompanies();
    this.generateUniqueInvoiceId();//cotizacion no
    this.GetSalesPerson();
    this.GetAccount();
    this.GetCards();
    this.GetAccountsBank();
    //#endregion
    // this.invoiceType = this.storageService.GetDefaultInvoiceType();
    // this.documentForm.patchValue({ DocumentType: this.invoiceType });
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.usersCredentials = JSON.parse(this.storage.getCurrentSession()).UserName;

    this.defaultGroupNum = "-1";
    this.defaultListNum = "-1";
    this.defaultContado = "Contado";
    this.defaultSlpCodeStr = -1;
    //Configuracion tabla
    this.tableLength = 1000;
    this.MapWidth = {};
    this.MapWidth["Id"] = 80;
    this.MapWidth["ItemCode"] = 450;
    this.MapWidth["UnitPrice"] = 200;
    this.MapWidth["Marca"] = 200;
    this.MapWidth["Group"] = 200;
    this.MapWidth["Quantity"] = 110;
    this.MapWidth["SubGroup"] = 100;
    this.MapWidth["ItemName"] = 350;
    this.MapWidth["Discount"] = 80;
    this.MapWidth["TaxRate"] = 80;
    this.MapWidth["TaxCode"] = 80;
    this.MapWidth["WhsCode"] = 80;
    this.MapWidth["WhsName"] = 200;
    this.MapWidth["LastDate"] = 100;
    this.MapWidth["LinTot"] = 100;
    this.MapWidth["Serie"] = 100;
    this.MapWidth["Opc"] = 100;
    this.Cant.setValue(1);
    this.requestToAwait = 2;
    this.documentForm.patchValue({ PayTerms: this.paymentTypes[1].id });
    this.conta = 0.0;
    this.total = 0.0;
    this.totalUSD = 0.0;
    this.tax = 0.0;
    this.discount = 0.0;
    this.totalWithoutTax = 0.0;
    this.identificationTypeList = IdentificationType;
    this.lines = [];
    this.onlineEvent = fromEvent(window, 'online');
    this.offlineEvent = fromEvent(window, 'offline');
    this.subscriptionsf.push(this.onlineEvent.subscribe(async e => {
    }));

    this.subscriptionsf.push(this.offlineEvent.subscribe(e => {
    }));

    this.isOnOrderMode = DOC_ENTRY > 0;
    this.companyService.GetViewGroupList().subscribe(next => {
      if (next.Result) {
        ((next.ViewGroupList) as IViewGroup[]).forEach(x => {
          switch (this.storage.GetDocumentType()) {
            case SOAndSQActions.EditOrder:
            case SOAndSQActions.CopyToOrder:
            case SOAndSQActions.CreateSaleOrder:
              if (x.CodNum === 1) {//SO
                this.isOnGroupLine = x.isGroup;
                this.isLineMode = x.LineMode; //Orden de lineas al inicio o final
              }
              break;
            case SOAndSQActions.EditQuotation:
            case SOAndSQActions.CreateQuotation:
              if (x.CodNum === 4) {//QO
                this.isOnGroupLine = x.isGroup;
                this.isLineMode = x.LineMode; //Orden de lineas al inicio o final
              }
              break;
            case SOAndSQActions.CreateInvoice:
            case SOAndSQActions.CopyToInvoice:
              if (x.CodNum === 3) {//INVO
                this.isOnGroupLine = x.isGroup;
                this.isLineMode = x.LineMode; //Orden de lineas al inicio o final
              }
              break;
          }

        });
      }
    });

    this.isOnCreateUpdateMode = DOC_ENTRY > 0;
    if (DOC_ENTRY > 0) {

      this.memoryInvoiceService.ShowInvoices.next(false);

      this.subscriptions = this.$requestViewer.subscribe(next => {
        if (next === this.requestToAwait) {
          switch (this.storage.GetDocumentType()) {
            case SOAndSQActions.EditQuotation: {
              this.documentForm.controls['cardName'].disable();
              this.documentForm.controls['cardCode'].disable();
              this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);
              this.GetDocument(DOC_ENTRY);
              this.defaultSlpCode = JSON.parse(this.storage.GetCustomerData()).SlpCode;
              break;
            }
            case SOAndSQActions.CopyToOrder: {
              this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);
              setTimeout(() => {
                this.GetBaseLines(DOC_ENTRY);
              }, 500);
              break;
            }
            case SOAndSQActions.EditOrder: {
              this.documentForm.controls['cardName'].disable();
              this.documentForm.controls['cardCode'].disable();
              this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
              this.GetDocument(DOC_ENTRY);
              this.defaultSlpCode = JSON.parse(this.storage.GetCustomerData()).SlpCode;
              break;
            }
            case SOAndSQActions.CopyToInvoice: {
              this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
              setTimeout(() => {
                this.GetBaseLines(DOC_ENTRY);
              }, 500);
              break;
            }
          }
        }
      });
    }
    else {
      switch (this.storage.GetDocumentType()) {
        case SOAndSQActions.CreateQuotation: {
          this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);
          break;
        }
        case SOAndSQActions.CreateSaleOrder: {
          this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
          break;
        }
        case SOAndSQActions.CreateInvoice: {
          this.memoryInvoiceService.ShowInvoices.next(true);
          this.GetConfiguredUdfs(DOCUMENT_ALIAS.INVOICE);
          this.GetConfiguredUdfsOIGN(DOCUMENT_ALIAS.GOODSRECEIPT);
          this.GetMemoryInvoiceSettings();
          this.AfterDeleteMemoryInvoice();
          break;
        }
      }



    }


  }
  //#region Carga info documentos a editar,copiar a
  GetDocument(_documentDocEntry: number) {
    this.soAdnSQService.GetDocument(_documentDocEntry, this.storage.GetDocumentType()).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.conta = 0;
        this.total = 0;
        this.itemsList = [];
        this.baseLines = next.Data.DocumentLines;
        this.saleDocumentModel = next.Data;
          

        setTimeout(() => {
          
          this.documentForm.patchValue({
            PayTerms: this.saleDocumentModel.PaymentGroupCode,
            // BillOverdue: this.saleOrder.U_FacturaVencida === 'SI' ? '0' : '1',
            SlpList: this.saleDocumentModel.SalesPersonCode,
            PriceList: this.saleDocumentModel.U_ListNum,

            // currency: this.saleDocumentModel.DocCurrency,
            DocumentType: this.saleDocumentModel.U_TipoDocE,
            cardName: this.saleDocumentModel.CardName,
            Comment: this.saleDocumentModel.Comments
          });
        }, 500);
        
        // if (this.bpList.length > 0) {
        //   const CUSTOMER = this.bpList.find(x => x.CardCode === this.saleDocumentModel.CardCode);
        //   if (CUSTOMER) this.priceList = CUSTOMER.ListNum;
        // }

        if (this.saleDocumentModel.U_TipoIdentificacion !== null) {
          this.feForm.patchValue({
            IdType: this.saleDocumentModel.U_TipoIdentificacion,
            Identification: this.saleDocumentModel.U_NumIdentFE,
            Email: this.saleDocumentModel.U_CorreoFE,
            // ObservacionFE: this.saleDocumentModel.U_ObservacionFE
          });

          (<HTMLButtonElement>document.getElementById('triggerFECollapser')).click();
        }
        this.priceList = this.saleDocumentModel.U_ListNum;

        this.userCurrency = this.saleDocumentModel.DocCurrency;

        this.documentForm.patchValue({
          DocumentType: this.saleDocumentModel.U_TipoDocE,
          cardName: this.saleDocumentModel.CardName,
          //PaymentMethod: this.saleOrder.U_NVT_Medio_Pago,
          // Comment: this.saleDocumentModel.Comment
        });
        next.Data.DocumentLines.forEach(x => {
          this.conta++;
          this.total += x.UnitPrice;
          const tot = x.UnitPrice * x.Quantity;
          let itemAux = {
            Id: this.conta,
            LinTot: tot,
            ItemCode: `${x.ItemCode} - ${x.ItemName}`,
            Item: x.ItemCode,
            ItemName: x.ItemName,
            DiscountPercent: x.DiscountPercent,
            Quantity: x.Quantity,
            U_SugPrice: 0,
            Serie: '',
            TaxCode: x.TaxCode,
            TaxRate: x.TaxRate != 0.0 ? x.TaxRate : 0.00,
            UnitPrice: +x.UnitPrice.toFixed(this.COMPANY.DecimalAmountPrice), // JSON.parse(this.storage.GetCustomerData()).Currency === 'COL' ? x.UnitPrice : (parseFloat(Number(x.UnitPrice / this.DailyExRate).toString())),
            WarehouseCode: x.WarehouseCode,
            WhsName: x.WhsName,
            TaxOnly: '',//x.TaxOnly ? 'tYES' : 'tNO',
            BaseEntry: x.BaseEntry == 0 ? null : x.BaseEntry,
            BaseType: x.BaseType,
            BaseLine: x.BaseLine == -1 ? null : x.BaseLine,
            LineNum: x.LineNum,
            LastPurchasePrice: +x.LastPurchasePrice.toFixed(this.COMPANY.DecimalAmountPrice),
            InvntItem: x.InvntItem,
            available: x.OnHand,
            LineStatus: x.LineStatus,
            ItemClass: x.ItemClass,
            ShouldValidateStock: x.ShouldValidateStock
          } as IDocumentLine;


          this.isLineMode ? this.itemsList.push(itemAux) : this.itemsList.unshift(itemAux);
          this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0);
          this.getTotals();

          // this.itemService.GetWHAvailableItem(x.ItemCode)
          //   .subscribe((data: any) => {
          //     if (data.Result) {
          //       let isInventoryItem: string;
          //       let cantAvailable: number = 0;
          //       // var index = this.itemsList.indexOf(this.itemsList.find(y => y.Item == x.ItemCode));
          //       data.whInfo.forEach(wh => {
          //         if (wh.InvntItem === "Y") {
          //           isInventoryItem = wh.InvntItem
          //           cantAvailable = wh.Disponible;
          //         }
          //       });
          //       if (data.whInfo.length <= 0) {
          //         isInventoryItem = 'Y';
          //         cantAvailable = 0;
          //       }
          //       this.itemsList.filter(y => y.Item == x.ItemCode).forEach(x => {
          //         x.available = cantAvailable
          //         x.InvntItem = isInventoryItem;
          //       });
          //       // this.itemsList[index].available = cantAvailable;
          //       // this.itemsList[index].InvntItem = isInventoryItem;
          //     }
          //   });


        });
      } else {
        console.log(next);
        this.alertService.errorAlert(next.Error.Message);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.errorAlert(error);
    });
  }



  GetBaseLines(_documentDocEntry: number) {
    this.soAdnSQService.GetDocument(_documentDocEntry, this.storage.GetDocumentType()).pipe(first()).subscribe(response => {
      if (response.Result) {

        this.conta = 0;
        this.total = 0;
        this.itemsList = [];
        this.saleDocumentModel = response.Data;

        this.documentForm.patchValue({ cardName: this.saleDocumentModel.CardName });
        if (this.bpList.length > 0) {
          const CUSTOMER = this.bpList.find(x => x.CardCode === this.saleDocumentModel.CardCode);
          if (CUSTOMER) this.priceList = +CUSTOMER.ListNum;
        }
        this.baseLines = response.Data.DocumentLines;

        this.documentForm.patchValue({
          DocumentType: this.saleDocumentModel.U_TipoDocE,
          Comment: this.saleDocumentModel.Comments,
          PayTerms: this.saleDocumentModel.PaymentGroupCode,
          PriceList: this.saleDocumentModel.U_ListNum,
          SlpList: this.saleDocumentModel.SalesPersonCode,
        });
        this.priceList = this.saleDocumentModel.U_ListNum;
        this.userCurrency = this.saleDocumentModel.DocCurrency;
        this.currencyPayment = this.userCurrency;

        if (this.saleDocumentModel.U_TipoIdentificacion !== null) {
          this.feForm.patchValue({
            IdType: this.saleDocumentModel.U_TipoIdentificacion,
            Identification: this.saleDocumentModel.U_NumIdentFE,
            Email: this.saleDocumentModel.U_CorreoFE
          });

          (<HTMLButtonElement>document.getElementById('triggerFECollapser')).click();
        }

        response.Data.DocumentLines.filter(x => x.LineStatus !== 'C').forEach(x => {
          this.conta++;
          //this.total += x.Quantity * x.UnitPrice;

          const tot = x.UnitPrice * x.Quantity;

          let itemAux = {
            Id: this.conta,
            LinTot: tot,
            ItemCode: `${x.ItemCode} - ${x.ItemName}`,
            Item: x.ItemCode,
            ItemName: x.ItemName,
            DiscountPercent: x.DiscountPercent,
            Quantity: x.Quantity,
            U_SugPrice: 0,
            Serie: '',
            TaxCode: x.TaxCode,
            TaxRate: x.TaxRate != 0.0 ? x.TaxRate : 0.00,
            UnitPrice: +x.UnitPrice.toFixed(this.COMPANY.DecimalAmountPrice),// JSON.parse(this.storage.GetCustomerData()).Currency === 'COL' ? x.UnitPrice : (parseFloat(Number(x.UnitPrice / this.DailyExRate).toString())),
            WarehouseCode: x.WarehouseCode,
            WhsName: x.WhsName,
            TaxOnly: '',//x.TaxOnly ? 'tYES' : 'tNO',
            BaseEntry: x.BaseEntry,
            BaseType: x.BaseType,
            BaseLine: x.BaseLine == -1 ? null : x.BaseLine,
            LineNum: x.LineNum,
            LastPurchasePrice: +x.LastPurchasePrice.toFixed(this.COMPANY.DecimalAmountPrice),
            InvntItem: x.InvntItem,
            available: x.OnHand,
            LineStatus: x.LineStatus,
            ItemClass: x.ItemClass,
            ShouldValidateStock: x.ShouldValidateStock
          } as IDocumentLine;

          this.isLineMode ? this.itemsList.push(itemAux) : this.itemsList.unshift(itemAux);
          this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0);
          this.getTotals();

          //   this.itemService.GetWHAvailableItem(x.ItemCode)
          //     .subscribe((data: any) => {
          //       if (data.Result) {
          //         let isInventoryItem: string;
          //         let cantAvailable: number = 0;
          //         // var index = this.itemsList.indexOf(this.itemsList.find(y => y.Item == x.ItemCode));
          //         data.whInfo.forEach(wh => {
          //           if (wh.InvntItem === "Y") {
          //             isInventoryItem = wh.InvntItem
          //             cantAvailable = wh.Disponible;
          //           }
          //         });
          //         if (data.whInfo.length <= 0) {
          //           isInventoryItem = 'Y';
          //           cantAvailable = 0;
          //         }
          //         this.itemsList.filter(y => y.Item == x.ItemCode).forEach(x => {
          //           x.available = cantAvailable
          //           x.InvntItem = isInventoryItem;
          //         });
          //         // this.itemsList[index].available = cantAvailable;
          //         // this.itemsList[index].InvntItem = isInventoryItem;
          //       }
          //     });
        });
      } else {
        this.alertService.errorAlert(response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert(err);
    });
  }
  //#endregion

  // #Componente de pagos
  GenerateDataForPayment(_requestPaymentCurrency?: string): any {


    let InvoiceInfo: IInvoiceInfoForPayment = {
      CardCode: this.documentForm.value.cardCode,
      Currency: this.userCurrency,
      SlpCode: this.documentForm.value.SlpList,
      uniqueInvCode: this.uniqueInvCode,
      Comment: 'Pago de factura',
      accountPayment: false
    }



    const requiredDataForPay = {
      IsAllowedToEditCardNumber: this.isAllowedToEditCardNumber,
      lists: {
        accountList: this.accountList,
        V_CreditCards: this.V_CreditCards,
        cardsList: this.cardsList,
        currencyList: this.currencyList,
        banksList: this.banksList,
        V_Checks: this.V_Checks,
      },
      Currency: {
        currencyPayment: _requestPaymentCurrency || this.currencyPayment,// this.documentForm.value.currency, // Moneda de pago
      },
      ExRate: this.DailyExRate,
      UserCurrency: this.userCurrency,
      DocumentTotals: {
        currencyChange: this.currencyChange, // Cambio actual
        totalUSD: this.totalUSD, // Total del documento en dolares
        total: this.total // Total del documento en colones
      },
      InvoiceInfo: InvoiceInfo,
      PinpadInfo: {
        PreDocument: this.GeneratePreDocumentForPPPayment(), // Documento que se requiere por el BAC para pp
        PrePaymentLines: this.CreatePaymentLines()
      },
      OnFail: {
        IsFail: this.IsPaymentFail,
        DataForFail: this.PaymentFail
      },
      CardValid: this.DefaultCardValid,
      DefaultCardNumber: this.defaultCardNumber,
      RequiredCashAccount: this.requiredCashAccount,
      RequiredTransferAccount: this.requiredTransferAccount,
      RequiredCardAccount: this.requiredCardAccount
    };

    return requiredDataForPay;
  }

  GeneratePreDocumentForPPPayment() {

    const linesList: any[] = [];
    this.itemsList.filter(x => x.LineStatus !== 'C').forEach(element => {
      if (element.ItemCode !== '') {
        const auxiliar = { ...element };
        auxiliar.ItemCode = element.ItemCode.split('-')[0].trim();
        linesList.push(auxiliar);
      }
    });

    let FE = {
      'IdType': this.feForm.value.IdType,
      'Email': this.feForm.value.Email,
      'Identification': this.feForm.value.Identification
    }

    const Invoice = {
      'InvoiceLinesList': linesList,
      'DocumentType': this.documentForm.value.DocumentType,
      'CardCode': this.documentForm.value.cardCode,
      'CardName': this.documentForm.value.cardName,
      // 'Currency': this.documentForm.value.currency,
      'PayTerms': this.documentForm.value.PayTerms,
      'Comment': this.documentForm.value.Comment,
      'SlpCode': this.documentForm.value.SlpList,
      'FEInfo': FE,
      'CLVS_POS_UniqueInvId': this.uniqueInvCode
    };
    return Invoice;
  }
  // Levanta el componente de pagos y retorna los pagos realizados.
  RisePaymentComponent(): void {
    let modalOption: NgbModalOptions = {
      backdrop: 'static',
      keyboard: false,
      ariaLabelledBy: 'modal-basic-title',
      size: 'lg',
      windowClass: 'Modal-Xl'
    };

    this.modalPay = this.modalService.open(PaymentComponent, modalOption);

    this.modalPay.componentInstance.requiredData = this.GenerateDataForPayment();

    this.modalPay.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
      console.log('result', result)
    }, (reason) => {
      if (reason.status === PaymentResults.Created) {
        let Payment: BasePayment = reason.Payment;
        this.changeColones = reason.Changes.COL;
        this.changeDolares = reason.Changes.USD;


        let change = this.documentForm.value.currency == 'COL' ? this.changeColones : this.changeDolares;

        this.PaymentFail = reason.OnFail;

        Payment.PaymentInvoices = this.CreatePaymentLines();

        this.terminals = reason.PinpadInfo.terminals;
        this.pinPadCards = reason.PinpadInfo.pinPadCards;
        this.pPTransaction = reason.PinpadInfo.pPTransaction;
        this.CreatePay(Payment);
      } else if (reason.status == PaymentResults.CancelButton) {
        this.IsPaymentFail = false;
      }
    });
  }

  CreatePaymentLines(): PaymentLines[] {

    const PaymentLines: PaymentLines[] = [];

    PaymentLines.push({
      AppliedFC: this.total,


      DocEntry: 0,
      InvoiceType: BoRcptInvTypes.it_Invoice, // 13  = invoice

      SumApplied: this.total
    });
    return PaymentLines;
  }
  CreatePay(payment: BasePayment) {

    if (this.isBilling) {
      this.attemptsWhileBilling++;
      console.log('Intento duplicación de factura ', this.attemptsWhileBilling);
      return;
    }

    this.blockUI.start('Generando factura y pago, espere por favor...');
    // if (!navigator.onLine) {
    //   this.blockUI.stop();
    //   this.alertService.infoAlert("Parece que no tienes internet. Vuelve a intertarlo mas tarde");
    //   return;
    // }
    this.isBilling = true;
    this.flagForm = true;
    this.ppbackup = payment;
    this.documentService.CreateInvoice(this.CreateInvoiceDocument(payment))
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.flagForm = false;

          this.isOnInvoiceDocument = true;
          this.NameActionDocument = 'Factura creada correctamente';
          this.returnedDocEntry = data.DocEntry;
          this.returnedDocNum = data.DocNum;
          this.returnedNumFE = data.NumDocFe;
          this.baseLines = null;
          this.IsPaymentFail = false;
          this.RiseInvoceCompleteModal(true);


          const STATUS = {
            documentInformationSync: true,
            connectionType: this.storage.getConnectionType()
          };
          this.commonService.offlineInformationPending.next(STATUS);

          this.baseLines = null;
          this.printARInvoice(data.DocEntry, this.pinPadCards.length);
          this.lastInvoice = data.DocEntry;
          this.btnVisibleBool = false;
          //Realizar pruebas para verificar que este flujo no haga falta en realidad.
          // if (this.pinPadCards.length > 0) {
          //   //this.pinPadCard.DocEntry = data.DocNum;
          //   this.pinPadCards.forEach(x => x.DocEntry = data.DocEntry);

          //   this.paymentService.updatePinPadPayment(this.pinPadCards).subscribe(next => {
          //     if (next.Result) {
          //       this.pinPadCards = [];
          //     }
          //     else {
          //       console.log(next.Error);
          //       this.alertService.errorAlert(`Error al actualizar el número de factura en el api local: ${next.Error.Message}`);
          //     }
          //   }, error => {
          //     console.log(error);
          //     this.alertService.errorAlert(`Error al actulizar el número de factura: ${error.error}`);
          //   });
          // }
        } else {
          this.blockUI.stop();
          this.IsPaymentFail = true;
          this.RisePaymentComponent();

          this.blockUI.stop();
          this.alertService.errorAlert(`Error al crear el documento: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
          this.attemptsWhileBilling = 0;
          this.isBilling = false;
          this.flagForm = false;
        }
      }, (error) => {
        console.log("Lista error");
        console.log(this.itemsList);
        this.IsPaymentFail = true;
        this.RisePaymentComponent();

        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        this.attemptsWhileBilling = 0;
        this.isBilling = false;
        this.flagForm = false;
      });

  }

  RiseInvoceCompleteModal(modalContent: boolean): void {
    this.modalInvoiceContent = modalContent;
    (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();

  }
  PrintDocument() {
    switch (this.storage.GetDocumentType()) {
      case SOAndSQActions.CreateQuotation:
      case SOAndSQActions.EditQuotation:
        this.printQandSO(this.lastQuotation, ReportType.Quotation);
        break;
      case SOAndSQActions.CreateSaleOrder:
      case SOAndSQActions.CopyToOrder:
      case SOAndSQActions.EditOrder:
        this.printQandSO(this.lastSO, ReportType.SaleOrder);
        break;
      case SOAndSQActions.CreateInvoice:
      case SOAndSQActions.CopyToInvoice:
        this.printARInvoice(this.lastInvoice, this.pinPadCards.length);
        break;
    }

  }

  // funcion para imprimir la factura
  printARInvoice(DocEntry: number, _ppCards: number) {
    this.blockUI.start('Generando la impresión...');

    if (_ppCards > 0) {
      // && (+this.pPTransaction.Amount.toString().slice(0, -2) > this.pPTransaction.QuickPayAmount) && (this.pPTransaction.EntryMode.includes('CLC') || this.pPTransaction.EntryMode.includes('CHP'))

      const RIGHT_SIDE = +this.pPTransaction.Amount.toString().slice(0, -2);
      const LEFT_SIDE = +`0.${this.pPTransaction.Amount.toString().slice(-2, this.pPTransaction.Amount.toString().length)}`;

      const CURRENT_TERMINAL = this.terminals.find(x => x.Currency == this.ppbackup.Currency);

      let IS_QUICK_PAY = false;

      if (CURRENT_TERMINAL) {

        IS_QUICK_PAY = (RIGHT_SIDE + LEFT_SIDE <= CURRENT_TERMINAL.QuickPayAmount)
          && (this.pPTransaction.EntryMode.includes('CLC') || this.pPTransaction.EntryMode.includes('CHP'));
      } else {

        IS_QUICK_PAY = (RIGHT_SIDE + LEFT_SIDE <= this.pPTransaction.QuickPayAmount)
          && (this.pPTransaction.EntryMode.includes('CLC') || this.pPTransaction.EntryMode.includes('CHP'));
      }

      const MOBJECT = JSON.parse(this.pinPadCards[0].ChargedResponse).EMVStreamResponse.printTags.string;
      console.log(MOBJECT);
      let printTags = '';
      for (let c = 0; c < MOBJECT.length; c++) {
        printTags += (MOBJECT[c] + ',');
      }
      printTags = printTags.slice(0, -1);
      const I_PP_TRANSACTION = {
        TerminalCode: this.pinPadCards[0].Terminal.TerminalId,
        MaskedNumberCard: this.pinPadCards[0].CardNumber,
        DocEntry: DocEntry,
        IsSigned: !IS_QUICK_PAY,
        PrintTags: printTags
      } as ITransactionPrint;

      this.reportsService.PrintReportPP(I_PP_TRANSACTION)
        .subscribe((data) => {
          this.blockUI.stop();
          if (this.electronRendererService.CheckElectron()) {
            let fileName = 'oinv_notsingn' + DocEntry + '.pdf';
            const PRINTERCONFIGURATION = JSON.parse(this.storage.getCompanyConfiguration().PrinterConfiguration) as IPrinter;
            let file = {
              "fileName": fileName,
              "file": data.UnsignedReport,
              "defaultPrinter": PRINTERCONFIGURATION.DisplayName
            };

            this.electronRendererService.send('Print', file);

            if (!IS_QUICK_PAY) {
              fileName = 'oinv_singn' + DocEntry + '.pdf';
              file = {
                "fileName": fileName,
                "file": data.SignedReport,
                "defaultPrinter": PRINTERCONFIGURATION.DisplayName
              };

              this.electronRendererService.send('Print', file);
            }
          }
          else {
            if (!IS_QUICK_PAY) {
              printJS({
                printable: data.SignedReport,
                type: 'pdf',
                base64: true
              });
            }

            printJS({
              printable: data.UnsignedReport,
              type: 'pdf',
              base64: true
            });

          }
        }, (error: any) => {
          console.log(error);
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
    }
    else {
      this.reportsService.printReport(DocEntry, ReportType.ArInvoice)
        .subscribe(data => {
          this.blockUI.stop();
          if (data.Result) {
            if (this.electronRendererService.CheckElectron()) {

              let fileName = 'Invoice_' + DocEntry + '.pdf';


              const PRINTERCONFIGURATION = JSON.parse(this.storage.getCompanyConfiguration().PrinterConfiguration) as IPrinter;
              let file = {
                "fileName": fileName,
                "file": data.Data,
                "defaultPrinter": PRINTERCONFIGURATION.DisplayName
              };

              this.electronRendererService.send('Print', file);
            }
            else {
              printJS({
                printable: data.Data,
                type: 'pdf',
                base64: true
              });
            }
          } else {
            this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);
          }
        }, error => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
    }
  }
  printQandSO(_docEntry: number, _reportType: number): void {
    this.blockUI.start('Generando la impresión...');
    this.reportsService.printReport(_docEntry, _reportType)
      .subscribe(data => {
        this.blockUI.stop();
        if (data.Result) {
          if (this.electronRendererService.CheckElectron()) {
            let fileName = 'Quotation_' + _docEntry + '.pdf';
            let file = { "fileName": fileName, "file": data.Data };
            this.electronRendererService.send('Print', file);
          }
          else {
            printJS({
              printable: data.Data,
              type: 'pdf',
              base64: true
            })
          }
        } else {
          this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);
        }

      }, error => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }
  //#region Creacion documento
  onSubmit() {
    if (!this.UdfPaymentValidation()) {
      this.blockUI.stop();
      this.isBilling = false;
      this.attemptsWhileBilling = 0;
      return;
    }
    if (this.flagForm) {
      this.alertService.infoAlert('Intento duplicación documento');
      return;
    }
    if (this.itemsList.length === 0) {
      this.alertService.errorInfoAlert(`Por favor agregue un producto al menos`);
      return;
    }
    const CORRUPTED_QUANTITY = this.itemsList.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto   ${CORRUPTED_QUANTITY.ItemCode}, debe ser mayor a 0`);
      return;
    }
    if (!this.COMPANY.HasZeroBilling) {

      const CORRUPTED_ITEM = this.itemsList.find(x => x.LinTot == 0);
      if (CORRUPTED_ITEM) {
        this.alertService.errorAlert(`El total de linea del producto "${CORRUPTED_ITEM.ItemCode}" es 0, elimínelo por favor.`);
        return;
      }
      const DIFERENCECOST_ITEM = this.itemsList.find(x => +x.UnitPrice <= (x.LastPurchasePrice ? +x.LastPurchasePrice : 0) && +x.UnitPrice != 0);
      if (DIFERENCECOST_ITEM) {
        this.alertService.errorAlert(`Costo del artículo "${DIFERENCECOST_ITEM.ItemCode}" es mayor o igual al precio de venta, modifique precio por favor. Precio venta: ${DIFERENCECOST_ITEM.UnitPrice} Precio costo: ${DIFERENCECOST_ITEM.LastPurchasePrice} `);
        return;
      }

    } else {
      const DIFERENCECOST_ITEM = this.itemsList.find(x => +x.UnitPrice <= (x.LastPurchasePrice ? +x.LastPurchasePrice : 0) && +x.UnitPrice != 0);
      if (DIFERENCECOST_ITEM) {
        this.alertService.errorAlert(`Costo del artículo "${DIFERENCECOST_ITEM.ItemCode}" es mayor o igual al precio de venta, modifique precio por favor. Precio venta: ${DIFERENCECOST_ITEM.UnitPrice} Precio costo: ${DIFERENCECOST_ITEM.LastPurchasePrice} `);
        return;
      }
    }
    const AVAILABLE_INV = this.itemsList.find(x => +x.available < (this.itemsList.filter(y => y.ShouldValidateStock && y.Item == x.Item && y.WarehouseCode == x.WarehouseCode && y.ItemClass != ItemsClass.Service).reduce((p, c) => { return p + c.Quantity }, 0)) && x.InvntItem === "Y");
    if (AVAILABLE_INV) {
      if ((this.storage.GetDocumentType() == SOAndSQActions.CreateInvoice) || (this.storage.GetDocumentType() == SOAndSQActions.CopyToInvoice)) {//Generar data necesaria para enviar a modal de pago

        if (this.isAllowedGoodReceipt) {
          this.InventorySettings();
        } else {
          this.alertService.infoInfoAlert(`Existen artículos que no cuentan con inventario, elimínelos para crear la factura.`);
        }
        return;
      } else {
        if ((this.storage.GetDocumentType() == SOAndSQActions.CopyToOrder) || (this.storage.GetDocumentType() == SOAndSQActions.CreateSaleOrder)
          || (this.storage.GetDocumentType() == SOAndSQActions.EditOrder)) {//Generar data necesaria para enviar a modal de pago
          this.alertService.infoInfoAlert(`Sin stock, no hay cantidad solicitada para el producto ${AVAILABLE_INV.ItemCode}, disponible:${AVAILABLE_INV.available} `);
          return;
        }
      }
    }

    if (!this.SlpsList.find(x => x.SlpCode == this.documentForm.controls.SlpList.value)) {
      this.alertService.infoInfoAlert(`Por favor seleccione un vendedor`);
      return;
    }


    if (this.documentForm.invalid && this.isEditable) {
      this.isOnSubmit = false;
      this.alertService.infoAlert("No es permitido cambiar el nombre a clientes de crédito");
      return;
    }


    if (this.documentForm.invalid) {
      this.isOnSubmit = false;
      this.alertService.infoAlert("Debe haber seleccionado tipo factura, cliente, término de pago");
      return;
    }


    if ((this.storage.GetDocumentType() == SOAndSQActions.CreateInvoice) || (this.storage.GetDocumentType() == SOAndSQActions.CopyToInvoice)) {//Generar data necesaria para enviar a modal de pago

      if (Number(this.PayTermsList.find(x => x.GroupNum == this.documentForm.controls.PayTerms.value).Type) === PayTermsEnum.A30Dias) {

        this.blockUI.start('Generando factura crédito, espere por favor...');
        this.flagForm = true;

        this.documentService.CreateInvoice(this.CreateInvoiceDocument())
          .subscribe((data: any) => {
            if (data.Result) {
              this.blockUI.stop();
              this.baseLines = null;
              this.isOnInvoiceDocument = true;
              this.NameActionDocument = 'Factura crédito creada correctamente';
              this.returnedDocEntry = data.DocEntry;
              this.returnedDocNum = data.DocNum;
              this.returnedNumFE = data.NumDocFe;

              this.RiseInvoceCompleteModal(false);

              const STATUS = {
                documentInformationSync: true,
                connectionType: this.storage.getConnectionType()
              };
              this.commonService.offlineInformationPending.next(STATUS);
              this.printARInvoice(data.DocEntry, this.pinPadCards.length);
              this.lastInvoice = data.DocEntry;
              this.btnVisibleBool = false;
              this.flagForm = false;
            } else {
              this.blockUI.stop();
              this.flagForm = false;
              this.alertService.errorAlert(`Error al crear el pago: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
              this.attemptsWhileBilling = 0;
              this.isBilling = false;
              this.flagForm = false;
            }
          }, (error) => {
            this.blockUI.stop();
            this.flagForm = false;
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
          });
      } else {

        this.isRequestinBacPayment = false;



        //JUMP
        this.RisePaymentComponent();
      }
    } else {

      switch (this.storage.GetDocumentType()) {
        case SOAndSQActions.CreateQuotation:
        case SOAndSQActions.EditQuotation:
          this.PostQuotation();
          break;
        case SOAndSQActions.CreateSaleOrder:
        case SOAndSQActions.CopyToOrder:
        case SOAndSQActions.EditOrder:
          this.PostSaleOrder();
          break;
      }

    }
  }

  PostSaleOrder() {
    let linesList: IDocumentLine[] = this.itemsList.map((line, index) => {

      let item = {
        ItemCode: line.ItemCode.split('-')[0].trim(),
        DiscountPercent: line.DiscountPercent, 
        Quantity: line.Quantity,
        TaxCode: line.TaxCode,
        TaxRate: line.TaxRate,
        UnitPrice: line.UnitPrice,
        WarehouseCode: line.WarehouseCode,
        TaxOnly: line.TaxOnly ? 'tYES' : 'tNO',
        LineNum: line.LineNum,
        BaseEntry: line.BaseEntry,
        BaseLine: line.BaseLine,
        BaseType: line.BaseType || -1,
        LineStatus: line.LineStatus
      } as IDocumentLine

      return item;

    });


    if (this.storage.GetDocEntry() > 0) {
      if (this.baseLines && this.storage.GetDocumentType() === SOAndSQActions.CopyToOrder) {
        let documentEntry = this.storage.GetDocEntry();
        this.baseLines.forEach(i => {
          let aux = linesList.find(x => x.ItemCode === i.ItemCode && !x['read']);
          if (aux) {
            aux['read'] = true;
            aux.BaseEntry = documentEntry;
            aux.BaseLine = i.BaseLine;
            aux.BaseType = BaseTypeLines.SALE_ORDER;
          }
        });
      }
    }



    let DocEntry: number = (this.storage.GetDocumentType() == SOAndSQActions.EditOrder) ? this.storage.GetDocEntry() : 0;


    const SaleDocument = {
      U_Online: '0',
      DocEntry: DocEntry,
      BaseEntry: this.storage.GetDocEntry(),
      DocumentLines: linesList,
      CardCode: this.documentForm.controls.cardCode.value,
      CardName: this.documentForm.controls.cardName.value,
      DocCurrency: this.userCurrency,
      PaymentGroupCode: this.documentForm.controls.PayTerms.value,
      SalesPersonCode: this.documentForm.controls.SlpList.value,
      Comments: this.documentForm.controls.Comment.value,
      DocType: BoDocumentTypes.dDocument_Items,
      U_TipoIdentificacion: (this.feForm.controls.IdType.value != '00') ? this.feForm.controls.IdType.value : null,
      U_NumIdentFE: this.feForm.controls.Identification.value,
      U_CorreoFE: this.feForm.controls.Email.value,
      U_ObservacionFE: this.feForm.value.ObservacionFE,
      U_CLVS_POS_UniqueInvId: this.uniqueInvCode,
      UdfTarget: this.mappedUdfs,
      U_TipoDocE: this.documentForm.controls.DocumentType.value,
      DocDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocDueDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      U_ListNum: this.documentForm.controls.PriceList.value

    } as ISaleDocument;



    if ((this.storage.GetDocumentType() == SOAndSQActions.CreateSaleOrder) || (this.storage.GetDocumentType() == SOAndSQActions.CopyToOrder)) {
      SaleDocument.DocumentLines = linesList.filter(x => x.LineStatus !== 'C');
      this.blockUI.start('Creando orden de venta, espere por favor...');
      this.flagForm = true;
      this.documentService.PostDocumentSaleOrder(SaleDocument)
        .subscribe((data: any) => {
          this.blockUI.stop(); // Stop blocking
          if (data.Result) {
            this.flagForm = false;
            this.NameActionDocument = 'Órden de venta creada con éxito';
            this.returnedDocEntry = data.DocEntry;
            this.returnedDocNum = data.DocNum;
            this.lastSO = data.DocEntry;
            (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();
            // this.alertService.successAlert(` Orden de venta creada con éxito, número documento: ${data.DocNum}, DocEntry: ${data.DocEntry}`);
          } else {
            this.flagForm = false;
            this.alertService.errorAlert(`Error al intentar crear el documento, Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
          }
          this.isOnSubmit = false;
        }, (error: any) => {
          this.flagForm = false;
          this.isOnSubmit = false;
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
    if (this.storage.GetDocumentType() == SOAndSQActions.EditOrder) {
      this.blockUI.start('Actualizando orden de venta, espere por favor...');
      this.flagForm = true;
      this.documentService.PostUpdateSaleOrder(SaleDocument)
        .subscribe((data: any) => {
          this.blockUI.stop(); // Stop blocking
          if (data.Result) {
            this.flagForm = false;
            this.NameActionDocument = 'Órden de venta actualizada con éxito';
            this.returnedDocEntry = data.DocEntry;
            this.returnedDocNum = data.DocNum;
            this.lastSO = data.DocEntry;
            (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();
            // this.alertService.successAlert(` Orden de venta creada con éxito, número documento: ${data.DocNum}, DocEntry: ${data.DocEntry}`);
          } else {
            this.flagForm = false;
            this.alertService.errorAlert(`Error al intentar crear el documento, Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
          }
          this.isOnSubmit = false;
        }, (error: any) => {
          this.flagForm = false;
          this.isOnSubmit = false;
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
  }
  PostQuotation() {

    let linesList: IDocumentLine[] = this.itemsList.map(line => {

      let item = {
        ItemCode: line.ItemCode.split('-')[0].trim(),
        DiscountPercent: line.DiscountPercent,
        Quantity: line.Quantity,
        TaxCode: line.TaxCode,
        TaxRate: line.TaxRate,
        UnitPrice: line.UnitPrice,
        WarehouseCode: line.WarehouseCode,
        TaxOnly: line.TaxOnly ? 'tYES' : 'tNO',
        LineNum: line.LineNum,
        BaseEntry: null,
        BaseLine: null,
        BaseType: -1,
        LineStatus: line.LineStatus

      } as IDocumentLine;

      return item;

    });

    let docEntry = this.storage.GetDocEntry();

    let Quotation = {
      DocEntry: docEntry,
      CardCode: this.documentForm.controls.cardCode.value,
      CardName: this.documentForm.controls.cardName.value,
      Comments: this.documentForm.controls.Comment.value,
      DocCurrency: this.userCurrency,
      DocDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocDueDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocType: BoDocumentTypes.dDocument_Items,
      PaymentGroupCode: this.documentForm.controls.PayTerms.value,
      SalesPersonCode: this.documentForm.controls.SlpList.value,
      U_Online: '0',
      U_TipoDocE: this.documentForm.controls.DocumentType.value,
      U_TipoIdentificacion: (this.feForm.controls.IdType.value != '00') ? this.feForm.controls.IdType.value : null,
      U_CorreoFE: this.feForm.value.Email,
      U_NumIdentFE: this.feForm.value.Identification,
      U_ObservacionFE: this.feForm.value.ObservacionFE,
      DocumentLines: linesList,
      UdfTarget: this.mappedUdfs,
      U_CLVS_POS_UniqueInvId: this.uniqueInvCode,
      U_ListNum: this.documentForm.controls.PriceList.value
    } as IQuotDocument;


    if (this.storage.GetDocumentType() == SOAndSQActions.CreateQuotation) {
      this.blockUI.start('Creando cotización, espere por favor...');
      this.flagForm = true;
      this.documentService.PostDocumentQuotation(Quotation)
        .subscribe((data: any) => {
          this.blockUI.stop(); // Stop blocking
          if (data.Result) {
            this.flagForm = false;
            this.NameActionDocument = 'Cotización creada con éxito';
            this.returnedDocEntry = data.DocEntry;
            this.returnedDocNum = data.DocNum;
            this.lastQuotation = data.DocEntry;
            (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();
            // this.alertService.successAlert(` Orden de venta creada con éxito, número documento: ${data.DocNum}, DocEntry: ${data.DocEntry}`);
          } else {
            this.flagForm = false;
            this.alertService.errorAlert(`Error al intentar crear el documento, Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
          }
          this.isOnSubmit = false;
        }, (error: any) => {
          this.flagForm = false;
          this.isOnSubmit = false;
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });

    }
    if (this.storage.GetDocumentType() == SOAndSQActions.EditQuotation) {
      this.blockUI.start('Actualizando cotización, espere por favor...');
      this.flagForm = true;
      this.documentService.PostUpdateQuotation(Quotation)
        .subscribe((data: any) => {
          this.blockUI.stop(); // Stop blocking
          if (data.Result) {
            this.flagForm = false;
            this.NameActionDocument = 'Cotización actualizada con éxito';
            this.returnedDocEntry = data.DocEntry;
            this.returnedDocNum = data.DocNum;
            this.lastQuotation = data.DocEntry;
            (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();
            // this.alertService.successAlert(` Orden de venta creada con éxito, número documento: ${data.DocNum}, DocEntry: ${data.DocEntry}`);
          } else {
            this.flagForm = false;
            this.alertService.errorAlert(`Error al intentar crear el documento, Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
          }
          this.isOnSubmit = false;
        }, (error: any) => {
          this.flagForm = false;
          this.isOnSubmit = false;
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }

  }


  CreateInvoiceDocument(payment: any = null): CreateInvoice {
    let invoiceLines: IDocumentLine[] = this.itemsList.filter(x => x.LineStatus !== 'C').map(line => {

      let item = {
        ItemCode: line.ItemCode.split('-')[0].trim(),
        DiscountPercent: line.DiscountPercent,
        Quantity: line.Quantity,
        TaxCode: line.TaxCode,
        TaxRate: line.TaxRate,
        UnitPrice: line.UnitPrice,
        WarehouseCode: line.WarehouseCode,
        TaxOnly: line.TaxOnly ? 'tYES' : 'tNO',
        BaseEntry: line.BaseEntry,
        BaseLine: line.BaseLine,
        BaseType: line.BaseType || -1,
        LineStatus: line.LineStatus
      } as IDocumentLine;

      return item;


    });


    if (this.storage.GetDocEntry() > 0) {

      if (this.baseLines)
        this.baseLines.forEach(i => {
          let aux = invoiceLines.find(x => x.ItemCode === i.ItemCode && !x['read']);

          if (aux) {
            aux['read'] = true;
            aux.BaseEntry = this.storage.GetDocEntry();
            aux.BaseLine = i.LineNum;
            aux.BaseType = BaseTypeLines.INVOICE;
          }
        });
    }


    let invoice = {
      BaseEntry: this.storageService.GetDocEntry(),
      CardCode: this.documentForm.value.cardCode,
      CardName: this.documentForm.value.cardName,
      Comments: this.documentForm.value.Comment,
      DocCurrency: this.userCurrency,
      DocDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocType: BoDocumentTypes.dDocument_Items,
      PaymentGroupCode: this.documentForm.value.PayTerms,
      SalesPersonCode: this.documentForm.value.SlpList,
      U_Online: '0',
      U_TipoDocE: this.documentForm.value.DocumentType,
      U_TipoIdentificacion: this.feForm.value.IdType === '00' ? null : this.feForm.value.IdType,
      U_CorreoFE: this.feForm.value.Email,
      U_NumIdentFE: this.feForm.value.Identification,
      U_ObservacionFE: null,
      DocumentLines: invoiceLines,
      UdfTarget: this.mappedUdfs,
      U_CLVS_POS_UniqueInvId: this.uniqueInvCode,
      U_ListNum: this.documentForm.controls.PriceList.value
    } as DocumentModel;



    const ppTransaction = payment ? payment.PPTransaction : null;

    if (payment && payment.PPTransaction) delete payment.PPTransaction;

    let createInvoiceReturn: CreateInvoice = {
      Invoice: invoice,
      Payment: payment,
      PPTransaction: ppTransaction
    }
    return createInvoiceReturn;
  }

  //#endregion

  //#region Items

  cant: number;
  addItems(item, _isManualOverride = false) {
    if (this.ItemInfo.value) {
      let code = `harcodedCode`;
      let mobileNavigatorObject: any = window.navigator;
      if (this.ProcessingScanning) {
        console.log("petición en proceso", this.buildedData);
        return;
      }
      this.ProcessingScanning = true;
      if (_isManualOverride) {
        if (this.searchTypeManual) {
          this.ItemInfo.setValue('');
          this.Cant.setValue(1);
          this.buildedData = ``;
          this.ProcessingScanning = false;
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
            this.nameField.nativeElement.focus();
            this.ProcessingScanning = false;
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

      if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
        mobileNavigatorObject.clipboard.readText()
          .then(text => {
            const priceList = this.documentForm.get('PriceList').value;
            if (!isNaN(parseInt(text))) {
              if (Number(text) > this.maxWeightTo0) {
                // this.Cant.setValue(Math.max(Number(text) - this.pesoBolsa, 0.0001)); // REVISAR EN CASO DE ALGUN PROBLEMA
                //this.invForm.patchValue({cardName: cardName});
                //console.log('Pasted content: ', text);
                mobileNavigatorObject.clipboard.writeText("") // * antes de limpiar string
                  .then(text => {
                    //this.Cant.setValue(Number(text));
                    //this.invForm.patchValue({cardName: cardName});
                    //console.log('Clipboard cleared ');
                  })
                  .catch(err => {
                    // console.error('Failed to clear clipboard contents: ', err);
                  });
              }
            }

            this.cant = Number(this.Cant.value);
            let cant2 = Number(this.Cant.value);
            let searchitem = true;
            if (this.isOnGroupLine) {
              var index: number = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
              if (index != -1) {
                this.itemsList[index].Quantity += this.cant;
                this.itemsList[index].LinTot = this.itemsList[index].Quantity * this.itemsList[index].UnitPrice;
                searchitem = false;
                this.LineTotalCalculate(index);
                this.getTotals();
                this.GetAvailableItemInventory(code, this.itemsList[index].Quantity);
                this.ItemInfo.setValue('');
                this.Cant.setValue(1);
                this.searchTypeManual = false;
                this.ProcessingScanning = false;
                this.nameField.nativeElement.focus();

                return;
              }
            }

            if (this.isProcessing) {
              this.ItemInfo.setValue('');
              this.Cant.setValue(1);
              this.buildedData = ``;
              return;
            }

            this.isProcessing = true;
            this.blockUI.start('Obteniendo información del artículo, espere por favor...');
            this.hasLines = true;

            this.itemService.GetItemByItemCode(code, priceList, this.documentForm.controls.cardCode.value) // TO AVOID BREAK ON GETITEMINFO
              .subscribe((data: any) => {
                this.isProcessing = false;
                this.searchTypeManual = false;
                if (data.Result) {
                  if (data.Item.HasInconsistency) {
                    this.alertService.infoAlert(data.Item.InconsistencyMessage);
                  }
                  if (searchitem) {
                    this.conta++;
                    this.total += data.Item.UnitPrice;
                    let tot = (data.Item.UnitPrice * this.cant);
                    // this.documentForm.patchValue({ currency: this.userCurrency });
                    let AUXILIAR_ITEM = {
                      Id: this.conta,
                      LinTot: tot,
                      ItemCode: `${data.Item.ItemCode} - ${data.Item.ItemName}`,
                      Item: data.Item.ItemCode,
                      ItemName: `${data.Item.ItemName}`,
                      DiscountPercent: data.Item.Discount,
                      Quantity: this.cant,
                      U_SugPrice: 0,
                      Serie: '',
                      TaxCode: data.Item.TaxCode,
                      TaxRate: data.Item.TaxRate != 0.0 ? data.Item.TaxRate : 0.00,
                      UnitPrice: data.Item.UnitPrice,
                      WarehouseCode: this.whCode,
                      WhsName: this.whName,
                      TaxOnly: '',//data.Item.TaxOnly ? 'tYES' : 'tNO',
                      BaseEntry: data.Item.BaseEntry,
                      BaseType: data.Item.BaseType,
                      BaseLine: data.Item.BaseLine,
                      LineNum: null,
                      LastPurchasePrice: Number(data.Item.LastPurchasePrice.toFixed(this.COMPANY.DecimalAmountPrice)),
                      InvntItem: data.Item.InvntItem,
                      available: data.Item.OnHand,
                      LineStatus: 'O',
                      ItemClass: data.Item.ItemClass,
                      ShouldValidateStock: data.Item.ShouldValidateStock
                    } as IDocumentLine;


                    if (AUXILIAR_ITEM.TaxCode === '')
                      this.alertService.infoInfoAlert('El artículo ' + AUXILIAR_ITEM.ItemName + ' no cuenta con el código del impuesto.');



                    AUXILIAR_ITEM.UnitPrice = Number(AUXILIAR_ITEM.UnitPrice.toFixed(this.COMPANY.DecimalAmountPrice));



                    if (this.userCurrency != 'COL' && this.userCurrency != 'USD') {
                      AUXILIAR_ITEM.Quantity = 1;
                      AUXILIAR_ITEM.LinTot = 0;
                      AUXILIAR_ITEM.UnitPrice = 0;
                      this.storage.setLog(`ERROR!, fecha: ${new Date()} ---(${this.userCurrency})`);
                    }

                    this.isLineMode ? this.itemsList.push(AUXILIAR_ITEM) : this.itemsList.unshift(AUXILIAR_ITEM)

                    this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0)
                    this.getTotals();
                  }

                  this.Cant.setValue(1);
                  this.ItemInfo.setValue('');
                  this.ProcessingScanning = false;
                  this.nameField.nativeElement.focus();
                  const LastPP = data.Item.LastPurchasePrice ? data.Item.LastPurchasePrice : 0;
                  if (data.Item.UnitPrice <= LastPP && data.Item.UnitPrice != 0) {
                    this.alertService.infoInfoAlert(`Costo del Artículo: ${data.Item.ItemCode}-${data.Item.ItemName} es mayor o igual al precio de venta. Modifique precio por favor`);//Precio costo:	₡${data.Item.LastPurchasePrice} Precio Venta: ₡${data.Item.UnitPrice}
                  }

                  let cantsingroupLine: number = 0;
                  this.itemsList.forEach(x => {
                    if (x.Item === code) {
                      cantsingroupLine += x.Quantity;
                    }
                  });

                  if (data.Item.ShouldValidateStock && ((cantsingroupLine) > +data.Item.OnHand) && data.Item.ItemClass != ItemsClass.Service) {
                    index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code && x.InvntItem === "Y"));
                    if (index != -1) {
                      this.alertService.infoInfoAlert(`Sin stock, total solicitado en el almacén: ${cantsingroupLine}, disponible: ${+data.Item.OnHand} `);
                      searchitem = false;
                      this.LineTotalCalculate(index)
                      this.getTotals();
                    }
                  }

                  (<HTMLElement>document.getElementById('helperClick')).click();
                  // this.itemService.GetWHAvailableItem(code)
                  //   .subscribe((data: any) => {
                  //     if (data.Result) {
                  //       if (data.whInfo.length > 0) {
                  //         let available: boolean = false;
                  //         let cantAvailable: number = 0;
                  //         data.whInfo.forEach(wh => {
                  //           if (wh.InvntItem === "Y") {
                  //             available = true;
                  //           }
                  //           cantAvailable = wh.Disponible;
                  //         });
                  //         this.itemsList.filter(x => x.Item == code).forEach(x => {
                  //           x.available = cantAvailable
                  //         });
                  //         if (cantAvailable < cantsingroupLine && available) {
                  //           this.alertService.infoInfoAlert(`Sin stock, solicitud de ${cantsingroupLine}, disponible:${cantAvailable} `);
                  //         }
                  //       } else {
                  //         this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
                  //       }
                  //       this.blockUI.stop();
                  //     } else {
                  //       this.blockUI.stop();
                  //       this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.Error.Message);
                  //     }

                  //   }, (error: any) => {
                  //     this.blockUI.stop();
                  //     this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
                  //   });

                } else {
                  this.ProcessingScanning = false;
                  this.blockUI.stop();
                  this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
                }
                this.ProcessingScanning = false;
                this.blockUI.stop();
              }, (error: any) => {
                this.isProcessing = false;
                this.searchTypeManual = false;
                this.ProcessingScanning = false;
                this.blockUI.stop();
                this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
              });


          })
          .catch(err => {
            this.isProcessing = false;
            this.searchTypeManual = false;
            this.ProcessingScanning = false;
            this.blockUI.stop();
            // console.error('Failed to read clipboard contents: ', err);
          });
      }
    }
  }
  // funcion para seleccionar un almacen nuevo para el item a facturar
  AvaItemSelected(event, avaItem, idx: number) {
    if (event.type === 'dblclick') {
      if (!this.isAllowedWHChange) {
        this.alertService.infoInfoAlert(`No tiene permiso para cambiar el almacén`);
        return;
      }
      if (+this.itemsList[this.indexAvaItem].Quantity === 0) {
        this.alertService.infoInfoAlert(`Por favor indique la cantidad en el ítem antes de cambiar el almacén`);
        return;
      }
      if (this.itemsList[this.indexAvaItem].Quantity > avaItem.Disponible && this.itemsList[this.indexAvaItem].InvntItem === "Y") {
        this.close();
        this.alertService.infoInfoAlert(`No se puede cambiar el almacén, stock insuficiente. Solicitado: ${this.itemsList[this.indexAvaItem].Quantity}, disponible: ${avaItem.Disponible}`);
        return;
      }

      // const QUANTITYTOTAL = this.itemsList.filter(y => y.Item == this.itemsList[idx].Item && this.itemsList[idx].InvntItem === "Y").reduce((p, c) => { return p + c.Quantity }, 0);

      // if (QUANTITYTOTAL > avaItem.Disponible && this.itemsList[idx].InvntItem === "Y") {
      //   this.close();
      //   this.alertService.infoInfoAlert(`No se puede cambiar el almacén, stock insuficiente. Solicitado: ${+QUANTITYTOTAL}, disponible: ${avaItem.Disponible}`);
      //   return;
      // }

      this.itemsList[this.indexAvaItem].WarehouseCode = avaItem.WhsCode;
      this.itemsList[this.indexAvaItem].WhsName = avaItem.WhsName;
      this.itemsList[this.indexAvaItem].Serie = '';
      this.itemsList[this.indexAvaItem].SysNumber = 0;
      this.itemsList[this.indexAvaItem].available = avaItem.Disponible;

      this.close();
      // (<HTMLButtonElement>document.getElementById('triggerWhsClose')).click();
    }
  }
  // funcion para obtener la informacion de los disponibles de un item en los almacenes
  // recibe como parametros el item y el index
  GetWHAvailableItem(event, content, ItemCode, idx) {
    if (ItemCode !== '') {
      if (event.type === 'dblclick') {
        event.srcElement.blur();
        event.preventDefault();
        // console.log(ItemCode);
        // console.log(idx);
        this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor...');
        this.itemService.GetWHAvailableItem(ItemCode)
          .subscribe((data: any) => {
            // console.log(data);
            if (data.Result) {

              this.WHAvailableItemList.length = 0;
              this.itemCode = ItemCode;
              this.indexAvaItem = idx;
              // console.log(this.indexAvaItem);
              this.WHAvailableItemList = data.whInfo;
              if (data.whInfo.length > 0) {
                this.expandedIndex = -1;
                this.expandRow(this.expandedIndex);
                this.openModal(content);
              } else {
                this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
              }
            } else {
              this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.Error.Message);
            }
            this.blockUI.stop();
          }, (error: any) => {
            this.blockUI.stop();
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
          });
      }

    }
  }
  expandRow(index: number): void {
    this.expandedIndex = index === this.expandedIndex ? -1 : index;
  }
  // funcion para cerrar la modal
  close() {
    this.modalReference.close();
  }

  openModal(content) {
    this.modalReference = this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg' });
    this.modalReference.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
    this.modalReference.result.then(
      (result) => {
        this.closeResult = `Closed with: ${result}`;
      },
      (reason) => {
        this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
      }
    );
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return "by pressing ESC";
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return "by clicking on a backdrop";
    } else {
      return `with: ${reason}`;
    }
  }
  // funcion para eliminar el item de la lista
  // recibe como parametro el item a eliminar
  removeItem(item) {
    if (item !== null) {
      const index = this.itemsList.indexOf(item);
      this.itemsList.splice(index, 1);
      this.getTotals();
      if (this.itemsList.length > 0) this.hasLines = true;
      else this.hasLines = false;
    } else {
      this.alertService.warningInfoAlert(
        "No se puede eliminar la ultima linea del documento"
      );
    }
  }
  OnClickTaxOnly(ItemLine) {
    ItemLine.TaxOnly = !ItemLine.TaxOnly;
    this.getTotals();
  }

  changeTaxCode(i: number, item: any) {

    const TAXCODE = this.itemsList[i].TaxCode;

    const rate = this.taxesList.find(i => i.TaxCode === TAXCODE.toUpperCase());

    if (typeof rate !== 'undefined') {

      this.itemsList[i].TaxRate = parseFloat(this.decimalPipe.transform(rate.TaxRate, '.2'));

      this.itemsList[i].TaxCode = rate.TaxCode.toUpperCase();

      this.LineTotalCalculate(i);

    }

  }

  // funcion para calcular el total de la linea
  // recibe como parametro el index de la lista de items
  LineTotalCalculate(idx: number) {
    let disc = 0;
    if (this.itemsList[idx].DiscountPercent <= this.maxDiscuont) {
      disc = this.itemsList[idx].DiscountPercent;
    }
    else {
      disc = this.maxDiscuont;
      this.alertService.infoInfoAlert('El descuento no puede ser mayor a ' + this.maxDiscuont + ' que es lo permitido para este usuario');
      this.itemsList[idx].DiscountPercent = this.maxDiscuont;
    }
    if (this.itemsList[idx].DiscountPercent == null) { this.itemsList[idx].DiscountPercent = 0; }

    const qty = this.itemsList[idx].Quantity;
    const price = this.itemsList[idx].UnitPrice;
    let lineTotal = Number((qty * price).toString());
    const taxamount = Number(
      (lineTotal * (this.itemsList[idx].TaxRate / 100)).toString()
    );
    lineTotal = Number((lineTotal + taxamount).toString());
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toString());
    this.itemsList[idx].LinTot = lineTotal;//.toString();
    this.getTotals();
    // console.log(13);
  }

  LineTotalCalculateExt(_idx: number) {
    let disc = 0;
    if (this.itemsList[_idx].DiscountPercent <= this.maxDiscuont) {
      disc = this.itemsList[_idx].DiscountPercent;
    }
    else {
      disc = this.maxDiscuont;
      this.alertService.infoInfoAlert('El descuento no puede ser mayor a ' + this.maxDiscuont + ' que es lo permitido para este usuario');
      this.itemsList[_idx].DiscountPercent = this.maxDiscuont;
    }
    if (this.itemsList[_idx].DiscountPercent == null) { this.itemsList[_idx].DiscountPercent = 0; }
    const qty = this.itemsList[_idx].Quantity;
    const price = this.itemsList[_idx].UnitPrice;
    let lineTotal = Number((qty * price).toString());
    const taxamount = Number(
      (lineTotal * (this.itemsList[_idx].TaxRate / 100)).toString()
    );
    lineTotal = Number((lineTotal + taxamount).toString());
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toString());
    this.itemsList[_idx].LinTot = lineTotal;//.toString();
    this.getTotals();
    // console.log(13);
  }
  //#endregion

  //#region Config vista document
  // Definir Titulos documento
  DefineTitleDocument(): void {
    switch (this.storage.GetDocumentType()) {
      case SOAndSQActions.EditOrder:
        this.documentTitle = 'Actualizar orden de venta'
        break;
      case SOAndSQActions.EditQuotation:
        this.documentTitle = 'Actualizar cotización'
        break;
      case SOAndSQActions.CopyToOrder:
      case SOAndSQActions.CreateSaleOrder:
        this.documentTitle = 'Crear orden de venta';
        break;
      case SOAndSQActions.CopyToInvoice:
      case SOAndSQActions.CreateInvoice:
        this.documentTitle = 'Crear factura';
        break;
      case SOAndSQActions.CreateQuotation:
        this.documentTitle = 'Crear cotización';
        break;


    }
  }
  DefineDocument(): void {
    switch (this.storage.GetDocumentType()) {
      case SOAndSQActions.EditOrder:
      case SOAndSQActions.CopyToOrder:
      case SOAndSQActions.CreateSaleOrder:
        this.documentTitle = 'Crear orden de venta';
        this.storage.SaveDocumentType(SOAndSQActions.CreateSaleOrder);
        this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
        this.router.navigate(['/', 'so', `${SOAndSQActions.CreateSaleOrder}`]);
        break;
      case SOAndSQActions.EditQuotation:
      case SOAndSQActions.CreateQuotation:
        this.documentTitle = 'Crear cotización';
        this.storage.SaveDocumentType(SOAndSQActions.CreateQuotation);
        this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);
        this.router.navigate(['/', 'quotation', `${SOAndSQActions.CreateQuotation}`]);
        break;
      case SOAndSQActions.CreateInvoice:
      case SOAndSQActions.CopyToInvoice:
        this.documentTitle = 'Crear factura';
        this.storage.SaveDocumentType(SOAndSQActions.CreateInvoice);
        this.GetConfiguredUdfs(DOCUMENT_ALIAS.INVOICE);
        this.GetConfiguredUdfsOIGN(DOCUMENT_ALIAS.GOODSRECEIPT);
        this.router.navigate(['/', 'invo', `${SOAndSQActions.CreateInvoice}`]);
        break;
    }
  }
  //#endregion

  //#region Limpiar vista documento
  ClearItemList() {
    // i need to set the current list over here
    const PRICE_LIST = this.PriceList.find(x => x.ListNum === +this.documentForm.get('PriceList').value);


    if (PRICE_LIST) {
      this.userCurrency = PRICE_LIST.PrimCurr;
      this.currencyPayment = this.userCurrency;
      if (PRICE_LIST.HasInconsitencies) {
        this.alertService.infoAlert(`Esta lista tiene inconsitencias usa colones y dólares`);
        return;
      }
    }
    this.itemsList.length = 0;
    this.GetItems();
    this.GetTaxes();
    this.GetAccount();
    this.GetCards();
    this.GetAccountsBank();
  }
  CreateNew(RemoveMemoryInvoice: boolean = true) {
    this.DefineDocument();
    this.isOnInvoiceDocument = false;
    this.udfs = [];
    this.udfsOIGN = [];
    this.ItemInfo.setValue('');
    this.buildedData = '';
    this.isScanning = false;
    this.isLockedByScanner = false;
    this.searchTypeManual = false;
    this.ProcessingScanning = false;
    this.NameActionDocument = ''

    this.pinPadCards = [];
    this.terminals = [];
    // this.pinPadCard = null;
    /*ref sale order*/
    if (this.subscriptions) this.subscriptions.unsubscribe();
    this.InvalidCardName = false;
    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    if (this.typeArrow) (<HTMLButtonElement>(document.getElementById('triggerFECollapser'))).click();
    this.storage.SaveDocEntry(-1);
    this.storage.SaveUIAction(-1);
    this.storage.SaveCustomerData('{}');
    // const DOC_ENTRY = this.storage.GetDocEntry();
    // if (DOC_ENTRY > 0) {
    //   this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.GetCustomerData()).CardCode;
    // } else {
    if (this.storage.GetDocumentType() === SOAndSQActions.CreateInvoice) {
      this.memoryInvoiceService.ShowInvoices.next(true);
    }
    // this.DEFAULT_BUSINESS_PARTNER = this.storage.GetDefaultBussinesPartner();
    this.GetDefaultBussinesPartnerSettings();
    this.GetDefaultPaymentSettings();

    /*ref end sale order*/
    this.btnVisibleBool = true;
    this.documentForm.reset(true);
    this.feForm.reset(true);
    this.documentForm.controls['cardName'].enable();
    this.documentForm.controls['cardCode'].enable();
    this.itemsList.length = 0;

    this.V_CreditCards.length = 0;
    this.V_Checks.length = 0;
    this.conta = 0;
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.identificationTypeList = IdentificationType;

    this.documentForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required], //CD0051 - SUPER // C0001 - DISUMED
      cardName: ['', Validators.required],
      // currency: ['', Validators.required],
      PayTerms: ['0'],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      paymentType: [''],
      Comment: '',
    });

    // this.invoiceType = this.storageService.GetDefaultInvoiceType();

    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {
        this.typesInvoice = next.InvoiceTypes;
        this.documentForm.patchValue({
          DocumentType: this.typesInvoice.find(x => x.IsDefault).Name,
        });
      }
      else {
        console.log(next);
        this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${next.Error ? next.Error.Message : ''}`);
      }
    }, error => {
      console.log(error);
      this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${error}`);
    });

    // this.documentForm.patchValue({ paymentType: this.paymentTypes[0].id });--revisar50

    // this.invForm.patchValue({ cardCode: this.DEFAULT_BUSSINESS_PARTNER });
    // this.GetExchangeRate();
    this.CreateFEForm();
    this.getMaxDiscout();
    this.getCustomers();
    this.GetParamsViewList();
    this.getExRate();
    this.GetPriceList();
    this.GetSalesPersonList();
    this.GetTaxes();
    this.GetAccount();
    this.GetCards();
    this.GetAccountsBank();
    this.GetPayTerms();
    this.Cant.setValue(1);

    this.ChangeCode(this.DEFAULT_BUSINESS_PARTNER);

    this.nameField.nativeElement.focus();
    this.Cant.setValue(1);
    this.nameField.nativeElement.focus();
    this.currencyPayment = 'COL';
    this.GetCompanies();
    this.generateUniqueInvoiceId();
    this.currencyPayment = 'COL';
    this.hasLines = false;
    this.isBilling = false;
    this.attemptsWhileBilling = 0;


    if (RemoveMemoryInvoice) {
      if (this.currentMemoryInvoice && this.currentMemoryInvoice.Id > 0) {
        this.storageService.RemoveMemoryInvoice(this.currentMemoryInvoice.Id);
        this.currentMemoryInvoice = null;
        this.AfterDeleteMemoryInvoice();
      } else {
        if (this.isOnOrderMode) {
          this.AfterDeleteMemoryInvoice();
          this.isOnOrderMode = false;
        }
      }
    }

  }
  //#endregion
  //#region documento en memoria

  // Accion que se ejecuta luego de eliminar una factura ya sea porque se facturo o se limpio
  //Hay 2 opciones si no existen mas en memoria se crea una nueva o sino se carga la ultima factura de la lista
  AfterDeleteMemoryInvoice() {
    setTimeout(() => {
      let InvociesInfo = this.storageService.GetMemoryInvoicesInfo();
      if (InvociesInfo.Size == 0) {
        this.CreateMemoryInvoice(InvociesInfo);
      } else {
        this.LoadMemoryInvoice(InvociesInfo.lastOne);
      }
    }, 500);
  }

  // Metodo que carga la data de una factura en memoria, la data es el form de la factura, el form de FE y la lista de items (lineas)
  LoadMemoryInvoice(MemoryInvoice: IMemoryInvoice): void {

    if (this.currentMemoryInvoice) this.UpdateMemoryInvoice();
    this.currentMemoryInvoice = MemoryInvoice;


    this.itemsList = MemoryInvoice.ItemsList;


    this.documentForm.setValue(MemoryInvoice.InvForm);
    this.feForm.setValue(MemoryInvoice.FEForm);


    this.priceList = +MemoryInvoice.InvForm.PriceList;
    if (this.PriceList && this.PriceList.length > 0 && this.PriceList.find(x => x.ListNum == this.priceList)) {
      this.userCurrency = this.PriceList.find(x => x.ListNum == this.priceList).PrimCurr;
      this.documentForm.patchValue({
        PriceList: this.priceList
      });
    }

    this.uniqueInvCode = MemoryInvoice.InvoiceNumber;

    this.hasLines = (MemoryInvoice.ItemsList.length > 0)


    // Se limpian los campos de los udfs
    this.udfs.forEach(x => {
      (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value = '';
    });
    this.LoadUdfsFromMemoryInvoice(MemoryInvoice.mappedUdfs);


    if (MemoryInvoice.ItemsList.length == 0) {
      this.blockUI.start('Cargando factura #' + MemoryInvoice.Id + ' en blanco.');
      this.getTotals();
      setTimeout(() => {
        this.blockUI.stop();
      }, 500);
    }

    this.storageService.UpdateMemoryInvoiceSelection(MemoryInvoice.Id);

  }


  // Metodo para cargar los udfs dinamicos de la factura que se almaceno.
  LoadUdfsFromMemoryInvoice(udfsSaved: IUdfTarget[]) {
    let differendUdfs: any[] = [];

    if (udfsSaved.length == 0) return;

    if (udfsSaved.length != this.udfs.length) {
      udfsSaved.forEach(i => {
        let udfExist: IUdf = this.udfs.find(x => x.Name == i.Name);
        if (udfExist) {
          (<HTMLSelectElement>document.getElementById(`dynamicRender_${i.Name}`)).value = i.Value;
        } else {
          if (i.Value !== '')
            differendUdfs.push(i);
        }
      });

      if (differendUdfs.length > 0) {
        let htmlMessage: string = '<lu>?</lu>'
        let content: string = '';

        differendUdfs.forEach(i => {
          content += '<li> ' + i.Name + '</li>';
        });
        htmlMessage = htmlMessage.replace('?', content);

        this.alertService.InfoAlertHtml(htmlMessage, 'Los siguientes Udfs no se encuentran');
      }
    } else {
      udfsSaved.forEach(x => {
        (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value = x.Value;
      });
    }


  }


  // Metodo para crear una factura nueva en blanco y almacenarla en localstorage.
  CreateMemoryInvoice(InvociesInfo: any): void {
    //let InvociesInfo = this.storageService.GetMemoryInvoicesInfo();

    let mappedUDFToSave: IUdfTarget[] = [];
    this.udfs.forEach(x => {
      let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;
      if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();
      mappedUDFToSave.push({
        Name: x.Name,
        Value: parsedValue,
        FieldType: x.FieldType
      } as IUdfTarget);
    });

    this.currentMemoryInvoice = {
      Id: InvociesInfo.nextID,
      UdfList: [],
      ItemsList: [],
      IsSelected: false,
      FEForm: this.feForm.value,
      InvForm: this.documentForm.value,
      InvoiceNumber: this.uniqueInvCode,
      mappedUdfs: [],
      IsEmpty: true
    }

    this.storageService.AddMemoryInvoiceList(this.currentMemoryInvoice);

  }

  // Actualiza una factura en memoria por el ID basado en la factura actual que se este mostrando.
  UpdateMemoryInvoice() {

    if (!this.currentMemoryInvoice) return;

    let mappedUDFToSave: IUdfTarget[] = [];

    this.udfs.forEach(x => {
      let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;

      if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();

      mappedUDFToSave.push({
        Name: x.Name,
        Value: parsedValue,
        FieldType: x.FieldType
      } as IUdfTarget);
    });


    this.storageService.UpdateMemoryInvoice({
      Id: this.currentMemoryInvoice.Id,
      UdfList: this.udfs,
      ItemsList: this.itemsList,
      IsSelected: false,
      FEForm: this.feForm.value,
      InvForm: this.documentForm.value,
      InvoiceNumber: this.currentMemoryInvoice.InvoiceNumber,
      mappedUdfs: mappedUDFToSave,
      IsEmpty: false
    });


  }

  // Funcion de prueba para validar si una factura en memoria esta en blanco.
  IsEmptyInvoice(invoice: IMemoryInvoice) {
    let condition: boolean = true;
    if (invoice.ItemsList.length === 0 && invoice.mappedUdfs.length === 0) {


    }
  }
  GetDefaultBussinesPartnerSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.BussinesPartner).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);
        this.DEFAULT_BUSINESS_PARTNER = result.DefaultBussinesPartnerCustomer;
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuración de socios de negocios por defecto ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuración de socios de negocios por defecto ' + err);
    });
  }
  GetDefaultPaymentSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.Payment).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);
        this.DefaultCardValid = result.CardValid;
        this.defaultCardNumber = result.CardNumber;
        this.requiredCashAccount = result.RequiredCashAccount;
        this.requiredTransferAccount = result.RequiredTransferAccount;
        this.requiredCardAccount = result.RequiredCardAccount
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuración de pagos ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuración de pagos' + err);
    });
  }
  GetMemoryInvoiceSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.Invoice).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);
        this.InvoicesInMemoryAccepted = result.Quantity;
        this.memoryInvoiceService.DocName.next(result.Name);
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuración de facturas ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuración de facturas ' + err);
    });
  }
  // Accion que se ejecuta al darle click al boton de +, primero se actualiza y se guarda la informacion de la factura actual
  // Luego limpiamos la vista de facturas para preparar la nueva factura que se creara y se almacenara en memoria.
  AddMemoryInvoice(): void {
    let InvociesInfo = this.storageService.GetMemoryInvoicesInfo();


    if (this.InvoicesInMemoryAccepted == InvociesInfo.Size) {
      this.alertService.infoInfoAlert('Número máximo de facturas en espera alcanzado ');
      return;
    }
    // Se actualiza la factura actual.
    this.UpdateMemoryInvoice();
    //Consultamos si existe una factura en blanco ya agregada
    let ExistEmpyInvoice = this.storageService.GetEmptyMemoryInvoice();
    // De exister esa factura la cargamos
    if (ExistEmpyInvoice) {
      this.currentMemoryInvoice = null;

      this.LoadMemoryInvoice(ExistEmpyInvoice);

      return;
    }

    //Limpiamos para la nueva factura
    this.CreateNew(false);

    setTimeout(() => {
      // Se crea la nueva factura.
      this.CreateMemoryInvoice(InvociesInfo);
    }, 600);
  }
  //#endregion

  //#region datos FE
  // convenience getter for easy access to form fields
  get f() {
    return this.documentForm.controls;
  }
  get fe() {
    return this.feForm.controls;
  }
  identificationTypeChange(IdentificationValue: string) {
    switch (IdentificationValue) {
      case '00': {
        this.feForm.controls['Identification'].setValidators([]);
        this.feForm.controls['Identification'].updateValueAndValidity();
        this.feForm.controls['Direccion'].setValidators([]);
        this.feForm.controls['Direccion'].updateValueAndValidity();
        this.feForm.controls['Email'].setValidators([]);
        this.feForm.controls['Email'].updateValueAndValidity();
        break;
      }
      case '01': {
        this.validatorFeForm(9, 9);
        // this.getProvinces();
        break;
      }
      case '02':
      case '04': {
        this.validatorFeForm(10, 10);
        // this.getProvinces();
        break;
      }
      case '03': {
        this.validatorFeForm(11, 12);
        // this.getProvinces();
        break;
      }
    }

  }
  queryFEData2() {
    let paymentTerm = this.PayTermsList.find(x => x.GroupNum === Number(this.documentForm.controls.PayTerms.value));


    if (paymentTerm.Type === PayTermsEnum.Contado && this.feForm.controls.IdType.value !== "") {
      this.blockUI.start('Obteniendo datos FE...');
      this.bpService.GetCustomersCont(this.feForm.controls.IdType.value, this.feForm.controls.Identification.value).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.documentForm.patchValue({ cardName: data.FEInfo.CardName });
          this.feForm.patchValue({ Email: data.FEInfo.Email });
        }
        else {
          // busca info del cliente en el padron
          this.blockUI.stop();
          this.blockUI.start('Obteniendo datos del padrón...');
          if (this.feForm.controls.Identification.value != '') {

            this.bpService.GetCustomersContPadron(this.feForm.controls.Identification.value).subscribe((data) => {
              this.blockUI.stop();
              if (data.tipoIdentificacion == this.feForm.controls.IdType.value) {
                this.documentForm.patchValue({ cardName: data.nombre });
              } else {
                this.alertService.errorInfoAlert(`Error no se ha encontrado la información en el padron del número de identificación ingresado.`);
              }
            }, (error: any) => {
              this.blockUI.stop();
              this.alertService.errorInfoAlert(`Error Padrón: No se ha encontrado la información en el padron del número de identificación ingresado.`);
            });

          }
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error Obteniendo datos FE!!!, error: ${error.error.Message}`);
      });
    }
  }

  validatorFeForm(min: number, max: number) {
    this.feForm.controls['Identification'].setValidators([Validators.required, Validators.minLength(min), Validators.maxLength(max)]);
    this.feForm.controls['Identification'].updateValueAndValidity();
    this.feForm.controls['Direccion'].setValidators([Validators.required, Validators.maxLength(250)]);
    this.feForm.controls['Direccion'].updateValueAndValidity();
    this.feForm.controls['Email'].setValidators([Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]);
    this.feForm.controls['Email'].updateValueAndValidity();
  }

  toggleArrow(): void { this.typeArrow = !this.typeArrow; }
  //#endregion

  //#region carga objetos en comun para documentos de ventas

  TypesInvoice(): void {
    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {

        this.typesInvoice = next.InvoiceTypes;
        this.documentForm.patchValue({
          DocumentType: this.typesInvoice.find(x => x.IsDefault).Name,
        });
      }
      else {
        console.log(next);
        this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${next.Error ? next.Error.Message : ''}`);
      }
    }, error => {
      console.log(error);
      this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${error}`);
    });
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {
    if (this.currentUser != null) {
      this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          data.perms.forEach(Perm => {
            // if (Perm.Name === "V_Inv") {
            //   this.permisos = Perm.Active;

            //   if (this.permisos) {
            //     // this.nameField.nativeElement.focus();
            //   }
            // }
            switch (this.storage.GetDocumentType()) {
              case SOAndSQActions.EditOrder:
              case SOAndSQActions.CopyToOrder:
              case SOAndSQActions.CreateSaleOrder:
                if (Perm.Name === "V_SO") {
                  this.permisos = Perm.Active;
                }
                break;
              case SOAndSQActions.EditQuotation:
              case SOAndSQActions.CreateQuotation:
                if (Perm.Name === "V_Quo") {
                  this.permisos = Perm.Active;


                }
                break;
              case SOAndSQActions.CreateInvoice:
              case SOAndSQActions.CopyToInvoice:
                if (Perm.Name === "V_Inv") {
                  this.permisos = Perm.Active;

                }
                break;
            }

            if (Perm.Name === 'V_LstChng') this.isAllowedPriceListChange = Perm.Active;
            if (Perm.Name === 'V_WHChng') this.isAllowedWHChange = Perm.Active;
            if (Perm.Name === 'V_Inv_OIGN') this.isAllowedGoodReceipt = Perm.Active;
            if (Perm.Name === 'Perm_ChangeTax') this.isChangeTax = Perm.Active;
            if (Perm.Name === 'Perm_Bonus') this.isPermBonus = Perm.Active;
            if (Perm.Name === 'W_ChangeCardNumber') this.isAllowedToEditCardNumber = Perm.Active;
          });
        } else {
          this.permisos = false;
        }
      }, error => {
        this.permisos = false;
        this.blockUI.stop();
      });
    }
  }


  getCustomers() {
    this.blockUI.start('Obteniendo clientes, espere por favor...');
    this.bpService.GetCustomers()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data && data.Code === undefined && data.BPS != null) {
          this.bpList.length = 0;
          this.bpCodeList.length = 0;
          this.bpNameList.length = 0;
          this.bpList = data.BPS;



          for (let item of data.BPS) {
            this.defaultGroupNum = item.GroupNum;
            if (item.ClienteContado) this.defaultContado = "Contado";
            else this.defaultContado = "Credito";
            this.bpCodeList.push(item.CardCode);
            this.bpNameList.push(item.CardName);
          }
          this.GetCurrencyType();
          this.GetPayTerms();
          this.GetPriceList();
        } else {
          this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  GetCurrencyType() {
    this.blockUI.start('Obteniendo los tipos de monedas...');
    this.paramsService.GetCurrencyType().subscribe(data => {
      if (data.Data.length > 0) {
        this.currencyList = data.Data;
        this.currencyList.sort();
        this.allCurrencyList = data.Data;
        this.currencyPayment = 'COL';
        this.Funcion();
        this.blockUI.stop();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar las monedas - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }
  Funcion(): void {

    let inputValue = this.DEFAULT_BUSINESS_PARTNER
    let code = inputValue;
    let codePos = this.bpCodeList.indexOf(code);
    let cardName = this.bpNameList[codePos];


    let customer = this.bpList.filter(cus => {
      return cus.CardCode === code;
    });

    this.userCurrency = customer[0].Currency;

    this.GetCurrencyByUser(customer[0].Currency);

    const DOC_ENTRY = this.storage.GetDocEntry();
    let MOBJECT;
    if (DOC_ENTRY > 0) {
      MOBJECT = this.saleDocumentModel;
    } else {
      this.documentForm.patchValue({ cardCode: this.DEFAULT_BUSINESS_PARTNER });
      this.priceList = +customer[0].ListNum;
    }
    this.documentForm.patchValue({ cardCode: MOBJECT ? MOBJECT.CardCode : this.DEFAULT_BUSINESS_PARTNER });
    this.documentForm.patchValue({ cardName: MOBJECT ? MOBJECT.CardName : cardName });

  }
  /**
* Funcion que permite llenar el select de moneda segun las monedas que posee el cliente
* @param {string} currency Variable que contiene el tipo de moneda del cliente
*/
  GetCurrencyByUser(currency: string) {
    this.currencyList = this.allCurrencyList;
    // if (currency === 'COL' || currency === 'USD') {
    //   this.currencyList = this.currencyList.filter(cur => cur.Id === currency);
    // }
    // if (this.currencyList.length === 1) {
    //   this.documentForm.patchValue({ currency: this.currencyList[0].Id }); //this.currencyList[0].Id
    // }
    // else {
    //   this.documentForm.patchValue({ currency: "COL" }); //
    // }

    // const DOC_ENTRY = this.storage.GetDocEntry();

    // if (DOC_ENTRY > 0) {
    //   const CUSTOMER_DATA = JSON.parse(this.storage.GetCustomerData());
    //   this.documentForm.patchValue({ currency: CUSTOMER_DATA.Currency });
    // }
    this.currencyPayment = this.userCurrency;
    this.SetCurr();
  }
  SetCurr(): void {
    let cur = this.currencyList.find(curr => curr.Id === this.userCurrency);

    if (this.storage.GetDocEntry() > 0) {
      cur = this.currencyList.find(curr => curr.Id === JSON.parse(this.storage.GetCustomerData()).Currency);
    }

    // this.userCurrency = this.currencyPayment;
    if (!cur) return;
    this.setCurr = cur.Symbol;
  }

  GetPayTerms() {
    this.blockUI.start('Obteniendo términos de pago, espere por favor...');
    this.itemService.GetPayTerms()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          const customer = this.bpList.filter(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);
          this.PayTermsList = data.payTermsList;
          const DOC_ENTRY = this.storage.GetDocEntry();
          if (DOC_ENTRY === -1) {
            this.documentForm.patchValue({ PayTerms: customer[0].GroupNum });
          }
        } else {

          this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
        }
      },
        (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
  }
  CreateFEForm() {
    this.feForm = this.fb.group({
      IdType: [''],
      Identification: [''],
      Email: [''],
      Provincia: [''],
      Canton: [''],
      Distrito: [''],
      Barrio: [''],
      Direccion: ['']
    });

    this.feForm.patchValue({ IdType: this.identificationTypeList[0].Id });
  }
  // obtiene el maximo descuento posible
  getMaxDiscout() {
    this.documentService.getMaxDiscout().subscribe((data: any) => {
      if (data.Result) {
        this.currentRequest++;
        this.maxDiscuont = data.discount;
        this.$requestViewer.next(this.currentRequest);
      }
      else {
        this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
      }
    }, (error: any) => {
      this.alertService.errorInfoAlert(`Error getCustomers!!!, error: ${error.error.Message}`);
    });

  }
  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.blockUI.start('Obteniendo parámetros...');
    this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.viewParamList = data.Params.filter(param => {
            if (this.storageService.GetDocumentType() == SOAndSQActions.CreateInvoice || this.storageService.GetDocumentType() == SOAndSQActions.CopyToInvoice) {
              return param.type === 1 && param.Visibility;
            } else {
              return param.type === 1 && param.Visibility && param.Name != 'TaxOnly';
            }

          });
          this.tableLength = 0;
          for (var i = 0; i < this.viewParamList.length; i++) {
            this.tableLength += this.MapWidth[this.viewParamList[i].Name];
          }
          this.viewParamListHeader = data.Params.filter(param => {

            return param.type === 2;
          });
          this.viewParamListTotales = data.Params.filter(param => {
            return param.type === 3;
          });
          this.viewParamTitles = data.Params.filter(param => {
            return param.type === 6;
          });
          this.ChargeParamstoView();
        } else {
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data.Error.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizaciones para dtos de cabezera
    this.viewParamListHeader.forEach((element) => {
      if (element.Name === "lbCardCode") {
        this.lbCardCode = element;
      }
      if (element.Name === "txtCardCode") {
        this.txtCardCode = element;
      }
      if (element.Name === "lbCardName") {
        this.lbCardName = element;
      }
      if (element.Name === "txtCardName") {
        this.txtCardName = element;
      }
      if (element.Name === "lbCurrency") {
        this.lbCurrency = element;
      }
      if (element.Name === "txtCurrency") {
        this.txtCurrency = element;
      }
      if (element.Name === "txtPayTerms") {
        this.txtPayTerms = element;
      }
      if (element.Name === "lbPayTerms") {
        this.lbPayTerms = element;
      }
      if (element.Name === "txtPriceList") {
        this.txtPriceList = element;
      }
      if (element.Name === "lbPriceList") {
        this.lbPriceList = element;
      }
      if (element.Name === "txtComments") {
        this.txtComments = element;
      }
      if (element.Name === "lbComments") {
        this.lbComments = element;
      }
      if (element.Name === "txtSLP") {
        this.txtSLP = element;
      }
      if (element.Name === "lbSLP") {
        this.lbSLP = element;
      }
    });
    // parametrizaciones datos de totales
    this.viewParamListTotales.forEach((element) => {
      if (element.Name === "lbTotalExe") {
        this.lbTotalExe = element;
      }
      if (element.Name === "txtTotalExe") {
        this.txtTotalExe = element;
      }
      if (element.Name === "lbDiscount") {
        this.lbDiscount = element;
      }
      if (element.Name === "txtDiscount") {
        this.txtDiscount = element;
      }
      if (element.Name === "lbTaxes") {
        this.lbTaxes = element;
      }
      if (element.Name === "txtTaxes") {
        this.txtTaxes = element;
      }
      if (element.Name === "lbTotal") {
        this.lbTotal = element;
      }
      if (element.Name === "txtTotal") {
        this.txtTotal = element;
      }
    });
    // parametrizacion del titulo
    // let obj = this.viewParamTitles.filter(param => {
    //   return param.Name === 'T_Inv';
    // });
    // this.title = obj[0].Text;
  }


  // obtiene el tipo de cambio
  getExRate() {
    this.blockUI.start('Obteniendo tipos de cambios, espere Por Favor...');
    this.exrate.getExchangeRate().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.currencyChange = data.exRate;
        this.DailyExRate = data.exRate
        this.currentRequest++;
        this.$requestViewer.next(this.currentRequest);
        //this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
      } else {
        this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
      }

    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error getCustomers!!!, error: ${error.error.Message}`);

    });
  }
  GetPriceList() {
    this.blockUI.start('Obteniendo listas de precios, espere por favor...');
    this.itemService.GetPriceList()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          const customer = this.bpList.find(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);
          this.PriceList = data.priceList;

          if (this.PriceList[0].HasInconsitencies) {

          }
          else {
            this.documentForm.patchValue({ PriceList: this.storage.GetDocEntry() > 0 ? this.priceList : this.PriceList[0].ListNum });
          }
          // const customer = this.bpList.find(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);
          // this.PriceList = data.priceList;
          // if (this.storage.GetDocEntry() <= 0) {
          //   this.userCurrency = this.PriceList.find(x => x.ListNum == customer.ListNum)!.PrimCurr;
          // }
          // this.documentForm.patchValue({ PriceList: this.storage.GetDocEntry() > 0 ? this.priceList: customer.ListNum  });
        } else {
          this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
        }
        this.SetDefaultList(this.DEFAULT_BUSINESS_PARTNER);
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  SetDefaultList(_cardCode: string) {
    this.itemService.GetPriceListDefault(_cardCode).subscribe(next => {
      if (next.Result) {
        this.documentForm.patchValue({
          PriceList: this.storage.GetDocEntry() > 0 ? this.priceList : next.PriceList.ListNum
        });
      }
    });
  }
  // funcion para obtener los items desde SAP
  // no recibe parametros
  GetItems() {
    this.blockUI.start('Obteniendo ítems, espere por Ffavor...');
    this.itemService.GetItems()
      .subscribe((data: any) => {
        if (data.Result) {
          this.itemsTypeaheadList = data.ItemList.ItemCompleteName;
          this.itemsCodeList = data.ItemList.ItemCode;
          this.itemsNameList = data.ItemList.ItemName;
          this.blockUI.stop();

        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);

        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  // funcion para obtener los impuestos desde SAP
  // no recibe parametros
  GetTaxes() {
    this.blockUI.start('Obteniendo impuestos, espere por favor...');
    this.taxService.GetTaxes()
      .subscribe((data: any) => {
        if (data.Result) {
          this.taxesList.length = 0;
          this.taxesList = data.Taxes;
        } else {
        }
        this.blockUI.stop();
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error getTaxes!!!, error: ${error.error.Message}`);
      });
  }

  GetCompanies() {
    this.blockUI.start('Obteniendo compañías, espere por favor...');
    this.companyService.GetCompanies().subscribe((data: any) => {
      if (data.Result) {
        this.companiesList.length = 0;
        this.companiesList = data.companiesList;
        this.companiesList.forEach(comp => {
          // this.pesoBolsa = comp.ScaleWeightToSubstract;49
          this.priceEditable = comp.IsLinePriceEditable;
          this.maxWeightTo0 = comp.ScaleMaxWeightToTreatAsZero;
        });
      } else {
        this.alertService.errorAlert('Error al cargar compañías - error: ' + data.Error.Message);
      }
      this.blockUI.stop();
    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }
  // funcion para obtener una lista de cuentas segun la compañía seleccionada
  GetAccount() {
    this.blockUI.start('Obteniendo cuentas, espere por favor...');
    this.accountService.getAccount()
      .subscribe((data: any) => {
        if (data.Result) {
          this.accountList = data.Data;
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('Error al cargar Cuentas - error: ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);

      });
  }
  GetCards() {
    this.blockUI.start('Obteniendo tarjetas, espere por favor...');
    this.cardService.getCards()
      .subscribe((data: any) => {
        if (data.Result) {
          this.cardsList = data.cardsList;

          this.CardName = data.cardsList[0].CardName;
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('error al cargar tarjetas de credito - error: ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  GetAccountsBank() {
    this.blockUI.start('Obteniendo bancos, espere por favor...');
    this.bankService.getAccountsBank()
      .subscribe((data: any) => {
        if (data.Result) {
          this.banksList = data.banksList;
          // this.checkForm.patchValue({ BankNames: data.banksList[0].BankCode });
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('error al obtener información de los Bancos - error: ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  // Genera el id para la creacion de la factura usanda en sap y el pin pad
  generateUniqueInvoiceId(): void {
    // const USER_PREFIXID = this.storage.GetPrefix();

    // const DATE = new Date();

    // const DAYS = DATE.getDate() < 10 ? '0' + DATE.getDate() : DATE.getDate().toString();
    // const MONTS = (DATE.getMonth() + 1) < 10 ? '0' + (DATE.getMonth() + 1) : (DATE.getMonth() + 1).toString();
    // const YEAR = DATE.getFullYear().toString().slice(2, 4);

    // const HOURS = DATE.getHours() < 10 ? '0' + DATE.getHours() : DATE.getHours();
    // const MINUTES = DATE.getMinutes() < 10 ? '0' + DATE.getMinutes() : DATE.getMinutes();
    // const SECONDS = DATE.getSeconds() < 10 ? '0' + DATE.getSeconds() : DATE.getSeconds();

    this.uniqueInvCode = this.commonService.GenerateDocumentUniqueID();//`${USER_PREFIXID + DAYS + MONTS + YEAR + HOURS + MINUTES + SECONDS}`;

    console.log('UniqueInvCode ', this.uniqueInvCode);
  }

  // establece la persona que es el vendedor
  GetSalesPerson() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.uService.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userAssignsList = data.Users;
        this.userAssignsList.forEach(user => {
          // if (this.currentUser.userId === user.UserId) {
          //   this.defaultSlpCode = user.SlpCode;
          //   this.defaultSlpCodeStr = user.SlpCode;
          //   this.documentForm.patchValue({ SlpList: user.SlpCode });
          if (this.currentUser.userId.toString() === user.UserId.toString()) {
            this.defaultSlpCode = user.SlpCode;
          }
        });
        this.GetSalesPersonList();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.Error.Message);
      }
    }, error => {
      console.log(error);
      this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + error);
    });
  }

  GetSalesPersonList() {
    this.blockUI.start('Obteniendo vendedores, espere por favor...');
    this.smService.getSalesMan()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.SlpsList = data.salesManList;
          const DOC_ENTRY = this.storage.GetDocEntry();
          if (DOC_ENTRY > 0) {
            const CUSTOMER_DATA = JSON.parse(this.storage.GetCustomerData());
            this.documentForm.patchValue({ SlpList: CUSTOMER_DATA.SlpCode });
          }
          else {
            this.documentForm.patchValue({ SlpList: this.defaultSlpCode.toString() });
          }

        } else {

          this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  SetWarehouseInfo() {
    let session = this.storage.getSession(true);
    if (session) {
      session = JSON.parse(session);
      this.whCode = session.WhCode;
      this.whName = session.WhName;
    }
  }
  //#endregion

  //#region config form cabecera documentos

  searchBPCode = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpCodeList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  searchBPName = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpNameList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  searchItemCode = this.IS();

  IS() {
    return (text$: Observable<string>) =>
    text$.pipe(
    debounceTime(15),
    distinctUntilChanged(),
    map(term => term.length < 1 ? []
    : this.itemsTypeaheadList.filter(v => {
    
    
    
    if (term.indexOf('*') == -1) {
    return v.toLowerCase().indexOf(term.toLowerCase()) > -1;
    }
    
    
    
    let a = v.toLowerCase();
    
    
    
    const stringSize = a.length;
    
    
    
    const t = term.toLowerCase();
    
    
    
    // if (this.itemsTypeaheadList.find(r => r === t)) return true;
    
    
    
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
  cantChange() {
    if (this.Cant.value < 1) {
      this.Cant.setValue(1);
    }
  }
  // funcion para detectar el cambio en el input de descripcion
  // recibe como parametro la descripcion del item
  ChangeDescription(_description) {
    if (_description != null) {
      let itemDescription = this.bpNameList.filter(
        (book) => book.toLowerCase() === _description.toLowerCase()
      );
      if (itemDescription.length > 0) {
        let description = itemDescription[0];
        let descriptionPos = this.bpNameList.indexOf(description);
        let cardCode = this.bpCodeList[descriptionPos];

        let customer = this.bpList.filter((cus: any) => {
          return cus.CardCode === cardCode;
        });
        this.GetCurrencyByUser(customer[0].Currency);

        if (cardCode !== this.documentForm.get('cardCode').value) {
          this.documentForm.patchValue({ cardCode: cardCode });
        }
        if (this.PriceList && this.PriceList.length > 0) {
          this.currencyPayment = this.userCurrency;
          // this.priceList = customer[0].ListNum;

          this.userCurrency = this.PriceList.find(x => x.ListNum == customer[0].ListNum)!.PrimCurr;
        }

        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;


            const DOC_ENTRY = this.storage.GetDocEntry();
            // if (DOC_ENTRY === -1) {
            //   this.documentForm.patchValue({ PayTerms: item.GroupNum.toString() });
            // }
            if (DOC_ENTRY <= 0) {
              this.documentForm.patchValue({ PayTerms: item.GroupNum.toString() });
            }
          }
        }
        const DOC_ENTRY = this.storage.GetDocEntry();

        if (DOC_ENTRY > 0 && this.saleDocumentModel) {  
          this.userCurrency = this.saleDocumentModel.DocCurrency;          
        } else {  
          this.userCurrency = this.PriceList.find(x => x.ListNum == customer[0].ListNum)!.PrimCurr;
        }
        this.currencyPayment = this.userCurrency;

        let nombre = "Contado";
        this.defaultContado = "Contado";
        if (customer[0].ClienteContado === false) {
          nombre = "A30Dias";
          this.defaultContado = "A30Dias";
        }

        for (let item of this.paymentTypes) {
          if (nombre === item.name.toString()) {
            this.documentForm.patchValue({ paymentType: item.id });
          }
        }
      }
    }
  }


  // funcion para detectar el cambio en el input de Código
  // recibe como parametro el Código del cliente
  ChangeCode(_code) {
    if (_code != null) {





      let cardCode = this.bpCodeList.filter(
        (book) => book.toLowerCase() === _code.toLowerCase()
      );
      if (cardCode.length > 0) {
        this.SetDefaultList(cardCode[0]);
        let code = cardCode[0];
        let codePos = this.bpCodeList.indexOf(code);
        let cardName = this.bpNameList[codePos];

        this.isEditable = !this.bpList[codePos].ClienteContado;

        let customer = this.bpList.filter(cus => {
          return cus.CardCode === code;
        });





        this.GetCurrencyByUser(customer[0].Currency);

        // tslint:disable-next-line:no-unused-expression
        if (cardName !== this.documentForm.get('cardName').value) {
          this.documentForm.patchValue({ cardName: cardName });
        }

        if (this.itemsList.length > 0) {
          this.SetupRecalculate();
        }

        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;


            const DOC_ENTRY = this.storage.GetDocEntry();
            if (DOC_ENTRY <= 0) {
              this.documentForm.patchValue({ PayTerms: item.GroupNum.toString() });
            }
            // this.documentForm.patchValue({ PriceList: this.storage.GetDocEntry() > 0 ? this.priceList :  item.ListNum });

          }
        }
        // for (let item of this.PriceList) {
        //   if (item.ListNum.toString() === customer[0].ListNum.toString()) {
        //     //     //this.defaultListNum = item.ListNum;
        //     //     //this.invForm.patchValue({PriceList: customer[0].ListNum});
        //   }
        // }
        for (let item of this.PriceList) {
          if (item.ListNum.toString() === customer[0].ListNum.toString()) {
          }
        }

        this.userCurrency = this.PriceList.find(x => x.ListNum == customer[0].ListNum)!.PrimCurr;
        this.currencyPayment = this.userCurrency;

        let nombre = "Contado";
        this.defaultContado = "Contado";
        if (customer[0].ClienteContado === false) {
          nombre = "A30Dias";
          this.defaultContado = "A30Dias";
        }
        //revisar
        for (let item of this.paymentTypes) {
          if (nombre === item.name.toString()) {
            this.documentForm.patchValue({ paymentType: item.id });
          }
        }
        setTimeout(() => {
          this.nameField.nativeElement.focus();
        }, 0);
      }
    }
  }

  SetupRecalculate(): void {
    this.conta = 0;
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    let itemsToCalculate: any[] = []; // lista de items

    this.itemsList.forEach(x => itemsToCalculate.push(x));
    this.blockUI.start('Recalculando precios, espere por favor');
    setTimeout(() => {
      this.PollItemsData(itemsToCalculate);
    }, 1000);
  }

  PollItemsData(_itemsList: any[]): void {
    if (_itemsList.length === 0 || this.itemsList.length === 0) {
      this.blockUI.stop();
      return;
    }
    const ITEM_INDEX = _itemsList.length - 1;
    const ITEM = _itemsList[ITEM_INDEX];
    const PRICE_LIST = this.documentForm.get('PriceList').value;
    this.itemService.GetItemByItemCode(ITEM.Item, PRICE_LIST, this.documentForm.controls.cardCode.value)
      .subscribe((data: any) => {
        if (data.Result) {
          this.total += ITEM.UnitPrice;
          this.itemsList[ITEM_INDEX].DiscountPercent = data.Item.Discount;

          this.LineTotalCalculateExt(_itemsList.length - 1);
          this.getTotals();
          _itemsList.pop();
          this.PollItemsData(_itemsList);
        } else {
          this.PollItemsData([]);
          this.alertService.errorAlert(`Error no se pudo recalcular los precios, motivo: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
        }
      }, (error: any) => {
        this.PollItemsData([]);
        this.alertService.errorInfoAlert(`Error no se pudo recalcular los precios, motivo: ${error}`);
      });
  }


  GetCustomerUpdate() {
    this.blockUI.start('Obteniendo clientes, espere por favor...');
    this.bpService.GetCustomers()
      .subscribe((data: any) => {
        this.blockUI.stop();
        // console.log(data.Code != null && data.Code == '404');
        if (data && data.Code === undefined && data.BPS != null) {
          this.bpList.length = 0;
          this.bpCodeList.length = 0;
          this.bpNameList.length = 0;
          this.bpList = data.BPS;
          for (let item of data.BPS) {
            // console.log(item);
            this.defaultGroupNum = item.GroupNum;
            this.bpCodeList.push(item.CardCode);
            this.bpNameList.push(item.CardName);
          }

        } else {
          this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  //Calculo de totales basado en ERA
  getTotals(): void {
    this.total = 0;
    this.discount = 0;
    this.tax = 0;
    this.totalWithoutTax = 0;

    // Recorre toda la lista de items agregados a facturar.
    this.itemsList.forEach(x => {

      const FIRST_SUBTOTAL = (x.Quantity * x.UnitPrice);

      const LINE_DISCOUNT = FIRST_SUBTOTAL * (x.DiscountPercent / 100);

      const SUBTOTAL_WITH_LINE_DISCOUNT = Math.round(((FIRST_SUBTOTAL - LINE_DISCOUNT) + Number.EPSILON) * 100) / 100;

      const HEADER_DISCOUNT = 0; // Este campo lo deja eaguilar para que si en futuro se decide implementar descuento de cabecera en el proyecto solo sea mapear la variable y no alterar la formula del cálculo

      const TOTAL_HEADER_DISCOUNT = (SUBTOTAL_WITH_LINE_DISCOUNT * HEADER_DISCOUNT);

      const SUBTOTAL_WITH_HEADER_DISCOUNT = SUBTOTAL_WITH_LINE_DISCOUNT - TOTAL_HEADER_DISCOUNT;

      const CURRENT_TAX_RATE = x.TaxRate / 100;

      const TOTAL_TAX = Math.round(((SUBTOTAL_WITH_HEADER_DISCOUNT * CURRENT_TAX_RATE) + Number.EPSILON) * 100) / 100;

      this.totalWithoutTax += Math.round((SUBTOTAL_WITH_HEADER_DISCOUNT * (+!x.TaxOnly) + Number.EPSILON) * 100) / 100;

      this.discount += LINE_DISCOUNT;

      this.tax += TOTAL_TAX;
      // const FIRST_SUBTOTAL = (x.Quantity * x.UnitPrice);
      // const LINE_DISCOUNT = FIRST_SUBTOTAL * (x.DiscountPercent / 100);

      // const SUBTOTAL_WITH_LINE_DISCOUNT = (FIRST_SUBTOTAL - LINE_DISCOUNT);

      // const CURRENT_TAX_RATE = x.TaxRate / 100;

      // const TOTAL_TAX = Math.round(((SUBTOTAL_WITH_LINE_DISCOUNT * CURRENT_TAX_RATE) + Number.EPSILON) * 100) / 100;

      // if (x.TaxOnly) {
      //   this.totalWithoutTax += 0;
      // } else {
      //   this.totalWithoutTax += Math.round((SUBTOTAL_WITH_LINE_DISCOUNT + Number.EPSILON) * 100) / 100;
      // }
      // this.discount += LINE_DISCOUNT;

      // this.tax += TOTAL_TAX;

    });



    const MOBJECT = this.saleDocumentModel;

    this.total = (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));

    // if (MOBJECT) {
    //   if (MOBJECT.DocCurrency == 'COL') {
    //     this.total = (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
    //     this.totalUSD = parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
    //   }
    //   else {
    //     this.total = (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
    //     this.totalUSD = parseFloat(Number(this.totalWithoutTax + this.tax).toString());
    //   }
    // }
    // else if (this.documentForm.value.currency) {
    //   if (this.documentForm.value.currency == 'COL') {
    //     this.total = (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
    //     this.totalUSD = parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
    //   }
    //   else {
    //     this.total = (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
    //     this.totalUSD = parseFloat(Number(this.totalWithoutTax + this.tax).toString());
    //   }
    // }
  }
  //#endregion

  //#region udfs definidos por usuario

  GetConfiguredUdfs(_documentAlias: string): void {
    this.blockUI.start(`Obteniendo datos, espere por favor`);
    this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.udfs = next.Udfs;

        this.udfs.filter(x => x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));

        const DOC_ENTRY = this.storage.GetDocEntry();

        if (DOC_ENTRY > 0 && this.udfs.length > 0) {

          this.GetUdfsData(this.udfs, _documentAlias, DOC_ENTRY);
        }

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
      this.blockUI.stop();
      console.log(error);
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

  GetUdfDevelopment(): void {
    this.udfService.GetUdfDevelopment().subscribe(next => {
      if (next.Result) {
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.INC_PAYMENT_CARDS).forEach(x => {
          this.udfTargets.push({
            Key: x.Description,
            Value: ''
          });
        });
        this.IsUdfIntegrityValid();
      }
    });
  }

  UdfSetter(_udfTargets: IKValue[]): void {
    _udfTargets.forEach(x => {
      const NOT_REDERED_UDF = <HTMLSelectElement>document.getElementById(`dynamicRender_${x.Key}`);
      if (!NOT_REDERED_UDF) throw new Error(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
      agreguelo en la configuración`);
    });
  }
  // Permite actulizar los valores de los udfs usados para desarrollo
  UdfTargetValueUpdater(_udfTargets: IKValue[]): boolean {
    let isCompletedUpdate = true;
    _udfTargets.forEach(x => {
      const UDF_TO_UPDATE = this.udfTargets.find(y => y.Key === x.Key);
      if (!UDF_TO_UPDATE) {
        this.alertService.errorAlert(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
        agreguelo en la configuración`);
        isCompletedUpdate = false;
      }
      else {
        UDF_TO_UPDATE.Value = x.Value;
      }

      const HTML_COMPONENT = <HTMLInputElement>document.getElementById(`dynamicRender_${x.Key}`);

      if (HTML_COMPONENT) {
        HTML_COMPONENT.value = x.Value;
        console.log((<HTMLInputElement>document.getElementById(`dynamicRender_${x.Key}`)).value);
      }
    });

    return isCompletedUpdate;
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
  // Se ejecta luego de completar la data de pago
  UdfPaymentValidation(): boolean {
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
  //#endregion

  //#region AJUSTE INVENTARIO
  GetAvailableItemInventory(code: string, cant: number) {
    this.itemService.GetWHAvailableItem(code)
      .subscribe((data: any) => {
        if (data.Result) {
          let available: boolean = false;
          data.whInfo.forEach(wh => {
            if (wh.Disponible < cant && wh.InvntItem === "Y") {
              available = true;
            }
          });
          if (data.whInfo.length > 0) {
            if (available) {
              this.alertService.infoInfoAlert(`Sin stock, solicitud de ${cant}, disponible:${data.whInfo[0].Disponible} `);
            }
          } else {
            this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
          }
        } else {
          this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.Error.Message);
        }

      }, (error: any) => {
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }


  GetSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.OIGN).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);;
        this.CommentInv = result.Comments;
        this.GoodsReceiptAccount = result.GoodsReceiptAccount;
      } else {
        this.alertService.errorAlert('Ócurrio un error obteniendo configuración de ajuste de inventario ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ócurrio un error obteniendo configuración de ajuste de inventario ' + err);
    });
  }

  // Levanta la modal de ajuste de inventario.

  InventorySettings(): void {

    this.GetSettings();

    this.blockUI.start('Obteniendo información');
    // Se filtra las lines que no tienen en stock la cantidad solicitada, seran las que se usen para el ajuste del inventario.
    let filterLines = this.itemsList.filter(x => +x.available < (this.itemsList.filter(y => y.ItemCode == x.ItemCode && y.WarehouseCode == x.WarehouseCode).reduce((p, c) => { return p + c.Quantity }, 0)) && x.InvntItem === "Y");

    let filterLinesGroup = filterLines.filter((item, index) => {
      return filterLines.findIndex(x => x.ItemCode == item.ItemCode && x.WarehouseCode == item.WarehouseCode) == index;
    });


    // Resive una lista de itemCodes de los items que se les quiere realizar el ajuste, este metodo valida si el item puede ser enviado a ajuste
    // Retorna un array de objetos formados por, itemCde, ultimo precio de compra, precio promedio y si se puede o no enviar a ajuste.
    this.itemService.GetDataForGoodReceiptInvocie(filterLinesGroup.map(i => i.Item), this.whCode).subscribe(response => {
      this.blockUI.stop();
      if (response.Result) {
        // Seteamos el mensaje que se ve en el popover de los items con desviacion
        this.DeviationMessage = response.Data[0].Message;

        filterLinesGroup.forEach(x => {

          // se busca la data obtenida del item que se esta iterando
          let value = response.Data.find(i => i.ItemCode === x.Item);
          let cantidad = this.itemsList.filter(y => y.ItemCode == x.ItemCode && y.WarehouseCode == x.WarehouseCode).reduce((p, c) => { return p + c.Quantity }, 0);
          const LINE = {
            // BarCode: x.BarCode,50
            ItemCode: x.Item,
            ItemName: `${x.Item} - ${x.ItemName}`,
            Quantity: +cantidad - x.available,
            Available: x.available,
            Missing: +cantidad,
            TaxCode: x.TaxCode,
            UnitPrice: value.LastPrice,
            Discount: x.DiscountPercent,
            Tax_Rate: x.TaxRate,
            TaxRate: x.TaxRate,
            TotalLine: value.LastPrice * (cantidad - x.available),
            WareHouse: x.WarehouseCode,
            AVGPrice: value.AVGPrice,
            LastPurchasePrice: value.LastPrice,
            DeviationStatus: value.DeviationStatus
          }

          this.lines.push(LINE);

        });


        this.TotalCalculateInventorySetting();

      } else {
        // Error
      }
    }, err => {
      //msj Error
      this.blockUI.stop();
    });
    (<HTMLInputElement>document.getElementById('raiseModalInventorySettings')).click();
  }


  //#001  Retorna el mensaje que se ve en el popover cuando un item cuenta con desviacion en su precio.
  ItemForAdjustment(index: number): string {
    if (this.lines[index] && this.lines[index].DeviationStatus === 0) {
      return this.DeviationMessage;
    }
    return '';
  }

  //#region UDFSOIGN
  GetUdfDevelopmentOIGN(): void {
    this.udfService.GetUdfDevelopment().subscribe(next => {
      if (next.Result) {
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.GOODSRECEIPT).forEach(x => {
          this.udfTargetsOIGN.push({
            Key: x.Description,
            Value: ''
          });
        });
        this.IsUdfIntegrityValidOIGN();
      }
    });
  }
  GetConfiguredUdfsOIGN(_documentAlias: string): void {
    this.blockUI.start(`Obteniendo datos, espere por favor`);
    this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.udfsOIGN = next.Udfs;
        this.udfsOIGN.filter(x => x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));

        this.GetUdfDevelopmentOIGN();

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
  // Verifica si los udfs a usar por desarrollo no han sido eliminados de la configuracion general
  IsUdfIntegrityValidOIGN(): boolean {
    let isValid = true;
    this.udfTargetsOIGN.forEach(x => {
      if (!this.udfsOIGN.find(y => y.Name === x.Key)) {
        this.alertService.errorAlert(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
      agreguelo en la configuración`);
        isValid = false;
        return;
      }
    });

    return isValid;
  }
  // CONFIG OIGN UDFS
  UdfOIGNValidation(): boolean {
    try {
      if (!this.IsUdfIntegrityValidOIGN()) return false;

      this.UdfSetter(this.udfTargetsOIGN);

      this.mappedUdfsOIGN = [];
      this.udfsOIGN.forEach(x => {
        let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;

        if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();

        this.mappedUdfsOIGN.push({
          Name: x.Name,
          Value: parsedValue,
          FieldType: x.FieldType
        } as IUdfTarget);
      });


      let udfName = '';
      let isValid = true;
      this.udfsOIGN.forEach(x => {
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
  //#endregion

  // Generar ajuste de inventario
  SaveInventorySettings() {
    if (!this.UdfOIGNValidation()) {
      this.blockUI.stop();

      return;
    }
    // if (!this.isAllowedGoodReceipt) {
    //   this.alertService.errorAlert("No cuenta con permiso para realizar ajuste de Inventario");
    //   return;
    // }

    if (this.GoodsReceiptAccount == '') {
      this.alertService.infoAlert('Cuenta no configurada para ajuste de inventario');
      return;
    }

    const CORRUPTED_QUANTITY = this.lines.find(x => x.Quantity == 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.ItemCode}  - ${CORRUPTED_QUANTITY.ItemName}, no puede ir en  0`);
      return;
    }
    const CORRUPTED_PRICE = this.lines.find(x => x.UnitPrice == 0);
    if (CORRUPTED_PRICE) {
      this.alertService.errorAlert(`El precio del producto  ${CORRUPTED_PRICE.ItemCode}  - ${CORRUPTED_PRICE.ItemName}, no puede ir en  0`);
      return;
    }

    const CORRUPTED_LINES = this.lines.some(i => i.DeviationStatus == 0);

    if (CORRUPTED_LINES) {
      this.alertService.infoAlert('Existen artículos que no pueden ser procesados ya que cuentan con una desviación')
      return;
    }



    // Validacion por si se requiere mostrar con los nombres o codigos de los articulos que no pueden ser procesados por tener desviacion
    // const CORRUPTED_LINES = this.lines.filter(i => i.hasDeviation);

    // if (CORRUPTED_LINES && CORRUPTED_LINES.length > 0) {
    //   let htmlMessage: string = '<lu style="text-align: left">?</lu>';
    //   let corruptedLines: string = '';

    //   CORRUPTED_LINES.forEach(i => {
    //     corruptedLines += '<li>' + i.ItemName + '</li>'
    //   });

    //   this.alertService.InfoAlertHtml(htmlMessage.replace('?', corruptedLines), 'Los siguientes articulos no pueden ser procesados ya que cuentan con una desviacion del ' + this.deviationPercent + '%');
    //   return;
    // }



    swal({
      type: 'warning',
      title: 'Se realizará ajuste de inventario',
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Continuar',
      cancelButtonText: 'No'
    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {
        this.blockUI.start('Realizando ajuste de inventario');

        this.goodsReciptStockService.CreateGoodsReceiptStock(
          this.lines, this.documentForm.controls.PriceList.value, this.CommentInv,
          this.usersCredentials, this.GoodsReceiptAccount, this.mappedUdfsOIGN, this.uniqueInvCode

        ).subscribe(response => {
          this.blockUI.stop();
          if (response.Result) {
            this.returnedDocNum = response.DocNum;
            this.closebuttonInvSetting.nativeElement.click();
            (<HTMLButtonElement>document.getElementById('triggerAfterInvModal')).click();
            this.lines.forEach(x => {
              this.itemService.GetWHAvailableItem(x.ItemCode)
                .subscribe((data: any) => {
                  if (data.Result) {
                    let available: boolean = false;
                    data.whInfo.forEach(wh => {
                      if (wh.InvntItem === "N") {
                        available = true;
                      }
                    });
                    if (!available) {
                      var index: number = this.itemsList.indexOf(this.itemsList.find(y => y.Item === x.ItemCode));
                      if (index != -1) {
                        this.itemsList[index].available = data.whInfo[0].Disponible;
                      }
                    }

                  } else {
                    this.blockUI.stop();
                    this.alertService.errorAlert('Error al obtener disponibilidad el artículo - ' + data.Error.Message);
                  }

                }, (error: any) => {

                  this.blockUI.stop();
                  this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
                });
            });


            this.lines = [];

            (<HTMLInputElement>document.getElementById('CreateInvo')).click();

          } else {
            console.log(response);
            this.alertService.errorAlert('Error' + response.Error.Message);
          }
        }, error => {
          console.log(error);
          this.blockUI.stop();
          if (error.error && error.error.errorInfo) {
            this.alertService.errorAlert(`Error: código ${error.error.Error.Code}. Detalle: ${error.error.Error.Message}`);
          }
          else {
            this.alertService.errorAlert(`Error: ${error}`);
          }
        });

      }
    });

  }

  OnCloseModalInventorySettings() {

    // (<HTMLInputElement>document.getElementById('CreateInvo')).click();
    swal({
      type: 'warning',
      title: 'No se ha realizado el ajuste de inventario',
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Continuar',
      cancelButtonText: 'No'
    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {
        this.lines.forEach(x => {

          var index: number = this.itemsList.indexOf(this.itemsList.find(y => y.Item === x.ItemCode));
          if (x.Available == 0) {
            if (index != -1) {
              this.itemsList.splice(index, 1);
            }
            this.getTotals();
          } else {
            if (index != -1) {
              this.itemsList[index].Quantity = x.Available;
              this.LineTotalCalculateExt(index);
            }
          }

        });

        this.lines = [];
        this.closebuttonInvSetting.nativeElement.click();
      }
    });


  }
  closeAfterInvModal() {
    this.lines = [];
    this.udfsOIGN = [];
    this.GetConfiguredUdfsOIGN(DOCUMENT_ALIAS.GOODSRECEIPT);

    (<HTMLInputElement>document.getElementById('CreateInvo')).click();


  }
  LineTotalCalculateInventorySetting(i: number, field: string) {
    switch (+field) {
      case 1:
        this.lines[i].Quantity = +(parseFloat((<HTMLInputElement>document.getElementById('quantity_' + i)).value).toFixed(2));
        this.lines[i].TotalLine = this.lines[i].Quantity * this.lines[i].LastPurchasePrice;
        this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].LastPurchasePrice).toFixed(2);
        break;
      case 2:
        this.lines[i].LastPurchasePrice = +(parseFloat((<HTMLInputElement>document.getElementById('lastPrice_' + i)).value).toFixed(2));
        this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].LastPurchasePrice).toFixed(2);
        this.lines[i].UnitPrice = this.lines[i].LastPurchasePrice;
        break;

      case 3:
        this.lines[i].LastPurchasePrice = +(parseFloat((<HTMLInputElement>document.getElementById('totalLine_' + i)).value).toFixed(2)) / this.lines[i].Quantity;
        this.lines[i].LastPurchasePrice = +this.lines[i].LastPurchasePrice.toFixed(2);
        this.lines[i].TotalLine = +(parseFloat((<HTMLInputElement>document.getElementById('totalLine_' + i)).value).toFixed(2));
        this.lines[i].UnitPrice = this.lines[i].LastPurchasePrice;
        break;
    }

    this.TotalCalculateInventorySetting();
  }

  TotalCalculateInventorySetting() {
    this.CRCTotal = +this.lines.reduce((a, b) => a +
      (((b.LastPurchasePrice * b.Quantity) - ((b.LastPurchasePrice * b.Quantity) * (b.Discount / 100))) +
        (((b.LastPurchasePrice * b.Quantity) - ((b.LastPurchasePrice * b.Quantity) * (b.Discount / 100))) * (b.Tax_Rate / 100)) || 0), 0).toFixed(2);

  }
  //#endregion

  //#region configuracion lineas sin stock,precio

  LineStatus(item: any, index: number): string {

    if (+item.UnitPrice <= +item.LastPurchasePrice && +item.UnitPrice !== 0) {
      return `Costo del artículo es mayor o igual al precio de venta. Precio venta: ${+item.UnitPrice} Precio costo: ${+item.LastPurchasePrice}`;
    } else
      if (+item.UnitPrice == 0) {
        return "No tiene precio";
      }
    if (item.ShouldValidateStock && +item.Quantity === 0 && item.ItemClass != ItemsClass.Service) {
      return "Sin stock";
    }

    // let cantsingroupLine: number = 0;
    // const INDEX = this.itemsList.findIndex(x => x.available !== 0 && x.Item === this.itemsList[index].Item);

    // this.itemsList.forEach(x => {
    //   if (x.Item === this.itemsList[index].Item) {
    //     cantsingroupLine += x.Quantity;

    //     if (INDEX !== -1) {
    //       x.available = this.itemsList[INDEX].available
    //       x.InvntItem = this.itemsList[INDEX].InvntItem
    //     }
    //   }
    // });

    const QUANTITYTOTAL = this.itemsList.filter(y => y.ShouldValidateStock && y.Item == this.itemsList[index].Item && this.itemsList[index].InvntItem === "Y" && y.WarehouseCode == this.itemsList[index].WarehouseCode && this.itemsList[index].ItemClass != ItemsClass.Service).reduce((p, c) => { return p + c.Quantity }, 0);

    if (this.itemsList[index].available < +QUANTITYTOTAL && this.itemsList[index].InvntItem === "Y" && this.itemsList[index].ItemClass != ItemsClass.Service && this.itemsList[index].ShouldValidateStock) {
      return `Sin stock almacén ${item.WhsName}, solicitado: ${+QUANTITYTOTAL}, disponible: ${this.itemsList[index].available}`;
    }

  }

  AvailableItemColor(item: any): boolean {
    let cantsingroupLine: number = 0;

    this.itemsList.forEach(x => {
      if (x.Item === item.Item) {
        cantsingroupLine += x.Quantity;
      }
    });

    if (+item.available < +cantsingroupLine && item.InvntItem === "Y" && item.ItemClass != ItemsClass.Service && item.ShouldValidateStock) {
      return true;
    }
  }

  LineColor(item: any): string {

    if (+item.UnitPrice <= +item.LastPurchasePrice || +item.UnitPrice == 0) {
      return "mOrange";
    }
  }
  GetCurrencySymbol(): string {
    switch (this.userCurrency) {
      case 'COL':
      case 'CRC':
        return 'CRC';
      case 'DOL':
      case 'USD':
        return 'USD';
      default:
        return ' ';
    }
  }

  GetSymbol(): string {
    switch (this.userCurrency) {
      case 'COL':
      case 'CRC':
        return '₡';
      case 'DOL':
      case 'USD':
        return '$';
      default:
        return '';
    }
  }
  //#endregion


}
