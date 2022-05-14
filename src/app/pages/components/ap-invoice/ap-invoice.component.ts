import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  NgZone,
  HostListener,
  Renderer2,
  Inject,
} from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from "@angular/forms";
import { BlockUI, NgBlockUI } from "ng-block-ui";
import { Observable, Subject, merge, Subscription } from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
} from "rxjs/operators";
import { DecimalPipe, CurrencyPipe, DOCUMENT, formatDate } from "@angular/common";
import {
  NgbModal,
  ModalDismissReasons,
  NgbModalOptions,
} from "@ng-bootstrap/ng-bootstrap";
import { ElectronService } from "ngx-electron";
const printJS = require("print-js");
// MODELOS
import {
  Params,
  AppConstants,
  UserAssigns,
  IdentificationType,
  TypeInvoice,
  PayTermsEnum,
  IUdfTarget,
  IKValue,
  IUdf,
  IPPTransaction,
  ITerminal
} from "./../../../models/index";
import { BoRcptInvTypes, PaymentResults, ReportType } from "../../../enum/enum";

import { Currency } from 'src/app/models/i-currency';
// SERVICIOS
import { Router } from "@angular/router";
import {
  CompanyService,
  UserService,
  ItemService,
  BusinessPartnerService,
  DocumentService,
  TaxService,
  PermsService,
  AuthenticationService,
  ParamsService,
  ReportsService,
  AccountService,
  ExRateService,
  CardService,
  BankService,
  AlertService,
  SalesManService,
  JsonDataService,
  PaymentService,
  StorageService,
  CommonService

} from "../../../services/index";

// Electron renderer service
import { ElectronRendererService } from '../../../electronrenderer.service';
import { Item } from "electron";
import { IItemDetail } from "src/app/models/i-itemDetail";
import { EventManager } from "@angular/platform-browser";
import { CONFIG_VIEW, DOCUMENT_ALIAS } from "src/app/models/constantes";
import { UdfsService } from "src/app/services/udfs.service";
import { IudfValue } from "src/app/models/iudf-value";
import { IContableAccounts } from "src/app/models/i-contableaccounts";
import { BasePayment, PaymentLines } from "src/app/models/i-payment-document";
import { IInvoiceInfoForPayment, IOnPaymentFail } from "src/app/models/i-payment-data";
import { PaymentComponent } from "src/app/components/payment/payment.component";

// PIPES

export enum KEY_CODE {
  F4 = 115,
  F7 = 118,
  F8 = 119

}

@Component({
  selector: 'app-ap-invoice',
  templateUrl: './ap-invoice.component.html',
  styleUrls: ['./ap-invoice.component.scss'],
  providers: [DecimalPipe, CurrencyPipe]
})

export class ApInvoiceComponent implements OnInit, OnDestroy, AfterViewInit {

  whCode: string;
  whName: string;

  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
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
  bpList: any[] = []; // lista de proveedores
  bpCodeList: string[] = []; // lista de los Códigos de proveedores
  bpNameList: string[] = []; // lista de los nombres de proveedores
  conta: number; // variable contador para colocar un 'id' a la lista de items
  total: number; // variable para almacenar el total de la factura
  totalUSD: number; //Variable almacena total factura en USD
  tax: number; // variable para almacenar el total de impuestos
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
  // modal de pagos

