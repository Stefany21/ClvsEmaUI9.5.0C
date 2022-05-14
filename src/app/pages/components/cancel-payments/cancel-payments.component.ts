import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { debounceTime, distinctUntilChanged, filter, finalize, map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';

// MODELOS

// SERVICIOS
import { BusinessPartnerService, PaymentService, ParamsService, AlertService, AuthenticationService, PermsService, SapService, StorageService } from '../../../services/index';
import { DatePipe } from '@angular/common';
import { AppConstants, ICard, IPayment, IPPTransaction, ITerminal } from 'src/app/models';
import { IInvoicePaymentDetail } from 'src/app/models/i-invoice-payment-detail';

// PIPES

@Component({
  selector: 'app-cancel-payments',
  templateUrl: './cancel-payments.component.html',
  styleUrls: ['./cancel-payments.component.scss']
})
export class CancelPaymentsComponent implements OnInit {
  //varbox
  terminals: ITerminal[];
  documentKey: string;
  @BlockUI() blockUI: NgBlockUI;
  date: Date;
  nowDate: any;
  InfoInv: FormGroup;
  bpCodeNameList: string[] = []; // lista de los codigo con nombres de clientes
  invList: any[] = [];
  cards: ICard[];
  StatusFact: String;
  Formadate: string;
  invoiceNumber: number;
  totalDocument: number;
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  status: boolean[] = [true, false];
  invoiceSelected = false; //Existe factura seleccionada
  detailPaymentForm;
  globalStatus: any;
  paymentDetail: IInvoicePaymentDetail;



  invoiceDocEntry: number; // DocEntry de la factura

  constructor(private fbl: FormBuilder,
    private bps: BusinessPartnerService,
    private pays: PaymentService,
    private paramsService: ParamsService,
    private alertService: AlertService,
    private sPerm: PermsService,
    private authenticationService: AuthenticationService,
    private storageService: StorageService
  ) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.date = new Date();
    this.nowDate = `${this.date.getFullYear()}-${('0' + (this.date.getMonth() + 1)).slice(-2)}-${('0' + this.date.getDate()).slice(-2)}`;
  }

  ngOnInit() {
    this.terminals = [];
    this.documentKey = '';
    this.fillDetailPaymentForm();
    this.checkPermits();
    this.GetParamsViewList();
    this.InfoInv = this.fbl.group({
      Cliente: ['', Validators.required],
      FechaIni: ['', Validators.required],
      FechaFin: ['', Validators.required]
    });

    this.InfoInv.controls.FechaIni.setValue(this.nowDate);
    this.InfoInv.controls.FechaFin.setValue(this.nowDate);

    this.getCustomers();
  }

  fillDetailPaymentForm(): void {
    this.detailPaymentForm = new FormGroup({
      InvoiceNumber: new FormControl(''),
      PaymentNumber: new FormControl(''),
      Total: new FormControl(''),
      TotalFC: new FormControl(''),
      TotalTransfer: new FormControl(''),
      TotalTransferFC: new FormControl(''),
    });
  }
  // chequea que se tengan los permisos para acceder a la pagina de cancelacion de pagos
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Cpay") {
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
  // obtiene la informacion de las facturas a cancelar
  // no recive paramestros
  getCustomers() {
    this.blockUI.start('Obteniendo clientes, espere por favor...'); // Start blocking
    this.bps.GetCustomers()
      .subscribe((data: any) => {
        if (data.Result) {
          for (let item of data.BPS) {
            this.bpCodeNameList.push(`${item.CardCode} - ${item.CardName}`);
          }
          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener la lista de Clientes - error: ' + data.errorInfo.Message);
        }
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error.error.Message}`);
      });
  }
  // llena el typehead
  searchBP = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpCodeNameList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  StatusFactura(status) {
    if (status == "O") {
      this.StatusFact = "Abierta";
    } else {
      this.StatusFact = "Cerrada";
    }
    return this.StatusFact;
  }
  // trae la lista de facturas a cancelar
  // no recive paramestros
  getInvList() {
    // if(this.InfoInv.invalid){
    //   this.alertService.infoAlert('Debe ingresar Cliente, Fecha inicial, Fecha Final');
    //   return;
    // }
    let cardCode = '';

    if (this.InfoInv.value.Cliente.split(' ')[0]) {
      cardCode = this.InfoInv.value.Cliente.split(' ')[0];
    }

    const InfoSearch = {
      CardCode: cardCode,
      FIni: this.InfoInv.value.FechaIni,
      FFin: this.InfoInv.value.FechaFin
    };

    this.blockUI.start('Obteniendo datos de los pagos a cancelar...');
    this.pays.getInvList(InfoSearch).subscribe((data: any) => {
      if (data.Result) {
        this.invList.length = 0;
        this.invList = data.paymentList;
        console.log(this.invList)
        this.blockUI.stop(); // Stop blocking
        if (data.paymentList.length === 0) {
          this.alertService.infoAlert('No se encontraron facturas en el rango de fechas seleccionadas');
        }
      } else {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorAlert('Error al obtener la lista de pago - error: ' + data.errorInfo.Message);
      }
    }, (error) => {
      this.blockUI.stop(); // Stop blocking
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error.error.Message}`);
    });
  }


  // valida que solo un check este activo
  // parametro dacentri del modelo
  CheInv(status: any, entry: any, _docNum: number, _invoiceNumber: number, InvoDocEntry: number,_documentKey: string) {
    this.blockUI.start('Obteniendo detalle de pago, espere por favor');
    this.pays.getPaymentDetail(entry).subscribe(next => {
      if (next.Result) {
        this.paymentDetail = next.InvoicePaymentDetail;
        this.invoiceNumber = _invoiceNumber;
        this.documentKey = _documentKey;
      
        console.table([entry, _docNum, _invoiceNumber, _documentKey], ['Value']);

        this.invoiceDocEntry = InvoDocEntry;

        this.fillDetailPaymentForm();
        this.detailPaymentForm.patchValue({
          InvoiceNumber: _invoiceNumber,
          PaymentNumber: entry,
          Total: next.InvoicePaymentDetail.CashSum,
          TotalFC: next.InvoicePaymentDetail.CashSumFC,
          TotalTransfer: next.InvoicePaymentDetail.TrsfrSum,
          TotalTransferFC: next.InvoicePaymentDetail.TrsfrSumFC
        });
        this.totalDocument = 0;
        this.totalDocument = next.InvoicePaymentDetail.CashSum + next.InvoicePaymentDetail.CashSumFC + next.InvoicePaymentDetail.TrsfrSumFC + next.InvoicePaymentDetail.TrsfrSum;
        this.cards = next.InvoicePaymentDetail.Cards;
        this.cards.forEach(x => {
          const DATE_DUE = new Date(x.FirstDue);
          const DATE_EXPIRATION = new Date(x.CardValid);
          this.totalDocument = this.totalDocument + x.CreditSum;
          x.FirstDue = DATE_DUE;
          x.CardValid = DATE_EXPIRATION;
        });
      }
      else {
        this.alertService.errorAlert(`Error al obtener el detalle de la factura: Error: ${next.Error.Code}, Detalle: ${next.Error.Message}`);
      }
      this.blockUI.stop();
    }, error => {
      console.log(error);
      this.blockUI.stop();
    });
    this.invoiceSelected = status.target.checked;
    this.invList.forEach(inv => {
      if (inv.DocEntry === entry) {
        inv.Selected = true;
      } else {
        inv.Selected = false;

      }
    });

  }
  // envia la informacion para cancelar el pago
  // no recive paramestros
  enviarInfo() {
    
    if (!this.paymentDetail) {
      this.alertService.infoInfoAlert(`Por favor seleccione una factura para poderla cancelar`);
      return;
    }

    this.blockUI.start('Procesando, espere por favor');

    this.paymentDetail.DocNum = this.invoiceNumber;

    if (this.paymentDetail.Cards.length > 0) {
      this.pays.GetCommitedPPCards(this.documentKey).subscribe(next => {
        if (next.Result) {
          this.CancelPPCard(next.Data[0]);
        }
        else {
          if (next.Error.Code == -5) { // Signfica que el pago con tarjetas se hizo manual
            this.raiseCancelPayment();
          }
          else {
            this.blockUI.stop();
            this.alertService.errorAlert(`Error: ${next.Error.Message}`);
          }
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorAlert(`Error: ${error}`);
        console.info('error detail', error);
      });
    }
    else {
      console.log('Sin pp')
      this.raiseCancelPayment();
    }
  }

  CancelPPCard(_pPTransaction: IPPTransaction) {
    this.blockUI.update(`Anulando tarjeta, espere por favor`);

    
    this.terminals = this.storageService.GetPPTerminals();

    if (!this.terminals || this.terminals.length == 0) {
      this.alertService.infoAlert(`No se pudieron descargar los terminales. Inicie sesión nuevamente por favor.`)
      return;
    }

    const TERMINAL = this.terminals.find(x => x.Id === _pPTransaction.TerminalId);

    if (!TERMINAL) {
      this.alertService.infoAlert(`No se pudo encontrar el terminal usado en la trasacción.  Inicie sesión nuevamente por favor.`)
      return;
    }

    _pPTransaction.Terminal = TERMINAL;

    this.pays.cancelPinPadCard(_pPTransaction).subscribe(next => {
      if (next.Result) {
        this.pays.CommitCanceledCard(next.Data, TERMINAL, next.Data.SerializedObject).subscribe(nexti => {
          if (nexti.Result) {
            console.info(nexti);
          }
          else {
            this.alertService.infoAlert(`No se puedo respaldar la transacción pero la tarjeta ha sido anulada`);
          }
          this.raiseCancelPayment();
        }, error => {
          this.alertService.infoAlert(`Error: ${AppConstants.GetError(error)}`);
          console.log(error);
        });
      }
      else {
        this.alertService.errorAlert(`Error: ${next.Error.Code} - ${next.Error.Message}`);
      }
    }, error => {
      console.info(error);
      let message = AppConstants.GetError(error);

      if (message && message.includes(`Unknown Error`)) {
        message = `Parece que el servicio pin pad no se está ejecutando. ` + message;
      }
      this.alertService.errorAlert(`Error: ` + message);
    });
  }

  raiseCancelPayment(_ppTransaction: IPPTransaction = null): void {
    var entry = '';
    var numFact = '';
    let docNumPago = -1;
    this.invList.forEach(inv => {

      if (inv.Selected) {
        entry = inv.DocEntry;
        numFact = inv.DocNum;
        docNumPago = inv.DocNumPago;
      }
    });
    if (!this.invoiceSelected) {
      this.alertService.infoAlert('Selecccione factura a cancelar');
      return;
    }
    const canPay = {
      DocEntry: entry
    };

    if (!this.blockUI.isActive) {
      this.blockUI.update(`Anulando pago, espere por favor.`);
    }
    else {
      this.blockUI.start(`Anulando pago, espere por favor.`);
    }

    this.pays.CancelPayment(canPay).pipe(finalize(()=>this.blockUI.stop())).subscribe((data: any) => {
     
      if (data.Result) {
        this.alertService.successAlertHtml(`Pago Cancelado Correctamente  <br/> Número de Factura: ${numFact}<br/>  Numero de Pago: ${entry}`);
        this.getInvList();
      }else {
        this.alertService.errorAlert('Error: ' + entry + ' Error: ' + data.Error.Message);
      }
    }, (error) => {
      
      this.alertService.errorInfoAlert(`Error: ${AppConstants.GetError(error)}`);
    });
  }
  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.viewParamTitles = data.Params.filter(param => {
            return param.type === 6;
          });
          this.ChargeParamstoView();
        } else {
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data.errorInfo.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  raiseModelDetail(_docNum: number, _invoiceNumber: number, _payMent: IPayment, status: any): void {
    this.invList.forEach(inv => inv.Selected = false);
    this.globalStatus = status;
    if ((<HTMLInputElement>document.getElementById('' + this.invoiceNumber)) !== null) (<HTMLInputElement>document.getElementById('' + this.invoiceNumber)).checked = false;
    this.blockUI.start('Obteniendo detalle de pago, espere por favor');
    this.pays.getPaymentDetail(_docNum).subscribe(next => {
      if (next.Result) {
        this.paymentDetail = next.InvoicePaymentDetail;
        this.invoiceNumber = _invoiceNumber;
        this.fillDetailPaymentForm();
        this.detailPaymentForm.patchValue({
          InvoiceNumber: _invoiceNumber,
          PaymentNumber: _docNum,
          Total: next.InvoicePaymentDetail.CashSum,
          TotalFC: next.InvoicePaymentDetail.CashSumFC,
          TotalTransfer: next.InvoicePaymentDetail.TrsfrSum,
          TotalTransferFC: next.InvoicePaymentDetail.TrsfrSumFC
        }
        );
        this.totalDocument = 0;
        this.totalDocument = next.InvoicePaymentDetail.CashSum + next.InvoicePaymentDetail.CashSumFC + next.InvoicePaymentDetail.TrsfrSumFC + next.InvoicePaymentDetail.TrsfrSum;
        this.cards = next.InvoicePaymentDetail.Cards;
        this.cards.forEach(x => {
          const DATE_DUE = new Date(x.FirstDue)
          const DATE_EXPIRATION = new Date(x.CardValid);
          this.totalDocument = this.totalDocument + x.CreditSum;
          x.FirstDue = DATE_DUE;
          x.CardValid = DATE_EXPIRATION;
        });
        (<HTMLButtonElement>document.getElementById('triggerDetailModal')).click();
      }
      else {
        this.alertService.errorAlert(`Error al obtener el detalle de la factura: Error: ${next.Error.Code}, Detalle: ${next.Error.Message}`);
      }
      this.blockUI.stop();
    }, error => {
      console.log(error);
      this.blockUI.stop();
    }, () => { this.blockUI.stop() });
    this.invoiceSelected = status.target.checked;
  }

  setSelectedInvoice(): void {
    console.log('global values ', this.globalStatus);
    this.invList.forEach(x => {
      if (x.DocNum === this.invoiceNumber) {
        if ((<HTMLInputElement>document.getElementById('' + x.DocNumPago)) !== null) {
          this.invList.forEach(inv => inv.Selected = inv.DocNum === this.invoiceNumber);
          this.invoiceSelected = true;
          (<HTMLInputElement>document.getElementById('' + x.DocNumPago)).checked = true;
        }
      }
    });
  }

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter(param => {
      return param.Name === 'T_cancelPay';
    });
    this.title = obj[0].Text;
  }

}
