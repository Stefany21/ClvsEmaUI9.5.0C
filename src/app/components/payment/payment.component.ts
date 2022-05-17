import { DatePipe, formatDate } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';
import { ElectronRendererService } from 'src/app/electronrenderer.service';
import { BACErrorCodes, BoRcptTypes, PaymentResults } from 'src/app/enum/enum';
import { Company, IPPTransaction, IPrinter, ITerminal, ITerminalByUser } from 'src/app/models';
import { IContableAccounts } from 'src/app/models/i-contableaccounts';
import { IInvoiceInfoForPayment, IOnPaymentFail } from 'src/app/models/i-payment-data';
import { BasePayment, CreditCards } from 'src/app/models/i-payment-document';
import { AlertService, AuthenticationService, CommonService, DocumentService, PaymentService, ReportsService, StorageService } from 'src/app/services';

// CONSTANTS
const printJS = require("print-js");
@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
  providers: [DatePipe]
})
export class PaymentComponent implements OnInit {

  //varbox
  requiredCardAccount: string;
  requiredCashAccount: string;
  requiredTransferAccount: string;
  defaultCardNumber: string;
  isAllowedToEditCardNumber: boolean;
  terminal: ITerminal;
  userCurrency: string;
  exRate: number;


  @BlockUI() blockUI: NgBlockUI;

  @Input() public requiredData: any;

  TO_FIXED_TOTALDOCUMENT: string; // Contiene la cantidad de decimales a usar en el total del documento

  //Forms
  cashForm: FormGroup;
  transferForm: FormGroup;
  checkForm: FormGroup;
  creditCardForm: FormGroup;
  //Variables pp
  pinPadCard: IPPTransaction;
  pinPadCards: IPPTransaction[];
  terminalsByUser: ITerminalByUser[];
  terminals: ITerminal[];
  pPTransaction: IPPTransaction;
  isRequestinBacPayment: boolean;


  preDocument: any;

  //Totales
  TotalG: number; // monto total del pago
  ReceivedG: number; // monto total recibido del pago
  DifferenceG: number; // monto total de la diferencia, o salto restante
  ChangeG: number; // guarda el vuelto
  TotalCash: number; // monto total del pago en efectivo
  TotalCards: number; // monto total del pago en tarjetas
  TotalTransfer: number; // monto total del pago en transferencia
  TotalCheck: number; // monto total del pago en cheque
  changeColones: number; // vuelto en colones
  changeDolares: number; // vuelto en dolares
  currencyChange: number; // monto del tipo de cambio
  totalUSD: number;
  total: number;


  //REVISAR ------------------------------------------------------
  isBilling: boolean;//Validacion flag para evitar reenvio de solicitudes al mismo tiempo

  currencyPayment: string;

  COMPANY: Company;

  currencyList: any[]; // lista de tipos de cambio
  accountList: IContableAccounts;
  V_CreditCards: CreditCards[]; // lista de pagos registrados con tarjetas de credito
  cardsList: any[]; // lista de tarjetas
  V_Checks: any[]; // Lista de pagos registrados con cheques
  banksList: any[]; // lista de bancos

  invoiceInfo: IInvoiceInfoForPayment;



  isFromFail: boolean;
  DefaultCardValid: string;//Fecha valido hasta configurado desde companias

  flagForm: boolean;  //Validacion flag para evitar reenvio de solicitudes al mismo tiempo 

  constructor(private fb: FormBuilder
    , private alertService: AlertService
    , private modalService: NgbModal
    , private datePipe: DatePipe
    , private storageService: StorageService
    , private authenticationService: AuthenticationService
    , private paymentService: PaymentService
    , private reportsService: ReportsService
    , private electronRendererService: ElectronRendererService
    , private router: Router) { }

  ngOnInit() {
    this.initData();
    this.LoadData();
    this.resetModalData();
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
  }

