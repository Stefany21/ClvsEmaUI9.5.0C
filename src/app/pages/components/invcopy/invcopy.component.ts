import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ReportTypeList } from '../../../models/constantes';
import { Subscription } from 'rxjs';
//const { BrowserWindow } = require('electron')
const printJS = require('print-js');
//const {app, BrowserWindow} = require('electron') //importamos lo necesario para trabajar ocn electron
//const path = require('path')
import { Injectable } from '@angular/core';
//const electron = (<any>window).require('electron');
//const {app, BrowserWindow} = (<any>window).require('electron');
import { BrowserWindow } from 'electron';
//const printer = require('pdf-to-printer');
//import { clipboard } from 'electron'
//const { clipboard } = window.require('electron')
// MODELOS
import { ReportType } from '../../../enum/enum';
// RUTAS

// COMPONENTES

// SERVICIOS
import { PermsService, DocumentService, ReportsService, ParamsService, AlertService, SalesManService, AuthenticationService, EprintService, PaymentService, StorageService, BankService } from '../../../services/index';
// Electron renderer service
import { ElectronRendererService } from '../../../electronrenderer.service';
import { IPPTransaction, IPrinter } from 'src/app/models';
import { ITransactionPrint } from 'src/app/models/i-transaction-print';
// PIPES

@Injectable({
  providedIn: 'root'
})
@Component({
  selector: 'app-invcopy',
  templateUrl: './invcopy.component.html',
  styleUrls: ['./invcopy.component.scss']
})
export class InvcopyComponent implements OnInit {

  @BlockUI() blockUI: NgBlockUI;
  userList: any[] = []; // lista de usuarios para busar la la lista de facturas segun usuario
  invList: any[] = []; // listas de las facturas que se obtiene a partir de la busqueda segun el usuario
  InvCopy: FormGroup; // nombre del formulario de facturas a reimprimir
  date: Date; // fecha actual
  nowDate: any;
  reportType: any[] = [];
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  // 			   private readonly _elec: EprintService
  constructor(private sPerm: PermsService,
    private fbs: FormBuilder,
    private invSer: DocumentService,
    private repoSer: ReportsService,
    private paramsService: ParamsService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private smService: SalesManService,
    private electronRendererService: ElectronRendererService
    , private paymentService: PaymentService
    , private storage: StorageService
    , private bankService: BankService
  ) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.date = new Date();
    // console.log(this.date);

    this.nowDate = `${this.date.getFullYear()}-${('0' + (this.date.getMonth() + 1)).slice(-2)}-${('0' + this.date.getDate()).slice(-2)}`;

