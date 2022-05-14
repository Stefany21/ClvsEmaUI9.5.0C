import { Component, OnInit, OnDestroy, ɵConsole } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Observable, Subject, merge, Subscription } from 'rxjs';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { NgbModal, ModalDismissReasons, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
// Electron renderer service
import { ElectronRendererService } from '../../../electronrenderer.service';
// MODELOS


import { CONFIG_VIEW, DOCUMENT_ALIAS } from "src/app/models/constantes";
// SERVICIOS
import {
  BusinessPartnerService,
  StoreService,
  DocumentService,
  ParamsService,
  PaymentService,
  SerieService,
  AccountService,
  CardService, BankService,
  SalesManService,
  ExRateService,
  AuthenticationService,
  PermsService,
  AlertService,
  ReportsService,
  StorageService,
  CompanyService
} from 'src/app/services';
const printJS = require("print-js");
import { Router } from '@angular/router';
import { BoRcptInvTypes, BoRcptTypes, PaymentResults, ReportType } from 'src/app/enum/enum';
import { IudfValue } from 'src/app/models/iudf-value';
import { UdfsService } from 'src/app/services/udfs.service';
import { IUdfTarget } from 'src/app/models/i-udf-target';
import { IKValue } from 'src/app/models/i-kvalue';
import { IPPTransaction, IUdf } from 'src/app/models';
import { PaymentComponent } from 'src/app/components/payment/payment.component';
import { IInvoiceInfoForPayment, IOnPaymentFail } from 'src/app/models/i-payment-data';
import { Currency } from 'src/app/models/i-currency';
import { BasePayment, PaymentLines } from 'src/app/models/i-payment-document';
@Component({
  selector: 'app-ap-payment',
  templateUrl: './ap-payment.component.html',
  styleUrls: ['./ap-payment.component.scss'],
  providers: [DecimalPipe, CurrencyPipe]
})
export class ApPaymentComponent implements OnInit {

  @BlockUI() blockUI: NgBlockUI;

  fecha: Date; // fecha actual

  searchForm: FormGroup; // formulario para la busqueda de pagos
  incomingPaymentForm: FormGroup; // formulario para los pagos


  serieList: any[] = []; // lista de las sedes
  bpList: any[] = []; // lista de clientes
  bpCodeList: string[] = []; // lista de los codigos de clientes
  bpNameList: string[] = []; // lista de los nombres de clientes
  bpCodeNameList: string[] = []; // lista de los codigo con nombres de clientes
  incomingPaymentList: any[] = []; // lista con los pagos
  currencyList: Currency[] = []; // lista de tipos de cambio
  currency: string; // moneda selecionada al buscar los anticipos
  totalCOL: number; // monto total en colones
  totalUSD: number; // monto total en dolares
  currencyChange: number; // monto del tipo de cambio
  accountList: any[] = []; // lista de cuentas
  cardsList: any[] = []; // lista de tarjetas
  banksList: any[] = []; // lista de bancos
  salesManList: any[] = []; // lista de vendedores
  currencyPayment: string; // moneda selecionada al buscar los anticipos
  attemptsWhileBilling: number = 0;
  isBilling: boolean;
  lastInvoice: number;
  btnVisibleBool: boolean;
  correctInvoice: boolean = false;  //dice si el pago se realizo correctamente
  facturando: boolean = false;

  // modal de pagos
  closeResult: string;
  modalPay: any; // instancia de la modal de pagos

  TotalG: number; // monto total del pago
  ReceivedG: number; // monto total recibido del pago
  DifferenceG: number; // monto total de la diferencia, o salto restante


  V_CreditCards: any[] = []; // lista de pagos registrados con tarjetas de credito
  CardName: string; // nombre de la tarjeta seleccionada para el pago con tarjeta
  V_Checks: any[] = []; // lista de pagos registrados con cheques

  isPagoCuenta: boolean;

  unamePattern = '^\d{2}\/\d{2}$';
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;

  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  TotalCol: FormControl = new FormControl();
  TotalUSD: FormControl = new FormControl();
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  udfs: IUdf[];


  changeColones: number;
  changeDolares: number;
  returnedDocEntry: number;
  returnedDocNum: number;
  uniqueInvCode: string;
  pinPadCards: IPPTransaction[];

  IsPaymentFail: boolean = false;
  PaymentFail: IOnPaymentFail;
  DefaultCardValid : String;
  constructor(private fb: FormBuilder,
    private businessPartnerService: BusinessPartnerService,
    private storeService: StoreService,
    private documentService: DocumentService,
    private paramsService: ParamsService,
    private sPerm: PermsService,
    private authenticationService: AuthenticationService,
    private paymentService: PaymentService,
    private serieService: SerieService,
    private modalService: NgbModal,
    private accountService: AccountService,
    private cardService: CardService,
    private bankService: BankService,
    private salesManService: SalesManService,
    private exRateService: ExRateService,
    private router: Router,
    private reportsService: ReportsService,
    private electronRendererService: ElectronRendererService,
    private alertService: AlertService,
    private dp: DecimalPipe,
    private udfService: UdfsService,
    private storage: StorageService,
    private companyService: CompanyService,) {
    // obtiene al anno para el footer
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.fecha = new Date();
  }
  // Limpiar Campos
  CreateNew() {
    this.pinPadCards = [];
    this.udfTargets = [];
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.OUTGOINGPAYMENTS);
    this.totalCOL = 0;
    this.totalUSD = 0;
    this.currencyChange = 0;
    this.isPagoCuenta = false;
    this.searchForm = this.fb.group({
      supplier: ['', Validators.required],
      sede: ['', Validators.required],
      currency: ['', Validators.required]
    });

    this.incomingPaymentForm = this.fb.group({
      salesMan: ['', Validators.required],
      comment: ['', Validators.required],
      pagocuenta: [this.isPagoCuenta],
      pagocuentavalue: [0],
      reference: ['']
    });





    this.V_CreditCards.length = 0;
    //this.getExchangeRate();
    // this.getSuppliers();
    //this.GetCurrencyType();
    //this.GetParamsViewList();
    //this.getSedes();
    //this.getSalesMan();
    //this.getAccount();
    //this.getCards();
    // this.getAccountsBank();
    this.btnVisibleBool = true;
    this.correctInvoice = false;
    this.isBilling = false;
    this.attemptsWhileBilling = 0;
    this.incomingPaymentList.length = 0;

  }

  ngOnInit() {
    this.udfTargets = [];
    this.udfs = [];
    this.GetDefaultPaymentSettings();
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.OUTGOINGPAYMENTS);
    this.checkPermits();
    this.totalCOL = 0;
    this.totalUSD = 0;
    this.currencyChange = 0;
    this.isPagoCuenta = false;

    this.searchForm = this.fb.group({
      supplier: ['', Validators.required],
      sede: ['', Validators.required],
      currency: ['', Validators.required]
    });

    this.incomingPaymentForm = this.fb.group({
      salesMan: ['', Validators.required],
      comment: ['', Validators.required],
      pagocuenta: [this.isPagoCuenta],
      pagocuentavalue: [0],
      reference: ['']
    });





    this.getExchangeRate();
    this.getSuppliers();
    this.GetCurrencyType();
    this.GetParamsViewList();
    this.getSedes();
    this.getSalesMan();
    this.getAccount();
    this.getCards();
    this.getAccountsBank();
    this.btnVisibleBool = true;
    this.correctInvoice = false;

  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_ApPayment") {
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

  // funcion para obtener el tipo de cambio segun la compañía seleccionada
  getExchangeRate() {
    this.blockUI.start('Obteniendo tipo de cambio, espere por favor...'); // Start blocking
    this.exRateService.getExchangeRate()
      .subscribe((data: any) => {
        if (data.Result) {
          this.currencyChange = data.exRate;
          this.getSuppliers();

          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener tipo de cambio - ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorAlert('Error al obtener tipo de cambio - ' + error);
      });
  }

  // funcion para obtener una lista de clientes segun la compañía seleccionada
  getSuppliers() {
    this.blockUI.start('Obteniendo proveedores, espere por favor...'); // Start blocking
    this.businessPartnerService.GetSuppliers()
      .subscribe((data: any) => {
        if (data.Result) {
          this.bpList.length = 0;
          this.bpCodeList.length = 0;
          this.bpNameList.length = 0;
          this.bpCodeNameList.length = 0;
          this.bpList = data.BPS;
          for (let item of data.BPS) {
            this.bpCodeList.push(item.CardCode);
            this.bpNameList.push(item.CardName);
            this.bpCodeNameList.push(`${item.CardCode} - ${item.CardName}`);
          }
          this.blockUI.stop(); // Stop blocking

        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener la lista de clientes - ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener una lista de sedes (stores) segun la compañía seleccionada
  getSedes() {
    this.blockUI.start('Obteniendo sedes, espere por favor...'); // Start blocking
    this.serieService.getSeries()
      .subscribe((data: any) => {
        if (data.Result) {
          this.serieList = data.Series;
          this.searchForm.patchValue({ sede: data.Series[0].Serie });
          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener las sedes - ' + data.Error.Message);
        }

      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener una lista de vendedores segun la compañía seleccionada
  getSalesMan() {
    this.blockUI.start('Obteniendo vendedores, espere por favor...'); // Start blocking
    this.salesManService.getSalesMan()
      .subscribe((data: any) => {
        if (data.Result) {
          this.salesManList = data.salesManList;
          this.incomingPaymentForm.patchValue({ salesMan: data.salesManList[0].SlpCode });
          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener los vendedores - ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener una lista de cuentas segun la compañía seleccionada
  getAccount() {
    this.blockUI.start('Obteniendo cuentas, espere por favor...'); // Start blocking
    this.accountService.getAccount()
      .subscribe((data: any) => {
        if (data.Result) {
          this.accountList = data.Data;


        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener las cuentas - ' + data.Error.Message);
        }

      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener una lista de tarjetas segun la compañía seleccionada
  getCards() {
    this.blockUI.start('Obteniendo tarjetas, espere por favor...'); // Start blocking
    this.cardService.getCards()
      .subscribe((data: any) => {
        if (data.Result) {
          this.cardsList = data.cardsList;
          this.CardName = data.cardsList[0].CardName;
          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener las tarjetas - ' + data.Error.Message);
        }
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener una lista de bancos segun la compañía seleccionada
  getAccountsBank() {
    this.blockUI.start('Obteniendo bancos, espere por favor...'); // Start blocking
    this.bankService.getAccountsBank()
      .subscribe((data: any) => {
        if (data.Result) {
          this.banksList = data.banksList;
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert('Error al obtener cuentas de bancos - ' + data.Error.Message);
        }
        // Stop blocking
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para el typeahead
  searchBP = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpCodeNameList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  // funcion de obtener las Facturas
  getInvoiceList() {
    if (!this.isPagoCuenta) {
      // stop here if form is invalid
      if (this.searchForm.invalid) {
        this.alertService.infoAlert('Debe haber seleccionado un proveedor, sede, moneda.');
        //this.alertService.infoInfoAlert('Debe haber seleccionado un Proveedor, sede, moneda');   
        return;
      }
      this.incomingPaymentList.length = 0;
      this.currency = this.searchForm.value.currency;
      this.blockUI.start('Obteniendo facturas, espere por favor...'); // Start blocking
      this.paymentService.getPayApInvoices(this.searchForm)
        .subscribe((data: any) => {
          if (data.Result) {
            this.incomingPaymentList = data.InvoicesList;
          } else {
            this.alertService.errorInfoAlert('Error al obtener lista de facturas- ' + data.Error.Message);
          }
          this.blockUI.stop(); // Stop blocking
        }, (error) => {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });

    } else {
      this.alertService.infoAlert('Para la nueva búsqueda, desmarque pago a cuenta.');
    }
  }

  // funcion para limpiar la tabla si es un pago a cuenta
  activePagocuenta() {
    if (!this.incomingPaymentForm.get('pagocuenta').value) {
      this.isPagoCuenta = true;
      this.incomingPaymentList.length = 0;
    } else {
      this.isPagoCuenta = false;
      this.incomingPaymentForm.get('pagocuentavalue').setValue(0);
    }
    this.totalCOL = 0;
    this.totalUSD = 0;
  }

  // funcion para colocar los totales en pago a cuenta segun la moneda seleccionada
  setPagoCuenta() {
    this.totalCOL = 0;
    this.totalUSD = 0;
    const value = this.searchForm.get('currency').value;
    if (value === 'COL') {
      this.totalCOL = parseFloat(this.incomingPaymentForm.get('pagocuentavalue').value);
      this.totalUSD = this.totalCOL / this.currencyChange;
    } else {
      this.totalUSD = parseFloat(this.incomingPaymentForm.get('pagocuentavalue').value);
      this.totalCOL = this.totalUSD * this.currencyChange;
    }
  }

  changeCurr() {
    if (this.incomingPaymentForm.get('pagocuenta').value) {
      if (this.searchForm.get('currency').value === 'USD') {
        this.totalUSD = this.incomingPaymentForm.get('pagocuentavalue').value;
        this.totalCOL = this.totalUSD * this.currencyChange;
      } else {
        this.totalCOL = this.incomingPaymentForm.get('pagocuentavalue').value;
        this.totalUSD = this.totalCOL / this.currencyChange;
      }
    }
  }
  // funcion para calcular el total a pagar en dolares y colones
  // recibe como parametro el monto del pago de la linea y el index
  setTotals() {
    this.totalCOL = 0;
    this.totalUSD = 0;
    this.incomingPaymentList.forEach(element => {
      if (element.Selected && this.currency === 'COL') {
        // si la moneda es colones y esta marcado
        this.totalCOL += parseFloat(element.Pago);
      } else if (element.Selected && this.currency === 'USD') {
        // si la moneda es dolares y esta marcado
        this.totalUSD += parseFloat(element.Pago);
      }
    });
    if (this.currency === 'COL') {
      this.totalUSD = this.totalCOL / this.currencyChange;
    } else {
      this.totalCOL = this.totalUSD * this.currencyChange;
    }
  }
  // asignar a pago el total de la factura
  changeSelectedPay(index: number, Selected: boolean, Pago: number, DocBalance: number) {
    if (Selected) {
      this.incomingPaymentList[index].Pago = DocBalance;//this.dp.transform(DocBalance, '1.2-2');

    } else {
      this.incomingPaymentList[index].Pago = 0;
    }
    this.setTotals();
  }

  // funcion para abrir la modal de pagos. ORIGINAL
  // CheckPayBalance(content) {
  //   if (!this.incomingPaymentForm.invalid && !this.searchForm.invalid) {
  //     if ((this.incomingPaymentList.length > 0 || this.isPagoCuenta) && (this.totalCOL > 0 && this.totalUSD > 0)) {
  //       this.DifferenceG = this.totalCOL;
  //       this.resetModalData();
  //       this.TotalG = this.totalCOL;
  //       this.setTotalAmount();
  //       this.modalPay = this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg', windowClass: 'Modal-Xl' });
  //       this.creditCardForm.patchValue({ VoucherNum: '0' });
  //       this.creditCardForm.patchValue({ CardNum: '9999' });
  //       this.creditCardForm.patchValue({ CardValid: '01/99' });
  //       this.modalPay.result.then((result) => {
  //         this.closeResult = `Closed with: ${result}`;
  //       }, (reason) => {
  //         this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
  //       });
  //     } else {
  //       if (!this.isPagoCuenta && (this.totalCOL === 0 && this.totalUSD === 0)) {
  //         this.alertService.infoAlert('No posee facturas para realizar el pago');
  //       } else if (this.isPagoCuenta && (this.totalCOL === 0 && this.totalUSD === 0)) {
  //         this.alertService.infoAlert('No tiene un total a pagar en pago a cuenta');
  //       }
  //     }
  //   } else {
  //     this.alertService.infoAlert('Debe haber seleccionado un proveedor, sede, moneda, vendedor y comentario.');
  //   }
  // }

  CheckPayBalance(content) {

    if (!this.UdfOVPMValidation()) {
      this.blockUI.stop();
      return;
    }

    if (!this.incomingPaymentForm.invalid && !this.searchForm.invalid) {
      if ((this.incomingPaymentList.length > 0 || this.isPagoCuenta) && (this.totalCOL > 0 && this.totalUSD > 0)) {
        this.DifferenceG = this.totalCOL;

        this.TotalG = this.totalCOL;

        this.RisePaymentComponent();



      } else {
        if (!this.isPagoCuenta && (this.totalCOL === 0 && this.totalUSD === 0)) {
          this.alertService.infoAlert('No posee facturas para realizar el pago');
        } else if (this.isPagoCuenta && (this.totalCOL === 0 && this.totalUSD === 0)) {
          this.alertService.infoAlert('No tiene un total a pagar en pago a cuenta');
        }
      }
    } else {
      this.alertService.infoAlert('Debe haber seleccionado un proveedor, sede, moneda, vendedor y comentario.');
    }
  }
  RisePaymentComponent() {
    this.modalPay = this.modalService.open(PaymentComponent, {
      backdrop: 'static',
      keyboard: false,
      ariaLabelledBy: 'modal-basic-title',
      size: 'lg',
      windowClass: 'Modal-Xl'


    });


    this.generateUniqueInvoiceId();
    this.modalPay.componentInstance.requiredData = this.GenerateDataForPayment();

    this.modalPay.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;


    }, (reason) => {
      if (reason.status === PaymentResults.Created) {
        let Payments:BasePayment = reason.Payment;
        this.changeColones = reason.Changes.COL;
        this.changeDolares = reason.Changes.USD;
       


        Payments.PaymentInvoices = this.GetPaymentLines();
        // this.terminals = reason.PinpadInfo.terminals;
        this.pinPadCards = reason.PinpadInfo.pinPadCards;



        this.PaymentFail = reason.OnFail;


        Payments.DocType = this.incomingPaymentForm.value.pagocuenta ? BoRcptTypes.rAccount : BoRcptTypes.rSupplier;



        this.CreatePay(Payments);
      } else if (reason.status === PaymentResults.CancelButton) {
        this.IsPaymentFail = false;
      }
    });
  }
  GetPaymentLines(): PaymentLines []  {

    if(this.incomingPaymentForm.value.pagocuenta) return [];

    const PaymentLines:PaymentLines[]  = [];
    let dT: string;
    const newIncomingPaymentList = this.incomingPaymentList.filter(book => book.Selected === true);
    newIncomingPaymentList.forEach(element => {
      if (element.type === 'Factura') { dT = BoRcptInvTypes.it_PurchaseInvoice; }
      if (element.type === 'Anticipo') { dT = BoRcptInvTypes.it_DownPayment; }
      PaymentLines.push({
        SumApplied: element.Pago,
        DocEntry: element.DocEntry,
        AppliedFC: element.DocTotal,
        InvoiceType: dT
      });
    });

    return PaymentLines;
  }

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


  }


  GenerateDataForPayment(): any {

    let InvoiceInfo: IInvoiceInfoForPayment = {
      CardCode: this.searchForm.value.supplier.split(' - ')[0],
      Currency: this.searchForm.value.currency,
      SlpCode: this.incomingPaymentForm.value.salesMan,
      uniqueInvCode: this.uniqueInvCode,
      Comment: this.incomingPaymentForm.value.comment,
      accountPayment: this.incomingPaymentForm.value.pagocuenta
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
        currencyPayment: this.searchForm.value.currency, // Moneda de pago
      },
      DocumentTotals: {
        currencyChange: this.currencyChange, // Cambio actual
        totalUSD: this.totalUSD, // Total del documento en dolares
        total: this.totalCOL // Total del documento en colones
      },
      InvoiceInfo: InvoiceInfo,

      PinpadInfo: {
        PreDocument: this.GeneratePreInvoiceForPPPayment() // Documento que se requiere por el BAC para pp
      },
      OnFail: {
        IsFail: this.IsPaymentFail,
        DataForFail: this.PaymentFail
      },
      CardValid : this.DefaultCardValid
    };
    return requiredDataForPay;
  }

  GeneratePreInvoiceForPPPayment() {
    const Document = {
      'InvoiceLinesList': this.incomingPaymentList.filter(book => book.Selected === true),
      'accountPayment': this.incomingPaymentForm.value.pagocuenta,
      'CardCode': this.searchForm.value.supplier.split(' - ')[0],
      'CardName': this.searchForm.value.supplier.split(' - ')[1],
      'Currency': this.searchForm.value.currency,
      'isPayAccount': this.incomingPaymentForm.value.pagocuenta,
      'Comment': this.incomingPaymentForm.value.Comment,
      'SlpCode': this.incomingPaymentForm.value.salesMan,
      'CLVS_POS_UniqueInvId': this.uniqueInvCode
    };
    return Document;
  }


  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  // funcion para cerrar la modal de pagos
  close() {
    this.modalPay.close();
  }
  // Cierra la modal
  closeModal() {
    this.modalPay.dismissAll('');
  }
  printInvoice() {
    this.printARInvoice(this.lastInvoice);
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
      }else{
        this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);  
      }
      },error=> {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para armar el objeto del pago y crearlo en SAP, ORIGINAL
  // CreatePay() {
  //   if (!this.UdfOVPMValidation()) {
  //     this.blockUI.stop();  
  //     return;
  //   }
  //   if (this.isBilling) {
  //     this.attemptsWhileBilling++;
  //     return;
  //   }
  //  if (this.ReceivedG > 0) {
  //     const PaymentLines = [];
  //     let dT = 0;
  //     const newIncomingPaymentList = this.incomingPaymentList.filter(book => book.Selected === true);
  //     newIncomingPaymentList.forEach(element => {
  //       if (element.type === 'Factura') { dT = 1; }
  //       if (element.type === 'Anticipo') { dT = 2; }
  //       PaymentLines.push({
  //         'InvTotal': element.DocTotal,
  //         'PayTotal': element.Pago,
  //         'DocNum': element.DocNum,
  //         'DocEntry': element.DocEntry,
  //         'InstId': element.InstlmntID,
  //         'Currency': element.DocCur,
  //         'Balance': element.DocBalance,
  //         'DocType': dT,
  //         'PayBalanceChk': false // Verifica el pago vs saldo
  //       });
  //     });
  //     let total = 0;
  //     if (this.searchForm.value.currency === 'COL') {
  //       total = this.totalCOL;
  //     } else {
  //       total = this.totalUSD;
  //     }
  //     const Payments = {
  //       CardCode: this.searchForm.value.supplier.split(' - ')[0],
  //       CashAccount: this.cashForm.value.AccountCash,
  //       CashSum: this.cashForm.value.TotalCash,
  //       CashCurr: this.currencyPayment,
  //       Comments: this.incomingPaymentForm.value.comment,
  //       accountPayment: this.incomingPaymentForm.value.pagocuenta,
  //       Currency: this.currencyPayment,
  //       DocRate: this.currencyChange,
  //       Reference: this.incomingPaymentForm.value.reference,
  //       SlpCode: '-1',
  //       Total: total,
  //       V_Checks: this.V_Checks,
  //       V_CreditCards: this.V_CreditCards,
  //       V_PaymentLines: PaymentLines,
  //       transfSum: this.transferForm.value.TransSum,
  //       trfsrAcct: this.transferForm.value.AccountTransf,
  //       trfsrCurr: this.currencyPayment,
  //       trfsrDate: this.transferForm.value.DateTrans,
  //       trfsrNum: this.transferForm.value.Ref,
  //     };
  //     this.blockUI.start('Generando el pago, espere por favor...'); // Start blocking  
  //     this.isBilling = true;
  //     this.facturando = true;
  //     this.paymentService.createPayApInvoices(Payments, this.mappedUdfs)
  //       .subscribe((data: any) => {
  //         this.blockUI.stop(); // Stop blocking
  //         if (data.result) {
  //           this.close();
  //           this.alertService.successAlertHtml(`Pago efectuado correctamente: DocEntry: ${data.DocEntry}, DocNum: ${data.DocNum}
  //         <br/><br/>
  //         <h3>Intentos de duplicación: <label class="text-danger">${this.attemptsWhileBilling}</label></h3>`);
  //           let modalOption: NgbModalOptions = {};
  //           modalOption.backdrop = 'static';
  //           modalOption.keyboard = false;
  //           modalOption.ariaLabelledBy = 'modal-basic-title';
  //           modalOption.size = 'lg';
  //           this.printARInvoice(data.DocEntry);
  //           this.lastInvoice = data.DocEntry;
  //           this.btnVisibleBool = false;
  //           this.correctInvoice = true;
  //           this.facturando = false;
  //           this.router.navigate(['/outgoingPayment']);
  //         } else {
  //           this.alertService.errorAlert(`Error al crear el pago: Codigo: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
  //           this.attemptsWhileBilling = 0;
  //           this.isBilling = false;
  //           this.facturando = false;

  //         }
  //         this.blockUI.stop(); // Stop blocking
  //       }, (error) => {
  //         this.blockUI.stop(); // Stop blocking
  //         this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
  //         this.isBilling = false;
  //         this.attemptsWhileBilling = 0;
  //         this.facturando = false;
  //       });
  //   } else {
  //     this.alertService.infoAlert('El monto a recibido debe ser igual al total a cancelar.');
  //   }
  // }

  // funcion para resetear los valores de la modal


  CreatePay(Payments: any) {

    if (this.isBilling) {
      this.attemptsWhileBilling++;
      return;
    }


    this.blockUI.start('Generando el pago, espere por favor...'); // Start blocking  
    this.isBilling = true;
    this.facturando = true;
    this.paymentService.createPayApInvoices(Payments, this.mappedUdfs)
      .subscribe((data: any) => {
        this.blockUI.stop(); // Stop blocking
        if (data.Result) {
          this.IsPaymentFail = false;

          (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();

          this.returnedDocEntry = data.DocEntry;
          this.returnedDocNum = data.DocNum;



          if (this.pinPadCards.length > 0) {
            //this.pinPadCard.DocEntry = data.DocNum;
            this.pinPadCards.forEach(x => x.DocEntry = data.DocNum);

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

          this.printARInvoice(data.DocEntry);
          this.lastInvoice = data.DocEntry;
          this.btnVisibleBool = false;
          this.correctInvoice = true;
          this.facturando = false;
          this.router.navigate(['/outgoingPayment']);
        } else {
          this.IsPaymentFail = true;
          this.RisePaymentComponent();
          this.alertService.errorAlert(`Error al crear el pago: Codigo: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
          this.attemptsWhileBilling = 0;
          this.isBilling = false;
          this.facturando = false;

        }
        this.blockUI.stop(); // Stop blocking
      }, (error) => {
        this.IsPaymentFail = true;
        this.RisePaymentComponent();
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        this.isBilling = false;
        this.attemptsWhileBilling = 0;
        this.facturando = false;
      });

  }









  getSelectedOptionText(event: Event) {
    let selectedOptions = event.target['options'];
    let selectedIndex = selectedOptions.selectedIndex;
    this.CardName = selectedOptions[selectedIndex].text;
  }







  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.blockUI.update('Obteniendo parámetros');
    this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.viewParamTitles = data.Params.filter(param => {
            return param.type === 6;
          });
          this.ChargeParamstoView();
        } else {
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data.Error.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter(param => {
      return param.Name === 'T_incomingPayment';
    });
    this.title = obj[0].Text;
  }

  // Obtiene los tipos de monedas ya sea Col o Usd desde una vista SQL
  GetCurrencyType() {
    this.blockUI.update('Obteniendo las monedas.');
    this.paramsService.GetCurrencyType().subscribe(data => {
      //this.blockUI.stop();
      if (data.Data.length > 0) {
        this.currencyList = data.Data;
        this.GetParamsViewList()
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar las monedas - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }



  //#region UDFS OVPM

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

  UdfOVPMValidation(): boolean {
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
  