  LoadData(): void {
    if (this.requiredData) {

      this.isAllowedToEditCardNumber = this.requiredData.IsAllowedToEditCardNumber;
      this.requiredCashAccount = this.requiredData.RequiredCashAccount;
      this.requiredTransferAccount = this.requiredData.RequiredTransferAccount;
      this.requiredCardAccount = this.requiredData.RequiredCardAccount;
      this.userCurrency = this.requiredData.UserCurrency;
      this.exRate = +this.requiredData.ExRate;

      this.isFromFail = false;
      this.invoiceInfo = this.requiredData.InvoiceInfo;
      //Listas 
      this.V_CreditCards = this.requiredData.lists.V_CreditCards;
      this.accountList = this.requiredData.lists.accountList;
      this.currencyList = this.requiredData.lists.currencyList;
      this.cardsList = this.requiredData.lists.cardsList;
      this.banksList = this.requiredData.lists.banksList;
      this.V_Checks = this.requiredData.lists.V_Checks;
      //Tipo cambio expresado en COL/USD/EUR
      this.currencyPayment = this.requiredData.Currency.currencyPayment;
      //Totals
      this.currencyChange = this.requiredData.DocumentTotals.currencyChange;
      this.totalUSD = this.requiredData.DocumentTotals.totalUSD;
      this.TotalG = this.total = this.requiredData.DocumentTotals.total;

      // PP, documento requerido para almacenarlo cuando se haga un pago por PP
      this.preDocument = this.requiredData.PinpadInfo.PreDocument;
      this.DefaultCardValid = this.requiredData.CardValid;
      this.defaultCardNumber = this.requiredData.DefaultCardNumber;

      // OnFail, si algo salio mal creando el documento al cual se le hizo el pago
      if (this.requiredData.OnFail.IsFail) {
        this.isFromFail = true;
        let value: IOnPaymentFail = this.requiredData.OnFail.DataForFail;

        this.pPTransaction = value.pPTransaction;
        this.pinPadCards = value.pinPadCards;

        this.cashForm.setValue(value.cashForm.value);
        this.creditCardForm.setValue(value.creditCardForm.value);
        this.transferForm.setValue(value.transferForm.value);
        //this.checkForm.setValue(value.checkForm.value);

        this.DifferenceG = value.DifferenceG;
        this.ReceivedG = value.ReceivedG;
        this.TotalCards = value.TotalCards;
        this.TotalCash = value.TotalCash;
        this.TotalCheck = value.TotalCheck;
        this.TotalTransfer = value.TotalTransfer;
        this.setTotalAmount();
        this.changeCurrency(true);
      }
    }


  }


  // funcion para cambiar el tipo de moneda en la modal de pagos
  changeCurrency(_isOnLoad = false): void {

    const AMOUNT_APPLIED = 1

    if (!_isOnLoad) {
      this.creditCardForm.patchValue({ CreditSum: 0 });
      this.cashForm.patchValue({ TotalCash: 0 });
      this.transferForm.patchValue({ TransSum: 0 });
      this.alertService.infoInfoAlert(`Se ha restablecido el monto recibido del cliente`);
    }



    if (this.currencyPayment !== 'COL') {
      //this.currencyPayment = 'USD';
      if (this.userCurrency === 'USD') {
        this.TotalG = this.total;
        this.ReceivedG = this.total;
      }
      else {
        this.TotalG = Number((this.total / this.currencyChange).toFixed(2)); // Number((/ this.currencyChange).toFixed(2));// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
        this.ReceivedG = this.TotalG; //Number((this.total / this.currencyChange).toFixed(2));// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
      }
      // this.TotalG = Number((this.total / this.currencyChange).toFixed(2));// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
      // this.ReceivedG = Number((this.total / this.currencyChange).toFixed(2));// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
    } else {
      // this.TotalG = this.total;
      // this.ReceivedG = this.total;

      if (this.userCurrency === 'COL') {
        this.TotalG = this.total;// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
        this.ReceivedG = this.TotalG;// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
      }
      else {


        this.TotalG = Number((this.total * this.currencyChange).toFixed(2));   // Number((/ this.currencyChange).toFixed(2));// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
        this.ReceivedG = this.TotalG; //Number((this.total / this.currencyChange).toFixed(2));// this.totalUSD;//Number((this.total / this.currencyChange).toFixed(2));
      }
      //this.currencyPayment = 'COL';
    }

    this.ReceivedG = 0;
    this.setTotalAmount();
  }

  onCtrlBCash(): void {
    this.patchZeroes();
    this.cashForm.patchValue({ TotalCash: this.DifferenceG.toFixed(this.COMPANY.DecimalAmountTotalDocument) });
    this.addAmountCash();
  }

  patchZeroes(): void {

  }

  addAmountCash(): void {
    // console.log('cash');
    this.ReceivedG = +this.ReceivedG.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    this.TotalG = +this.TotalG.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    this.TotalCash = parseFloat(this.cashForm.value.TotalCash);

    if (this.TotalCash > 0) {
      this.setTotalAmount();
    } else {
      this.cashForm.patchValue({ TotalCash: 0 });
      this.TotalCash = 0;
      this.setTotalAmount();
    }
  }

