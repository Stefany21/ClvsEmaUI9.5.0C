import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, NgZone, HostListener, Inject, DoCheck, Renderer2 } from "@angular/core";
import { FormBuilder, FormGroup, Validators, FormControl } from "@angular/forms";
import { BlockUI, NgBlockUI } from "ng-block-ui";
import { Observable, Subject, merge, Subscription, fromEvent, empty, forkJoin } from "rxjs";
import { debounceTime, distinctUntilChanged, filter, map, first } from "rxjs/operators";
import { DecimalPipe, CurrencyPipe, DatePipe, DOCUMENT } from "@angular/common";
import { NgbModal, ModalDismissReasons, NgbModalOptions, NgbButtonsModule } from "@ng-bootstrap/ng-bootstrap";
import { formatDate } from '@angular/common';
import swal from 'sweetalert2';
// MODELOS
import { Params, AppConstants, UserAssigns, IdentificationType, PayTermsEnum, CONFIG_VIEW, TypeInvoice, IViewGroup, IPPTransaction, ICard, Company, IPrice, IPrinter, ISaleOrder, IDocumentLine, ITerminal, ITerminalByUser, IInvoiceType, IUdf, IUdfTarget, KeyValue, IKValue, IDocumentToSync, Users, User, settings } from "./../../../models/index";
import { ReportType, BACErrorCodes, SOAndSQActions, PaymentResults, BoRcptInvTypes, BoDocumentTypes, BaseTypeLines } from "../../../enum/enum";
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
import { THIS_EXPR } from "@angular/compiler/src/output/output_ast";
import { TransitionCheckState } from "@angular/material";
import { timeStamp } from "console";
import { Item } from "electron";
import { ILine } from "src/app/models/i-line";
import { GoodsReceiptStockService } from "src/app/services/goodsReceiptStockService";
import { IMemoryInvoice } from "src/app/models/i-memory-invoice";
import { MemoryInvoiceService } from "src/app/services/memory-invoice.service";
import { PaymentComponent } from "src/app/components/payment/payment.component";
import { IInvoiceInfoForPayment, IOnPaymentFail } from "src/app/models/i-payment-data";
import { CreateInvoice, DocumentModel, LinesBaseModel } from "src/app/models/i-invoice-document";
import { BasePayment, PaymentLines } from "src/app/models/i-payment-document";
import { Console } from "@angular/core/src/console";
import { Currency } from "src/app/models/i-currency";
import { IDocument } from "src/app/models/i-document";
// import { ConsoleReporter } from "jasmine";   

// PIPES

export enum KEY_CODE {
  F4 = 115,
  F7 = 118,
  F8 = 119
}

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss'],
  providers: [DecimalPipe, CurrencyPipe, DatePipe]
})
export class InvoiceComponent implements OnInit, OnDestroy, AfterViewInit, DoCheck {
  //VARBOX
  searchTypeManual: boolean; // Validación por 2ble petición en typeahead cuando se agrega ítem por búsqueda manual,sin scanner.
  isProcessing: boolean;
  modalInvoiceContent: boolean;
  isScanning: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  currentNgbIndex = 0;
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  udfs: IUdf[];
  udfsOIGN: IUdf[];
  mappedUdfsOIGN: IUdfTarget[];
  udfTargetsOIGN: IKValue[];
  isAllowedWHChange: boolean;

  terminalsByUser: ITerminalByUser[];
  terminals: ITerminal[];
  pPTransaction: IPPTransaction;

  documentType: string;
  isRequiredEmail: boolean;
  hasIdentification: boolean;
  isOnPrint: boolean;
  priceList: number;
  subscriptions: Subscription;//Contiene la lista de todas las subscriptions
  subscriptionsf: Subscription[] = []; // Contiene la lista de todas las subscriptions
  currentRequest: number;
  requestToAwait: number;
  $requestViewer: Subject<number>;
  InvalidCardName: boolean;
  returnedDocEntry: number;
  returnedDocNum: number;
  returnedNumFE: number;
  baseLines: IDocumentLine[];
  typeArrow: boolean; // Hace toggle al darle click
  saleOrder: IDocument;
  //#region Cambios Jorge EMA Aromas
  whName: string;
  whCode: string;
  //#endregion

  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual

  public model: any;
  @BlockUI() blockUI: NgBlockUI;

  invForm: FormGroup; // formulario para la orden de venta
  feForm: FormGroup;
  // totalForm: FormGroup; // formulario para el total de la orden de venta
  submitted = false; // variable para reconcer si se envio una peticion o no
  maxDiscuont: any;
  setCurr: string; // tipo de moneda escogida en simbolo
  currencyList: Currency[] = []; // lista de tipos de cambio
  allCurrencyList: Currency[] = []; // lista de todos los tipos de cambio existentes en la aplicacion
  itemsList: any[] = []; // lista de items
  companiesList: any[] = []; // lista de las compannias
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  itemsCodeList: string[] = []; // lista de los Códigos de items
  itemsNameList: string[] = []; // lista de los nombres de items
  PayTermsList: any[] = []; // lista de los Terminos de pagos
  PriceList: any[] = []; // lista de las listas de precios
  SlpsList: any[] = []; // lista de los vendedores
  bpList: any[] = []; // lista de clientes
  bpCodeList: string[] = []; // lista de los Códigos de clientes
  bpNameList: string[] = []; // lista de los nombres de clientes
  conta: number; // variable contador para colocar un 'id' a la lista de items
  total: number; // variable para almacenar el total de la factura
  totalUSD: number;
  tax: number; // variable para almacenar el total de impuestos
  isAllowedPriceListChange: boolean; // Controla el cambio de lista por parte del usuario
  discount: number; // variable para almacenar el total de descuento
  totalWithoutTax: number; // variable para almacenar el total sin impuesto
  taxesList: any[] = []; // lista de los impuestos
  viewParamList: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListHeader: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListTotales: any[] = []; // llena la lista con los componentes parametrizados
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  closeResult: string; // variable para saber porque se cerro la modal
  modalReference: any; // instancia de la modal de terminal y sucursal
  WHAvailableItemList: any[] = []; // lista de los items disponibles por almacen
  indexAvaItem: number; // indice de la lista del item seleccionado para la disponibilidad
  itemCode: string; // variable para almacenar el Código del ite seleccionado para buscar la disponibilidad
  seriesList: any[] = []; // lista de las series de un item po almacen
  nombreProvincia: string; // almacena el nombre de la provincia de la direccion de la fe
  nombreCanton: string; // almacena el nombre de la canton de la direccion de la fe
  nombreDistrito: string; // almacena el nombre de la distrito de la direccion de la fe
  nombreBarrio: string; // almacena el nombre de la barrio de la direccion de la fe
  userCurrency: string; // Usado para precargar el tipo de moneda que usara el usuario
  // modal de pagos

  accountList: any[] = []; // lista de cuentas
  cardsList: any[] = []; // lista de tarjetas
  banksList: any[] = []; // lista de bancos
  salesManList: any[] = []; // lista de vendedores
  currencyPayment: string; // moneda selecionada al buscar los anticipos
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
  correctInvoice: boolean = false;  //dice si el pago se realizo correctamente
  facturando: boolean = false;
  hasLines: boolean = false; //dice si el pago se realizo correctamente
  isPagoCuenta: boolean;
  currencyChange: number; // monto del tipo de cambio
  unamePattern = "^d{2}/d{2}$";
  btnVisibleBool: boolean;
  defaultSlpCode: number = -1;
  defaultSlpCodeStr: any;
  defaultGroupNum: any;
  defaultListNum: any;
  defaultContado: any;
  public expandedIndex: number; // variable para manejar el collapse de los items y reconocer sobre cual se va a trabajar
  title: string; // titulo de la vista
  feOpen: boolean = false; // dice si la pestana de datos de fe esta abierta
  _timeout: any = null;
  changeColones: number; // vuelto en colones
  changeDolares: number; // vuelto en dolares
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

  // pinPadCard: IPPTransaction;
  pinPadCards: IPPTransaction[];
  DEFAULT_BUSINESS_PARTNER: string;

  // -----------------------------
  // -------- Campos para metrizables de totales
  lbTotalExe: Params = new Params(); // etiqueta para Total sin impuestos
  txtTotalExe: Params = new Params(); // campo para Total sin impuestos
  lbDiscount: Params = new Params(); // etiqueta para descuentos
  txtDiscount: Params = new Params(); // campo para descuentos
  lbTaxes: Params = new Params(); // etiqueta para Impuestos
  txtTaxes: Params = new Params(); // campo para Impuestos
  lbTotal: Params = new Params(); // etiqueta para Total
  txtTotal: Params = new Params(); // campo para Total
  // -----------------------------
  TotalCol: FormControl = new FormControl();
  TotalUSD: FormControl = new FormControl();
  Cant: FormControl = new FormControl();
  ItemInfo: FormControl = new FormControl();
  permisos: boolean = true;
  paymentTypes: any[] = [
    { id: '1', name: "A30Dias" },
    { id: '2', name: "Contado" },
  ];
  TypesInvoice: any[] = [];
  paymentType: number = 1;
  pesoBolsa: number = 0.020;
  priceEditable: boolean = false;
  maxWeightTo0: number = 0.01;
  userAssignsList: UserAssigns[] = [];
  identificationTypeList: any[] = [];
  typesInvoice: IInvoiceType[] = [];
  TRANSFER_DATE = new Date(Date.now());
  provinceList: any[] = [];// provincias
  cantonList: any[] = []; // lista de cantones
  districtList: any[] = []; // lista de distritos
  neighborhoodList: any[] = []; // lista de barrios
  provinceId: string; // identificador de la provincia
  cantonId: string; // identificador del canton
  districtId: string; // identificador del distrito
  neighborhoodId: string; // identificador del barrio
  DailyExRate: number;
  MapWidth: any;
  tableLength: number;
  isOnSubmit: boolean = false;
  @ViewChild("name") nameField: ElementRef;
  lastInvoice: number;
  @ViewChild("payContent") payContentModal: any;
  isBilling: boolean;//Validacion flag para evitar reenvio de solicitudes al mismo tiempo
  attemptsWhileBilling: number = 0;
  viewGroupList: IViewGroup[] = []; //contiene lista de agrupaciones en linea
  isOnEditMode = false;
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
  invoiceType: string; // contiene el valor definido en un JSON para el tipo de Factura
  documents: IDocumentToSync[];//ref Offline view
  documentPendingSync: number;//ref Offline view
  flagForm: boolean; //Validacion flag para evitar reenvio de solicitudes al mismo tiempo, facturas credito
  lines: any[] = []; // Modelo para ajuste de inventario
  CommentInv: string;
  GoodsReceiptAccount: string;
  CRCTotal: number; // Total en colones
  isAllowedGoodReceipt: boolean; // Permiso para realizar ajuste de inventario


  currentMemoryInvoice: IMemoryInvoice;
  InvoicesInMemoryAccepted: number;
  addMemoryInvoiceSubscription: Subscription;
  loadMemoryInvoiceSubscription: Subscription;

  //deviationPercent: number = 20;
  DeviationMessage: string = '';

  isOnOrderMode: boolean;



  //#Pagos, variables requeridas para cuando falla creando el documento al que se le realizaron pagos.
  IsPaymentFail: boolean = false;
  PaymentFail: IOnPaymentFail;





  @ViewChild('closebuttonInvSetting') closebuttonInvSetting;
  SettingOIGNJson: any;
  // Permite cambiar entre los inpus de lectura y edicion para el precio unitario
  toggleEdition(): void {
    if (this.priceEditable) {
      setTimeout(() => {
        this.editUnitPrice.nativeElement.focus();
      }, 0);
      this.isOnEditMode = true;
    }
  }
  // Si el input de editar el precio pierde el foco, se restablece el contenido al valor previo que tenia
  onFocusOutEvent($event: any) {
    this.isOnEditMode = false;
  }