    this.electronRendererService.on('TestResponse', (event: Electron.IpcMessageEvent, ...arg) => {
      console.log("response from electron render service: load printresponse listener" + arg);
    });

  }

  ngOnInit() {
    this.checkPermits();
    this.GetParamsViewList();
    this.InvCopy = this.fbs.group({
      slpCode: [''],
      DocEntry: [''],
      FechaIni: [''],
      FechaFin: [''],
      InvType: ['']
    });
    this.chargeUser();
    this.reportType = ReportTypeList;
    this.InvCopy.patchValue({ InvType: this.reportType[0].Id });
    this.InvCopy.controls.FechaFin.setValue(this.nowDate);
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        // console.log(data);
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Print") {
            this.permisos = Perm.Active;
          }
        });

      } else {
        this.permisos = false;
      }
    }, error => {
      console.log(error);
      this.permisos = false;
      this.blockUI.stop();
    });
  }

  // obtien ela lista de ususarios para la busqueda por slpCode
  // sin parametros
  chargeUser() { 
    this.blockUI.start('Cargando listas de usuarios...');
    this.smService.getSalesMan().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userList = data.salesManList;
        this.InvCopy.patchValue({ slpCode: this.userList[0].SlpCode });
        this.InvCopy.controls.FechaIni.setValue(this.nowDate);
        this.InvCopy.controls.FechaFin.setValue(this.nowDate);
        this.InvCopy.patchValue({ InvType: this.reportType[0].Id });
      } else {
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
  // obtiene la lista de las SO para mostrarlas en la tabla
  // no parametros
  getInvList() {
    const inv = {
      slpCode: this.InvCopy.value.slpCode,
      DocEntry: this.InvCopy.value.DocEntry,
      FechaIni: this.InvCopy.value.FechaIni,
      FechaFin: this.InvCopy.value.FechaFin,
      InvType: this.InvCopy.value.InvType
    };

    this.blockUI.start('Obteniendo datos de Facturas...');
    this.invSer.GetInvList(inv).subscribe((data: any) => {
      this.blockUI.stop();   
      if (data.Result) {
        this.invList.length = 0;
        if (data.invList.length > 0) {
          this.invList = data.invList;
        } else { this.alertService.infoInfoAlert('No se encontraron facturas dentro de estos parametros de busqueda') }
      } else {             
        this.alertService.errorAlert('Error al obtener las listas Facturas - error: ' + data.Error.Message);
      }          
    }, (error) => {
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      this.blockUI.stop();
    });
  }
  // envia a reimprimir la orden de venta
  // recive el DocEntry de la orden de venta
  
  StandarPrint(_docEntry): void {  
    this.repoSer.printARInvoiceCopy(_docEntry, this.InvCopy.value.InvType)
      .subscribe(data => { 
        this.blockUI.stop();
        if(data.Result){        
        if (this.electronRendererService.CheckElectron()) {
          let fileName = 'InvoiceCopy_' + _docEntry + '.pdf';
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
        // this.PrintService(_docEntry, data);
      }, error => { 
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);  
      });
  }

  CustomPrint(_pPTransaction: IPPTransaction, _docEntry: number): void {
    const RIGHT_SIDE = +_pPTransaction.Amount.toString().slice(0, -2);
    const LEFT_SIDE = +`0.${_pPTransaction.Amount.toString().slice(-2, _pPTransaction.Amount.toString().length)}`;

   

    const MOBJECT = JSON.parse(_pPTransaction.ChargedResponse);

    let printTags = '';
    for (let c = 0; c < MOBJECT.EMVStreamResponse.printTags.length; c++) {
      printTags += (MOBJECT.EMVStreamResponse.printTags.string[c] + ',');
    }

    this.bankService.getTerminal(_pPTransaction.TerminalId).subscribe(next => {
      if (next.Result) {
        
        const IS_QUICK_PAY = (RIGHT_SIDE + LEFT_SIDE <= next.PPTerminal.QuickPayAmount)
        && (_pPTransaction.EntryMode.includes('CLC') || _pPTransaction.EntryMode.includes('CHP'));

        printTags = printTags.slice(0, -1);
        const I_PP_TRANSACTION = {
          TerminalCode: next.PPTerminal.TerminalId,
          MaskedNumberCard: MOBJECT.EMVStreamResponse.maskedCardNumber,
          DocEntry: _docEntry,
          IsSigned: !IS_QUICK_PAY,
          PrintTags: printTags
        } as ITransactionPrint;

        this.repoSer.PrintReportPP(I_PP_TRANSACTION)
          .subscribe((data: any) => {
            this.blockUI.stop();
            if (this.electronRendererService.CheckElectron()) {
              let fileName = 'oinv_notsingn' + _docEntry + '.pdf';
              const PRINTERCONFIGURATION = JSON.parse(this.storage.getCompanyConfiguration().PrinterConfiguration) as IPrinter;
              let file = {
                "fileName": fileName,
                "file": data.UnsignedReport,
                "defaultPrinter": PRINTERCONFIGURATION.DisplayName
              };

              this.electronRendererService.send('Print', file);

              if (!IS_QUICK_PAY) {
                fileName = 'oinv_singn' + _docEntry + '.pdf';
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
            this.blockUI.stop();
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
          });
      }
      else {
        this.blockUI.stop();
        this.alertService.errorAlert(`Error: ${next.Error ? next.Error.Message : ''}`);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.errorAlert(`Error: ${error}`);
    });
  }

  PrintService(_data: any, _docEntry: number): void {
    if (this.electronRendererService.CheckElectron()) {
      let fileName = 'InvoiceCopy_' + _docEntry + '.pdf';
      let file = { "fileName": fileName, "file": _data };
      this.electronRendererService.send('Print', file);
    }
    else {
      printJS({
        printable: _data,
        type: 'pdf',
        base64: true
      })
    }
  }

  printARInvoice(_document: any) {
    let DocEntry = _document.DocEntry;
    this.blockUI.start(`Generando impresión, espere por favor`);
    this.paymentService.GetPPTransactionByInvoiceNumber(_document.InvoiceNumber).subscribe(next => {
      if (next.Result) {
        
        this.CustomPrint(next.Data, DocEntry);
      }
      else {            
        this.StandarPrint(DocEntry);
      }  
    }, error => {
      console.log(error);
      this.StandarPrint(DocEntry);
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
      return param.Name === 'T_print';
    });
    this.title = obj[0].Text;
  }

}