  // funcion para calcular el total de recibido y de diferencia para el pago
  setTotalAmount(): void { //decimalPipe

    this.ReceivedG = Number((this.TotalCash + this.TotalCards + this.TotalCheck + this.TotalTransfer).toString());
    this.ReceivedG = +this.ReceivedG.toFixed(this.COMPANY.DecimalAmountTotalDocument);

    let diff = Number((this.TotalG - this.ReceivedG).toString());

    this.DifferenceG = Math.max(diff, 0.0);
    this.ChangeG = Math.max(0, -1 * diff);

    if (this.currencyPayment !== 'COL') {
      this.changeDolares = this.ChangeG;
      this.changeColones = Number((this.ChangeG * this.currencyChange).toString());
    }
    else {
      this.changeDolares = Number((this.ChangeG / this.currencyChange).toString());;
      this.changeColones = this.ChangeG;
    }
  }

  // funcion para colocar el monto a pagar en tranferencia
  addAmountTransfer(): void {
    this.TotalTransfer = parseFloat(this.transferForm.value.TransSum);
    this.TotalTransfer = +this.TotalTransfer.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    this.TotalCards = +this.TotalCards.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    this.TotalCheck = +this.TotalCheck.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    this.TotalG = +this.TotalG.toFixed(this.COMPANY.DecimalAmountTotalDocument);

    if (this.TotalTransfer > 0) {
      if ((this.TotalCards + this.TotalTransfer + this.TotalCheck) <= this.TotalG) {
        this.setTotalAmount();
      } else {
        this.alertService.infoInfoAlert('El monto ingresado en transferencia supera el total de la factura.');
        this.transferForm.patchValue({ TransSum: 0 });
        this.TotalTransfer = 0;
        this.setTotalAmount();
      }
    } else {
      this.transferForm.patchValue({ TransSum: 0 });
      this.TotalTransfer = 0;
      this.setTotalAmount();
      // this.alertService.infoInfoAlert(
      //   "El monto ingresado en Total es incorrecto."
      // );
    }
  }

  addAmounCreditCard() {

    if (this.requiredCardAccount && +this.creditCardForm.value.CreditSum > 0 && this.creditCardForm.value.CreditCard == '') {
      this.alertService.infoAlert(`Por favor seleccione el nombre de la tarjeta antes de enviar el pago`);
      return ;
    }

    if (!this.creditCardForm.value.CardNum) {
      this.alertService.infoAlert(`Por favor digite un número de tarjeta válido`);
      return ;
    }

    let totalcard = 0;
    if (this.creditCardForm.valid) {
      if (parseFloat(this.creditCardForm.value.CreditSum) > 0) {
        if (this.V_CreditCards.length > 0) {
          this.V_CreditCards.forEach((vcc) => {
            totalcard += parseFloat(vcc.CreditSum.toString());
          });
          totalcard += parseFloat(this.creditCardForm.value.CreditSum);
        } else {
          totalcard = parseFloat(this.creditCardForm.value.CreditSum);
        }

        totalcard = Number(totalcard.toFixed(this.COMPANY.DecimalAmountTotalDocument));

        if (totalcard > 0) {
          if ((totalcard + this.TotalTransfer + this.TotalCheck) <= this.TotalG) {

            const CREDIT_CARD = this.cardsList.filter(x => x.CreditCard === this.creditCardForm.value.CreditCard)[0];
            // console.log('Aquiiii', CREDIT_CARD)
            // Revisar ----------
            let temp = this.creditCardForm.value.CardValid.split('-');
            let aux = temp[1] + '/' + temp[0][2] + temp[0][3];

            this.V_CreditCards.push({
              CardValid: aux,
              CreditCardNumber: this.creditCardForm.value.CardNum,
              // CrTypeCode: CREDIT_CARD.CardName.split(' ')[0],
              CreditCard: CREDIT_CARD.CardName.split(' ')[0],
              CreditSum: this.creditCardForm.value.CreditSum,
              //Curr: this.currencyPayment,
              U_ManualEntry: this.creditCardForm.value.IsManualEntry ? '1' : '0',

              FormatCode: CREDIT_CARD.CardName,
              OwnerIdNum: this.creditCardForm.value.OwnerIdNum,
              VoucherNum: this.creditCardForm.value.VoucherNum,
              IsManualEntry: this.creditCardForm.value.IsManualEntry,
              CreditAcct: CREDIT_CARD.CreditCard
            } as CreditCards);

            this.TotalCards = totalcard;
            this.setTotalAmount();

            this.creditCardForm.patchValue({ OwnerIdNum: '0' });
            this.creditCardForm.patchValue({ VoucherNum: '0' });
            this.creditCardForm.patchValue({ CardNum: this.defaultCardNumber });
            this.creditCardForm.patchValue({ CardValid: this.DefaultCardValid });
            this.creditCardForm.patchValue({ CreditSum: '0' });
            this.creditCardForm.patchValue({ IsManualEntry: true });
          } else {

            this.creditCardForm.patchValue({ CreditSum: '0' });
            this.alertService.infoInfoAlert('El monto ingresado en la tarjeta de crédito supera el total de la factura.');
          }
        } else {
          this.alertService.infoInfoAlert(
            "El monto ingresado en Total es incorrecto."
          );
          this.creditCardForm.patchValue({ CreditSum: 0 });
        }
      } else {
        this.creditCardForm.patchValue({ CreditSum: 0 });
        // this.alertService.infoInfoAlert(
        //   "El monto total debe ser superior a cero."
        // );
      }
    } else {
      this.alertService.infoInfoAlert("Campos inválidos");
    }
  }