  accountList: IContableAccounts; // lista de cuentas
  cardsList: any[] = []; // lista de tarjetas
  banksList: any[] = []; // lista de bancos
  salesManList: any[] = []; // lista de vendedores
  currencyPayment: string; // moneda selecionada al buscar los anticipos
  modalPay: any; // instancia de la modal de pagos
  modalChange: any; // instancia de la modal de vueltos
  TotalG: number; // monto total del pago
  ReceivedG: number; // monto total recibido del pago
  DifferenceG: number; // monto total de la diferencia, o salto restante
  ChangeG: number; // guarda el vuelto
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
    { id: 1, name: "Contado" },
    { id: 2, name: "Credito" },
  ];
  paymentType: number = 1;
  pesoBolsa: number = 0.020;
  priceEditable: boolean = false;
  maxWeightTo0: number = 0.01;
  userAssignsList: UserAssigns[] = [];
  identificationTypeList: any[] = [];
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
  DEFAULT_AP_INVO_BUSINESS_PARTNER: string;
  tableLength: number;
  isOnSubmit: boolean = false;
  @ViewChild("name") nameField: ElementRef;
  lastInvoice: number;
  @ViewChild("payContent") payContentModal: any;
  isBilling: boolean;
  attemptsWhileBilling: number = 0;
  typesInvoice: any[] = [];

  //------------------------
  isLockedByScanner: boolean;
  buildedData: string;
  isScanning: boolean;
  searchTypeManual: boolean;
  isProcessing: boolean;
  userCurrency: string;
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  udfs: IUdf[];

  uniqueDocumentID: string;
  DefaultCardValid : String;
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

  //001
  ItemDetail: IItemDetail;
  CommentarioActual: string

  constructor(private fb: FormBuilder,
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
    private router: Router,
    private commonService: CommonService,
    private alertService: AlertService,
    private jsonDataService: JsonDataService,
    private smService: SalesManService,
    private cp: CurrencyPipe,
    private renderer: Renderer2,
    private eventManager: EventManager,
    @Inject(DOCUMENT) private _document: Document,
    private paymentService: PaymentService,
    private electronRendererService: ElectronRendererService,
    private storage: StorageService,
    private udfService: UdfsService,) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.checkPermits();

    });
    this.expandedIndex = -1;



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


  ngOnInit() {
    this.isLockedByScanner = false;
    this.udfTargets = [];
    this.terminals = [];
    this.pinPadCards = [];
    this.udfs = [];
    this.GetDefaultPaymentSettings();
    this.GetDefaultBussinesPartnerSettings();
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.APINVOICE);
    this.ItemDetail = {} as IItemDetail;
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
    this.conta = 0;
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.identificationTypeList = IdentificationType;
    this.invForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_AP_INVO_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      PayTerms: ['', Validators.required],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      paymentType: ['']
    });
    this.typesInvoice = TypeInvoice;
    this.invForm.patchValue({ DocumentType: this.typesInvoice[1].Name });
    this.invForm.patchValue({ paymentType: this.paymentTypes[0].id });





    this.createFEForm();
    this.getMaxDiscout();
    this.getSuppliers();
    this.GetParamsViewList();

    // this.DEFAULT_AP_INVO_BUSINESS_PARTNER = JSON.parse(this.storage.getCurrentSession()).DefaultApInvoBussinesPartnerUI;

    this.getExchangeRate();
    this.getExRate();
    this.GetPriceList();

    this.getItems();
    this.getTaxes();
    this.getAccount();
    this.getCards();
    this.getAccountsBank();
    this.getCompanies();

    this.setSalesPerson();
    this.Cant.setValue(1);
    this.correctInvoice = false;
    this.setWarehouseInfo();

    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();
  }

  //#1
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










  ngAfterViewInit() { }

  getBPFEData() {
    if (this.invForm.controls.paymentType.value === '2') {
      this.blockUI.start('Obteniendo datos FE...');
      this.bpService.GetCustomersCred(this.invForm.controls.cardCode.value).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.getProvincesPatch(data);
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error getTaxes!!!, Error: ${error.error.Message}`);
      });
    }
  }
  // obtiene la informacion de factura electronica cuando se introducen ciertos datos preliminares de factura de contado
  queryFEData() {
    if (this._timeout) {
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(() => {
      this._timeout = null;
      if (Number(this.invForm.controls.paymentType.value) === 1 && this.feForm.controls.IdType.value !== "") {
        this.blockUI.start('Obteniendo datos FE...');
        this.bpService.GetCustomersCont(this.feForm.controls.IdType.value, this.feForm.controls.Identification.value).subscribe((data: any) => {
          this.blockUI.stop();
          if (data.Result) {
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
          this.alertService.errorInfoAlert(`Error getTaxes!!!, Error: ${error.error.Message}`);
        });
      }
    }, 2000);
  }

  queryFEData2() {
    let paymentTerm = this.PayTermsList.find(x => x.GroupNum === Number(this.invForm.controls.PayTerms.value));
    if (paymentTerm.Type === PayTermsEnum.Contado && this.feForm.controls.IdType.value !== "") {
    // if (Number(this.invForm.controls.paymentType.value) === 1 && this.feForm.controls.IdType.value !== "") {
      this.blockUI.start('Obteniendo datos FE...');
      this.bpService.GetCustomersCont(this.feForm.controls.IdType.value, this.feForm.controls.Identification.value).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
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
          // busca info del Proveedor en el padron
          this.blockUI.stop();
          this.blockUI.start('Obteniendo datos del padrón...');
          if (this.feForm.controls.Identification.value != '') {
            this.bpService.GetCustomersContPadron(this.feForm.controls.Identification.value).subscribe((data: any) => {
              this.blockUI.stop();
              if (data.tipoIdentificacion == this.feForm.controls.IdType.value) {
                this.invForm.patchValue({ cardName: data.nombre });
              } else {
                this.alertService.errorInfoAlert(`Error no se ha encontrado la informacion en el padron del número de identificación ingresado.`);
              }
            }, (error: any) => {
              this.blockUI.stop();
              this.alertService.errorInfoAlert(`Error Padrón: No se ha encontrado la informacion en el padron del número de identificación ingresado.`);
            });
          }
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error Obteniendo datos FE!!!, Error: ${error.error.Message}`);
      });
    }
  }
  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_ApInvoice") {
            this.permisos = Perm.Active;
            if (this.permisos) {
              this.nameField.nativeElement.focus();
            }
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

  // establece la persona que es el vendedor
  setSalesPerson() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.uService.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userAssignsList = data.Users;
        this.userAssignsList.forEach(user => {
          if (this.currentUser.userId.toString() === user.UserId.toString()) {
            this.defaultListNum = user.PriceListDef;
            this.defaultSlpCode = user.SlpCode;
            this.defaultSlpCodeStr = user.SlpCode;
            this.invForm.patchValue({ SlpList: user.SlpCode });
          }
        });
        this.GetSalesPersonList();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.Error.Message);
      }
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


  // Viene de facturacion
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


            // if (this.isOnGroupLine) {
            //   var index: number = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
            //   if (index != -1) {
            //     this.itemsList[index].Quantity += this.cant;
            //     this.itemsList[index].LinTot = this.itemsList[index].Quantity * this.itemsList[index].UnitPrice;
            //     searchitem = false;
            //     this.LineTotalCalculate(index);
            //     this.getTotals();
            //     this.GetAvailableItemInventory(code, this.itemsList[index].Quantity);
            //     this.ItemInfo.setValue('');
            //     this.Cant.setValue(1);
            //     this.searchTypeManual = false;

            //     return;
            //   }
            // }

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
                if (data.Result) {
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
                      'WarehouseCode': this.whCode,
                      'WhsName': this.whName,
                      'Serie': '',
                      'SysNumber': 0,
                      'InvntItem': data.Item.InvntItem,
                      'OnHand': data.Item.OnHand,

                    };

                    //  AUXILIAR_ITEM.UnitPrice = AUXILIAR_ITEM.UnitPrice.toFixed(this.COMPANY.DecimalAmountPrice);


                    AUXILIAR_ITEM.UnitPrice = AUXILIAR_ITEM.UnitPrice.toFixed(2);

                    if (this.userCurrency != 'COL' && this.userCurrency != 'USD') {
                      AUXILIAR_ITEM.Quantity = 1;
                      AUXILIAR_ITEM.LinTot = 0;
                      AUXILIAR_ITEM.UnitPrice = 0;
                      this.storage.setLog(`ERROR!, fecha: ${new Date()} ---(${this.invForm.controls.currency.value})`);
                    }

                    // this.isLineMode ? this.itemsList.push(AUXILIAR_ITEM) : this.itemsList.unshift(AUXILIAR_ITEM)

                    // this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0)

                    this.itemsList.push(AUXILIAR_ITEM);

                    this.LineTotalCalculate(this.itemsList.length - 1)
                    this.getTotals();

                  }

                  this.Cant.setValue(1);
                  this.ItemInfo.setValue('');

                  // const LastPP = data.Item.LastPurchasePrice ? data.Item.LastPurchasePrice : 0;
                  // if (data.Item.UnitPrice <= LastPP && data.Item.UnitPrice != 0) {
                  //   this.alertService.infoInfoAlert(`Costo del Artículo: ${data.Item.ItemCode}-${data.Item.ItemName} es mayor o igual al precio de venta. Modifique precio por favor`);//Precio costo:	₡${data.Item.LastPurchasePrice} Precio Venta: ₡${data.Item.UnitPrice}
                  // }

                  let cantsingroupLine: number = 0;
                  this.itemsList.forEach(x => {
                    if (x.Item === code) {
                      cantsingroupLine += x.Quantity;
                    }
                  });

                  //if (_isManualTrigger)
                  (<HTMLElement>document.getElementById('helperClick')).click();
                  // this.itemService.GetWHAvailableItem(code)
                  //   .subscribe((data: any) => {
                  //     if (data.Result) {
                  //       let available: boolean = false;
                  //       let cantAvailable: number = 0;
                  //       let index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
                  //       data.whInfo.forEach(wh => {
                  //         if (wh.InvntItem === "N") {
                  //           available = true;
                  //         }
                  //         cantAvailable = wh.Disponible;
                  //         if (wh.Disponible >= this.cant) {
                  //           available = true;
                  //         }


                  //       });
                  //       this.itemsList[index].available = cantAvailable;
                  //       if (cantAvailable < cantsingroupLine && !available) {
                  //         this.alertService.infoInfoAlert(`Sin stock, solicitud de ${cantsingroupLine}, disponible:${cantAvailable} `);
                  //       }

                  //       if (!available) {
                  //         // index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
                  //         if (index !== -1) {
                  //           this.itemsList[index].Quantity = 0;
                  //           this.itemsList[index].LinTot = 0;
                  //           searchitem = false;
                  //           this.LineTotalCalculate(index)
                  //           this.getTotals();
                  //         }
                  //         this.blockUI.stop();
                  //         this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
                  //       }
                  //       this.blockUI.stop();
                  //     } else {
                  //       this.blockUI.stop();
                  //       this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.Error.Message);
                  //     }

                    // }, (error: any) => {
                    //   this.blockUI.stop();
                    //   this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
                    // });

                } else {
                  this.blockUI.stop();
                  this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
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




  // metodo actual al dia 29/09/2021 -> Obsoleto
  // addItems(item) {

  //   if (this.ItemInfo.value !== '') {

  //     let mobileNavigatorObject: any = window.navigator;
  //     if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
  //       mobileNavigatorObject.clipboard.readText()
  //         .then(text => {

  //           if (!isNaN(parseInt(text))) {
  //             if (Number(text) > this.maxWeightTo0) {
  //               mobileNavigatorObject.clipboard.writeText("*")
  //                 .then(text => {
  //                 })
  //                 .catch(err => {
  //                 });
  //             }

  //           }

  //           let cant = Number(this.Cant.value);
  //           let cant2 = Number(this.Cant.value);
  //           let code = item.item.split(' COD. ')[0];
  //           let searchitem = true;
  //           this.blockUI.start('Obteniendo Información del Artículo, espere por favor...');
  //           var index: number = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
  //           if (index != -1) {
  //             this.itemsList[index].Quantity += cant;
  //             this.itemsList[index].LinTot = this.itemsList[index].Quantity * this.itemsList[index].UnitPrice;
  //             searchitem = false;
  //             this.LineTotalCalculate(index)
  //             this.getTotals();
  //             this.blockUI.stop();
  //           }
  //           this.hasLines = true;
  //           this.itemService.GetItemByItemCode(item.item.split(' COD. ')[0], this.invForm.controls.PriceList.value)
  //             .subscribe((data: any) => {
  //               if (data.result) {
  //                 if (searchitem) {
  //                   this.conta++;
  //                   this.total += data.Item.UnitPrice;
  //                   let tot = (data.Item.UnitPrice * cant);
  //                   this.itemsList.push({
  //                     'Item': `${code}`,
  //                     'ItemCode': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
  //                     'ItemName': `${data.Item.ItemName}`,
  //                     'CodeName': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
  //                     'UnitPrice': this.invForm.controls.currency.value == 'COL' ? data.Item.UnitPrice : (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toFixed(2))),
  //                     'U_SugPrice': '0',
  //                     'TaxCode': data.Item.TaxRate != 0.0 ? data.Item.TaxCode : 'EXE',
  //                     'Quantity': cant,
  //                     'Active': true,
  //                     'Id': this.conta,
  //                     'LinTot': tot,
  //                     'TaxRate': data.Item.TaxRate != 0.0 ? data.Item.TaxRate : 0.00,
  //                     'Discount': 0.00,
  //                     'WhsCode': this.whCode,
  //                     'WhsName': this.whName,
  //                     'Serie': '',
  //                     'SysNumber': 0,
  //                     'InvntItem': data.Item.InvntItem,
  //                     'OnHand': data.Item.OnHand
  //                   });

  //                   this.LineTotalCalculate(this.itemsList.length - 1)
  //                   this.getTotals();
  //                 }
  //                 this.Cant.setValue(1);
  //                 this.ItemInfo.setValue('');
  //                 this.itemService.GetWHAvailableItem(code)
  //                   .subscribe((data: any) => {
  //                     if (data.result) {
  //                       let available: boolean = false;

  //                       data.whInfo.forEach(wh => {
  //                         if (wh.InvntItem === "N") {
  //                           available = true;
  //                         }
  //                         if (wh.Disponible >= cant) {
  //                           available = true;
  //                         }
  //                       });

  //                       if (!available) {
  //                         index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
  //                         if (index !== -1) {
  //                           this.itemsList[index].Quantity = 0;
  //                           this.itemsList[index].LinTot = 0;
  //                           searchitem = false;
  //                           this.LineTotalCalculate(index)
  //                           this.getTotals();
  //                         }
  //                         this.blockUI.stop();
  //                         this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
  //                       }
  //                       this.blockUI.stop();
  //                     } else {
  //                       this.blockUI.stop();
  //                       this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
  //                     }

  //                   }, (error: any) => {
  //                     this.blockUI.stop();
  //                     this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
  //                   });

  //               } else {
  //                 this.blockUI.stop();
  //                 this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
  //               }
  //               this.blockUI.stop();
  //             }, (error: any) => {
  //               this.blockUI.stop();
  //               this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
  //             });


  //         })
  //         .catch(err => {
  //         });
  //     }



  //   }
  // }


  cantChange() {
    if (this.Cant.value < 1) {
      this.Cant.setValue(1);
    }
  }

  // obtiene el tipo de cambio
  getExRate() {
    this.blockUI.start('Obteniendo tipos de cambios, espere por favor...');
    this.exrate.getExchangeRate().subscribe((data: any) => {
      if (data.Result) {

        this.DailyExRate = data.exRate
        this.blockUI.stop();
        //this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
      }

    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error getSuppliers!!!, Error: ${error.error.Message}`);
    });
  }

  // obtiene el maximo descuento posible
  getMaxDiscout() {
    this.blockUI.start('Obteniendo tipos de cambio, espere por favor...');
    this.documentService.getMaxDiscout().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.maxDiscuont = data.discount
        this.blockUI.stop();
      }
      else {
        this.blockUI.stop();
        this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
      }
    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error getSuppliers!!!, Error: ${error.error.Message}`);
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
    this.currentUserSubscription.unsubscribe();
  }

  // *****Parte de fecuturacion*****/

  // funcion para obtener los proveedores desde SAP
  // no recibe parametros
  getSuppliers() {
    this.blockUI.start('Obteniendo proveedores, espere por favor...');
    this.bpService.GetSuppliers()
      .subscribe((data: any) => {
        if (data.Result) {
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
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener los items desde SAP
  // no recibe parametros
  getItems() {
    this.blockUI.start('Obteniendo ítems, espere por favor...');
    this.itemService.GetItems()
      .subscribe((data: any) => {
        if (data.Result) {
          this.itemsTypeaheadList.length = 0;
          this.itemsList.length = 0;
          this.itemsCodeList.length = 0;
          this.itemsNameList.length = 0;

          this.itemsTypeaheadList = data.ItemList.ItemCompleteName;
          this.itemsCodeList = data.ItemList.ItemCode;
          this.itemsNameList = data.ItemList.ItemName;
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);

        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener los impuestos desde SAP
  // no recibe parametros

  getTaxes() {
    this.blockUI.start('Obteniendo impuestos, espere por favor...');
    this.taxService.GetTaxes()
      .subscribe((data: any) => {
        if (data.Result) {
          this.taxesList.length = 0;
          this.taxesList = data.Taxes;
          this.taxesList.push({
            "TaxCode": 'EXE',
            "TaxRate": '0.00'
          })
        } else {
        }
        this.blockUI.stop();
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  // funcion para obtener los proveedores desde SAP
  // recibe como parametros el item y el index
  selectedItem(item, idx) {
    if (item.item !== "") {
      this.blockUI.start('Obteniendo información del artículo, espere por favor...');
      this.itemService.GetItemByItemCode(item.item.split(' COD. ')[0], this.invForm.controls.PriceList.value)
        .subscribe((data: any) => {
          if (data.Result) {
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
              'WarehouseCode': this.whCode,
              'WhsName': this.whName,
              'Serie': '',
              'SysNumber': 0
            });
            this.getTotals();
          } else {
            this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
          }
          this.blockUI.stop();
        }, (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
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
        "No se puede eliminar la ultima línea del documento"
      );
    }
  }

  getClipboardData() {

    let mobileNavigatorObject: any = window.navigator;
    if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
      mobileNavigatorObject.clipboard.readText()
        .then(text => {
          this.Cant.setValue(Number(text));
          mobileNavigatorObject.clipboard.writeText("0")
            .then(text => {

            })
            .catch(err => {
            });
        })
        .catch(err => {
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

  // searchItemCode = (text$: Observable<string>) =>
  //   text$.pipe(
  //     //debounceTime(5),
  //     distinctUntilChanged(),
  //     map(term => term.length < 1 ? []
  //       : this.itemsTypeaheadList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
  //   )


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
        let code = cardCode[0];
        let codePos = this.bpCodeList.indexOf(code);
        let cardName = this.bpNameList[codePos];

        let customer = this.bpList.filter(cus => {
          return cus.CardCode === code;
        });
        this.getCurrencyByUser(customer[0].Currency);
        if (cardName !== this.invForm.get('cardName').value) {
          this.invForm.patchValue({ cardName: cardName });

        }

        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;
            this.invForm.patchValue({ PayTerms: item.GroupNum.toString() });
          }
        }
        for (let item of this.PriceList) {
          if (item.ListNum.toString() === customer[0].ListNum.toString()) {
          }
        }
        let nombre = "Contado";
        this.defaultContado = "Contado";
        if (customer[0].ClienteContado === false) {
          nombre = "Credito";
          this.defaultContado = "Credito";
        }
        for (let item of this.paymentTypes) {
          if (nombre === item.name.toString()) {
            this.invForm.patchValue({ paymentType: item.id });
          }
        }
      }
    }
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
        // tslint:disable-next-line:no-unused-expression
        if (cardCode !== this.invForm.get('cardCode').value) {
          this.invForm.patchValue({ cardCode: cardCode });
        }
        for (let item of this.bpList) {
          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;
            this.invForm.patchValue({ PayTerms: item.GroupNum.toString() });
          }
        }
        let nombre = "Contado";
        this.defaultContado = "Contado";
        if (customer[0].ClienteContado === false) {
          nombre = "Credito"
          this.defaultContado = "Credito";
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
  getTotals() {
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.itemsList.forEach((x) => {

      const FIRST_SUBTOTAL = (x.Quantity * x.UnitPrice);
      const LINE_DISCOUNT = FIRST_SUBTOTAL * (x.Discount / 100);

      const SUBTOTAL_WITH_LINE_DISCOUNT = Math.round(((FIRST_SUBTOTAL - LINE_DISCOUNT) + Number.EPSILON) * 100) / 100;

      const HEADER_DISCOUNT = 0; // Este campo lo deja eaguilar para que si en futuro se decide implementar descuento de cabecera en el proyecto solo sea mapear la variable y no alterar la formula del cálculo

      const TOTAL_HEADER_DISCOUNT = (SUBTOTAL_WITH_LINE_DISCOUNT * HEADER_DISCOUNT);

      const SUBTOTAL_WITH_HEADER_DISCOUNT = SUBTOTAL_WITH_LINE_DISCOUNT - TOTAL_HEADER_DISCOUNT;

      const CURRENT_TAX_RATE = x.TaxRate / 100;

      const TOTAL_TAX = Math.round(((SUBTOTAL_WITH_HEADER_DISCOUNT * CURRENT_TAX_RATE) + Number.EPSILON) * 100) / 100;

      this.totalWithoutTax += Math.round((SUBTOTAL_WITH_HEADER_DISCOUNT * 1 + Number.EPSILON) * 100) / 100;

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

    if (this.invForm.controls.currency.value == 'COL') {
      this.total += (parseFloat(Number(this.totalWithoutTax + this.tax).toFixed(2)));
      this.totalUSD += parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toFixed(2));
    }
    else {
      this.total += (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toFixed(2)));
      this.totalUSD += parseFloat(Number(this.totalWithoutTax + this.tax).toFixed(2));
    }

  }

  // funcion al cambiar el tipo de taxcode
  // recibe como parametro el taxxode y el indice de la lista
  changeTaxCode(i: number, item: any) {
    const rate = this.taxesList.find(i => i.TaxCode === item.TaxCode.toUpperCase());
    const idx: number = this.itemsList.indexOf(this.itemsList.find(x => x.ItemCode == item.ItemCode));

    if (typeof rate !== 'undefined') {
      this.itemsList[idx].TaxRate = parseFloat(this.decimalPipe.transform(rate.TaxRate, '.2'));
      this.itemsList[idx].TaxCode = rate.TaxCode.toUpperCase();
      this.LineTotalCalculate(idx);
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
    let lineTotal = Number((qty * price).toFixed(2));
    const taxamount = Number(
      (lineTotal * (this.itemsList[idx].TaxRate / 100)).toFixed(2)
    );
    lineTotal = Number((lineTotal + taxamount).toFixed(2));
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toFixed(2));
    this.itemsList[idx].LinTot = lineTotal.toString();
    this.getTotals();
  }

  LineTotalCalculateExt(idx: number) {
    idx = this.itemsList.length - idx - 1;
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
    let lineTotal = Number((qty * price).toFixed(2));
    const taxamount = Number(
      (lineTotal * (this.itemsList[idx].TaxRate / 100)).toFixed(2)
    );
    lineTotal = Number((lineTotal + taxamount).toFixed(2));
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toFixed(2));
    this.itemsList[idx].LinTot = lineTotal.toString();
    this.getTotals();
  }

  // funcion para imprimir la factura
  printARInvoice(DocEntry: number) {
    this.blockUI.start('Generando la impresión...');
    this.reportsService.printReport(DocEntry, ReportType.ArInvoice)
      .subscribe(data => {
        this.blockUI.stop();
        if(data.Result){
        if (this.electronRendererService.CheckElectron()) {
          let fileName = 'Invoice_' + DocEntry + '.pdf';
          let file = { "fileName": fileName, "file": data.Data};
          this.electronRendererService.send('Print', file);
        }
        else {
          printJS({
            printable: data.Data,
            type: 'pdf',
            base64: true
          })
        }
      }else{
        this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);
      }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
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
        if (data.Result) {
          this.viewParamList = data.Params.filter(param => {
            return param.type === 1 && param.Visibility && param.ParamsId != 80; // Agregue esto (&& param.PramsId!=80) para que no jale la columna de articulo bonificado ya que aqui no se requiere aun.
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
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data.Error.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener la informacion de los disponibles de un item en los almacenes
  // recibe como parametros el item y el index
  GetWHAvailableItem(event, content, ItemCode, idx) {
    if (ItemCode !== '') {
      if (event.type === 'dblclick') {
        event.srcElement.blur();
        event.preventDefault();
        this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor...');
        this.itemService.GetWHAvailableItem(ItemCode)
          .subscribe((data: any) => {
            if (data.Result) {
              this.WHAvailableItemList.length = 0;
              this.itemCode = ItemCode;
              this.indexAvaItem = this.itemsList.length - 1 - idx;
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
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
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
          if (data.Result) {
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
            this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.Error.Message);
          }

        }, (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
  }

  // funcion para seleccionar un almacen nuevo para el item a facturar
  avaItemSelected(event, avaItem, idx: number) {
    if (event.type === 'dblclick') {
      this.itemsList[this.indexAvaItem].WarehouseCode = avaItem.WarehouseCode;
      this.itemsList[this.indexAvaItem].WhsName = avaItem.WhsName;
      this.itemsList[this.indexAvaItem].Serie = "";
      this.itemsList[this.indexAvaItem].SysNumber = 0;
      this.close();
    } else if (event.type === 'click') {
      this.itemService.GetSeriesByItem(this.itemCode, avaItem.WarehouseCode).subscribe((data: any) => {
        if (data.Result) {
          this.seriesList.length = 0;
          this.seriesList = data.series;
          if (data.series.length > 0) {
            this.expandRow(idx);
          } else {
          }
          this.blockUI.stop();
        }
      },
        (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(
            `Error al intentar conectar con el servidor, Error: ${error}`
          );
        }
      );
    }
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
      this.itemsList[this.indexAvaItem].WarehouseCode = avaItem.WarehouseCode;
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
      if (element.Name === "lbCardCodeS") {
        this.lbCardCode = element;
      }
      if (element.Name === "txtCardCode") {
        this.txtCardCode = element;
      }
      if (element.Name === "lbCardNameS") {
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
      return param.Name === 'T_Apinv';//T_Apinv
    });
    // this.title = obj[0].Text;
  }

  // ***** parte de Pagos *****

  // cierra el modal de pagos
  closePayModal() {
    this.modalPay.close();
    this.isOnSubmit = false;
  }

  closeChangeModal() {
    this.modalChange.close();
  }

  RiseInvoceCompleteModal(modalContent: boolean): void {
    this.modalInvoiceContent = modalContent;
    (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();

  }



  CreatePay(_payment: BasePayment) {
    if (this.isBilling) {
      this.attemptsWhileBilling++;
      console.log('Intento duplicación de factura ', this.attemptsWhileBilling);
      return;
    }
    this.blockUI.start('Generando factura y pago, espere por favor...');
    this.isBilling = true;
    if (!navigator.onLine) {
      this.blockUI.stop();
      this.alertService.infoAlert("Parece que no tienes internet. Vuelve a intertarlo mas tarde");
      return;
    }
    this.facturando = true;
    let payOk = true;
    // if (this.ReceivedG < this.TotalG) {
    //   payOk = this.partialPayValidator();
    // }
    if (payOk) {
      // const PaymentLines = [];
      // let dT = 1;
      // PaymentLines.push({
      //   'InvTotal': this.total,
      //   'DocNum': 0,
      //   'PayTotal': this.TotalG,
      //   'DocEntry': 0,
      //   'InstId': 30, // plasos
      //   'Currency': this.invForm.value.currency,
      //   'Balance': this.TotalG,
      //   'DocType': dT,
      //   'PayBalanceChk': false, // Verifica el pago vs saldo
      //   'ReceivedAmount': this.ReceivedG,
      //   'Change': this.ChangeG
      // });
      // let total = 0;
      // total = this.total;

      // const Payments = {
      //   CardCode: this.invForm.value.cardCode,
      //   CashAccount: this.cashForm.value.AccountCash,
      //   CashSum: this.cashForm.value.TotalCash,
      //   CashCurr: this.currencyPayment,
      //   Comments: 'pago de factura',
      //   Currency: this.currencyPayment,
      //   DocRate: this.currencyChange,
      //   SlpCode: this.invForm.controls.SlpList.value,
      //   Total: total,
      //   V_Checks: this.V_Checks,
      //   V_CreditCards: this.V_CreditCards,
      //   V_PaymentLines: PaymentLines,
      //   transfSum: this.transferForm.value.TransSum,
      //   trfsrAcct: this.transferForm.value.AccountTransf,
      //   trfsrCurr: this.currencyPayment,
      //   trfsrDate: this.transferForm.value.DateTrans,
      //   trfsrNum: this.transferForm.value.Ref,
      // };

      this.documentService.CreateapInvoice(this.invForm, _payment, this.itemsList, this.feForm, this.mappedUdfs, this.uniqueDocumentID)
        .subscribe((data: any) => {
          this.blockUI.stop();

          if (data.Result) {
            console.log('Result from payment',data);


            this.NameActionDocument = 'Factura creada correctamente';
            this.returnedDocEntry = data.DocEntry;
            this.returnedDocNum = data.DocNum;
            this.returnedNumFE = data.NumDocFe;
            this.lastInvoice = data.DocEntry;
            this.IsPaymentFail = false;
            this.RiseInvoceCompleteModal(true);


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




            this.btnVisibleBool = false;
            this.correctInvoice = true;
            this.facturando = false;
          } else {
            this.blockUI.stop();
            this.blockUI.stop();
            this.facturando = false;
            this.alertService.errorAlert(`Error al crear el pago: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
            this.attemptsWhileBilling = 0;
            this.isBilling = false;
            this.IsPaymentFail = true;
            this.onSubmit();
          }
          this.facturando = false;
        }, (error) => {
          this.facturando = false;
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
          this.attemptsWhileBilling = 0;
          this.isBilling = false;
          this.IsPaymentFail = true;
          this.onSubmit();

        });
    }
  }

  DeleteOffLineInvoice(invId: number) {
    this.documentService.DeleteOffLineInvoice(invId)
      .subscribe((data: any) => {
        if (data.Result) {
        }
        else {
          console.log(`Error al crear el pago: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
        }
      }, (error) => {
        console.log(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  testKeydown(a) {
    if (a.which === 13) {
      this.closeChangeModal();
    }

  }

  printInvoice() {
    this.printARInvoice(this.lastInvoice);
  }

  onSubmit() {
    if (!this.UdfOPCHValidation()) {
      this.blockUI.stop();
      return;
    }
    const CORRUPTED_QUANTITY = this.itemsList.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.ItemCode}  - ${CORRUPTED_QUANTITY.ItemName}, debe ser mayor a 0`);
      return;
    }
    if (!this.invForm.invalid) {
      if (this.itemsList.length > 0) {
        if (this.total > 0) {
          this.facturando = true;
          if (Number(this.PayTermsList.find(x => x.GroupNum == this.invForm.controls.PayTerms.value).Type) === PayTermsEnum.A30Dias) {
            this.blockUI.start('Generando factura, espere por favor...');
            this.documentService.CreateapInvoice(this.invForm, {}, this.itemsList, this.feForm, this.mappedUdfs, this.uniqueDocumentID)
              .subscribe((data: any) => {
                this.blockUI.stop();
                if (data.Result) {

                  this.NameActionDocument = 'Factura crédito creada correctamente';
                  this.returnedDocEntry = data.DocEntry;
                  this.returnedDocNum = data.DocNum;
                  this.returnedNumFE = data.NumDocFe;
                  this.lastInvoice = data.DocEntry;
                  this.RiseInvoceCompleteModal(false);
                  this.btnVisibleBool = false;
                  this.correctInvoice = true;

                  this.facturando = false;
                } else {
                  this.facturando = false;
                  this.alertService.errorAlert(`Error al crear factura: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
                }
              }, (error) => {
                this.blockUI.stop();
                this.facturando = false;
                this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
              });
          } else {
            this.DifferenceG = this.total;
            //this.resetModalData();
            this.TotalG = this.total;
            this.setTotalAmount();
            if (this.invForm.controls.currency.value == 'COL') {
            }
            else {
              this.changeCurrency();
            }

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


                let change = this.invForm.value.currency == 'COL' ? this.changeColones : this.changeDolares;

                this.PaymentFail = reason.OnFail;

                Payment.PaymentInvoices = this.CreatePaymentLines();

                this.terminals = reason.PinpadInfo.terminals;
                this.pinPadCards = reason.PinpadInfo.pinPadCards;
                this.pPTransaction = reason.PinpadInfo.pPTransaction;
                this.CreatePay(Payment);
              } else if (reason.status == PaymentResults.CancelButton) {
                this.IsPaymentFail = false;
                this.facturando = false;
              }
            });
          }
        } else {
          this.isOnSubmit = false;
          this.alertService.infoInfoAlert(
            "El monto total de la factura debe ser mayor a 0"
          );
        }
      } else {
        this.isOnSubmit = false;
        this.alertService.infoInfoAlert(
          "Debe existir al menos un Item en la factura"
        );
      }
    } else {
      this.isOnSubmit = false;
      this.alertService.infoInfoAlert(
        "Debe haber seleccionado un proveedor, sede, moneda, vendedor y comentario, gracias."
      );
    }
  }

  CreateInvOnline(ClaveFE: string, NumFe: string) {
    this.documentService.createInvOnline(this.invForm, {}, this.itemsList, this.feForm, ClaveFE, NumFe)
      .subscribe((data: any) => {
        this.documentService.CreateapInvoice(this.invForm, {}, this.itemsList, this.feForm, this.mappedUdfs, this.uniqueDocumentID)
        this.blockUI.stop();
        this.alertService.successAlertHtml(`Factura creada correctamente`);
        this.btnVisibleBool = false;
        this.correctInvoice = true;
        this.lastInvoice = data.DocEntry;
        this.facturando = false;
      }, (error) => {
        this.blockUI.stop();
        this.facturando = false;
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para resetear los valores de la modal
  resetModalData() {
    this.currencyPayment = "COL";
    this.TotalCash = 0;
    this.TotalCards = 0;
    this.TotalCheck = 0;
    this.TotalTransfer = 0;
    this.TotalG = 0;
    this.ReceivedG = 0;
    this.DifferenceG = 0;
    this.ChangeG = 0;
    this.V_Checks.length = 0;
    this.V_CreditCards.length = 0;

  }

  // funcion para calcular el total de recibido y de diferencia para el pago
  setTotalAmount() { //decimalPipe
    this.ReceivedG = Number((this.TotalCash + this.TotalCards + this.TotalCheck + this.TotalTransfer).toFixed(2));
    let diff = Number((this.TotalG - this.ReceivedG).toFixed(2));
    this.DifferenceG = Math.max(diff, 0.0);
    this.ChangeG = Math.max(0, -1 * diff);

    if (this.currencyPayment !== 'COL') {
      this.changeDolares = this.ChangeG;
      this.changeColones = Number((this.ChangeG * this.currencyChange).toFixed(2));
    }
    else {
      this.changeDolares = Number((this.ChangeG / this.currencyChange).toFixed(2));;
      this.changeColones = this.ChangeG;
    }


  }

  // funcion para obtener una lista de cuentas segun la compañía seleccionada
  getAccount() {
    this.blockUI.start('Obteniendo cuentas, espere por favor...');
    this.accountService.getAccount()
      .subscribe((data: any) => {
        if (data.Result) {
          this.accountList = data.Data;

          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('Error al cargar cuentas - error: ' + data.Error.Message);
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
    return Number((num).toFixed(2));
  }

  // funcion para cambiar el tipo de moneda en la modal de pagos
  changeCurrency() {
    if (this.currencyPayment !== 'COL') {
      this.TotalG = this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
      this.ReceivedG = this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
      this.currencyPayment = 'USD';
    } else {
      this.TotalG = this.total;
      this.ReceivedG = this.total;
      this.currencyPayment = 'COL';
    }
    this.ReceivedG = 0;
    this.setTotalAmount();
  }

  // funcion qu obtiene el tipo de cambio
  getExchangeRate() {
    this.blockUI.start('Obteniendo tipo de cambio, espere por favor...');
    this.exRateService.getExchangeRate()
      .subscribe((data: any) => {
        if (data.Result) {
          this.currencyChange = data.exRate;
          this.blockUI.stop();

        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('error al cargar tipo de cambio - Error: ' + data.Error.Message);

        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);

      });
  }

  getCards() {
    this.blockUI.start('Obteniendo tarjetas, espere por favor...');
    this.cardService.getCards()
      .subscribe((data: any) => {
        if (data.Result) {
          this.cardsList = data.cardsList;

          this.CardName = data.cardsList[0].CardName;
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('error al cargar tarjetas de credito - Error: ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  getAccountsBank() {
    this.blockUI.start('Obteniendo bancos, espere por favorr...');
    this.bankService.getAccountsBank()
      .subscribe((data: any) => {
        if (data.Result) {
          this.banksList = data.banksList;

          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('error al obtener información de los Bancos - Error: ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }





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
        this.alertService.errorAlert('Error al cargar las monedas - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  SetCurr() {
    let cur = this.currencyList.filter((curr) => {
      return curr.Id === this.invForm.controls.currency.value;
    });
    this.setCurr = cur[0].Symbol;

    if (this.invForm.controls.currency.value === 'COL') {

      this.setCurr = '₡';
      this.currencyPayment = 'COL';
    }
    else {
      this.currencyPayment = 'USD';
      this.setCurr = '$';
    }

    this.userCurrency = this.currencyPayment;
  }

  CreateNew() {
    this.isLockedByScanner = false;
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.APINVOICE);
    this.ItemInfo.setValue('');
    this.facturando = false;
    this.resetModalData();
    this.btnVisibleBool = true;
    this.invForm.reset(true);

    this.terminals = [];
    this.pinPadCards = [];
    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();
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
    this.GetDefaultBussinesPartnerSettings();

    this.invForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_AP_INVO_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      PayTerms: ['', Validators.required],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      paymentType: [''],
    });


      this.invForm.patchValue({ paymentType: this.paymentTypes[0].id });
      this.invForm.patchValue({ DocumentType: this.typesInvoice[1].Name });




    this.invForm.patchValue({ cardCode: this.DEFAULT_AP_INVO_BUSINESS_PARTNER });
    this.getExchangeRate();
    this.createFEForm();
    this.getMaxDiscout();
    this.getSuppliers();
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
    this.nameField.nativeElement.focus();
    this.correctInvoice = false;
    this.correctInvoice = false;
    this.Cant.setValue(1);
    this.nameField.nativeElement.focus();
    this.currencyPayment = 'COL';
    this.getCompanies();
    this.currencyPayment = 'COL';
    this.hasLines = false;
    this.isBilling = false;
    this.attemptsWhileBilling = 0;

  }

  funcion() {
    let inputValue = this.DEFAULT_AP_INVO_BUSINESS_PARTNER;
    let code = inputValue;
    let codePos = this.bpCodeList.indexOf(code);
    let cardName = this.bpNameList[codePos];

    let customer = this.bpList.filter(cus => {
      return cus.CardCode === code;
    });
    this.getCurrencyByUser(customer[0].Currency);

    if (cardName !== this.invForm.get('cardName').value) {
      this.invForm.patchValue({ cardName: cardName });
    }

    this.userCurrency = customer[0].Currency;
  }

  GetPayTerms() {
    this.blockUI.start('Obteniendo términos de pago, espere por favor...');
    this.itemService.GetPayTerms()
      .subscribe((data: any) => {
        if (data.Result) {
          this.PayTermsList = data.payTermsList;
          this.invForm.patchValue({ PayTerms: this.defaultGroupNum });
          this.invForm.patchValue({ PriceList: this.defaultListNum });
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.Error.Code}, mensaje: ${data.Error.Message}`);
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
        if (data.Result) {


          this.PriceList = data.priceList;
          setTimeout(() => {
            this.invForm.patchValue({ PriceList: data.priceList[0].ListNum });
            this.blockUI.stop();
          }, 500);


        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
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

  GetSalesPersonList() {
    this.blockUI.start('Obteniendo vendedores, espere por favor...');
    this.smService.getSalesMan()
      .subscribe((data: any) => {
        if (data.Result) {
          this.SlpsList = data.salesManList;
          this.invForm.patchValue({ SlpList: this.defaultSlpCodeStr });
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: Código: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
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
        this.provinceList = data2.Provinces;
        this.feForm.patchValue({ IdType: data.FEInfo.IdType });
        this.feForm.patchValue({ Identification: data.FEInfo.Identification });
        this.feForm.patchValue({ Email: data.FEInfo.Email });
        this.feForm.patchValue({ Direccion: data.FEInfo.Direccion });
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
    this.blockUI.start('Obteniendo compañías, espere por favorr...');
    this.companyService.GetCompanies().subscribe((data: any) => {
      if (data.Result) {
        this.companiesList.length = 0;
        this.companiesList = data.companiesList;
        this.companiesList.forEach(comp => {
          this.pesoBolsa = comp.ScaleWeightToSubstract;
          this.priceEditable = comp.IsLinePriceEditable;
          this.maxWeightTo0 = comp.ScaleMaxWeightToTreatAsZero;
        });
      } else {
        this.alertService.errorAlert('Error al cargar compañías - Error: ' + data.Error.Message);
      }
      this.blockUI.stop();
    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // formatea el monto a currency
  public currencyFormat(number: number) {
    return this.cp.transform(number, '', '', '1.2-2');
  }

  setWarehouseInfo() {
    let session = this.storage.getSession(navigator.onLine);
    if (session) {
      session = JSON.parse(session);

      this.whCode = session.WhCode;
      this.whName = session.WhName;
    }
  }

  //001
  RiseModal(item: any): void {
    this.blockUI.start('Obteniendo la informacion del articulo...');
    let itemCode = item.Item;
    this.itemService.GetItemDetails(itemCode, 3, 2).subscribe(data => {
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
  OnCloseItemDetailModal() {


  }

  GetGoodReceptsForItemDetail() {
    let EntryNumbers = Number((<HTMLInputElement>document.getElementById("GoodReciptNumber")).value);
    this.blockUI.start('Obteniendo las entradas del articulo...')
    this.itemService.GetItemDetails(this.ItemDetail.ItemCode, EntryNumbers, 2).subscribe(data => {
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

  CloseModal(): void {
    this.modalReference.close();
  }

  OpenModalComent(content: any, Comment: string) {
    this.CommentarioActual = Comment;
    this.modalReference = this.modalService.open(content,
      {
        centered: true,
        backdrop: 'static'
      });

  }

  //#region UDFS OPCH

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
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.OUTGOINGPAYMENTS).forEach(x => {
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

  UdfOPCHValidation(): boolean {
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
  //------------------------------------ Payment Component
  //#Pagos, variables requeridas para cuando falla creando el documento al que se le realizaron pagos.
  IsPaymentFail: boolean = false;
  PaymentFail: IOnPaymentFail;
  terminals: ITerminal[];
  pPTransaction: IPPTransaction;
  // pinPadCard: IPPTransaction;
  pinPadCards: IPPTransaction[];
  modalInvoiceContent: boolean;


  NameActionDocument: string;
  returnedDocEntry: number;
  returnedDocNum: number;
  returnedNumFE: number;


  GenerateDataForPayment(): any {


    let InvoiceInfo: IInvoiceInfoForPayment = {
      CardCode: this.invForm.value.cardCode,
      Currency: this.invForm.value.currency,
      SlpCode: this.invForm.value.SlpList,
      uniqueInvCode: this.uniqueDocumentID,
      Comment: 'Pago de factura proveedor',
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
      },
      CardValid : this.DefaultCardValid

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
      'DocumentType': this.invForm.value.DocumentType,
      'CardCode': this.invForm.value.cardCode,
      'CardName': this.invForm.value.cardName,
      'Currency': this.invForm.value.currency,
      'PayTerms': this.invForm.value.PayTerms,
      'Comment': this.invForm.value.Comment,
      'SlpCode': this.invForm.value.SlpList,
      'FEInfo': FE,
      'CLVS_POS_UniqueInvId': this.uniqueDocumentID
    };
    return Invoice;
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
   //#endregion
   GetDefaultBussinesPartnerSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.BussinesPartner).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);
        this.DEFAULT_AP_INVO_BUSINESS_PARTNER = result.DefaultBussinesPartnerSupplier;
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuración de socios de negocios por defecto ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuración de  de socios de negocios por defecto ' + err);
    });
  }
  GetDefaultPaymentSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.Payment).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);
        this.DefaultCardValid = result.CardValid;
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuración de pagos ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuración de pagos' + err);
    });
  }

}

