import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Observable, Subject, merge, Subscription } from 'rxjs';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { DecimalPipe, formatDate } from '@angular/common';
import { NgbModal, ModalDismissReasons, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

// MODELOS

import { CONFIG_VIEW, DOCUMENT_ALIAS } from "src/app/models/constantes";
// RUTAS

// COMPONENTES

// SERVICIOS
import {
  BusinessPartnerService, StoreService, DocumentService, ParamsService, PaymentService,
  SerieService, AccountService, CardService, BankService, SalesManService, ExRateService, AuthenticationService, PermsService,
  AlertService,
  ReportsService,
  StorageService,
  CommonService,
  CompanyService
} from '../../../../services/index';
import { Router } from '@angular/router';
import { ElectronRendererService } from 'src/app/electronrenderer.service';
import { BoRcptInvTypes, BoRcptTypes, PaymentResults, ReportType } from 'src/app/enum/enum';
import { IudfValue } from 'src/app/models/iudf-value';
import { IKValue, IPPTransaction, IUdf, IUdfTarget } from 'src/app/models';
import { UdfsService } from 'src/app/services/udfs.service';
import { PaymentComponent } from 'src/app/components/payment/payment.component';
import { IInvoiceInfoForPayment, IOnPaymentFail } from 'src/app/models/i-payment-data';
import { Currency } from 'src/app/models/i-currency';
import { PaymentLines } from 'src/app/models/i-payment-document';
const printJS = require("print-js");
@Component({
  selector: 'app-incoming-payment',
  templateUrl: './incoming-payment.component.html',
  styleUrls: ['./incoming-payment.component.scss']
})
export class IncomingPaymentComponent implements OnInit {

  @BlockUI() blockUI: NgBlockUI;

  fecha: Date; // fecha actual

  searchForm: FormGroup; // formulario para la busqueda de pagos
  incomingPaymentForm: FormGroup; // formulario para los pagos


  uniqueDocumentID: string;

  serieList: any[] = []; // lista de las sedes
  bpList: any[] = []; // lista de clientes
  bpCodeList: string[] = []; // lista de los codigos de clientes
  bpNameList: string[] = []; // lista de los nombres de clientes
  bpCodeNameList: string[] = []; // lista de los codigo con nombres de clientes
  incomingPaymentList: any[] = []; // lista con los pagos
  currencyList: Currency[] = []; // lista de tipos de cambio
  currency: string; // moneda selecionada al buscar los anticipos
  // totalCOL: number; // monto total en colones
  // totalUSD: number; // monto total en dolares
  currencyChange: number; // monto del tipo de cambio
  accountList: any[] = []; // lista de cuentas
  cardsList: any[] = []; // lista de tarjetas
  banksList: any[] = []; // lista de bancos
  salesManList: any[] = []; // lista de vendedores
  currencyPayment: string; // moneda selecionada al buscar los anticipos
  ChangeG: number; // guarda el vuelto
  // modal de pagos
  closeResult: string;
  modalPay: any; // instancia de la modal de pagos

  TotalG: number; // monto total del pago
  ReceivedG: number; // monto total recibido del pago
  DifferenceG: number; // monto total de la diferencia, o salto restante

  // TotalCash: number; // monto total del pago en efectivo
  // TotalCards: number; // monto total del pago en tarjetas
  // TotalTransfer: number; // monto total del pago en transferencia
  // TotalCheck: number; // monto total del pago en cheque

  V_CreditCards: any[] = []; // lista de pagos registrados con tarjetas de credito
  CardName: string; // nombre de la tarjeta seleccionada para el pago con tarjeta
  V_Checks: any[] = []; // lista de pagos registrados con cheques
  DocEntry: number;
  isPagoCuenta: boolean;

  unamePattern = '^\d{2}\/\d{2}$';
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  canPrint = false;
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  /*Fecha Transferencia*/
  mDate: string;
  hasInvoice = false;
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  udfs: IUdf[];


  changeColones: number;
  changeDolares: number;
  returnedDocNum: number
  returnedDocEntry: number;
  uniqueInvCode: string;
  pinPadCards: IPPTransaction[];


  IsPaymentFail: boolean = false;
  PaymentFail: IOnPaymentFail;
  DefaultCardValid : String;
  total: number;
  constructor(private fb: FormBuilder,
    private businessPartnerService: BusinessPartnerService,
    private storeService: StoreService,
    private documentService: DocumentService,
    private commonService: CommonService,
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
    private alertService: AlertService,
    private electronRendererService: ElectronRendererService,
    private reportsService: ReportsService,
    private udfService: UdfsService,
    private storage: StorageService,
    private companyService: CompanyService,) {
    // obtiene al anno para el footer
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.fecha = new Date();
  }

  ngOnInit() {
    this.pinPadCards = [];
    this.udfTargets = [];
    this.udfs = [];
    this.GetDefaultPaymentSettings();
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.INCOMINGPAYMENTS);
    this.mDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.checkPermits();
    this.total = 0;  
    this.currencyChange = 0;
    this.isPagoCuenta = false;

    this.searchForm = this.fb.group({
      customer: ['', Validators.required],
      sede: ['', Validators.required],
      currency: ['', Validators.required]
    });

    // this.incomingPaymentForm = this.fb.group({
    //   salesMan: ['', Validators.required],
    //   comment: ['', Validators.required],
    //   pagocuenta: [this.isPagoCuenta],
    //   pagocuentavalue: [0],
    //   reference: ['']
    // });
    this.incomingPaymentForm = this.fb.group({
      salesMan: 1,
      comment: '',
      pagocuenta: [this.isPagoCuenta],
      pagocuentavalue: [0],
      reference: ['']
    });


    this.getExchangeRate();
    this.getCustomers();
    this.GetCurrencyType();
    this.GetParamsViewList();
    this.getSedes();
    this.getSalesMan();
    this.getAccount();
    this.getCards();
    this.getAccountsBank();


    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();

  }

  generateIncomingPayment(): void {
    console.log('creating pay');
    //this.CheckPayBalance();
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        // console.log(data);
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Ipay") {
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
    // console.log(this.permisos);
  }

  // funcion para obtener el tipo de cambio segun la compañía seleccionada
  getExchangeRate() {
    this.blockUI.start('Obteniendo tipo de cambio, espere por favor...'); // Start blocking
    this.exRateService.getExchangeRate()
      .subscribe((data: any) => {
        if (data.Result) {
          this.currencyChange = data.exRate;
          this.getCustomers();

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
  getCustomers() {
    this.blockUI.start('Obteniendo Clientes, espere por favor...'); // Start blocking
    this.businessPartnerService.GetCustomers()
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
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
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
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
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

  // funcion de obtener los anticipos
  getInvoiceList() {

    if (!this.isPagoCuenta) {
      // stop here if form is invalid
      if (this.searchForm.invalid) {
        return;
      }
      this.incomingPaymentList.length = 0;
      this.currency = this.searchForm.value.currency;
      this.blockUI.start('Obteniendo los anticipos, espere por favor...'); // Start blocking
      this.canPrint = false;
      this.paymentService.getPayInvoices(this.searchForm)
        .subscribe((data: any) => {
          if (data.Result) {
            this.incomingPaymentList = data.InvoicesList;
          } else {
            this.alertService.errorInfoAlert('Error al obtener lista de anticipos- ' + data.Error.Message);
          }
          this.blockUI.stop(); // Stop blocking
        }, (error) => {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });

    } else {
      this.alertService.infoInfoAlert('Para la nueva búsqueda, desmarque pago a cuenta.');
    }
  }

  // funcion para limpiar la tabla si es un pago a cuenta
  activePagocuenta() {
    if (!this.incomingPaymentForm.get('pagocuenta').value) {
      this.isPagoCuenta = true;
      this.hasInvoice = true;
      this.incomingPaymentList.length = 0;
    } else {
      this.isPagoCuenta = false;
      this.incomingPaymentForm.get('pagocuentavalue').setValue(0);
    }
    this.total = 0;
  }

  // funcion para colocar los totales en pago a cuenta segun la moneda seleccionada
  setPagoCuenta() {  
    this.total = parseFloat(this.incomingPaymentForm.get('pagocuentavalue').value);    
    // this.totalCOL = 0;
    // this.totalUSD = 0;
    // const value = this.searchForm.get('currency').value;
    // if (value === 'COL') {
    //   this.totalCOL = parseFloat(this.incomingPaymentForm.get('pagocuentavalue').value);
    //   this.totalUSD = this.totalCOL / this.currencyChange;
    // } else {
    //   this.totalUSD = parseFloat(this.incomingPaymentForm.get('pagocuentavalue').value);
    //   this.totalCOL = this.totalUSD * this.currencyChange;
    // }
  }

  changeCurr() {
    console.log('currency ->', this.searchForm.get('currency').value);
    this.currencyPayment = this.searchForm.get('currency').value;
    this.total = this.incomingPaymentForm.get('pagocuentavalue').value;
    
    // if (this.incomingPaymentForm.get('pagocuenta').value) {
    //   if (this.searchForm.get('currency').value === 'USD') {
    //     this.totalUSD = this.incomingPaymentForm.get('pagocuentavalue').value;
    //     this.totalCOL = this.totalUSD * this.currencyChange;
    //   } else {
    //     this.totalCOL = this.incomingPaymentForm.get('pagocuentavalue').value;
    //     this.totalUSD = this.totalCOL / this.currencyChange;
    //   }
    // }
  }
  // funcion para calcular el total a pagar en dolares y colones
  // recibe como parametro el monto del pago de la linea y el index
  setTotals() {
    this.total = 0;
    this.incomingPaymentList.forEach(element => {
      this.total += parseFloat(element.Pago);
      // if (element.Selected && this.currency === 'COL') {
      //   // si la moneda es colones y esta marcado
      //   this.totalCOL += parseFloat(element.Pago);
      // } else if (element.Selected && this.currency === 'USD') {
      //   // si la moneda es dolares y esta marcado
      //   this.totalUSD += parseFloat(element.Pago);
      // }
    });
    // if (this.currency === 'COL') {
    //   this.totalUSD = this.totalCOL / this.currencyChange;
    // } else {
    //   this.totalCOL = this.totalUSD * this.currencyChange;
    // }
  }

  changeSelectedPay(index: number, Selected: boolean, Pago: number, DocBalance: number) {
    //this.incomingPaymentList.forEach(x => x.Selected = false);
    if (Selected) {
      this.incomingPaymentList[index].Pago = DocBalance;
      // this.incomingPaymentList[index].Selected = true;
    } else {
      this.incomingPaymentList[index].Pago = 0;
    }
    this.hasInvoice = this.incomingPaymentList.find(x => x.Pago > 0);
    this.setTotals();
  }


  // Levanta la modal de pagos
  RisePaymentComponent(): void {
    let modalOption: NgbModalOptions = {
      backdrop: 'static',
      keyboard: false,
      ariaLabelledBy: 'modal-basic-title',
      size: 'lg',
      windowClass: 'Modal-Xl'
    };

    this.generateUniqueInvoiceId();

    this.modalPay = this.modalService.open(PaymentComponent, modalOption);

    this.modalPay.componentInstance.requiredData = this.GenerateDataForPayment();

    this.modalPay.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;


    }, (reason) => {
      if (reason.status === PaymentResults.Created) {
        let Payments = reason.Payment;
        this.changeColones = reason.Changes.COL;
        this.changeDolares = reason.Changes.USD;


        this.PaymentFail = reason.OnFail;

        Payments.PaymentInvoices = this.GetPaymentLines();

        // this.terminals = reason.PinpadInfo.terminals;
        this.pinPadCards = reason.PinpadInfo.pinPadCards;

        this.CreatePay(Payments);
      } else if (reason.status === PaymentResults.CancelButton) {
        this.IsPaymentFail = false;
      }
    });

  }

  CheckPayBalance(content) {
    if (!this.UdfORCTValidation()) {
      this.blockUI.stop();
      return;
    }
    //if (!this.isPagoCuenta) {
    if (!this.incomingPaymentForm.invalid && !this.searchForm.invalid) {
      if ((this.incomingPaymentList.length > 0 || this.isPagoCuenta) && (this.total > 0 )) {
        this.TotalG = this.total;
        this.RisePaymentComponent();
      } else {
        if (!this.isPagoCuenta && (this.total === 0)) {
          this.alertService.infoInfoAlert('No posee facturas para realizar el pago');
        } else if (this.isPagoCuenta && (this.total === 0)) {
          this.alertService.infoInfoAlert('No tiene un total a pagar en pago a cuenta');
        }
      }
    } else {
      this.alertService.infoInfoAlert('Debe haber seleccionado un cliente, sede, moneda, vendedor y comentario, gracias.');
    }
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

  printInvoice() {
    this.printReport(this.DocEntry);
  }

  printReport(DocEntry: number) {
    this.blockUI.start('Generando la impresión...');
    this.reportsService.printReport(DocEntry, ReportType.PaidRecived)
      .subscribe(data => {
        this.blockUI.stop();
        if (data.Result) {
          //var fileBase64 = atob(data);
          /*
          printJS({
              printable: data,
              type: 'pdf',
              base64: true
            })
        */
          //this.playPingPong(fileBase64);
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
        } else {
          this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);
        }
        /*
          var length = fileBase64.length;
          var arrayBuffer = new ArrayBuffer(length);
          var uintArray = new Uint8Array(arrayBuffer);
          for (var i = 0; i < length; i++) {
            uintArray[i] = fileBase64.charCodeAt(i);
          }
          var tab = window.open();
          var pdfFile = new Blob([uintArray], { type: 'application/pdf' });
          var fileUrl = URL.createObjectURL(pdfFile);
          tab.location.href = fileUrl;
        tab.print();
        */
      }, error => {
        this.blockUI.stop();
        // console.log('error');
        // console.log('error');
        // console.log(error);
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }



  GetPaymentLines(): PaymentLines[] {
    const PaymentLines: PaymentLines[] = [];
    let dT: string;
    const newIncomingPaymentList = this.incomingPaymentList.filter(book => book.Selected === true);
    newIncomingPaymentList.forEach(element => {
      if (element.type === 'Factura') { dT = BoRcptInvTypes.it_Invoice; }
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



  CreatePay(Payments: any) {

    this.blockUI.start('Generando el pago, espere por favor...'); // Start blocking

    Payments['U_CLVS_POS_UniqueInvId'] = this.uniqueDocumentID;
    if(this.searchForm.value.currency === Payments.DocCurrency){
      Payments.DocRate = 0;  
    }  
    this.paymentService.createPayInvoices(Payments, this.incomingPaymentForm.value.pagocuenta, this.mappedUdfs)
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          //this.close();
          this.IsPaymentFail = false;


          this.hasInvoice = false;
          this.DocEntry = data.DocEntry;
          this.canPrint = true;
          (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();

          this.returnedDocEntry = data.DocEntry;
          this.returnedDocNum = data.DocNum;

          // Probar para verificar que no se oucpe este codigo
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

          this.incomingPaymentList.length = 0;
          this.currency = this.searchForm.value.currency;




          this.paymentService.getPayInvoices(this.searchForm)
            .subscribe((data: any) => {
              if (data.Result) {
                this.incomingPaymentList = data.InvoicesList;
              } else {
                this.alertService.errorInfoAlert('Error al obtener lista de anticipos- ' + data.Error.Message);
              }
            }, (error) => {
              this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
            });
        } else {
          this.IsPaymentFail = true;
          this.RisePaymentComponent();
          this.alertService.errorAlert(`Error al crear el pago: Codigo: ${data.Error.Code}, Mensaje: ${data.Error.Message}`);
        }
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.IsPaymentFail = true;
        this.RisePaymentComponent();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });

  }









  tryM() {
    console.log(this.isPagoCuenta);
    // this.paymentService.createPayInvoices(null).subscribe(response => {
    //   console.log(response);
    // }, er => {
    //     console.log(er);
    // })
  }

  closePayModal() {
    if (this.V_CreditCards.length > 0) {
      this.alertService.infoInfoAlert(`Elimine las tarjetas agregadas`);
      return;
    }
    this.modalPay.close();
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
        this.currencyList = this.currencyList.reverse();
        this.searchForm.patchValue({
          currency: 'COL'
        });
        this.GetParamsViewList();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar las monedas - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }











  CreateNew() {
    this.InitVariables()
  }
  InitVariables() {
    this.udfTargets = [];
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.INCOMINGPAYMENTS);
    this.total = 0;
    this.currencyChange = 0;
    this.isPagoCuenta = false;

    this.ReceivedG = 0;
    this.uniqueDocumentID = this.commonService.GenerateDocumentUniqueID();

    this.TotalG = 0.0;
    this.mDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.V_CreditCards = [];

    this.hasInvoice = false;
    this.canPrint = false;
    this.incomingPaymentList = [];

    this.ReceivedG = 0;











    this.incomingPaymentForm = this.fb.group({
      salesMan: 1,
      comment: '',
      pagocuenta: [this.isPagoCuenta],
      pagocuentavalue: [0],
      reference: ['']
    });

    this.searchForm = this.fb.group({
      customer: ['', Validators.required],
      currency: ['', Validators.required]
    });

    this.getExchangeRate();
    this.getCustomers();
    this.GetCurrencyType();
    this.GetParamsViewList();
    this.getAccount();
    this.getCards();
    this.getAccountsBank();
    this.canPrint = false;
  }
  //#region UDFS ORCT

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
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.INCOMINGPAYMENTS).forEach(x => {
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

  UdfORCTValidation(): boolean {
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


  GenerateDataForPayment(): any {

    let InvoiceInfo: IInvoiceInfoForPayment = {
      CardCode: this.searchForm.value.customer.split(' - ')[0],
      Currency: this.searchForm.value.currency,
      SlpCode: '-1',
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
      UserCurrency:  this.searchForm.value.currency,
      DocumentTotals: {
        currencyChange: this.currencyChange, // Cambio actual
        totalUSD: this.total, // Total del documento en dolares
        total: this.total // Total del documento en colones
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

  GeneratePreInvoiceForPPPayment() {

    const Document = {
      'InvoiceLinesList': this.incomingPaymentList.filter(book => book.Selected === true),
      'accountPayment': this.incomingPaymentForm.value.pagocuenta,
      'CardCode': this.searchForm.value.customer.split(' - ')[0],
      'CardName': this.searchForm.value.customer.split(' - ')[1],
      'Currency': this.searchForm.value.currency,
      'isPayAccount': this.incomingPaymentForm.value.pagocuenta,
      'Comment': this.incomingPaymentForm.value.Comment,
      'SlpCode': '-1',
      'CLVS_POS_UniqueInvId': this.uniqueInvCode
    };
    return Document;
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

 GetSymbol(): string {
    switch (this.searchForm.value.currency) {
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


}