  removeCreditCard(index, _voucherNumber: string) {

    let iPPTrasaction = this.pinPadCards.find(x => x.ReferenceNumber === _voucherNumber);

    if (iPPTrasaction) {
      this.terminal = this.terminals.find(x => x.Currency == this.currencyPayment);      
      iPPTrasaction.Terminal = this.terminal;
      this.blockUI.start(`Anulando tarjeta, espere por favor`);
      this.paymentService.cancelPinPadCard(iPPTrasaction).subscribe(next => {


        try {

          if (next.Result) {

            this.pinPadCards = this.pinPadCards.filter(x => x.ReferenceNumber !== _voucherNumber);
            this.TotalCards -= this.V_CreditCards[index].CreditSum;
            this.V_CreditCards.splice(index, 1);
            this.setTotalAmount();
            this.alertService.infoInfoAlert(`Tarjeta eliminada`);

            this.creditCardForm.patchValue({
              'CardValid': this.DefaultCardValid,
              'CardNum': '9999',
              'OwnerIdNum': '0',
              'VoucherNum': '0',
              'IsManualEntry': true
            });
            this.pPTransaction = null;
            this.PrintVoid(next.Data);

            next.Data.InvoiceDocument = this.GeneratePreDocument();


            this.paymentService.CommitCanceledCard(next.Data, this.terminal, next.Data.SerializedObject).pipe(finalize(() => this.blockUI.stop())).subscribe(nexti => {

              if (nexti.Result) {
                console.info(nexti);
                //console.info(`succes: ${JSON.stringify(next)}`)
              }
              else {
                this.alertService.infoAlert(`No se puedo respaldar la transacción pero la tarjeta ha sido anulada`);
              }
            }, error => {
              console.log(error);
            });
          }
          else {
            this.alertService.errorAlert(`No se puede anular la tarjeta seleccionada, Detalle: ${next.Error.Message}`);
          }

        } catch (error) {
          this.blockUI.stop();
          this.alertService.errorAlert(`No se puede anular la tarjeta seleccionada, Detalle: ${JSON.stringify(error)}`);
        }


      }, error => {
        this.blockUI.stop();
        console.log(error);
      }, () => this.blockUI.stop());
    }
    else {
      this.TotalCards -= this.V_CreditCards[index].CreditSum;
      this.V_CreditCards.splice(index, 1);
      this.setTotalAmount();
    }
  }