  onkeyUp(event: any, index: number): void {
    if (this.priceEditable) {
      if (event.key === 'Enter') {
        this.itemsList[index].UnitPrice = +event.target.value;
        this.isOnEditMode = false;
        this.LineTotalCalculateExt(index);
      }
      if (event.key === 'Escape') {
        this.isOnEditMode = false;
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

  Comments: FormControl = new FormControl();

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
    @Inject(DOCUMENT) private _document: Document,) {
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

    // if (this.ItemInfo && this.ItemInfo.value && this.ItemInfo.value.includes('*')) {
    //   try {
    //     setTimeout(() => {
    //       let buttons = document.getElementsByClassName('dropdown-item');
    //       if (buttons && buttons.length > 0) {
    //         for (let c = 0; c < 1; c++) {
    //           let button = document.getElementById(buttons[c].getAttribute('id'));

    //           if (button.childNodes[0]) {
    //             let child = button.childNodes[0];
    //           }
    //           
    //         }
    //       }
    //     });
    //   }
    //   catch (error) {

    //   }
    // }

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





  mDate: string;

  initVarialbles(): void {
    this.isOnOrderMode = false;
    this.currentMemoryInvoice as IMemoryInvoice;
    this.buildedData = '';
    this.isScanning = false;
    this.isProcessing = false;
    this.searchTypeManual = false;
    this.isLockedByScanner = false;
    this.udfTargets = [];
    this.udfs = [];
    this.udfsOIGN = [];
    this.udfTargetsOIGN = [];
    this.checkPermits();

    this.getCustomers();
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.invoiceType = this.storageService.GetDefaultInvoiceType();
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.usersCredentials = JSON.parse(this.storage.getCurrentSession()).UserName;

    this.itemsTypeaheadList.length = 0;
    this.itemsList = [];
    this.itemsCodeList = [];
    this.itemsNameList = [];
    this.isRequestinBacPayment = false;
    this.pinPadCards = [];
    this.terminals = [];
    // this.pinPadCard = null;
    this.defaultGroupNum = "-1";
    this.defaultListNum = "-1";
    this.defaultContado = "Contado";
    this.defaultSlpCodeStr = "-1";
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
    this.btnVisibleBool = true;
    this.conta = 0.0;
    this.total = 0.0;
    this.totalUSD = 0.0;
    this.tax = 0.0;
    this.discount = 0.0;
    this.totalWithoutTax = 0.0;
    this.TotalG = 0.0;
    this.identificationTypeList = IdentificationType;
    this.lines = [];
    //his.typesInvoice = TypeInvoice;
    this.isAllowedPriceListChange = false;
    this.isAllowedGoodReceipt = false;
    this.currentUser = JSON.parse(this.storage.getSession(navigator.onLine));
    this.invForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      PayTerms: ['', Validators.required],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      paymentType: [''],
      Comment: '',
    });

    this.invForm.patchValue({ paymentType: this.paymentTypes[0].id });
    //this.invForm.patchValue({ DocumentType: this.typesInvoice[0].Name });

    this.mDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    // this.GetConfiguredUdfs();


    this.createFEForm();
    this.getMaxDiscout();

    this.GetParamsViewList();

    //this.GetCurrencyType();
    this.getExchangeRate();
    this.getExRate();
    this.GetPriceList();

    this.getItems();
    this.getTaxes();
    this.getAccount();
    this.getCards();
    this.getAccountsBank();
    this.getCompanies();
    this.generateUniqueInvoiceId();
    this.setSalesPerson();
    this.setWarehouseInfo();


    this.Cant.setValue(1);
    this.correctInvoice = false;
    this.InvoicesInMemoryAccepted = 5;


  }



  ngOnInit() {
    this.initVarialbles();

    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {

        this.typesInvoice = next.InvoiceTypes;
        this.invForm.patchValue({
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
    // this.jsonDataService.getJSONInvoiceType()
    //   .subscribe((data: any) => {
    //     this.typesInvoice = data
    //   });

    this.invoiceType = this.storageService.GetDefaultInvoiceType();
    this.invForm.patchValue({ DocumentType: this.invoiceType });

    this.hasIdentification = false;
    this.isOnPrint = false;
    this.currentRequest = 0;
    this.requestToAwait = 2;
    this.InvalidCardName = false;
    const DOC_ENTRY = this.storage.GetDocEntry();
    this.typeArrow = false;
    if (DOC_ENTRY > 0) {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.GetCustomerData()).CardCode;
    } else {
      this.DEFAULT_BUSINESS_PARTNER = this.storage.GetDefaultBussinesPartner();

    }

    this.onlineEvent = fromEvent(window, 'online');
    this.offlineEvent = fromEvent(window, 'offline');
    this.subscriptionsf.push(this.onlineEvent.subscribe(async e => {
    }));

    this.subscriptionsf.push(this.offlineEvent.subscribe(e => {
    }));

    this.companyService.GetViewGroupList().subscribe(next => {
      if (next.result) {
        ((next.ViewGroupList) as IViewGroup[]).forEach(x => {
          if (x.CodNum === 3) this.isOnGroupLine = x.isGroup;//Facturación
          if (x.CodNum === 3) this.isLineMode = x.LineMode; //Orden de lineas al inicio o final
        });
      }
    });

    this.isOnOrderMode = DOC_ENTRY > 0;
    if (DOC_ENTRY > 0) {
      this.memoryInvoiceService.ShowInvoices.next(false);

      this.subscriptions = this.$requestViewer.subscribe(next => {
        if (next === this.requestToAwait) {
          switch (Number(localStorage.getItem("SOAndSQAction"))) {
            case SOAndSQActions.EditOrder: {

              this.invForm.controls['cardName'].disable();
              this.invForm.controls['cardCode'].disable();
              //this.GetSaleOrder(DOC_ENTRY);
              break;
            }
            case SOAndSQActions.CopyToInvoice: {
              this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);

              setTimeout(() => {
                this.getBaseLines(DOC_ENTRY);
              }, 500);

              break;
            }
          }
        }
      });
    }
    else {
      this.memoryInvoiceService.ShowInvoices.next(true);
      this.GetConfiguredUdfs(DOCUMENT_ALIAS.INVOICE);
      this.GetConfiguredUdfsOIGN(DOCUMENT_ALIAS.GOODSRECEIPT);


      this.GetMemoryInvoiceSettings();

      this.AfterDeleteMemoryInvoice();
    }


    // const DATE = new Date();

    // if(!this.storageService.getConnectionType){
    const STATUS = {
      documentInformationSync: true,
      connectionType: true
    };
    this.commonService.offlineInformationPending.next(STATUS);
    // }



  }


  ngAfterViewInit() { }

  getBPFEData() {
    if (Number(this.invForm.controls.PayTerms.value) === PayTermsEnum.A30Dias) {
      this.blockUI.start('Obteniendo datos FE...');
      this.bpService.GetCustomersCred(this.invForm.controls.cardCode.value).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.result) {

          this.getProvincesPatch(data);
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error getTaxes!!!, error: ${error.error.Message}`);
      });
    }
    // borra los datos de FE si existieran cuando se pasa a contado
    else {
      this.feForm.patchValue({ IdType: '00' });
      this.feForm.get('Identification').setValidators([]); // or clearValidators()
      this.feForm.get('Identification').updateValueAndValidity();
      this.feForm.patchValue({ Identification: '' });
      this.feForm.patchValue({ Email: '' });
      this.feForm.get('Email').setValidators([]); // or clearValidators()
      this.feForm.get('Email').updateValueAndValidity();
    }
  }
  // obtiene la informacion de factura electronica cuando se introducen ciertos datos preliminares de factura de contado
  queryFEData() {
    if (this._timeout) {
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(() => {
      this._timeout = null;
      if (Number(this.invForm.controls.PayTerms.value) === PayTermsEnum.Contado && this.feForm.controls.IdType.value !== "") {
        this.blockUI.start('Obteniendo datos FE...');
        this.bpService.GetCustomersCont(this.feForm.controls.IdType.value, this.feForm.controls.Identification.value).subscribe((data: any) => {
          this.blockUI.stop();
          if (data.result) {
            this.feForm.patchValue({ Email: data.FEInfo.Email });
            this.feForm.patchValue({ Direccion: data.FEInfo.Direccion });
            let provid = '01';
            let provname = this.provinceList[0].ProvinceName;
            this.provinceList.forEach(prov => {
              if (prov.ProvinceName.toUpperCase() === data.FEInfo.Provincia.toUpperCase()) {
                provid = prov.ProvinceId;
                provname = prov.ProvinceName;
              }
            });
            this.feForm.patchValue({ Provincia: Number(provid).toString() });
            this.nombreProvincia = provname;
            this.getCantonsPatch(provid, data.FEInfo.Canton, data.FEInfo.Distrito, data.FEInfo.Barrio);
          }
        }, (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error getTaxes!!!, error: ${error.error.Message}`);
        });
      }
    }, 2000);
  }

  queryFEData2() {
    let paymentTerm = this.PayTermsList.find(x => x.GroupNum === Number(this.invForm.controls.PayTerms.value));


    if (paymentTerm.Type === PayTermsEnum.Contado && this.feForm.controls.IdType.value !== "") {
      this.blockUI.start('Obteniendo datos FE...');
      this.bpService.GetCustomersCont(this.feForm.controls.IdType.value, this.feForm.controls.Identification.value).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.result) {
          this.invForm.patchValue({ cardName: data.FEInfo.CardName });
          this.feForm.patchValue({ Email: data.FEInfo.Email });
          // this.feForm.patchValue({ Direccion: data.FEInfo.Direccion });
          // let ProvinciaObj = data.FEInfo.Provincia.split("-");
          // let ProvinciaId = ProvinciaObj[0];
          // switch (ProvinciaId) {
          //   case "01": {
          //     ProvinciaId = "1";
          //     break;
          //   }
          //   case "02": {
          //     ProvinciaId = "2";
          //     break;
          //   }
          //   case "03": {
          //     ProvinciaId = "3";
          //     break;
          //   }
          //   case "04": {
          //     ProvinciaId = "4";
          //     break;
          //   }
          //   case "05": {
          //     ProvinciaId = "5";
          //     break;
          //   }
          //   case "06": {
          //     ProvinciaId = "6";
          //     break;
          //   }
          //   case "07": {
          //     ProvinciaId = "7";
          //     break;
          //   }
          //   default: {
          //     ProvinciaId = "99";
          //     break;
          //   }
          // }
          // let provid = ProvinciaId;
          // let provname = this.provinceList[0].ProvinceName;
          // this.provinceList.forEach(prov => {
          //   if (prov.ProvinceName.toUpperCase() === data.FEInfo.Provincia.toUpperCase()) { //data.FEInfo.Provincia
          //     provid = prov.ProvinceId;
          //     provname = prov.ProvinceName;
          //   }
          // });

          // this.nombreProvincia = provname;
          // this.feForm.patchValue({ Provincia: Number(provid).toString() });  //data.FEInfo.Provincia
          // let BarrioObj = data.FEInfo.Barrio.split("-");
          // let CantonObj = data.FEInfo.Canton.split("-");
          // let DistritoObj = data.FEInfo.Distrito.split("-");
          // let Barrio = BarrioObj[1];
          // let Canton = CantonObj[1];
          // let Distrito = DistritoObj[1];
          // this.getCantonsPatch(provid, Canton, Distrito, Barrio);
        }
        else {
          // busca info del cliente en el padron
          this.blockUI.stop();
          this.blockUI.start('Obteniendo datos del padrón...');
          if (this.feForm.controls.Identification.value != '') {
            this.bpService.GetCustomersContPadron(this.feForm.controls.Identification.value).subscribe((data: any) => {
              this.blockUI.stop();
              if (data.Result.result) {
                this.invForm.patchValue({ cardName: data.Result.CardName });
              }
            }, (error: any) => {
              this.blockUI.stop();
              this.alertService.errorInfoAlert(`Error Padrón!!!, error: ${error.error.Message}`);
            });
          }
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error Obteniendo datos FE!!!, error: ${error.error.Message}`);
      });
    }
  }
  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {
    if (this.currentUser != null) {
      this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.result) {
          let permListtable: any = data.perms;
          data.perms.forEach(Perm => {

            if (Perm.Name === "V_Inv") {
              this.permisos = Perm.Active;

              if (this.permisos) {
                // this.nameField.nativeElement.focus();
              }
            }
            if (Perm.Name === 'V_LstChng') this.isAllowedPriceListChange = Perm.Active;
            if (Perm.Name === 'V_WHChng') this.isAllowedWHChange = Perm.Active;
            if (Perm.Name === 'V_Inv_OIGN') this.isAllowedGoodReceipt = Perm.Active;
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

  // establece la persona que es el vendedor
  setSalesPerson() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.uService.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.result) {
        this.userAssignsList = data.Users;
        this.userAssignsList.forEach(user => {
          if (this.currentUser.userId === user.UserId) {
            this.defaultSlpCode = user.SlpCode;
            this.defaultSlpCodeStr = user.SlpCode;
            this.invForm.patchValue({ SlpList: user.SlpCode });
          }
        });
        this.GetSalesPersonList();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.errorInfo.Message);
      }
    }, error => {
      console.log(error);
      this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + error);
    });
  }

  addCommas(num) {
    let str = num.toString().split(".");
    if (str[0].length >= 4) {
      //add comma every 3 digits befor decimal
      str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
    }
    return str.join('.');
  }
  summarize(_line: any): void {
    let isFound = false;
    this.itemsList.forEach(x => {
      if (x.item === _line.item) {
        x.Quantity = x.Quantity + 1;
        this.cant = x.Quantity;
        isFound = true;
      }
    });

    if (!isFound) this.isLineMode ? this.itemsList.push(_line) : this.itemsList.unshift(_line)
  }

  cant: number;
  addItems(item, _isManualOverride = false) {
    if (this.ItemInfo.value) {
      let code = `harcodedCode`;
      let mobileNavigatorObject: any = window.navigator;
      if (_isManualOverride) {
        if (this.searchTypeManual) {
          this.ItemInfo.setValue('');
          this.Cant.setValue(1);
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
            this.nameField.nativeElement.focus();
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
            const priceList = this.invForm.get('PriceList').value;

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

            this.itemService.GetItemByItemCode(code, priceList, this.invForm.controls.cardCode.value) // TO AVOID BREAK ON GETITEMINFO
              .subscribe((data: any) => {
                this.isProcessing = false;
                this.searchTypeManual = false;
                if (data.result) {
                  if (searchitem) {
                    this.conta++;
                    this.total += data.Item.UnitPrice;
                    let tot = (data.Item.UnitPrice * this.cant);
                    this.invForm.patchValue({ currency: this.userCurrency });
                    let AUXILIAR_ITEM = {
                      'Item': `${code}`,
                      'ItemCode': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
                      'ItemName': `${data.Item.ItemName}`,
                      'CodeName': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
                      'UnitPrice': this.userCurrency === 'COL' ? data.Item.UnitPrice : (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toString())),
                      'LastPurchasePrice': `${data.Item.LastPurchasePrice}`,
                      'U_SugPrice': '0',
                      'TaxCode': data.Item.TaxRate != 0.0 ? data.Item.TaxCode : 'EXE',
                      'Quantity': this.cant,
                      'Active': true,
                      'Id': this.conta,
                      'LinTot': tot,
                      'TaxRate': data.Item.TaxRate != 0.0 ? data.Item.TaxRate : 0.00,
                      'Discount': data.Item.Discount,
                      'WhsCode': this.whCode,
                      'WhsName': this.whName,
                      'Serie': '',
                      'SysNumber': 0,
                      'InvntItem': data.Item.InvntItem,
                      'OnHand': data.Item.OnHand,

                    };

                    AUXILIAR_ITEM.UnitPrice = AUXILIAR_ITEM.UnitPrice.toFixed(this.COMPANY.DecimalAmountPrice);

                    if (this.userCurrency != 'COL' && this.userCurrency != 'USD') {
                      AUXILIAR_ITEM.Quantity = 1;
                      AUXILIAR_ITEM.LinTot = 0;
                      AUXILIAR_ITEM.UnitPrice = 0;
                      this.storage.setLog(`ERROR!, fecha: ${new Date()} ---(${this.invForm.controls.currency.value})`);
                    }

                    this.isLineMode ? this.itemsList.push(AUXILIAR_ITEM) : this.itemsList.unshift(AUXILIAR_ITEM)

                    this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0)
                    this.getTotals();
                  }

                  this.Cant.setValue(1);
                  this.ItemInfo.setValue('');

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

                  //if (_isManualTrigger)
                  (<HTMLElement>document.getElementById('helperClick')).click();
                  this.itemService.GetWHAvailableItem(code)
                    .subscribe((data: any) => {
                      if (data.result) {
                        let available: boolean = false;
                        let cantAvailable: number = 0;
                        index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
                        data.whInfo.forEach(wh => {
                          if (wh.InvntItem === "Y") {
                            available = true;
                          }
                          cantAvailable = wh.Disponible;
                          // if (wh.Disponible >= this.cant) {
                          //   available = true;
                          // }


                        });
                        this.itemsList[index].available = cantAvailable;
                        if (cantAvailable < cantsingroupLine && available) {
                          this.alertService.infoInfoAlert(`Sin stock, solicitud de ${cantsingroupLine}, disponible:${cantAvailable} `);
                        }
                        // Si hay en stock 5 e ingreso 6 me indica no posee disponible
                        // if (!available) {
                        //   // index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
                        //   if (index !== -1) {
                        //     this.itemsList[index].Quantity = 0;
                        //     this.itemsList[index].LinTot = 0;
                        //     searchitem = false;
                        //     this.LineTotalCalculate(index)
                        //     this.getTotals();
                        //   }
                        //   this.blockUI.stop();   
                        //   this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
                        // }
                        this.blockUI.stop();
                      } else {
                        this.blockUI.stop();
                        this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
                      }

                    }, (error: any) => {
                      this.blockUI.stop();
                      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
                    });

                } else {
                  this.blockUI.stop();
                  this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
                }
                this.blockUI.stop();
              }, (error: any) => {
                this.isProcessing = false;
                this.searchTypeManual = false;
                this.blockUI.stop();
                this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
              });


          })
          .catch(err => {
            this.isProcessing = false;
            this.searchTypeManual = false;
            this.blockUI.stop();
            // console.error('Failed to read clipboard contents: ', err);
          });
      }
    }
  }




  cantChange() {
    if (this.Cant.value < 1) {
      this.Cant.setValue(1);
    }
  }




  recoveringLocalCredentials(message: string): void {

    this.blockUI.start(message);
    setTimeout(() => {
      const _SESSION = JSON.parse(this.storage.getCurrentSession());
      if (_SESSION !== null) {
        if (_SESSION['access_token'] !== null) {
          // console.log(_SESSION);
          this.authenticationService.authPinPadCredentials(_SESSION.UserName, _SESSION.Password)
            .subscribe(
              next => {
                this.blockUI.stop();
                if (next && next.access_token) {
                  this.storage.setCurrentSessionOffline(next);
                  this.alertService.infoInfoAlert('Servicios de integración con datáfonos obtenidos, vuelva a realizar el cobro. Gracias');
                }
                else {
                  this.alertService.errorInfoAlert('No se pudieron obtener servicios de integración con datáfonos');
                }
                this.blockUI.stop();
              }, error => {
                this.alertService.errorAlert(`No se pudo conectar con el servidor local, error: ${error}`);
                console.log(error);
                this.blockUI.stop();
              }, () => {
                this.blockUI.stop();
              });
        }
      }
      else {
        this.blockUI.stop();
        this.alertService.errorAlert(`Error al procesar la tarjeta: No se ha podico conectar con el servidor local`);
      }
    }, 2500);
  }
  // obtiene el tipo de cambio
  getExRate() {
    this.blockUI.start('Obteniendo tipos de cambios, espere Por Favor...');
    this.exrate.getExchangeRate().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.result) {
        this.DailyExRate = data.exRate
        this.currentRequest++;
        this.$requestViewer.next(this.currentRequest);
        //this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
      } else {
        this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
      }

    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error getCustomers!!!, error: ${error.error.Message}`);

    });
  }

  // obtiene el maximo descuento posible
  getMaxDiscout() {
    this.documentService.getMaxDiscout().subscribe((data: any) => {
      if (data.result) {
        this.currentRequest++;
        this.maxDiscuont = data.discount;
        this.$requestViewer.next(this.currentRequest);
      }
      else {
        this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
      }
    }, (error: any) => {
      this.alertService.errorInfoAlert(`Error getCustomers!!!, error: ${error.error.Message}`);
    });

  }

  expandRow(index: number): void {
    this.expandedIndex = index === this.expandedIndex ? -1 : index;
  }
  createFEForm() {
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

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    this.currentUserSubscription.unsubscribe();
    this.storage.SaveDocEntry(-1);
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

  // *****Parte de fecuturacion*****/

  // funcion para obtener los clientes desde SAP
  // no recibe parametros
  getCustomers() {
    this.blockUI.start('Obteniendo clientes, espere por favor...');
    this.bpService.GetCustomers()
      .subscribe((data: any) => {
        // console.log(data.Code != null && data.Code == '404');
        if (data && data.Code === undefined && data.BPS != null) {
          this.bpList.length = 0;
          this.bpCodeList.length = 0;
          this.bpNameList.length = 0;
          this.bpList = data.BPS;

          for (let item of data.BPS) {
            // console.log(item);
            this.defaultGroupNum = item.GroupNum;

            if (item.ClienteContado) this.defaultContado = "Contado";
            else this.defaultContado = "Credito";
            this.bpCodeList.push(item.CardCode);
            this.bpNameList.push(item.CardName);
          }
          this.GetCurrencyType();
          this.GetPayTerms();
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  // funcion para obtener los items desde SAP
  // no recibe parametros
  getItems() {
    this.blockUI.start('Obteniendo ítems, espere por Ffavor...');
    this.itemService.GetItems()
      .subscribe((data: any) => {
        if (data.result) {

          /*
              this.itemsList.push({
                'Item': '',
                'ItemCode': '',
                'ItemName': '',
                'UnitPrice': '0',
                'TaxCode': 'EXE',
                'Quantity': '1',
                'Active': true,
                'Id': this.conta,
                'LinTot': 0,
                'TaxRate': 0.00,
                'Discount': 0,
                'WhsCode': '01',
                'WhsName': 'Almacen Prueba',
                'Serie': '',
                'SysNumber': 0
              });
          */
          this.itemsTypeaheadList = data.ItemList.ItemCompleteName;
          this.itemsCodeList = data.ItemList.ItemCode;
          this.itemsNameList = data.ItemList.ItemName;
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);

        }
      }, (error: any) => {
        this.blockUI.stop();
        // console.log('error');
        // console.log(error);
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  // funcion para obtener los impuestos desde SAP
  // no recibe parametros

  getTaxes() {
    this.blockUI.start('Obteniendo impuestos, espere por favor...');
    this.taxService.GetTaxes()
      .subscribe((data: any) => {
        if (data.result) {
          this.taxesList.length = 0;
          this.taxesList = data.Taxes;
          // this.taxesList.push({
          //   "TaxCode": 'EXE',
          //   "TaxRate": '0.00'
          // })
        } else {
        }
        this.blockUI.stop();
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error getTaxes!!!, error: ${error.error.Message}`);
      });
  }

  // funcion para obtener los clientes desde SAP
  // recibe como parametros el item y el index
  selectedItem(item, idx) {
    if (item.item !== "") {
      // console.log(item);
      // console.log(idx);
      this.blockUI.start('Obteniendo información del artículo, espere por favor...');
      this.itemService.GetItemByItemCode(item.item.split(' COD. ')[0], this.invForm.controls.PriceList.value, this.invForm.controls.cardCode.value)
        .subscribe((data: any) => {
          // console.log(data);
          if (data.result) {
            this.itemsList[idx].ItemCode = data.Item.ItemCode;
            this.itemsList[idx].ItemName = data.Item.ItemName;
            this.itemsList[idx].Item = `${data.Item.ItemCode} - ${data.Item.ItemName}`;
            this.itemsList[idx].UnitPrice = data.Item.UnitPrice;
            this.itemsList[idx].U_SugPrice = data.Item.UnitPrice;
            this.itemsList[idx].TaxCode = data.Item.TaxCode;
            this.itemsList[idx].Discount = data.Item.Discount;
            this.itemsList[idx].TaxRate = data.Item.TaxRate;
            this.itemsList[idx].LinTot = parseFloat(data.Item.UnitPrice);
            this.itemsList[idx].Active = false;
            this.conta++;
            this.total += data.Item.UnitPrice;
            this.itemsList.push({
              'Item': '',
              'ItemCode': '',
              'ItemName': '',
              'UnitPrice': '0',
              'TaxCode': 'EXE',
              'Quantity': '1',
              'Active': true,
              'Id': this.conta,
              'LinTot': 0,
              'TaxRate': 0.00,
              'Discount': 0,
              'WhsCode': this.whCode,
              'WhsName': this.whName,
              'Serie': '',
              'SysNumber': 0
            });
            this.getTotals();
          } else {
            this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
          }
          this.blockUI.stop();
        }, (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
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

  getClipboardData() {

    let mobileNavigatorObject: any = window.navigator;
    if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
      mobileNavigatorObject.clipboard.readText()
        .then(text => {
          this.Cant.setValue(Number(text));
          //this.invForm.patchValue({cardName: cardName});
          // console.log('Pasted content: ', text);
          mobileNavigatorObject.clipboard.writeText("0")
            .then(text => {
              //this.Cant.setValue(Number(text));
              //this.invForm.patchValue({cardName: cardName});
              // console.log('Clipboard cleared ');
            })
            .catch(err => {
              // console.error('Failed to clear clipboard contents: ', err);
            });
        })
        .catch(err => {
          // console.error('Failed to read clipboard contents: ', err);
        });
    }

  }

  // convenience getter for easy access to form fields
  get f() {
    return this.invForm.controls;
  }
  get fe() {
    return this.feForm.controls;
  }
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

  // funcion para detectar el cambio en el input de Código
  // recibe como parametro el Código del item
  changeCode(code) {
    if (code != null) {
      let cardCode = this.bpCodeList.filter(
        (book) => book.toLowerCase() === code.toLowerCase()
      );
      if (cardCode.length > 0) {
        this.setDefaultList(cardCode[0]);
        // tslint:disable-next-line:no-shadowed-variable
        let code = cardCode[0];
        let codePos = this.bpCodeList.indexOf(code);
        let cardName = this.bpNameList[codePos];

        let customer = this.bpList.filter(cus => {
          return cus.CardCode === code;
        });
        this.getCurrencyByUser(customer[0].Currency);

        // tslint:disable-next-line:no-unused-expression
        if (cardName !== this.invForm.get('cardName').value) {
          this.invForm.patchValue({ cardName: cardName });
        }

        if (this.itemsList.length > 0) this.SetupRecalculate();
        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;


            const DOC_ENTRY = this.storage.GetDocEntry();
            if (DOC_ENTRY === -1) {
              this.invForm.patchValue({ PayTerms: item.GroupNum.toString() });
            }
          }
        }
        for (let item of this.PriceList) {
          if (item.ListNum.toString() === customer[0].ListNum.toString()) {
            //this.defaultListNum = item.ListNum;
            //this.invForm.patchValue({PriceList: customer[0].ListNum});
          }
        }
        let nombre = "Contado";
        this.defaultContado = "Contado";
        if (customer[0].ClienteContado === false) {
          nombre = "A30Dias";
          this.defaultContado = "A30Dias";
        }

        for (let item of this.paymentTypes) {
          if (nombre === item.name.toString()) {
            this.invForm.patchValue({ paymentType: item.id });
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
    const PRICE_LIST = this.invForm.get('PriceList').value;
    this.itemService.GetItemByItemCode(ITEM.Item, PRICE_LIST, this.invForm.controls.cardCode.value)
      .subscribe((data: any) => {
        if (data.result) {
          this.total += ITEM.UnitPrice;


          // let tot = this.soForm.get("currency").value === "COL" ? (ITEM.UnitPrice * ITEM.Quantity) : (ITEM.Quantity * (parseFloat(Number(ITEM.UnitPrice / this.DailyExRate).toFixed(2))));

          this.itemsList[ITEM_INDEX].Discount = data.Item.Discount;

          this.LineTotalCalculateExt(_itemsList.length - 1);
          this.getTotals();
          _itemsList.pop();
          this.PollItemsData(_itemsList);
        } else {
          this.PollItemsData([]);
          this.alertService.errorAlert(`Error no se pudo recalcular los precios, motivo: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }
      }, (error: any) => {
        this.PollItemsData([]);
        this.alertService.errorInfoAlert(`Error no se pudo recalcular los precios, motivo: ${error}`);
      });
  }







  // funcion para detectar el cambio en el input de descripcion
  // recibe como parametro la descripcion del item
  changeDescription(description) {
    if (description != null) {
      let itemDescription = this.bpNameList.filter(
        (book) => book.toLowerCase() === description.toLowerCase()
      );
      if (itemDescription.length > 0) {
        // tslint:disable-next-line:no-shadowed-variable
        let description = itemDescription[0];
        let descriptionPos = this.bpNameList.indexOf(description);
        let cardCode = this.bpCodeList[descriptionPos];

        let customer = this.bpList.filter((cus: any) => {
          return cus.CardCode === cardCode;
        });
        this.getCurrencyByUser(customer[0].Currency);

        if (cardCode !== this.invForm.get('cardCode').value) {
          this.invForm.patchValue({ cardCode: cardCode });
        }
        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;


            const DOC_ENTRY = this.storage.GetDocEntry();
            if (DOC_ENTRY === -1) {
              this.invForm.patchValue({ PayTerms: item.GroupNum.toString() });
            }
          }
        }
        let nombre = "Contado";
        this.defaultContado = "Contado";
        if (customer[0].ClienteContado === false) {
          nombre = "A30Dias";
          this.defaultContado = "A30Dias";
        }
        for (let item of this.paymentTypes) {
          if (nombre === item.name.toString()) {
            this.invForm.patchValue({ paymentType: item.id });
          }
        }
      }
    }
  }

  // funcion para calcular los totales de la SO
  // no recibe parametros
  //Calculo de totales metodo original
  // getTotals_ORIGINAL() {
  //   this.total = 0;
  //   this.totalUSD = 0;
  //   this.tax = 0;
  //   this.discount = 0;
  //   this.totalWithoutTax = 0;
  //   this.itemsList.forEach((element) => {
  //    
  //     const lintot = parseFloat(
  //       (element.UnitPrice * element.Quantity).toString()
  //     );
  //     const disc = parseFloat(
  //       Number(lintot * (element.Discount / 100)).toString()
  //     );
  //     this.discount = parseFloat(Number(disc + this.discount).toString());
  //     this.totalWithoutTax = parseFloat(Number((lintot - disc) + this.totalWithoutTax).toString());
  //     this.tax = parseFloat(Number(((lintot - disc) * (element.TaxRate / 100)) + this.tax).toString());

  //     this.discount = +this.discount.toFixed(this.COMPANY.DecimalAmountTotalDocument);
  //     this.totalWithoutTax = +this.totalWithoutTax.toFixed(this.COMPANY.DecimalAmountTotalDocument);
  //   });

  //   this.tax = +this.tax.toFixed(this.COMPANY.DecimalAmountTotalDocument);

  //   const MOBJECT = this.saleOrder;

  //   if (MOBJECT) {
  //     if (MOBJECT.Currency == 'COL') {
  //       this.total = (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
  //       this.totalUSD = parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
  //     }
  //     else {
  //       this.total = (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
  //       this.totalUSD = parseFloat(Number(this.totalWithoutTax + this.tax).toString());
  //     }
  //   }
  //   else if (this.invForm.value.currency) {
  //     if (this.invForm.value.currency == 'COL') {
  //       this.total = (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
  //       this.totalUSD = parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
  //     }
  //     else {
  //       this.total = (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
  //       this.totalUSD = parseFloat(Number(this.totalWithoutTax + this.tax).toString());
  //     }
  //   }


  //   // this.total = Math.floor(this.total);// +this.total.toFixed(this.COMPANY.DecimalAmountTotalDocument);
  //   // this.totalUSD = Math.floor(this.totalUSD);//+this.totalUSD.toFixed(this.COMPANY.DecimalAmountTotalDocument);
  // }

  //Calculo de totales basado en ERA
  getTotals(): void {
    this.total = 0;
    this.discount = 0;
    this.tax = 0;
    this.totalWithoutTax = 0;

    // Recorre toda la lista de items agregados a facturar.
    this.itemsList.forEach(x => {
      const FIRST_SUBTOTAL = (x.Quantity * x.UnitPrice);
      const LINE_DISCOUNT = FIRST_SUBTOTAL * (x.Discount / 100);
      //const SUBTOTAL_WITH_LINE_DISCOUNT = Math.round(((FIRST_SUBTOTAL - LINE_DISCOUNT) + Number.EPSILON) * 100) / 100;
      const SUBTOTAL_WITH_LINE_DISCOUNT = (FIRST_SUBTOTAL - LINE_DISCOUNT);
      // const HEADER_DISCOUNT = 0;

      // const TOTAL_HEADER_DISCOUNT = (SUBTOTAL_WITH_LINE_DISCOUNT * HEADER_DISCOUNT);

      // const SUBTOTAL_WITH_HEADER_DISCOUNT = SUBTOTAL_WITH_LINE_DISCOUNT - TOTAL_HEADER_DISCOUNT;

      const CURRENT_TAX_RATE = x.TaxRate / 100;

      // const TOTAL_TAX = Math.round(((SUBTOTAL_WITH_HEADER_DISCOUNT * CURRENT_TAX_RATE) + Number.EPSILON) * 100) / 100;

      // this.totalWithoutTax += Math.round((SUBTOTAL_WITH_HEADER_DISCOUNT * (+!x.TaxOnly) + Number.EPSILON) * 100) / 100;

      const TOTAL_TAX = Math.round(((SUBTOTAL_WITH_LINE_DISCOUNT * CURRENT_TAX_RATE) + Number.EPSILON) * 100) / 100;

      //this.totalWithoutTax += Math.round((SUBTOTAL_WITH_LINE_DISCOUNT * (+!x.TaxOnly) + Number.EPSILON) * 100) / 100;

      if (x.TaxOnly) {
        this.totalWithoutTax += 0;
      } else {
        this.totalWithoutTax += Math.round((SUBTOTAL_WITH_LINE_DISCOUNT + Number.EPSILON) * 100) / 100;
      }
      this.discount += LINE_DISCOUNT;

      this.tax += TOTAL_TAX;

    });


    //this.tax = Math.round(((this.tax) + Number.EPSILON) * 100) / 100;

    //this.tax = this.roundToTwo(this.tax);

    // this.totalWithoutTax = this.roundToTwo(this.totalWithoutTax);



    const MOBJECT = this.saleOrder;

    if (MOBJECT) {
      if (MOBJECT.DocCurrency == 'COL') {
        this.total = (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
        this.totalUSD = parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
      }
      else {
        this.total = (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
        this.totalUSD = parseFloat(Number(this.totalWithoutTax + this.tax).toString());
      }
    }
    else if (this.invForm.value.currency) {
      if (this.invForm.value.currency == 'COL') {
        this.total = (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
        this.totalUSD = parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
      }
      else {
        this.total = (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
        this.totalUSD = parseFloat(Number(this.totalWithoutTax + this.tax).toString());
      }
    }
  }



  // funcion al cambiar el tipo de taxcode
  // recibe como parametro el taxxode y el indice de la lista




  changeTaxCode(i: number, item: any) {
    const rate = this.taxesList.find(i => i.TaxCode === item.TaxCode.toUpperCase());
    //const index =( this.itemsList.length - 1) - idx ;
    //const idx: number = this.itemsList.indexOf(this.itemsList.find(x => x.ItemCode == item.ItemCode));
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
    if (this.itemsList[idx].Discount <= this.maxDiscuont) {
      disc = this.itemsList[idx].Discount;
    }
    else {
      disc = this.maxDiscuont;
      this.alertService.infoInfoAlert('El descuento no puede ser mayor a ' + this.maxDiscuont + ' que es lo permitido para este usuario');
      this.itemsList[idx].Discount = this.maxDiscuont;
    }
    if (this.itemsList[idx].Discount == null) { this.itemsList[idx].Discount = 0; }

    const qty = this.itemsList[idx].Quantity;
    const price = this.itemsList[idx].UnitPrice;
    let lineTotal = Number((qty * price).toString());
    const taxamount = Number(
      (lineTotal * (this.itemsList[idx].TaxRate / 100)).toString()
    );
    lineTotal = Number((lineTotal + taxamount).toString());
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toString());
    this.itemsList[idx].LinTot = lineTotal.toString();
    this.getTotals();
    // console.log(13);
  }

  LineTotalCalculateExt(idx: number) {
    // idx = this.itemsList.length - idx - 1;
    let disc = 0;
    if (this.itemsList[idx].Discount <= this.maxDiscuont) {
      disc = this.itemsList[idx].Discount;
    }
    else {
      disc = this.maxDiscuont;
      this.alertService.infoInfoAlert('El descuento no puede ser mayor a ' + this.maxDiscuont + ' que es lo permitido para este usuario');
      this.itemsList[idx].Discount = this.maxDiscuont;
    }
    if (this.itemsList[idx].Discount == null) { this.itemsList[idx].Discount = 0; }
    const qty = this.itemsList[idx].Quantity;
    const price = this.itemsList[idx].UnitPrice;
    let lineTotal = Number((qty * price).toString());
    const taxamount = Number(
      (lineTotal * (this.itemsList[idx].TaxRate / 100)).toString()
    );
    lineTotal = Number((lineTotal + taxamount).toString());
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toString());
    this.itemsList[idx].LinTot = lineTotal.toString();
    this.getTotals();
    // console.log(13);
  }

  // funcion para imprimir la factura
  printARInvoice(DocEntry: number, _ppCards: number) {
    this.blockUI.start('Generando la impresión...');

    if (_ppCards > 0) {
      // && (+this.pPTransaction.Amount.toString().slice(0, -2) > this.pPTransaction.QuickPayAmount) && (this.pPTransaction.EntryMode.includes('CLC') || this.pPTransaction.EntryMode.includes('CHP'))

      const RIGHT_SIDE = +this.pPTransaction.Amount.toString().slice(0, -2);
      const LEFT_SIDE = +`0.${this.pPTransaction.Amount.toString().slice(-2, this.pPTransaction.Amount.toString().length)}`;

      const IS_QUICK_PAY = (RIGHT_SIDE + LEFT_SIDE <= this.pPTransaction.QuickPayAmount)
        && (this.pPTransaction.EntryMode.includes('CLC') || this.pPTransaction.EntryMode.includes('CHP'));

      const MOBJECT = JSON.parse(this.pinPadCards[0].StringedResponse).EMVStreamResponse.printTags.string;
      console.log(MOBJECT);
      let printTags = '';
      for (let c = 0; c < MOBJECT.length; c++) {
        printTags += (MOBJECT[c] + ',');
      }
      printTags = printTags.slice(0, -1);
      const I_PP_TRANSACTION = {
        TerminalCode: this.terminals[0].TerminalId,
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
        .subscribe((data: any) => {
          this.blockUI.stop();

          if (this.electronRendererService.CheckElectron()) {

            let fileName = 'Invoice_' + DocEntry + '.pdf';


            const PRINTERCONFIGURATION = JSON.parse(this.storage.getCompanyConfiguration().PrinterConfiguration) as IPrinter;
            let file = {
              "fileName": fileName,
              "file": data,
              "defaultPrinter": PRINTERCONFIGURATION.DisplayName
            };

            this.electronRendererService.send('Print', file);
          }
          else {
            printJS({
              printable: data,
              type: 'pdf',
              base64: true
            });
          }
        }, (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
    }
  }

  // ***** Modal de Items para compañias
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

  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.blockUI.start('Obteniendo parámetros...');
    this.paramsService.getParasmView()
      .subscribe((data: any) => {

        if (data.result) {
          this.viewParamList = data.Params.filter(param => {
            return param.type === 1 && param.Visibility;
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
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data.errorInfo.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
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
            if (data.result) {

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
              this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
            }
            this.blockUI.stop();
          }, (error: any) => {
            this.blockUI.stop();
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
          });
      }

    }
  }

  //chequea si hay existencias del item a agregar
  CheckAvailableItem(ItemCode) {
    if (ItemCode !== '') {
      this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor...');
      this.itemService.GetWHAvailableItem(ItemCode)
        .subscribe((data: any) => {
          // console.log(data);
          if (data.result) {
            this.WHAvailableItemList.length = 0;
            this.itemCode = ItemCode;
            this.WHAvailableItemList = data.whInfo;
            if (data.whInfo.length <= 0) {
              this.blockUI.stop();
              this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
            }
            this.blockUI.stop();
          } else {
            this.blockUI.stop();
            this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
          }

        }, (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
    }
  }

  // funcion para seleccionar un almacen nuevo para el item a facturar
  avaItemSelected(event, avaItem, idx: number) {

    if (event.type === 'dblclick') {
      if (!this.isAllowedWHChange) {
        this.alertService.infoInfoAlert(`No tiene permiso para cambiar el almacén`);
        return;
      }

      this.itemsList[this.indexAvaItem].WhsCode = avaItem.WhsCode;
      this.itemsList[this.indexAvaItem].WhsName = avaItem.WhsName;
      this.itemsList[this.indexAvaItem].Serie = "";
      this.itemsList[this.indexAvaItem].SysNumber = 0;
      this.close();
    }
    //  else if (event.type === 'click') {
    //   this.itemService.GetSeriesByItem(this.itemCode, avaItem.WhsCode).subscribe((data: any) => {
    //     if (data.result) {
    //       this.seriesList.length = 0;
    //       this.seriesList = data.series;
    //       if (data.series.length > 0) {
    //         this.expandRow(idx);
    //       } else {
    //       }
    //       this.blockUI.stop();
    //     }
    //   },
    //     (error: any) => {
    //       this.blockUI.stop();
    //       this.alertService.errorInfoAlert(
    //         `Error al intentar conectar con el servidor, Error: ${error}`
    //       );
    //     }
    //   );
    // }
  }

  // funcion para cerrar la modal para escoger la terminal y sucursal
  close() {
    this.modalReference.close();
  }

  // funcion para selecccionar una seria
  // recibe como parametro el objeto de serie y del almacen en el que se selecciono la serie
  selectSerie(series, avaItem) {

    if (series.Disponible > 0) {
      this.itemsList[this.indexAvaItem].Serie = series.PlacaChasis;
      this.itemsList[this.indexAvaItem].SysNumber = series.SysNumber;
      this.itemsList[this.indexAvaItem].WhsCode = avaItem.WhsCode;
      this.itemsList[this.indexAvaItem].WhsName = avaItem.WhsName;
      this.itemsList[this.indexAvaItem].UnitPrice = series.Precio;
      this.itemsList[this.indexAvaItem].Marca = series.PlacaChasis;
      this.LineTotalCalculate(this.indexAvaItem);
      this.alertService.infoInfoAlert(
        `Se seleccionó la serie: ${series.PlacaChasis}`
      );
    } else {
      this.alertService.infoInfoAlert(
        "No puede seleccionar esta serie ya que no posee disponibles"
      );
    }
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
    let obj = this.viewParamTitles.filter(param => {
      return param.Name === 'T_Inv';
    });
    this.title = obj[0].Text;
  }






  CreateInvoiceDocument(payment: any = null): CreateInvoice {


    let invoiceLines: IDocumentLine[] = this.itemsList.map(line => {

      let item = {
        ItemCode: line.ItemCode.split('-')[0].trim(),
        DiscountPercent: line.Discount,
        Quantity: line.Quantity,
        Serie: '',
        TaxCode: line.TaxCode,
        TaxRate: line.TaxRate,
        UnitPrice: line.UnitPrice,
        WarehouseCode: line.WhsName,
        TaxOnly: line.TaxOnly ? 'tYES' : 'tNO',
        BaseEntry: line.BaseEntry,
        BaseLine: line.BaseLine,
        BaseType: line.BaseType || -1,
      } as IDocumentLine;

      return item;

    });


    if (this.storage.GetDocEntry() > 0) {

      this.baseLines.forEach(i => {
        let aux = invoiceLines.find(x => x.ItemCode === i.ItemCode && !x['read']);

        if (aux) {
          aux['read'] = true;
          aux.BaseEntry = this.storage.GetDocEntry();
          aux.BaseLine = i.BaseLine;
          aux.BaseType = BaseTypeLines.INVOICE;
        }
      });
    }
   

    let invoice: any = {

      DocEntry: 0, //this.storageService.GetDocEntry(),
      DocNum: 0,
      DocDueDate: null,
      BaseEntry: this.storageService.GetDocEntry(),
      CardCode: this.invForm.value.cardCode,
      CardName: this.invForm.value.cardName,
      Comments: this.invForm.value.Comment,
      DocCurrency: this.invForm.value.currency,
      DocDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocType: BoDocumentTypes.dDocument_Items,
      NumAtCard: null,
      PaymentGroupCode: this.invForm.value.PayTerms,
      SalesPersonCode: this.invForm.value.SlpList,
      U_Online: '0',
      U_TipoDocE: this.invForm.value.DocumentType,
      U_TipoIdentificacion: this.feForm.value.IdType === '00' ? null : this.feForm.value.IdType,
      U_CorreoFE: this.feForm.value.Email,
      U_NumIdentFE: this.feForm.value.Identification,
      U_ObservacionFE: null,
      DocumentLines: invoiceLines,
      UdfTarget: this.mappedUdfs,
      Series: 0,
      U_CLVS_POS_UniqueInvId: this.uniqueInvCode
    };



    let createInvoiceReturn: CreateInvoice = {
      Invoice: invoice,
      Payment: payment,
      PPTransaction:null
    }

    return createInvoiceReturn;
  }






  CreatePay(payment: BasePayment) {

    if (this.isBilling) {
      this.attemptsWhileBilling++;
      console.log('Intento duplicación de factura ', this.attemptsWhileBilling);
      return;
    }



    this.blockUI.start('Generando factura y pago, espere por favor...');

    this.isBilling = true;
    // if (!navigator.onLine) {
    //   this.blockUI.stop();
    //   this.alertService.infoAlert("Parece que no tienes internet. Vuelve a intertarlo mas tarde");
    //   return;
    // }
    this.facturando = true;

    this.documentService.CreateInvoice(this.CreateInvoiceDocument(payment))
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.result) {



          this.returnedDocEntry = data.DocEntry;
          this.returnedDocNum = data.DocNum;
          this.returnedNumFE = data.NumDocFe;

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
          this.correctInvoice = true;
          this.facturando = false;
          if (this.pinPadCards.length > 0) {
            //this.pinPadCard.DocEntry = data.DocNum;
            this.pinPadCards.forEach(x => x.DocEntry = data.DocEntry);

            this.paymentService.updatePinPadPayment(this.pinPadCards).subscribe(next => {
              if (next.Result) {
                this.pinPadCards = [];
              }
              else {
                console.log(next.Error);
                this.alertService.errorAlert(`Error al actualizar el número de factura en el api local: ${next.Error.Message}`);
              }
            }, error => {
              console.log(error);
              this.alertService.errorAlert(`Error al actulizar el número de factura: ${error.error}`);
            });
          }
        } else {
          this.blockUI.stop();

          this.IsPaymentFail = true;
          this.RisePaymentComponent();

          this.blockUI.stop();
          this.facturando = false;
          this.alertService.errorAlert(`Error al crear el documento: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
          this.attemptsWhileBilling = 0;
          this.isBilling = false;
        }
        this.facturando = false;
      }, (error) => {
        console.log("Lista error");
        console.log(this.itemsList);
        this.IsPaymentFail = true;
        this.RisePaymentComponent();

        this.facturando = false;
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        this.attemptsWhileBilling = 0;
        this.isBilling = false;
      });

  }


  GeneratePreDocumentForPPPayment() {

    const linesList: any[] = [];

    this.itemsList.forEach(element => {
      if (element.ItemCode !== '') {
        element.ItemCode = element.ItemCode.split('-')[0].trim();
        linesList.push(element);
      }
    });

    let FE = {
      'IdType': this.feForm.value.IdType,
      'Email': this.feForm.value.Email,
      'Identification': this.feForm.value.Identification
    }

    const Invoice = {
      'InvoiceLinesList': linesList,
      'DocumentType': this.invForm.value.DocumentType,
      'CardCode': this.invForm.value.cardCode,
      'CardName': this.invForm.value.cardName,
      'Currency': this.invForm.value.currency,
      'PayTerms': this.invForm.value.PayTerms,
      'Comment': this.invForm.value.Comment,
      'SlpCode': this.invForm.value.SlpList,
      'FEInfo': FE,
      'CLVS_POS_UniqueInvId': this.uniqueInvCode
    };
    return Invoice;
  }



  // GeneratePreInvoice(): string {

  //   const PaymentLines = [];
  //   let dT = 1;
  //   PaymentLines.push({
  //     'InvTotal': this.total,
  //     'DocNum': 0,
  //     'PayTotal': this.TotalG,
  //     'DocEntry': 0,
  //     'InstId': 30, // plasos
  //     'Currency': this.invForm.value.currency,
  //     'Balance': this.TotalG,
  //     'DocType': dT,
  //     'PayBalanceChk': false, // Verifica el pago vs saldo
  //     'ReceivedAmount': this.ReceivedG,
  //     'Change': this.ChangeG
  //   });

  //   let total = 0;
  //   total = this.total;

  //   const Payments = {
  //     CardCode: this.invForm.value.cardCode,
  //     CashAccount: this.cashForm.value.AccountCash,
  //     CashSum: this.cashForm.value.TotalCash,
  //     CashCurr: this.currencyPayment,
  //     Comments: 'pago de fatura',
  //     Currency: this.currencyPayment,
  //     DocRate: this.currencyChange,
  //     SlpCode: this.invForm.controls.SlpList.value,
  //     Total: total,
  //     V_Checks: this.V_Checks,
  //     V_CreditCards: this.V_CreditCards,
  //     V_PaymentLines: PaymentLines,
  //     transfSum: this.transferForm.value.TransSum,
  //     trfsrAcct: this.transferForm.value.AccountTransf,
  //     trfsrCurr: this.currencyPayment,
  //     trfsrDate: this.transferForm.value.DateTrans,
  //     trfsrNum: this.transferForm.value.Ref,
  //   };

  //   const linesList: any[] = [];

  //   this.itemsList.forEach(element => {
  //     if (element.ItemCode !== '') {
  //       element.ItemCode = element.ItemCode.split('-')[0].trim();
  //       linesList.push(element);
  //     }
  //   });

  //   let FE = {
  //     'IdType': this.feForm.value.IdType,
  //     'Email': this.feForm.value.Email,
  //     'Identification': this.feForm.value.Identification
  //   }

  //   const Invoice = {
  //     'InvoiceLinesList': linesList,
  //     'DocumentType': this.invForm.value.DocumentType,
  //     'CardCode': this.invForm.value.cardCode,
  //     'CardName': this.invForm.value.cardName,
  //     'Currency': this.invForm.value.currency,
  //     'PayTerms': this.invForm.value.PayTerms,
  //     'Comment': this.invForm.value.Comment,
  //     'SlpCode': this.invForm.value.SlpList,
  //     'FEInfo': FE,
  //     'CLVS_POS_UniqueInvId': this.uniqueInvCode
  //   };

  //   const createInvoice = {
  //     'Invoice': Invoice,
  //     'Payment': Payments
  //   };

  //   return JSON.stringify(createInvoice);
  // }

  DeleteOffLineInvoice(invId: number) {
    this.documentService.DeleteOffLineInvoice(invId)
      .subscribe((data: any) => {
        if (data.result) {
        }
        else {
          console.log(`Error al crear el pago: Código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }
      }, (error) => {
        console.log(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  testKeydown(a) {
    if (a.which === 13) {
      //this.closeChangeModal();
    }
    // console.log(a);
  }

  printInvoice() {
    this.printARInvoice(this.lastInvoice, this.pinPadCards.length);
  }
  uniqueInvCode: string;

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




  // Genera la data necesaria para enviar a la modal de pagos

  onSubmit() {
    if (!this.UdfPaymentValidation()) {
      this.blockUI.stop();
      this.isBilling = false;
      this.attemptsWhileBilling = 0;
      return;
    }
    const CORRUPTED_QUANTITY = this.itemsList.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.CodeName}, debe ser mayor a 0`);
      return;
    }
    if (!this.COMPANY.HasZeroBilling) {

      const CORRUPTED_ITEM = this.itemsList.find(x => x.LinTot == 0);
      if (CORRUPTED_ITEM) {
        this.alertService.errorAlert(`El total de linea del producto "${CORRUPTED_ITEM.CodeName}" es 0, elimínelo por favor.`);
        return;
      }
      const DIFERENCECOST_ITEM = this.itemsList.find(x => +x.UnitPrice <= (x.LastPurchasePrice ? +x.LastPurchasePrice : 0) && +x.UnitPrice != 0);
      if (DIFERENCECOST_ITEM) {
        this.alertService.errorAlert(`Costo del artículo "${DIFERENCECOST_ITEM.CodeName}" es mayor o igual al precio de venta, modifique precio por favor. Precio venta: ${DIFERENCECOST_ITEM.UnitPrice} Precio costo: ${DIFERENCECOST_ITEM.LastPurchasePrice} `);
        return;
      }

    } else {
      const DIFERENCECOST_ITEM = this.itemsList.find(x => +x.UnitPrice <= (x.LastPurchasePrice ? +x.LastPurchasePrice : 0) && +x.UnitPrice != 0);
      if (DIFERENCECOST_ITEM) {
        this.alertService.errorAlert(`Costo del artículo "${DIFERENCECOST_ITEM.CodeName}" es mayor o igual al precio de venta, modifique precio por favor. Precio venta: ${DIFERENCECOST_ITEM.UnitPrice} Precio costo: ${DIFERENCECOST_ITEM.LastPurchasePrice} `);
        return;
      }
    }
    const AVAILABLE_INV = this.itemsList.find(x => +x.available < (this.itemsList.filter(y => y.Item == x.Item).reduce((p, c) => { return p + c.Quantity }, 0)) && x.InvntItem === "Y");
    // const AVAILABLE_INV = this.itemsList.find(x => +x.available < +x.Quantity && x.InvntItem === "Y");
    if (AVAILABLE_INV) {

      if (this.isAllowedGoodReceipt) {
        this.InventorySettings();
      } else {
        this.alertService.infoInfoAlert(`Existen artículos que no cuentan con inventario, elimínelos para crear la factura.`);
      }
      return;
    }

    if (!this.SlpsList.find(x => x.SlpCode == this.invForm.controls.SlpList.value)) {
      this.alertService.infoInfoAlert(`Por favor selecione un vendedor`);
      return;
    }

    if (!this.invForm.invalid) {
      if (this.itemsList.length > 0) {
        // if (this.total > 0) {
        this.facturando = true;

        if (Number(this.PayTermsList.find(x => x.GroupNum == this.invForm.controls.PayTerms.value).Type) === PayTermsEnum.A30Dias) {
          if (this.flagForm) {
            this.alertService.infoAlert('Intento duplicación documento');
            return;
          }
          this.blockUI.start('Generando factura crédito, espere por favor...');
          this.flagForm = true;

          this.documentService.CreateInvoice(this.CreateInvoiceDocument())
            .subscribe((data: any) => {

              // //this.documentService.CreateInvoice(this.invForm, {}, this.itemsList, this.feForm)
              // this.blockUI.stop();
              // this.alertService.infoInfoAlert(`Factura creada correctamente`);
              // this.btnVisibleBool = false;
              // this.correctInvoice = true;
              // this.lastInvoice = data.DocEntry;
              // this.facturando = false;
              if (data.result) {
                //this.closePayModal();
                this.blockUI.stop();
                this.baseLines = null;


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
                this.correctInvoice = true;
                this.facturando = false;
                this.flagForm = false;
              } else {
                this.blockUI.stop();
                this.flagForm = false;
                this.facturando = false;
                this.alertService.errorAlert(`Error al crear el pago: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
                this.attemptsWhileBilling = 0;
                this.isBilling = false;
              }
            }, (error) => {
              this.blockUI.stop();
              this.flagForm = false;
              this.facturando = false;
              this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
            });
        } else {

          this.isRequestinBacPayment = false;



          //JUMP
          this.RisePaymentComponent();
        }

      } else {
        this.isOnSubmit = false;
        this.alertService.infoInfoAlert(
          "Debe existir al menos un ítem en la factura"
        );
      }
    } else {
      this.isOnSubmit = false;
      this.alertService.infoAlert(
        "Debe haber seleccionado tipo factura, cliente, moneda, término de pago"
      );
    }
  }

  // #Componente de pagos
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
      this.facturando = false;
      console.log('result', result)
    }, (reason) => {
      this.facturando = false;
      if (reason.status === PaymentResults.Created) {
        let Payment: BasePayment = reason.Payment;
        this.changeColones = reason.Changes.COL;
        this.changeDolares = reason.Changes.USD;



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

    // PaymentLines.push({
    //   'InvTotal': this.total,
    //   'DocNum': 0,
    //   'PayTotal': this.TotalG,
    //   'DocEntry': 0,
    //   'InstId': 30, // plasos
    //   'Currency': this.invForm.value.currency,
    //   'Balance': this.TotalG,
    //   'DocType': 1,
    //   'PayBalanceChk': false, // Verifica el pago vs saldo
    //   'ReceivedAmount': RecivedAmount,
    //   'Change': change,
    // });




    PaymentLines.push({
      AppliedFC: this.total,
      DocEntry: 0,
      InvoiceType: BoRcptInvTypes.it_Invoice, // 13  = invoice
      SumApplied: this.total
    });
    return PaymentLines;
  }



  GenerateDataForPayment(): any {


    let InvoiceInfo: IInvoiceInfoForPayment = {
      CardCode: this.invForm.value.cardCode,
      Currency: this.invForm.value.currency,
      SlpCode: this.invForm.value.SlpList,
      uniqueInvCode: this.uniqueInvCode,
      Comment: 'Pago de factura',
      accountPayment: false
    }



    const requiredDataForPay = {
      lists: {
        accountList: this.accountList,
        V_CreditCards: this.V_CreditCards,
        cardsList: this.cardsList,
        currencyList: this.currencyList,
        banksList: this.banksList,
        V_Checks: this.V_Checks,
      },
      Currency: {
        currencyPayment: this.invForm.value.currency, // Moneda de pago
      },
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
      }

    };

    return requiredDataForPay;
  }


  // Genera el id para la creacion de la factura usanda en sap y el pin pad
  generateUniqueInvoiceId(): void {
    const USER_PREFIXID = this.storage.GetPrefix();

    const DATE = new Date();

    const DAYS = DATE.getDate() < 10 ? '0' + DATE.getDate() : DATE.getDate().toString();
    const MONTS = (DATE.getMonth() + 1) < 10 ? '0' + (DATE.getMonth() + 1) : (DATE.getMonth() + 1).toString();
    const YEAR = DATE.getFullYear().toString().slice(0, 2);

    const HOURS = DATE.getHours() < 10 ? '0' + DATE.getHours() : DATE.getHours();
    const MINUTES = DATE.getMinutes() < 10 ? '0' + DATE.getMinutes() : DATE.getMinutes();
    const SECONDS = DATE.getSeconds() < 10 ? '0' + DATE.getSeconds() : DATE.getSeconds();

    this.uniqueInvCode = `${USER_PREFIXID + DAYS + MONTS + YEAR + HOURS + MINUTES + SECONDS}`;

    console.log('UniqueInvCode ', this.uniqueInvCode);
  }

  //Esto se usa en algun lado????
  CreateInvOnline(ClaveFE: string, NumFe: string) {
    let mappedUdfs: IUdfTarget[] = [];
    this.udfs.forEach(x => {
      mappedUdfs.push({
        Name: x.Name,
        Value: (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value,
        FieldType: x.FieldType
      } as IUdfTarget);
    });

    this.documentService.createInvOnline(this.invForm, {}, this.itemsList, this.feForm, ClaveFE, NumFe)
      .subscribe((data: any) => {
        this.documentService.CreateInvoice(this.CreateInvoiceDocument())
        this.blockUI.stop();
        this.alertService.infoInfoAlert(`Factura creada correctamente`);
        this.baseLines = null;
        this.btnVisibleBool = false;
        this.correctInvoice = true;
        this.lastInvoice = data.DocEntry;
        this.facturando = false;
      }, (error) => {
        this.blockUI.stop();
        this.facturando = false;
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }



  // funcion para obtener una lista de cuentas segun la compañía seleccionada
  getAccount() {
    this.blockUI.start('Obteniendo cuentas, espere por favor...');
    this.accountService.getAccount()
      .subscribe((data: any) => {
        if (data.result) {
          this.accountList = data.accountList;

          //this.GetPayTerms();
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('Error al cargar Cuentas - error: ' + data.errorInfo.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);

      });
  }

  // redondea un numero hacia arriba con la cantidad de decimales establecidos en la variable precision
  roundUp(num, precision) {
    precision = Math.pow(10, precision);
    num = Math.ceil(num * precision) / precision;
    return Number((num).toString());
  }



  // funcion qu obtiene el tipo de cambio
  getExchangeRate() {
    this.blockUI.start('Obteniendo tipo de cambio, espere por favor...');
    this.exRateService.getExchangeRate()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.result) {
          this.currencyChange = data.exRate;
        } else {
          this.alertService.errorAlert('error al cargar tipo de cambio - error: ' + data.errorInfo.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  getCards() {
    this.blockUI.start('Obteniendo tarjetas, espere por favor...');
    this.cardService.getCards()
      .subscribe((data: any) => {
        if (data.result) {
          this.cardsList = data.cardsList;

          this.CardName = data.cardsList[0].CardName;
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('error al cargar tarjetas de credito - error: ' + data.errorInfo.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  getAccountsBank() {
    this.blockUI.start('Obteniendo bancos, espere por favor...');
    this.bankService.getAccountsBank()
      .subscribe((data: any) => {
        if (data.result) {
          this.banksList = data.banksList;
          // this.checkForm.patchValue({ BankNames: data.banksList[0].BankCode });
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('error al obtener información de los Bancos - error: ' + data.errorInfo.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }




  PrintVoid(_pPTransaction: IPPTransaction) {
    const DATE = new Date(_pPTransaction.CreationDate);

    const DAYS = DATE.getDate() < 10 ? '0' + DATE.getDate() : DATE.getDate().toString();
    const MONTHS = (DATE.getMonth() + 1) < 10 ? '0' + (DATE.getMonth() + 1) : (DATE.getMonth() + 1).toString();
    const YEAR = DATE.getFullYear().toString().slice(0, 2);
    _pPTransaction.Amount = +(+_pPTransaction.Amount).toFixed(2);
    _pPTransaction.CreationDate = DAYS + ' / ' + MONTHS + ' / ' + YEAR;
    this.blockUI.start('Generando la impresión...');
    this.reportsService.PrintVoucher(_pPTransaction).subscribe(data => {
      this.blockUI.stop();
      if (this.electronRendererService.CheckElectron()) {
        let fileName = 'Invoice_' + _pPTransaction.TransactionId + '.pdf';
        const PRINTERCONFIGURATION = JSON.parse(this.storage.getCompanyConfiguration().PrinterConfiguration) as IPrinter;
        let file = {
          "fileName": fileName,
          "file": data,
          "defaultPrinter": PRINTERCONFIGURATION.DisplayName
        };
        this.electronRendererService.send('Print', file);
      }
      else {
        printJS({
          printable: data,
          type: 'pdf',
          base64: true
        });
      }
    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });

    // this.reportsService.PrintVoucher(_pPTransaction).subscribe(next => {
    //   console.log(next);
    // });
  }

  // removeCheck(index) {
  //   this.TotalCheck -= this.V_Checks[index].CheckSum;
  //   this.V_Checks.splice(index, 1);
  //   this.setTotalAmount();
  // }

  partialPayValidator() {
    if (
      confirm(
        "el monto del pago es menor del monto total, ¿desea realizar el pago parcial?"
      )
    ) {
      return true;
    } else {
      return false;
    }
  }

  getCurrencyByUser(currency: string) {
    this.currencyList = this.allCurrencyList;
    if (currency === 'COL' || currency === 'USD') {

      this.currencyList = this.currencyList.filter(cur => cur.Id === currency);

      this.currencyList.push({
        Id: "USD",
        Name: "Dólares",
        Symbol: "$"
      });
    }
    this.currencyList = this.currencyList.sort();
    if (this.currencyList.length === 1) {
      this.invForm.patchValue({ currency: this.currencyList[0].Id });
      this.currencyPayment = this.currencyList[0].Id;
    }
    else {
      this.currencyPayment = 'COL';
      this.invForm.patchValue({ currency: "COL" }); //
    }

    this.SetCurr();
  }

  GetCurrencyType() {
    this.blockUI.start('Obteniendo los tipos de monedas...');
    this.paramsService.GetCurrencyType().subscribe(data => {
      if (data.Data.length > 0) {
        this.currencyList = data.Data;
        this.currencyList.sort();
        this.allCurrencyList = data.Data;
        this.currencyPayment = 'COL';
        this.funcion();
        this.blockUI.stop();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar las monedas - ' + data.Error);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  SetCurr() {
    let cur = this.currencyList.find(curr => curr.Id === this.invForm.controls.currency.value);

    if (this.storage.GetDocEntry() > 0) {
      cur = this.currencyList.find(curr => curr.Id === JSON.parse(this.storage.GetCustomerData()).Currency);
    }

    this.userCurrency = this.currencyPayment;
    if (!cur) return;
    this.setCurr = cur.Symbol;
    // let cur = this.currencyList.filter((curr) => {
    //   return curr.Id === this.invForm.controls.currency.value;
    // });
    // this.setCurr = cur[0].Symbol;
    // if (this.invForm.controls.currency.value === 'COL') {

    //   this.setCurr = '₡';
    //   this.currencyPayment = 'COL';
    // }
    // else {
    //   this.currencyPayment = 'USD';
    //   this.setCurr = '$';
    // }
    // this.userCurrency = this.currencyPayment;
  }

  CreateNew(RemoveMemoryInvoice: boolean = true) {
    this.ItemInfo.setValue('');
    this.buildedData = '';
    this.isScanning = false;
    this.isLockedByScanner = false;
    this.searchTypeManual = false;
    this.udfs = [];
    this.udfsOIGN = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.INVOICE);
    this.GetConfiguredUdfsOIGN(DOCUMENT_ALIAS.GOODSRECEIPT);
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
    const DOC_ENTRY = this.storage.GetDocEntry();
    if (DOC_ENTRY > 0) {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.GetCustomerData()).CardCode;
    } else {
      this.memoryInvoiceService.ShowInvoices.next(true);
      this.DEFAULT_BUSINESS_PARTNER = this.storage.GetDefaultBussinesPartner();
    }
    /*ref end sale order*/
    this.facturando = false;
    this.btnVisibleBool = true;
    this.invForm.reset(true);


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

    this.invForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required], //CD0051 - SUPER // C0001 - DISUMED
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      PayTerms: ['0'],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      paymentType: [''],
      Comment: '',
    });

    this.invoiceType = this.storageService.GetDefaultInvoiceType();

    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {
        this.typesInvoice = next.InvoiceTypes;
        this.invForm.patchValue({
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

    this.invForm.patchValue({ paymentType: this.paymentTypes[0].id });

    // this.invForm.patchValue({ cardCode: this.DEFAULT_BUSSINESS_PARTNER });
    this.getExchangeRate();
    this.createFEForm();
    this.getMaxDiscout();
    this.getCustomers();
    this.GetParamsViewList();
    this.getExRate();
    this.GetPriceList();
    this.GetSalesPersonList();
    this.getTaxes();
    this.getAccount();
    this.getCards();
    this.getAccountsBank();
    this.GetPayTerms();
    this.Cant.setValue(1);

    this.changeCode(this.DEFAULT_BUSINESS_PARTNER);

    this.nameField.nativeElement.focus();
    this.correctInvoice = false;
    this.correctInvoice = false;
    this.Cant.setValue(1);
    this.nameField.nativeElement.focus();
    this.currencyPayment = 'COL';
    this.getCompanies();
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

  funcion() {

    let inputValue = this.DEFAULT_BUSINESS_PARTNER
    let code = inputValue;
    let codePos = this.bpCodeList.indexOf(code);
    let cardName = this.bpNameList[codePos];


    let customer = this.bpList.filter(cus => {
      return cus.CardCode === code;
    });

    this.userCurrency = customer[0].Currency;

    this.getCurrencyByUser(customer[0].Currency);

    // if (cardName !== this.invForm.get('cardName').value) {
    //   this.invForm.patchValue({ cardName: cardName });
    // }
    const DOC_ENTRY = this.storage.GetDocEntry();
    let MOBJECT;
    if (DOC_ENTRY > 0) {
      MOBJECT = this.saleOrder;
    }
    this.invForm.patchValue({ cardCode: MOBJECT ? MOBJECT.CardCode : this.DEFAULT_BUSINESS_PARTNER });
    this.invForm.patchValue({ cardName: MOBJECT ? MOBJECT.CardName : cardName });

  }

  GetPayTerms() {
    this.blockUI.start('Obteniendo términos de pago, espere por favor...');
    this.itemService.GetPayTerms()
      .subscribe((data: any) => {
        if (data.result) {
          const customer = this.bpList.filter(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);

          this.PayTermsList = data.payTermsList;

          const DOC_ENTRY = this.storage.GetDocEntry();
          if (DOC_ENTRY === 0 || DOC_ENTRY === -1) {
            this.invForm.patchValue({ PayTerms: customer[0].GroupNum });
          }
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }
      },
        (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
  }

  GetPriceList() {
    this.blockUI.start('Obteniendo listas de precios, espere por favor...');
    this.itemService.GetPriceList()
      .subscribe((data: any) => {
        if (data.result) {
          this.PriceList = data.priceList;

          this.invForm.patchValue({ PriceList: this.PriceList[0].ListNum });
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }
        this.setDefaultList(this.DEFAULT_BUSINESS_PARTNER);
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  ClearItemList() {
    this.itemsList.length = 0;
    this.getItems();
    this.getTaxes();
    this.getAccount();
    this.getCards();
    this.getAccountsBank();
  }

  setDefaultList(_cardCode: string) {
    this.itemService.GetPriceListDefault(_cardCode).subscribe(next => {
      if (next.Result) {
        this.invForm.patchValue({
          PriceList: next.PriceList.ListNum
        });
      }
    });
  }

  GetSalesPersonList() {
    this.blockUI.start('Obteniendo vendedores, espere por favor...');
    this.smService.getSalesMan()
      .subscribe((data: any) => {
        if (data.result) {
          this.SlpsList = data.salesManList;
          this.invForm.patchValue({ SlpList: this.defaultSlpCodeStr });
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
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
        this.getProvinces();
        break;
      }
      case '02':
      case '04': {
        this.validatorFeForm(10, 10);
        this.getProvinces();
        break;
      }
      case '03': {
        this.validatorFeForm(11, 12);
        this.getProvinces();
        break;
      }
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

  getProvinces() {

    this.jsonDataService.getJSONProvinces()
      .subscribe((data: any) => {
        this.provinceList = data.Provinces;
        this.feForm.patchValue({ Provincia: this.provinceList[0].ProvinceId });
        this.nombreProvincia = this.provinceList[0].ProvinceName;
        this.getCantons(this.provinceList[0].ProvinceId)
      });
  }

  setProvinceName(provId) {
    let provList: any;
    this.jsonDataService.getJSONProvinces()
      .subscribe((data: any) => {
        provList = data.Provinces;
        provList.forEach(prov => {
          if (Number(prov.ProvinceId) === Number(provId)) {
            this.nombreProvincia = prov.ProvinceName;
          }
        });
      });
  }

  setCantonName(cantonId) {
    let cantList: any;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        cantList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId), 'CantonId');
        if (true) {
          cantList.forEach(cant => {
            if (Number(cant.CantonId) === Number(cantonId)) {
              this.nombreCanton = cant.CantonName;
            }
          });
        }
      });
  }

  setDistrictName(distId) {
    let distList: any;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        distList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId), 'DistrictId');
        if (true) {
          distList.forEach(dist => {
            if (Number(dist.DistrictId) === Number(distId)) {
              this.nombreDistrito = dist.DistrictName;
            }
          });
        }
      });
  }

  setNeighborhoodName(neighId) {
    let neighList: any;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        neighList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId && x.DistrictId === this.districtId), 'NeighborhoodId');
        if (true) {
          neighList.forEach(neigh => {
            if (Number(neigh.NeighborhoodId) === Number(neighId)) {
              this.nombreBarrio = neigh.NeighborhoodName;
            }
          });
        }
      });
  }

  getProvincesPatch(data) {
    this.blockUI.start('Obteniendo datos FE...');
    this.jsonDataService.getJSONProvinces()
      .subscribe((data2: any) => {
        this.blockUI.stop();
        //this.provinceList = data2.Provinces;
        this.feForm.patchValue({ IdType: data.FEInfo.IdType });
        this.feForm.patchValue({ Identification: data.FEInfo.Identification });
        this.feForm.patchValue({ Email: data.FEInfo.Email });
        //this.feForm.patchValue({ Direccion: data.FEInfo.Direccion });
        // let provid = '01';
        // let provname = this.provinceList[0].ProvinceName;
        // this.provinceList.forEach(prov => {
        //   if (prov.ProvinceName.toUpperCase() === data.FEInfo.Provincia.toUpperCase()) {
        //     provid = prov.ProvinceId;
        //     provname = prov.ProvinceName;
        //   }
        // });
        // this.nombreProvincia = provname;
        // this.feForm.patchValue({ Provincia: Number(provid).toString() });
        // this.getCantonsPatch(provid, data.FEInfo.Canton, data.FEInfo.Distrito, data.FEInfo.Barrio);
      });
  }

  getCantons(provinceId) {
    this.setProvinceName(provinceId);
    this.provinceId = provinceId;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.cantonList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId), 'CantonId');
        if (true) {
          this.cantonId = this.cantonList[0].CantonId;
          this.feForm.patchValue({ Canton: this.cantonId });
          this.nombreCanton = this.cantonList[0].CantonName;
          this.getDistrics(this.cantonId);
        }
      });
  }

  getCantonsPatch(provinceId, cantonName, districtName, neighbourhoodName) {
    this.provinceId = provinceId;
    this.setProvinceName(provinceId);
    this.blockUI.start('Obteniendo datos FE...');
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.blockUI.stop();
        this.cantonList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId)), 'CantonId');
        let cantid = '01';
        let cantname = this.cantonList[0].CantonName;
        this.cantonList.forEach(cant => {
          if (cant.CantonName.toUpperCase() === cantonName.toUpperCase()) {
            cantid = cant.CantonId;
            cantname = cant.CantonName;
          }
        });
        if (true) {
          this.cantonId = cantid;
          this.nombreCanton = cantname;
          this.feForm.patchValue({ Canton: cantid });
          this.getDistricsPatch(cantid, districtName, neighbourhoodName);
        }
      });
  }

  getDistrics(cantonId) {
    this.cantonId = cantonId;
    this.setCantonName(cantonId);
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.districtList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId), 'DistrictId');
        if (typeof this.feForm.value.Distrito !== 'undefined') {
          this.districtId = this.districtList[0].DistrictId;
          this.nombreDistrito = this.districtList[0].DistrictName;
          this.feForm.patchValue({ Distrito: this.districtId });
          this.getNeighborhood(this.districtId);
        }
      });
  }

  getDistricsPatch(cantonId, districtName, neighbourhoodName) {
    this.cantonId = cantonId;
    this.setCantonName(cantonId);
    this.blockUI.start('Obteniendo datos FE...');
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.blockUI.stop();
        this.districtList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId) && x.CantonId === this.cantonId), 'DistrictId');
        let distid = '01';
        let distname = this.districtList[0].DistrictName;
        this.districtList.forEach(dist => {
          if (dist.DistrictName.toUpperCase() === districtName.toUpperCase()) {
            distid = dist.DistrictId;
            distname = dist.DistrictName;
          }
        });
        if (true) {
          this.districtId = distid;
          this.nombreDistrito = distname;
          this.feForm.patchValue({ Distrito: distid });
          this.getNeighborhoodPatch(distid, neighbourhoodName);
        }
      });
  }

  getNeighborhood(districtId) {
    this.districtId = districtId;
    this.setDistrictName(districtId);
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.neighborhoodList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId) && x.CantonId === this.cantonId && x.DistrictId === this.districtId), 'NeighborhoodId');
        if (typeof this.feForm.value.Barrio !== 'undefined') {
          this.neighborhoodId = this.neighborhoodList[0].NeighborhoodId;
          this.nombreBarrio = this.neighborhoodList[0].NeighborhoodName;
          this.feForm.patchValue({ Barrio: this.neighborhoodId });
        }
      });
  }

  getNeighborhoodPatch(districtId, neighbourhoodName) {
    this.districtId = districtId;
    this.setDistrictName(districtId);
    this.blockUI.start('Obteniendo datos FE...');
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.blockUI.stop();
        this.neighborhoodList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId) && x.CantonId === this.cantonId && x.DistrictId === this.districtId), 'NeighborhoodId');
        let neighid = '01';
        let neighname = this.neighborhoodList[0].NeighborhoodName;
        this.neighborhoodList.forEach(neigh => {
          if (neigh.NeighborhoodName.toUpperCase() === neighbourhoodName.toUpperCase()) {
            neighid = neigh.NeighborhoodId;
            neighname = neigh.NeighborhoodName;
          }
        });
        if (true) {
          this.neighborhoodId = neighid;
          this.nombreBarrio = neighname;
          this.feForm.patchValue({ Barrio: neighid });
        }
      });
  }

  unique(array, propertyName) {
    return array.filter(
      (e, i) =>
        array.findIndex((a) => a[propertyName] === e[propertyName]) === i
    );
  }

  patchZeroes() {
    /*
    this.checkForm.patchValue({CheckSum: 0 });
    this.cashForm.patchValue({TotalCash: 0 });
    this.transferForm.patchValue({TransSum: 0 });
    this.creditCardForm.patchValue({CreditSum: 0 });
    */
  }







  onAltArticulos() {

  }

  getCompanies() {
    this.blockUI.start('Obteniendo compañías, espere por favor...');
    this.companyService.GetCompanies().subscribe((data: any) => {
      if (data.result) {
        this.companiesList.length = 0;
        this.companiesList = data.companiesList;
        this.companiesList.forEach(comp => {
          this.pesoBolsa = comp.ScaleWeightToSubstract;
          this.priceEditable = comp.IsLinePriceEditable;
          this.maxWeightTo0 = comp.ScaleMaxWeightToTreatAsZero;
        });
      } else {
        this.alertService.errorAlert('Error al cargar compañías - error: ' + data.errorInfo.Message);
      }
      this.blockUI.stop();
    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  // formatea el monto a currency
  public currencyFormat(number: number) {
    return this.cp.transform(number, '', '', '1.2-2');
  }

  //#region Cambios Jorge EMA Aromas
  setWarehouseInfo() {
    let session = this.storage.getSession(true);
    if (session) {
      session = JSON.parse(session);
      this.whCode = session.WhCode;
      this.whName = session.WhName;
    }
  }
  /*Ref sale order*/
  getBaseLines(saleOrderDocEntry: number) {
    this.soAdnSQService.GetSaleOrderToCopy(saleOrderDocEntry).pipe(first()).subscribe(response => {
      if (response.Result) {
        this.conta = 0;
        this.total = 0;
        this.itemsList = [];
        this.saleOrder = response.Data;


        if (this.bpList.length > 0) {
          const CUSTOMER = this.bpList.find(x => x.CardCode === this.saleOrder.CardCode);
          if (CUSTOMER) this.priceList = CUSTOMER.ListNum;
        }
        this.baseLines = response.Data.DocumentLines;
        this.defaultSlpCode = this.saleOrder.SalesPersonCode;

        this.invForm.patchValue({
          DocumentType: this.saleOrder.U_TipoDocE,
          cardName: this.saleOrder.CardName,
          Comment: this.saleOrder.Comments,
          PayTerms: this.saleOrder.PaymentGroupCode,
          SlpList: this.saleOrder.SalesPersonCode
        });

        if (this.saleOrder.U_NumIdentFE !== null) {

          this.feForm.patchValue({
            IdType: this.saleOrder.U_TipoIdentificacion,
            Identification: this.saleOrder.U_NumIdentFE,
            Email: this.saleOrder.U_CorreoFE,
            ObservacionFE: this.saleOrder.U_ObservacionFE
          });

          (<HTMLButtonElement>(document.getElementById('triggerFECollapser'))).click();
        }

        response.Data.DocumentLines.forEach(x => {
          this.conta++;
          const tot = x.UnitPrice * x.Quantity;

          let varAux = {
            'Item': `${x.ItemCode}`,
            'ItemCode': `${x.ItemCode} - ${x.ItemCode}`,
            'ItemName': `${x.ItemName}`,
            'CodeName': `${x.ItemCode} - ${x.ItemName}`,
            'UnitPrice': JSON.parse(this.storage.GetCustomerData()).Currency === 'COL' ? x.UnitPrice : (parseFloat(Number(x.UnitPrice / this.DailyExRate).toString())),
            'UnitPriceCol': x.UnitPrice,
            'UnitPriceDol': x.UnitPrice,
            'U_SugPrice': '0',
            'TaxCode': x.TaxCode,
            'Quantity': x.Quantity,
            'Active': true,
            'Id': this.conta,
            'LinTot': tot,
            'TaxRate': x.TaxRate != 0.0 ? x.TaxRate : 0.00,
            'Discount': x.DiscountPercent,
            'WhsCode': x.WarehouseCode,
            'WhsName': x.WhsName,
            'Serie': '',
            'SysNumber': 0,
            'OnHand': 0,
            'BaseEntry': x.BaseEntry,
            'BaseType': x.BaseType,
            'BaseLine': x.BaseLine,
            'LineNum': x.LineNum,
            'U_NVT_ServicioMedico': x.U_NVT_ServicioMedico,
            'TaxCode_BCK': x.TaxCode_BCK,
            'TaxRate_BCK': x.TaxRate_BCK,
            'ItemGroupCode': x.ItemGroupCode,
            'LastPurchasePrice': x.LastPurchasePrice,
            'available': '',
            'InvntItem': '',
          }
          this.isLineMode ? this.itemsList.push(varAux) : this.itemsList.unshift(varAux);
          this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0);

          this.getTotals();

          this.itemService.GetWHAvailableItem(x.ItemCode)
            .subscribe((data: any) => {
              if (data.result) {
                let isInventoryItem: string;
                let cantAvailable: number = 0;
                // var index = this.itemsList.indexOf(this.itemsList.find(y => y.Item == x.ItemCode));
                data.whInfo.forEach(wh => {
                  if (wh.InvntItem === "Y") {
                    isInventoryItem = wh.InvntItem
                    cantAvailable = wh.Disponible;
                  }
                });
                if (data.whInfo.length <= 0) {
                  isInventoryItem = 'Y';
                  cantAvailable = 0;
                }
                // this.itemsList[index].available = cantAvailable;
                // this.itemsList[index].InvntItem = isInventoryItem;
                this.itemsList.filter(y => y.Item == x.ItemCode).forEach(x => {
                  x.available = cantAvailable
                  x.InvntItem = isInventoryItem;
                });
              }
            });

          // this.itemService.GetWHAvailableItem(x.ItemCode).subscribe((response: any) => {
          //   if (response.result) {
          //     let cantAvailable: number = 0;
          //     let isInventoryItem: string;

          //     response.whInfo.forEach(wh => {
          //       cantAvailable = wh.Disponible;
          //       isInventoryItem = wh.InvntItem;
          //     });

          //     this.conta++;
          //     const tot = x.UnitPrice * x.Quantity; 

          //     let varAux = {
          //       'Item': `${x.ItemCode}`,
          //       'ItemCode': `${x.ItemCode} - ${x.ItemCode}`,
          //       'ItemName': `${x.ItemName}`,
          //       'CodeName': `${x.ItemCode} - ${x.ItemName}`,
          //       'UnitPrice': JSON.parse(this.storage.GetCustomerData()).Currency === 'COL' ? x.UnitPrice : (parseFloat(Number(x.UnitPrice / this.DailyExRate).toString())),
          //       'UnitPriceCol': x.UnitPrice,
          //       'UnitPriceDol': x.UnitPrice,
          //       'U_SugPrice': '0',
          //       'TaxCode': x.TaxCode,
          //       'Quantity': x.Quantity,
          //       'Active': true,
          //       'Id': this.conta,
          //       'LinTot': tot,
          //       'TaxRate': x.TaxRate != 0.0 ? x.TaxRate : 0.00,
          //       'Discount': x.Discount,
          //       'WhsCode': x.WhsCode,
          //       'WhsName': x.WhsName,
          //       'Serie': '',
          //       'SysNumber': 0,
          //       'OnHand': 0,
          //       'BaseEntry': x.BaseEntry,
          //       'BaseType': x.BaseType,
          //       'BaseLine': x.BaseLine,
          //       'LineNum': x.LineNum,
          //       'U_NVT_ServicioMedico': x.U_NVT_ServicioMedico,
          //       'TaxCode_BCK': x.TaxCode_BCK,
          //       'TaxRate_BCK': x.TaxRate_BCK,
          //       'ItemGroupCode': x.ItemGroupCode,
          //       'LastPurchasePrice': x.LastPurchasePrice,
          //       'available': cantAvailable,
          //       'InvntItem': isInventoryItem,
          //     }
          //     this.isLineMode ?  this.itemsList.push(varAux) : this.itemsList.unshift(varAux);
          //     this.isLineMode ?  this.LineTotalCalculate(this.itemsList.length - 1) :  this.LineTotalCalculate(0);

          //   }
          // });
        });
      } else {
        this.alertService.errorAlert(response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert(err);
    });
  }




  //#endregion

  /*
  NOTAS:
    EN EL HTML
    <!-- <input [class.text-danger]="item.Quantity === 0 && item.InvntItem==='Y'" class="form-control form-control-sm invi" *ngIf=" param.Visibility && param.Name == 'ItemCode'" type="text" [(ngModel)]="item.CodeName" readonly> -->
    ESTA LINEA ES LA ORIGINAL, PERO LA COMENTE PARA INTENTAR CORREGIR EL MARCADO SIN INVENTARIO, Y ASI CON TODAS LAS COLUMNAS DE LA TABLA
    QUITE && item.InvntItem==='Y'
  */


  //#endregion

  toggleArrow(): void { this.typeArrow = !this.typeArrow; }

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

  LineStatus(item: any, index: number): string {
    if (+item.UnitPrice <= +item.LastPurchasePrice && +item.UnitPrice !== 0) {
      return `Costo del artículo es mayor o igual al precio de venta. Precio venta: ${+item.UnitPrice} Precio costo: ${+item.LastPurchasePrice}`;
    } else
      if (+item.UnitPrice == 0) {
        return "No tiene precio";
      }
    if (+item.Quantity === 0) {
      return "Sin stock";
    }

    // let cantsingroupLine: number = 0;
    // const INDEX = this.itemsList.findIndex(x => x.available !== '' && x.Item === this.itemsList[index].Item);

    // this.itemsList.forEach(x => {
    //   if (x.Item === this.itemsList[index].Item) {
    //     cantsingroupLine += x.Quantity;

    //     if (INDEX !== -1) {
    //       x.available = this.itemsList[INDEX].available
    //       x.InvntItem = this.itemsList[INDEX].InvntItem
    //     }
    //   }
    // });   
    const QUANTITYTOTAL = this.itemsList.filter(y => y.Item == this.itemsList[index].Item && this.itemsList[index].InvntItem === "Y").reduce((p, c) => { return p + c.Quantity }, 0);


    if (this.itemsList[index].available < +QUANTITYTOTAL && this.itemsList[index].InvntItem === "Y") {
      return `Sin stock, solicitado: ${+QUANTITYTOTAL}, disponible: ${this.itemsList[index].available}`;
    }

  }

  AvailableItemColor(item: any): boolean {
    let cantsingroupLine: number = 0;

    this.itemsList.forEach(x => {
      if (x.Item === item.Item) {
        cantsingroupLine += x.Quantity;
      }
    });

    if (+item.available < +cantsingroupLine && item.InvntItem === "Y") {
      return true;
    }
  }

  LineColor(item: any): string {
    if (+item.UnitPrice <= +item.LastPurchasePrice || +item.UnitPrice == 0) {
      return "mOrange";
    }
  }

  RiseInvoceCompleteModal(modalContent: boolean): void {
    this.modalInvoiceContent = modalContent;
    (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();

  }


  OnClickTaxOnly(ItemLine) {
    ItemLine.TaxOnly = !ItemLine.TaxOnly;
    this.getTotals();
  }

  getCustomerUpdate() {
    this.blockUI.start('Obteniendo clientes, espere por favor...');
    this.bpService.GetCustomers()
      .subscribe((data: any) => {
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

          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  //#region AJUSTE INVENTARIO
  GetAvailableItemInventory(code: string, cant: number) {
    this.itemService.GetWHAvailableItem(code)
      .subscribe((data: any) => {
        if (data.result) {
          let available: boolean = false;
          data.whInfo.forEach(wh => {
            if (wh.Disponible >= cant && wh.InvntItem === "Y") {
              available = true;
            }
          });
          if (data.whInfo.length > 0) {
            if (!available) {
              this.alertService.infoInfoAlert(`Sin stock, solicitud de ${cant}, disponible:${data.whInfo[0].Disponible} `);
            }
          } else {
            this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
          }
        } else {
          this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
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


  // Levanta la modal de ajuste de inventario.
  InventorySettings_ORIGINAL(): void {
    this.GetSettings();
    this.itemsList.forEach(x => {
      if (+x.available < +x.Quantity && x.InvntItem === "Y") {
        this.conta++;
        const tot = x.UnitPrice * x.Quantity;

        //#001 07/09/2021 Obtiene el avg y ultimo precio de entrada de los items.
        forkJoin([this.itemService.GetItemAVGPrice(x.Item), this.itemService.GetItemLastPrice(x.Item)]).subscribe(([avg, last]) => {
          console.table([avg, last]);
          let avgPrice: number = 0;
          let lastPrice: number = 0;

          if (avg.result) {
            avgPrice = avg.Data;
          } else {
            this.alertService.infoInfoAlert('Ocurrió un error obteniendo el AVGPrice del item, causa: ' + avg.errorInfo.message);
          }

          if (last.result) {
            lastPrice = last.Data;
          } else {
            //this.alertService.infoInfoAlert('Ocurrio un error obteniendo el ultimo precio de entrada del item, causa: ' + last.errorInfo.message);
          }
          const LINE = {
            BarCode: x.BarCode,
            ItemCode: x.Item,
            ItemName: `${x.Item} - ${x.ItemName}`,
            Quantity: +x.Quantity - x.available,
            Available: x.available,
            Missing: +x.Quantity,
            TaxCode: x.TaxCode,
            UnitPrice: lastPrice,
            Discount: x.Discount,
            Tax_Rate: x.TaxRate,
            TaxRate: x.TaxRate,
            TotalLine: lastPrice * (x.Quantity - x.available),
            WareHouse: this.whCode,
            AVGPrice: avgPrice,
            LastPurchasePrice: lastPrice,
            hasDeviation: false
          }

          this.lines.push(LINE);
          this.TotalCalculateInventorySetting();


        });
        //-------------------------------
        // Original como lo hizo Stef
        // const LINE = {
        //   BarCode: x.BarCode,
        //   ItemCode: x.Item,
        //   ItemName: `${x.Item} - ${x.ItemName}`,
        //   Quantity: +x.Quantity - x.available,
        //   Available: x.available,
        //   Missing: +x.Quantity,
        //   TaxCode: x.TaxCode,
        //   UnitPrice: +(Number(x.LastPurchasePrice)).toFixed(4),
        //   Discount: x.Discount,
        //   Tax_Rate: x.TaxRate,
        //   TaxRate: x.TaxRate,
        //   TotalLine: x.LastPurchasePrice * (x.Quantity - x.available),
        //   WareHouse: this.whCode,
        // }

        // this.lines.push(LINE);


      }
    });

    // this.TotalCalculateInventorySetting();

    (<HTMLInputElement>document.getElementById('raiseModalInventorySettings')).click();
  }

  InventorySettings(): void {


    this.GetSettings();

    this.blockUI.start('Obteniendo información');
    // Se filtra las lines que no tienen en stock la cantidad solicitada, seran las que se usen para el ajuste del inventario.
    let filterLines = this.itemsList.filter(x => +x.available < (this.itemsList.filter(y => y.ItemCode == x.ItemCode).reduce((p, c) => { return p + c.Quantity }, 0)) && x.InvntItem === "Y");

    let filterLinesGroup = filterLines.filter((item, index) => {
      return filterLines.findIndex(x => x.ItemCode == item.ItemCode) == index;
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
          let cantidad = this.itemsList.filter(y => y.ItemCode == x.ItemCode).reduce((p, c) => { return p + c.Quantity }, 0);
          const LINE = {
            BarCode: x.BarCode,
            ItemCode: x.Item,
            ItemName: `${x.Item} - ${x.ItemName}`,
            Quantity: +cantidad - x.available,
            Available: x.available,
            Missing: +cantidad,
            TaxCode: x.TaxCode,
            UnitPrice: value.LastPrice,
            Discount: x.Discount,
            Tax_Rate: x.TaxRate,
            TaxRate: x.TaxRate,
            TotalLine: value.LastPrice * (cantidad - x.available),
            WareHouse: this.whCode,
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
          this.lines, this.invForm.controls.PriceList.value, this.CommentInv,
          this.usersCredentials, this.GoodsReceiptAccount, this.mappedUdfsOIGN,this.uniqueInvCode

        ).subscribe(response => {
          this.blockUI.stop();
          if (response.result) {
            this.returnedDocNum = response.DocNum;
            this.closebuttonInvSetting.nativeElement.click();
            (<HTMLButtonElement>document.getElementById('triggerAfterInvModal')).click();
            this.lines.forEach(x => {
              this.itemService.GetWHAvailableItem(x.ItemCode)
                .subscribe((data: any) => {
                  if (data.result) {
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
                    this.alertService.errorAlert('Error al obtener disponibilidad el artículo - ' + data.errorInfo.Message);
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
            this.alertService.errorAlert('Error' + response.errorInfo.Message);
          }
        }, error => {
          console.log(error);
          this.blockUI.stop();
          if (error.error && error.error.errorInfo) {
            this.alertService.errorAlert(`Error: código ${error.error.errorInfo.Code}. Detalle: ${error.error.errorInfo.Message}`);
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

  // LineTotalCalculateInventorySetting_ORIGINAL(i: number, field: string) {
  //   switch (+field) {
  //     case 1:
  //       this.lines[i].Quantity = +(parseFloat((<HTMLInputElement>document.getElementById('quantity_' + i)).value).toFixed(2));
  //       this.lines[i].TotalLine = this.lines[i].Quantity * this.lines[i].UnitPrice;
  //       this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].UnitPrice).toFixed(2);
  //       break;
  //     case 2:
  //       this.lines[i].UnitPrice = +(parseFloat((<HTMLInputElement>document.getElementById('unitPrice_' + i)).value).toFixed(2));
  //       this.lines[i].TotalLine = +(this.lines[i].Quantity * this.lines[i].UnitPrice).toFixed(2);
  //       break;

  //     case 3:
  //       this.lines[i].UnitPrice = +(parseFloat((<HTMLInputElement>document.getElementById('totalLine_' + i)).value).toFixed(2)) / this.lines[i].Quantity;
  //       this.lines[i].UnitPrice = +this.lines[i].UnitPrice.toFixed(2);
  //       this.lines[i].TotalLine = +(parseFloat((<HTMLInputElement>document.getElementById('totalLine_' + i)).value).toFixed(2));
  //       break;
  //   }

  //   this.TotalCalculateInventorySetting();
  // }

  // TotalCalculateInventorySetting_ORIGINAL() {
  //   this.CRCTotal = +this.lines.reduce((a, b) => a +
  //     (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) +
  //       (((b.UnitPrice * b.Quantity) - ((b.UnitPrice * b.Quantity) * (b.Discount / 100))) * (b.Tax_Rate / 100)) || 0), 0).toFixed(2);

  // }
  // #001 07/09/2021


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

  //#region 001 Region de metodos CRUD de la factura en memoria.

  // Metodo que carga la data de una factura en memoria, la data es el form de la factura, el form de FE y la lista de items (lineas)
  LoadMemoryInvoice(MemoryInvoice: IMemoryInvoice): void {

    if (this.currentMemoryInvoice) this.UpdateMemoryInvoice();
    this.currentMemoryInvoice = MemoryInvoice;

    this.itemsList = MemoryInvoice.ItemsList;

    //this.invForm.setValue(MemoryInvoice.InvForm);
    let invoiceForm = MemoryInvoice.InvForm;

    this.invForm.patchValue({
      Comments: invoiceForm.Comments,
      PayTerms: invoiceForm.PayTerms,
      PriceList: invoiceForm.PriceList,
      SlpList: invoiceForm.SlpList,
      cardCode: invoiceForm.cardCode,
      cardName: invoiceForm.cardName,
      currency: invoiceForm.currency,
      paymentType: invoiceForm.paymentType

    });

    if (invoiceForm.DocumentType)
      this.invForm.patchValue({ DocumentType: invoiceForm.DocumentType });

    this.feForm.setValue(MemoryInvoice.FEForm);

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
      InvForm: this.invForm.value,
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
      InvForm: this.invForm.value,
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
}
