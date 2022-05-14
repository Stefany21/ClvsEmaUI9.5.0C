import { Component, OnInit, ViewChild } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { saveAs } from 'file-saver';
import { FormGroup, FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';

const printJS = require('print-js');

// MODELOS

import { PaydeskBalance, CONFIG_VIEW, ITerminalByUser, ITerminal, ICommitedTransaction } from 'src/app/models/index';
// RUTAS

// COMPONENTES

// SERVICIOS
import { PermsService, DocumentService, ReportsService, ParamsService, AlertService, SalesManService, StorageService, DailybalanceService, CommonService, CompanyService, BankService, AuthenticationService } from '../../../services/index';
import { toInteger } from '@ng-bootstrap/ng-bootstrap/util/util';
import { element } from '@angular/core/src/render3';

// Electron renderer service
import { ElectronRendererService } from '../../../electronrenderer.service';
import { NgbModal, ModalDismissReasons, NgbTabset } from '@ng-bootstrap/ng-bootstrap';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';

// PIPES

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  styleUrls: ['./balance.component.scss'],
  providers: [DatePipe]
})
export class BalanceComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  @ViewChild('tabset') tabSet: NgbTabset;

  paydeskBalanceForm: FormGroup;
  BForm: FormGroup; // nombre del formulario de facturas a reimprimir  
  correoForm: FormGroup; // Formulario de correo
  // whatsappForm: FormGroup; // Formulario de whatsapp

  Date: Date; // fecha actual
  NowDate1: any;
  Zoom: number;
  IsLocked: boolean;
  CloseResult: string;
  ModalPay: any;

  AddCc: boolean = true;//Agregar copia correo
  AddCopiaMail: boolean = false;
  BtnOptionDocument: boolean = false; //Opcion del Documento 
  Base64Report: string;

  Pinpad = false;
  terminalsByUser: ITerminalByUser[];
  terminals: ITerminal[];
  Total: string;
  permisos = true;
  currentUser: any; // variable para almacenar el usuario actual  
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual

  constructor(private fbs: FormBuilder,
    private sPerm: PermsService,
    private invSer: DocumentService,
    private alertService: AlertService,
    private salesManService: SalesManService,
    private repoSer: ReportsService,
    private electronRendererService: ElectronRendererService,
    private modalService: NgbModal,
    private fb: FormBuilder,
    private storageService: StorageService,
    private datePipe: DatePipe,
    private paydeskService: DailybalanceService,
    private commonService: CommonService,
    private companyService: CompanyService,
    private banksService: BankService,
    private permService: PermsService,
    private authenticationService: AuthenticationService
  ) {
    this.electronRendererService.on('Print', (event: Electron.IpcMessageEvent, ...arg) => {
      console.log("response from electron render service: load print listener" + arg);
    });
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });

  }


  ngOnInit() {
    this.Total = '';
    this.IsLocked = true;
    this.Zoom = 0.5;
    this.BtnOptionDocument = false;
    this.Date = new Date();
    this.NowDate1 = `${this.Date.getFullYear()}-${('0' + (this.Date.getMonth() + 1)).slice(-2)}-${('0' + this.Date.getDate()).slice(-2)}T${(this.Date.getHours())}:${('0' + this.Date.getMinutes()).slice(-2)}:${('0' + this.Date.getSeconds()).slice(-2)}`;

    this.BForm = this.fbs.group({
      UserName: [{ value: '', disabled: true }, Validators.required],
      UserCode: [{ value: '', disabled: true }, Validators.required],
      FechaIni: [this.datePipe.transform(new Date(), 'yyyy-MM-dd')],
      FechaFin: [''],
    });
    this.BtnOptionDocument = false;

    // this.correoForm.controls['E_Mail'].setValidators([]);
    //this.correoForm.controls['E_Mail'].updateValueAndValidity();

    this.correoForm = this.fb.group({
      emailsend: ['', [Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]],
      subject: ['', Validators.required],
      message: [''],
      tags: [''],//this.fb.array([])      
    });
    this.AddCopiaMail = false;
    // this.whatsappForm = this.fb.group({
    //   numeroWhatsapp: ['', Validators.required],
    //   messageWhatsapp: ['', Validators.required]
    // });
    this.paydeskBalanceForm = this.fb.group({
      Cash: ['', Validators.required],
      Cards: ['', Validators.required],
      Transfer: ['', Validators.required],
      CardsPinpad: ['', Validators.required]
    });
    this.CheckPermits();
    this.setLoggedUserName();
    this.GetSettings();
    this.terminals = this.storageService.GetPPTerminals();
    this.terminalsByUser = this.storageService.GetPPTerminalsbyUser();
  }
  get formControls() {
    return this.paydeskBalanceForm.controls;
  }
  async onClickCreatePaydeskBalance() {
    if (!this.Pinpad) {
      this.paydeskBalanceForm.get('CardsPinpad').setValue(0);
    }
    if (this.paydeskBalanceForm.invalid) {
      const CONFIRMATIONRESULT = await this.alertService.ConfirmationAlert('Confirmación', 'No has completado valores para el cierre de caja. ¿Continuar de todas formas?', 'Continuar');
      if (!CONFIRMATIONRESULT) return;
    }

    let paydeskBalance = this.paydeskBalanceForm.value as PaydeskBalance;

    this.blockUI.start('Procesando...');

    this.paydeskService.PostPaydeskBalance(paydeskBalance)
      .subscribe(response => {
        this.blockUI.stop();

        if (response.Result) {
          this.alertService.successInfoAlert('Proceso finalizado exitosamente');
          this.paydeskBalanceForm.reset();
          this.tabSet.select('tabSearch');
          this.BtnOptionDocument = true;
          this.Base64Report = response.File;
          this.pdfSrc = this.base64ToArrayBuffer(response.File) as ArrayBuffer;
        } else {
          this.alertService.errorAlert(response.Error.Message);
        }
      }, err => {
        this.blockUI.stop();
        this.alertService.errorAlert(err);
      });
  }
  increaseZoom(): void {
    this.Zoom = this.Zoom + 0.1;
    this.Zoom = +this.Zoom.toFixed(1);
  }

  decreaseZoom(): void {
    if (this.Zoom === 0.1) return;
    this.Zoom = this.Zoom - 0.1;
    this.Zoom = +this.Zoom.toFixed(1);
  }



  // obtiene los cierres de caja del api
  // getInvBalanceList() {
  //   const BalanceModel = {
  //     User: this.BForm.value.slpCode,
  //     FIni: this.BForm.value.FechaIni,
  //     FFin: this.BForm.value.FechaFin,
  //     DBCode: null,
  //   };
  //   this.blockUI.start('Obteniendo datos de Facturas...');
  //   this.invSer.GetInvBalanceList(BalanceModel).subscribe((data: any) => {
  //     if (data.result) {
  //       this.balanceList.length = 0;
  //       if (data.UsrBalance.length > 0) {
  //         this.balanceList = data.UsrBalance;
  //         this.GetCurrList();
  //         this.BtnOptionDocument = true;
  //       } else {
  //         this.viewTable = false;
  //         this.BtnOptionDocument = false;
  //         this.alertService.infoAlert('No se encontraron datos dentro de los parámetros de búsqueda');
  //       }
  //       this.blockUI.stop(); // Stop blocking
  //     } else {
  //       this.BtnOptionDocument = false;
  //       this.viewTable = false;
  //       this.alertService.infoAlert('No se encontraron datos dentro de los parámetros de búsqueda');
  //       //this.alertService.infoAlert('Error al obtener  datos del cierre - error: ' + data.errorInfo.Message);
  //       this.blockUI.stop(); // Stop blocking
  //     }
  //   }, (error) => {
  //     this.viewTable = false;
  //     this.alertService.errorAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
  //     this.blockUI.stop(); // Stop blocking
  //   });
  // }

  // pone los cierres de caja en la lista
  // GetCurrList() {
  //   this.COLList.length = 0;
  //   this.USDList.length = 0;
  //   this.cardDol = 0;
  //   this.transDoL = 0;
  //   this.CashDol = 0;
  //   this.CheckDol = 0;
  //   this.TotalDol = 0;
  //   this.cardCol = 0;
  //   this.transCol = 0;
  //   this.CashCol = 0;
  //   this.CheckCol = 0;
  //   this.TotalCol = 0;
  //   this.BalanceCol = 0;
  //   this.BalanceDol = 0;
  //   this.viewTable = true;
  //   this.balanceList.forEach(element => {
  //     if (element.DocCur === 'COL') {
  //       this.COLList.push(element);
  //       this.cardCol += element.CreditSum;
  //       this.transCol += element.TrsfrSum;
  //       this.CashCol += element.CashSum;
  //       this.CheckCol += element.CheckSum;
  //       this.TotalCol += element.PayTotal;
  //       this.BalanceCol += element.Balance;
  //     }
  //     if (element.DocCur === 'USD') {
  //       this.USDList.push(element)
  //       this.cardDol += element.CredSumFC;
  //       this.transDoL += element.TrsfrSumFC;
  //       this.CashDol += element.CashSumFC;
  //       this.CheckDol += element.CheckSumFC;
  //       this.TotalDol += element.PayTotal;
  //       this.BalanceDol += element.Balance;
  //     }
  //   })
  // }
  // funcion para cerrar la modal de envios de documentos
  close() {
    // this.correoForm.disable();
    this.ModalPay.close();
    this.AddCc = true;
  }

  get ced() {
    return this.correoForm.controls;
  }

  download() {
    this.blockUI.start('Procesando PDF, espere por favor...'); // Start blocking
    const BALANCEMODEL = {
      User: this.BForm.value.UserCode,
      FIni: this.BForm.value.FechaIni,
      FFin: this.BForm.value.FechaFin,
      DBCode: null,
    };
    this.repoSer.printBalanceReport(BALANCEMODEL)
      .subscribe((response: any) => {
        this.blockUI.stop(); // Stop blocking      
        if (response.Result) {
          var fileBase64 = atob(response.File);
          var length = fileBase64.length;
          var arrayBuffer = new ArrayBuffer(length);
          var uintArray = new Uint8Array(arrayBuffer);
          for (var i = 0; i < length; i++) {
            uintArray[i] = fileBase64.charCodeAt(i);
          }
          this.Date = new Date();
          this.NowDate1 = `${this.Date.getFullYear()}-${('0' + (this.Date.getMonth() + 1)).slice(-2)}-${('0' + this.Date.getDate()).slice(-2)}`;

          var pdfFile = new Blob([uintArray], { type: 'application/pdf' });
          var fileUrl = URL.createObjectURL(pdfFile);
          saveAs(pdfFile, `Reporte Cierre de Caja-${this.NowDate1}-PDF`);
        } else {
          this.alertService.errorAlert(`${response.errorInfo.Message}`);
        }
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorAlert(`${error}`);
      });
    return false;

  }
  deleteCc(index: number): void {
    // this.tags.removeAt(index);
    //this.tags.markAsDirty();
    this.AddCc = true;
    this.AddCopiaMail = false;
    this.correoForm.patchValue({ tags: "" });
  }
  get tags(): FormArray {
    return this.correoForm.get('tags') as FormArray;
  }
  addCorreo(): void {
    this.AddCopiaMail = true;
    //this.tags.push(new FormControl());
    this.AddCc = false;
  }
  SendWhatsappDocument() {
    /*  
    const whatsappModal = {
      numeroWhatsapp: this.whatsappForm.value.numeroWhatsapp,
      messageWhatsapp: this.whatsappForm.value.messageWhatsapp,
      modelReport:  {
        User: this.BForm.value.slpCode,
        FIni: this.BForm.value.FechaIni,
        FFin: this.BForm.value.FechaFin,
        DBCode: null,
        sendMailModel :null
      }
    }
    this.repoSer.SendWhatsappDocument(whatsappModal)
    .subscribe(data=> {
      //if(data.result){}

    })
*/
  }
  SendDocument() {
    this.blockUI.start('Enviando documento...'); // Start blocking 
    const CORREOMODEL = {
      emailsend: this.correoForm.value.emailsend,
      subject: this.correoForm.value.subject,
      message: this.correoForm.value.message,
      EmailCC: this.correoForm.value.tags
    };
    const BALANCEMODEL = {
      User: this.BForm.value.UserCode,
      FIni: this.BForm.value.FechaIni,
      FFin: this.BForm.value.FechaFin,
      DBCode: null,
      sendMailModel: CORREOMODEL
    };
    this.repoSer.sendDocument(BALANCEMODEL)
      .subscribe(data => {
        this.blockUI.stop();
        if (data.Result) {
          this.alertService.successAlertHtml(`Documento enviado por correo correctamente`);
          this.close();
          this.AddCopiaMail = false;
        } else {
          this.alertService.errorAlert(`Error al enviar documento al correo: ${data.Error.Code}-${data.Error.Message}`);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
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



  //Funcion abrir modal enviar por correo    
  sendOptionDocumento(content) {
    this.correoForm = this.fb.group({
      emailsend: ['', [Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]],
      subject: ['', Validators.required],
      message: [''],
      tags: [''],//this.fb.array([])      
    });
    this.ModalPay = this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg', windowClass: 'Modal-sm' });
    this.ModalPay.result.then((result) => {

      this.CloseResult = `Closed with: ${result}`;
    }, (reason) => {
      this.CloseResult = `Dismissed ${this.getDismissReason(reason)}`;
      this.correoForm = this.fb.group({
        emailsend: [''],
        subject: ['', Validators.required],
        message: [''],
        tags: [''],//this.fb.array([])      
      });
    });
  }

  pdfSrc: ArrayBuffer;// = "https://vadimdez.github.io/ng2-pdf-viewer/assets/pdf-test.pdf";
  // se encarga de imprimir 
  printReport() {

    if (!this.Base64Report) return;
    if (this.electronRendererService.CheckElectron()) {
      var date = new Date();
      let fileName = 'BalanceReporrt_' + date.getTime() + '.pdf';
      let file = { "fileName": fileName, "file": this.Base64Report };
      this.electronRendererService.send('Print', file);
    }
    else {
      printJS({
        printable: this.Base64Report,
        type: 'pdf',
        base64: true
      })
    }
  }

  displayPdfReport() {
    this.BtnOptionDocument = false;
    this.IsLocked = true;
    this.blockUI.start('Obteniendo la impresión...'); // Start blocking
    const BALANCEMODEL = {
      User: this.BForm.value.UserCode,
      FIni: this.BForm.value.FechaIni,
      FFin: this.BForm.value.FechaFin,
      DBCode: null,
    };
    this.repoSer.printBalanceReport(BALANCEMODEL)
      .subscribe((data: any) => {
        this.blockUI.stop();
        this.BtnOptionDocument = true;
        this.IsLocked = false;
        this.pdfSrc = this.base64ToArrayBuffer(data.File) as ArrayBuffer;
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  base64ToArrayBuffer(base64) {
    let binary_string = window.atob(base64);
    let len = binary_string.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  onTabChange($event: any) {
    if ($event.nextId === 'tabSearch') {
      this.paydeskBalanceForm.reset();
    } else {
      this.pdfSrc = null;
      this.Base64Report = null;
      this.BtnOptionDocument = false;
    }
  }
  setLoggedUserName() {
    let session: any = this.storageService.getCurrentSession();
    if (!session) return;

    session = JSON.parse(session);
    this.BForm.get('UserName').setValue(session.UserName);
  }

  onClickSearchPaydeskBalance() {

    if (!this.BForm.get('UserName').value || !this.BForm.get('FechaIni').value) {
      this.alertService.infoInfoAlert('Campos requeridos con formato inválido');
      return;
    }

    this.blockUI.start('Procesando...');
    this.paydeskService.GetPaydeskBalance(this.BForm.get('FechaIni').value)
      .subscribe(response => {
        this.blockUI.stop();
        if (response.Result) {
          this.BtnOptionDocument = true;
          this.IsLocked = false;
          this.Base64Report = response.File;

          this.pdfSrc = this.base64ToArrayBuffer(response.File) as ArrayBuffer;


        } else {
          this.alertService.errorAlert(response.Error.Message);
        }
      }, err => {
        console.log('kKAdskajd',err)
        this.blockUI.stop();
        this.alertService.errorAlert(err);
      });
  }

  onClickDownloadPdf() {
    if (!this.Base64Report) return;

    this.commonService.downloadFile(this.Base64Report, `Cierre de caja ${new Date().toISOString().split('T')[0]}`, 'application/pdf', 'pdf');
  }
  GetSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.Payment).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);
        this.Pinpad = result.Pinpad
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuracion compañía uso de pinpad ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion compañía uso de pinpad ' + err);

    });
  }
  onClickSearchPinpad(): void {
    if (this.terminals.length === 0) {
      this.alertService.warningInfoAlert(`No hay terminales en el almacenamiento local`);
      return;
    }
    if (this.terminalsByUser.length === 0) {
      this.alertService.warningInfoAlert(`Servicios de integración con datáfonos no configurados`);
      return;
    }
    let terminal: ITerminal;
    this.terminals.forEach(x => {
      this.terminalsByUser.forEach(y => {
        if (y.TerminalId === x.TerminalId) {
          terminal = x;
        }
      })
    });
    this.blockUI.start(`Obteniendo totales transacciones de pinpad`);
    this.banksService.GetTransactionsPinpadTotal(terminal.Id).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.Total = next.Data;
        if (this.Total !== '0') {
          this.Total = next.Data.toString().slice(0, -2) + '.' + (next.Data.toString()).slice(next.Data.toString().length - 2);
        }

        this.paydeskBalanceForm.patchValue({ CardsPinpad: this.Total });
        this.alertService.infoInfoAlert(`Tarjetas con transacciones pinpad obtenidas exitosamente`);
      }
      else {
        this.alertService.errorAlert(`No se pudo obtener totales de tarjetas, error:  ${next.Error.Code}-${next.Error.Message}`);
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorInfoAlert(`No se pudo obtener totales de tarjetas, error: ${error}`);
    });
  }
  // Verifica si el usuario tiene permiso para acceder a la pagina
  CheckPermits() {
    this.permService.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_Balance') {
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
}