  PrintVoid(_pPTransaction: IPPTransaction) {
    const DATE = new Date(_pPTransaction.CreationDate);

    const DAYS = DATE.getDate() < 10 ? '0' + DATE.getDate() : DATE.getDate().toString();
    const MONTHS = (DATE.getMonth() + 1) < 10 ? '0' + (DATE.getMonth() + 1) : (DATE.getMonth() + 1).toString();
    const YEAR = DATE.getFullYear().toString().slice(2, DATE.getFullYear().toString().length);
    let stringedAmount: string = _pPTransaction.Amount.toString();
    _pPTransaction.Amount = stringedAmount.substring(-1, stringedAmount.length - 2) + '.' + stringedAmount.substring(stringedAmount.length - 2);

    // _pPTransaction.Amount = +(+_pPTransaction.Amount).toFixed(2);
    // _pPTransaction.CreationDate = DAYS + ' / ' + MONTHS + ' / ' + YEAR;    
    _pPTransaction.CreationDate = formatDate(_pPTransaction.CreationDate, 'yyyy-MM-dd', 'en'); 
    this.blockUI.start('Procesando, espere por favor');

    this.reportsService.PrintVoucher(_pPTransaction).pipe(finalize(() => this.blockUI.stop())).subscribe(data => {


      try {

        if (data.Result) {
          if (this.electronRendererService.CheckElectron()) {
            let fileName = 'Invoice_' + _pPTransaction.TransactionId + '.pdf';
            const PRINTERCONFIGURATION = JSON.parse(this.storageService.getCompanyConfiguration().PrinterConfiguration) as IPrinter;
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

      } catch (error) {
        console.info(error);
      }

    }, error => {

      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });

    // this.reportsService.PrintVoucher(_pPTransaction).subscribe(next => {
    //   console.log(next);
    // });
  }


  PrintCanceledVoucher(): void {
    // throw new Error("Method not implemented.");
  }


  onCtrlBTransferencia(): void {
    this.patchZeroes();
    this.transferForm.patchValue({ TransSum: this.DifferenceG.toFixed(this.COMPANY.DecimalAmountTotalDocument) });
    this.addAmountTransfer();
  }

  onCtrlBCheque(): void {
    this.patchZeroes();
    this.checkForm.patchValue({ CheckSum: this.DifferenceG.toFixed(this.COMPANY.DecimalAmountTotalDocument) });
  }

  onCtrlBTarjeta(): void {
    this.patchZeroes();
    this.TotalG = +this.TotalG.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    this.ReceivedG = +this.ReceivedG.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    this.creditCardForm.patchValue({ CreditSum: this.DifferenceG.toFixed(this.COMPANY.DecimalAmountTotalDocument) });
  }

  closePayModal(): void {
    if (this.V_CreditCards.length > 0 && !this.isBilling) {
      this.alertService.infoInfoAlert(`Elimine las tarjetas agregadas`);
      return;
    }

    // console.log('payments', this.V_CreditCards);
    // console.log('payments', this.isBilling);

    let closeDetail = { status: PaymentResults.CancelButton, DismissReason: 'Cancelar' };
    this.modalService.dismissAll(closeDetail);
    //this.isOnSubmit = false;
  }

  resetModalData(): void {


    if (this.isFromFail) return;

    this.TotalCash = 0;
    this.TotalCards = 0;
    this.TotalCheck = 0;
    this.TotalTransfer = 0;
    this.ReceivedG = 0;
    this.DifferenceG = this.TotalG;
    this.ChangeG = 0;


    this.cashForm.patchValue({ AccountCash: this.accountList.CashAccounts[0].Account });
    this.cashForm.patchValue({ TotalCash: 0 });

    this.creditCardForm.patchValue({ CreditCard: this.cardsList[0].CreditCard });
    this.creditCardForm.patchValue({ CreditSum: 0 });
    this.creditCardForm.patchValue({ IsManualEntry: true });
    this.creditCardForm.patchValue({ VoucherNum: '0' });
    this.creditCardForm.patchValue({ CardNum: this.defaultCardNumber });
    this.creditCardForm.patchValue({ CardValid: this.DefaultCardValid });
    this.creditCardForm.patchValue({ OwnerIdNum: '0' });



    this.transferForm.patchValue({ AccountTransf: this.accountList.TransferAccounts[0].Account });
    this.transferForm.patchValue({ DateTrans: this.datePipe.transform(new Date(), 'y-MM-dd') });
    this.transferForm.patchValue({ Ref: '' });
    this.transferForm.patchValue({ TransSum: 0 });

    this.checkForm.patchValue({ AccountCheck: this.accountList.CheckAccounts[0].Account });
    this.checkForm.patchValue({ BankNames: this.banksList[0].BankCode });
    this.checkForm.patchValue({ DueDate: '' });
    this.checkForm.patchValue({ CountryCod: 'CR' });
    this.checkForm.patchValue({ AcctNum: '' });
    this.checkForm.patchValue({ CheckNum: '' });
    this.checkForm.patchValue({ CheckSum: 0 });
  }


  initData(): void {
    this.flagForm = false;
    this.terminal = this.storageService.GetTerminal() as ITerminal;
    this.pinPadCards = [];
    this.pinPadCard = null;
    this.currencyList = []; // lista de tipos de cambio

    this.V_CreditCards = []; // lista de pagos registrados con tarjetas de credito
    this.cardsList = []; // lista de tarjetas
    this.V_Checks = []; // Lista de pagos registrados con cheques
    this.banksList = []; // lista de bancos


    this.terminals = this.storageService.GetPPTerminals();
    this.terminalsByUser = this.storageService.GetPPTerminalsbyUser();
    this.COMPANY = this.storageService.getCompanyConfiguration();

    let mDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.cashForm = this.fb.group({
      AccountCash: ["", Validators.required],
      TotalCash: [0, Validators.required],
    });

    this.transferForm = this.fb.group({
      AccountTransf: ["", Validators.required],
      DateTrans: [mDate, Validators.required],
      Ref: ["", Validators.required],
      TransSum: [0, Validators.required],
    });

    this.checkForm = this.fb.group({
      AccountCheck: ['', Validators.required],
      BankNames: ['', Validators.required],
      DueDate: ['', Validators.required],
      CountryCod: [{ value: 'CR', disabled: true }, Validators.required],
      AcctNum: ['', Validators.required],
      CheckNum: ['', Validators.required],
      CheckSum: [0, Validators.required]
    });

    this.creditCardForm = this.fb.group({
      CreditCard: [""],
      CardNum: [""], // , [Validators.required, Validators.minLength(4), Validators.maxLength(4)]
      OwnerIdNum: ["", Validators.required],
      CardValid: [""], //, [Validators.required, Validators.minLength(3), Validators.maxLength(6)]
      CreditSum: [0, Validators.required],
      VoucherNum: ["", Validators.required],
      IsManualEntry: [true, Validators.required]
    });



    // this.creditCardForm.patchValue({ VoucherNum: '0' });
    //   this.creditCardForm.patchValue({ CardNum: '9999' });
    // this.creditCardForm.patchValue({ CardValid: '2022-12' });
    // this.creditCardForm.patchValue({ OwnerIdNum: '0' });
    // this.creditCardForm.patchValue({ IsManualEntry: true });




  }


  OnPaymentCreated(payment: any): void {


    let closeDetail = {
      status: PaymentResults.Created,
      Payment: payment,
      Changes: {
        USD: this.changeDolares,
        COL: this.changeColones,
        Recived: this.ReceivedG
      },
      PinpadInfo: {
        pinPadCards: this.pinPadCards,
        terminals: this.terminals,
        pPTransaction: this.pPTransaction
      },
      OnFail: this.CreateOnFailObject(),
      DismissReason: 'Ok'
    }


    this.modalService.dismissAll(closeDetail);
  }


  // Hace la peticion de pago al api local para uso del pin pad
  requestPinPadPayment(): void {
    if (this.flagForm) {
      console.log('Intento duplicación pago pinpad');
      return;  
    }  

    if (this.requiredCardAccount && +this.creditCardForm.value.CreditSum > 0 && this.creditCardForm.value.CreditCard == '') {
      this.alertService.infoAlert(`Por favor seleccione el nombre de la tarjeta antes de enviar el pago`);
      return ;
    }

    this.terminal = this.terminals.find(x => x.Currency == this.currencyPayment);
    if (!this.terminal ) {//|| Object.keys(this.terminal).length === 0) { 
      this.alertService.warningInfoAlert(`No existe un terminal configurado para el usuario`);
      this.isRequestinBacPayment = false;
      return;
    }
    const AMOUNT = +this.creditCardForm.value.CreditSum; 

    if (AMOUNT <= 0) {
      this.alertService.infoInfoAlert(`El monto a cobrar debe ser superior a 0`);
      return;
    }

    let totalcard = 0;

    if (parseFloat(this.creditCardForm.value.CreditSum) > 0) {
      if (this.V_CreditCards.length > 0) {
        this.V_CreditCards.forEach((vcc) => {
          // totalcard += vcc.CreditSum;
          totalcard += parseFloat(vcc.CreditSum.toString());
        });
        totalcard += parseFloat(this.creditCardForm.value.CreditSum);
      } else {
        totalcard = parseFloat(this.creditCardForm.value.CreditSum);
      }

      totalcard = Number(totalcard.toFixed(this.COMPANY.DecimalAmountTotalDocument));

      if (totalcard > 0) {
        if ((totalcard + this.TotalTransfer + this.TotalCheck) <= this.TotalG) {
          this.isRequestinBacPayment = true;

          if (this, this.currencyPayment !== this.terminal.Currency) {
            this.alertService.infoAlert(`El terminal sólo permite cobrar en ${this.terminal.Currency}`);
            return;
          }

          // let local_locked = false;
          // let terminal: ITerminal;




          // this.terminals.forEach(x => {
          //   this.terminalsByUser.forEach(y => {
          //     if (y.TerminalId === x.TerminalId && x.Currency === this.currencyPayment && !local_locked) {
          //       terminal = x;
          //       local_locked = true;
          //     }
          //   })
          // });

          // return;

          this.blockUI.start(`Solicitando pago`);
          this.flagForm = true;
          const CREDIT_CARD = this.cardsList.filter(x => x.CreditCard === this.creditCardForm.value.CreditCard)[0];

          // let CardExpDate = new Date(this.creditCardForm.value.CardValid);



          // console.log(aux);
          // CardExpDate.setMonth(CardExpDate.getMonth()+1)

          // Revisar ---------------------
          let temp = this.creditCardForm.value.CardValid.split('-');
          let aux = temp[0][2] + temp[0][3] + temp[1];

          // console.log(this.terminal);

          this.paymentService.requestPinPadPayment(AMOUNT, this.invoiceInfo.uniqueInvCode, this.currencyPayment, this.GeneratePreDocument(),
            this.BacIdGenerator(), JSON.parse(this.storageService.getCurrentSession()).UserName, this.terminal.TerminalId, CREDIT_CARD.CardName.slice(2),
            aux, this.terminal).subscribe(next => {
              this.flagForm = false;
              try {

                if (next.Result) {
                  this.pPTransaction = next.Data;
                  this.pPTransaction.Terminal = this.terminal;
                  this.pPTransaction.TerminalId = this.terminal.Id;
                  this.pPTransaction.SerializedObject = next.Data.SerializedObject;

                  if (next.Data.ResponseCode === '00') {

                    const PIN_PAD_CARD = next.Data;
                    this.pinPadCard = PIN_PAD_CARD;

                    this.creditCardForm.patchValue({ 'CardNum': PIN_PAD_CARD.CardNumber });
                    this.creditCardForm.patchValue({ 'OwnerIdNum': PIN_PAD_CARD.AuthorizationNumber });
                    this.creditCardForm.patchValue({ 'VoucherNum': PIN_PAD_CARD.ReferenceNumber });
                    this.creditCardForm.patchValue({ 'IsManualEntry': false });


                    this.pinPadCards.push(this.pinPadCard);
                    this.alertService.successInfoAlert(`Cobro realizado`);
                    this.TotalCards = totalcard;
                    this.setTotalAmount();

                    document.getElementById('raiseCardPayment').click();
                  }
                  else {

                    let errorRegistered = false;
                    let errorDetail = '';
                    let localIndex = 0;
                    BACErrorCodes.forEach(x => {
                      if (Object.keys(x)[0] == next.Data.ResponseCode) {
                        errorDetail = BACErrorCodes[localIndex][next.Data.ResponseCode];
                        errorRegistered = true;
                      }
                      localIndex++;
                    });

                    if (!errorRegistered) {
                      this.alertService.errorAlert(`Error al realizar el cobro. No existe descripción para el siguiente código de error: ${next.Data.ResponseCode}`);
                    }
                    else {
                      this.alertService.errorAlert(`Error al realizar el cobro. Código: ${next.Data.ResponseCode}, detalle ${errorDetail}`);
                    }
                  }
                }
                else {
                  this.isRequestinBacPayment = false;
                  console.log(next);
                  this.creditCardForm.patchValue({ CreditSum: 0 });
                  if (next.Error.Code === 401) {
                    this.recoveringLocalCredentials(next.Error.Message);
                  }
                  else {
                    this.alertService.errorAlert(`Error al realizar el cobro. Código: ${next.Data.ResponseCode}, detalle: ${next.Error.Message}`);
                  }
                }
                this.isRequestinBacPayment = false;
                this.blockUI.stop();
              }
              catch (error) {
                this.alertService.errorAlert(`Error al realizar el cobro. Código: ${next.Data.ResponseCode}, detalle: ${JSON.stringify(error)}`);
                this.isRequestinBacPayment = false;
                this.blockUI.stop();
              }
            }, error => {
              this.blockUI.stop();
              this.flagForm = false;
              this.isRequestinBacPayment = false;
              console.info(error);
              let message = JSON.stringify(error);

              if (message && message.toUpperCase().includes("Unknown Error".toUpperCase())) {
                message = `No se pudo conectar con el servicio pin pad, es posible que el servicio no se esté ejecutando. ${JSON.stringify(error)}`;
              }

              this.alertService.infoAlert(`Error: ${message}`);
            });
        } else {
          this.creditCardForm.patchValue({ CreditSum: 0 });
          this.alertService.infoInfoAlert('El monto ingresado en la tarjeta de crédito supera el total de la factura.');
        }
      } else {
        this.alertService.infoInfoAlert(
          "El monto ingresado en Total es incorrecto."
        );
      }
    } else {
      this.creditCardForm.patchValue({ CreditSum: 0 });
      this.alertService.infoInfoAlert(
        "El monto total debe ser superior a cero."
      );
    }
  }

  recoveringLocalCredentials(message: string): void {

    this.blockUI.start(message);
    setTimeout(() => {
      const _SESSION = JSON.parse(this.storageService.getCurrentSession());
      if (_SESSION !== null) {
        if (_SESSION['access_token'] !== null) {

          this.authenticationService.authPinPadCredentials(_SESSION.UserName, _SESSION.Password)
            .subscribe(
              next => {
                this.blockUI.stop();
                if (next && next.access_token) {
                  this.storageService.setCurrentSessionOffline(next);
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
        this.alertService.errorAlert(`Error al procesar la tarjeta: No se ha podido conectar con el servidor local`);
      }
    }, 2500);
  }



  CreatePaymentObject() {

    let total = 0;
    total = this.total;

    let Payments: BasePayment = {
      CardCode: this.invoiceInfo.CardCode,
      CashAccount: this.cashForm.value.AccountCash,
      CashSum: this.cashForm.value.TotalCash - this.ChangeG,
      Remarks: this.invoiceInfo.Comment,
      DocCurrency: this.currencyPayment,
      DocRate: this.currencyChange,
      Total: total,
      //PaymentChecks: this.V_Checks,
      PaymentCreditCards: this.V_CreditCards,
      PaymentInvoices: [],
      TransferSum: this.transferForm.value.TransSum,
      TransferAccount: this.transferForm.value.AccountTransf,
      TransferDate: this.transferForm.value.DateTrans,
      TransferReference: this.transferForm.value.Ref,
      accountPayment: this.invoiceInfo.accountPayment,
      DocDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DueDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      Series: -1,
      DocType: BoRcptTypes.rCustomer,
      UDFs: [],
      CheckAccount: '',
      CounterReference: '',
      U_MontoRecibido: this.ReceivedG
    };
    Payments['PPTransaction'] = this.pPTransaction;

    return Payments;
  }


  CreateOnFailObject(): IOnPaymentFail {

    return {

      //Forms
      cashForm: this.cashForm,
      checkForm: this.checkForm,
      creditCardForm: this.creditCardForm,
      transferForm: this.transferForm,

      //Variables de PP
      pPTransaction: this.pPTransaction,
      pinPadCards: this.pinPadCards,

      // Totales
      ChangeG: this.ChangeG,
      DifferenceG: this.DifferenceG,
      ReceivedG: this.ReceivedG,
      TotalCards: this.TotalCards,
      TotalCash: this.TotalCash,
      TotalCheck: this.TotalCheck,
      TotalTransfer: this.TotalTransfer

    }
  }




  GeneratePreDocument(): string {

    const Payments = this.CreatePaymentObject();

    const JSONDocument = {
      'Invoice': this.preDocument,
      'Payment': { ...Payments, V_PaymentLines: this.requiredData.PinpadInfo.PrePaymentLines }
    }

    return JSON.stringify(JSONDocument);
  }


  BacIdGenerator(): string {
    const DATE = new Date();

    const DAYS = DATE.getDate() < 10 ? '0' + DATE.getDate() : DATE.getDate().toString();
    const MONTS = (DATE.getMonth() + 1) < 10 ? '0' + (DATE.getMonth() + 1) : (DATE.getMonth() + 1).toString();
    const YEAR = DATE.getFullYear();


    const HOURS = DATE.getHours() < 10 ? '0' + DATE.getHours() : DATE.getHours();
    const MINUTES = DATE.getMinutes() < 10 ? '0' + DATE.getMinutes() : DATE.getMinutes();
    const SECONDS = DATE.getSeconds() < 10 ? '0' + DATE.getSeconds() : DATE.getSeconds();

    const DATE_ = new Date(Date.UTC(YEAR, +DAYS, +MONTS, +HOURS, +MINUTES, +SECONDS));

    const PRE_FIX = DATE_.getTime() / 1000;

    const SUB_FIX = this.terminal.Id < 10 ? '0' + this.terminal.Id : this.terminal.Id;

    return SUB_FIX + '' + PRE_FIX;
  }

  CreatePay() {

    if (this.requiredCashAccount && this.TotalCash > 0 && this.cashForm.value.AccountCash == '') {
      this.alertService.infoAlert(`Por favor seleccione una cuenta de efectivo antes de enviar el pago`);
      return ;
    }

    if (this.requiredCardAccount && this.TotalCards > 0 && this.creditCardForm.value.CreditCard == '') {
      this.alertService.infoAlert(`Por favor seleccione el nombre de la tarjeta antes de enviar el pago`);
      return ;
    }

    if (this.requiredTransferAccount && this.TotalTransfer > 0 && this.transferForm.value.AccountTransf == '') {
      this.alertService.infoAlert(`Por favor seleccione una cuenta de transferencia antes de enviar el pago`);
      return ;
    }

    this.isBilling = true;

    let payOk = true;
    if (this.ReceivedG < this.TotalG) {
      payOk = this.partialPayValidator();
    }
    if (payOk) {
      const Payments = this.CreatePaymentObject();

      this.blockUI.stop();

      this.OnPaymentCreated(Payments);

    }
  }

  partialPayValidator(): boolean {
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

}
