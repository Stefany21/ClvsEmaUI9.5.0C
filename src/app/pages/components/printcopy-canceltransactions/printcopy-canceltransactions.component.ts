import { Component, OnInit } from "@angular/core";
import { BlockUI, NgBlockUI } from "ng-block-ui";
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
} from "@angular/forms";
import { ReportTypeList } from "../../../models/constantes";
import { Subscription } from "rxjs";
//const { BrowserWindow } = require('electron')
const printJS = require("print-js");
//const {app, BrowserWindow} = require('electron') //importamos lo necesario para trabajar ocn electron
//const path = require('path')
import { Injectable } from "@angular/core";
//const electron = (<any>window).require('electron');
//const {app, BrowserWindow} = (<any>window).require('electron');
import { BrowserWindow } from "electron";
//const printer = require('pdf-to-printer');
//import { clipboard } from 'electron'
//const { clipboard } = window.require('electron')
// MODELOS
import { ReportType } from "../../../enum/enum";
// RUTAS

// COMPONENTES

// SERVICIOS
import {
  PermsService,
  DocumentService,
  ReportsService,
  ParamsService,
  AlertService,
  SalesManService,
  AuthenticationService,
  EprintService,
  PaymentService,
  StorageService,
  BankService,
} from "../../../services/index";
// Electron renderer service
import { ElectronRendererService } from "../../../electronrenderer.service";
import { IPPTransaction, IPrinter, ITerminal } from "src/app/models";
import { ITransactionPrint } from "src/app/models/i-transaction-print";
import { formatDate } from "@angular/common";
// PIPES

@Component({
  selector: "app-printcopy-canceltransactions",
  templateUrl: "./printcopy-canceltransactions.component.html",
  styleUrls: ["./printcopy-canceltransactions.component.scss"],
})
export class PrintcopyCanceltransactionsComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  userList: any[] = []; // lista de usuarios para busar la la lista de facturas segun usuario
  invList: any[] = []; // listas de las facturas que se obtiene a partir de la busqueda segun el usuario
  TransactionCanceledCopy: FormGroup; // nombre del formulario de facturas a reimprimir
  date: Date; // fecha actual
  nowDate: any;
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  PPTransactionsCanceled: IPPTransaction[];
  terminals: ITerminal[];
  UserNameTerminal: string;
  // 			   private readonly _elec: EprintService
  constructor(
    private sPerm: PermsService,
    private fbs: FormBuilder,
    private invSer: DocumentService,
    private repoSer: ReportsService,
    private paramsService: ParamsService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private smService: SalesManService,
    private electronRendererService: ElectronRendererService,
    private paymentService: PaymentService,
    private storage: StorageService,
    private bankService: BankService
  ) {
    this.currentUserSubscription =
      this.authenticationService.currentUser.subscribe((user) => {
        this.currentUser = user;
      });
    this.date = new Date();
    this.nowDate = `${this.date.getFullYear()}-${("0" +(this.date.getMonth() + 1)).slice(-2)}-${("0" + this.date.getDate()).slice(-2)}`;

    this.electronRendererService.on(
      "TestResponse",
      (event: Electron.IpcMessageEvent, ...arg) => {
        console.log(
          "response from electron render service: load printresponse listener" +
            arg
        );
      }
    );
  }

  ngOnInit() {
    this.PPTransactionsCanceled = [];
    this.terminals = [];
    this.checkPermits();
    this.GetParamsViewList();
    this.getTerminals();    
    this.TransactionCanceledCopy = this.fbs.group({
      UserPrefix: [""],
      FechaIni: [""],
      FechaFin: [""],
    });
    this.TransactionCanceledCopy.controls.FechaIni.setValue(this.nowDate);
    this.TransactionCanceledCopy.controls.FechaFin.setValue(this.nowDate);
  }

  getTerminals() {
    this.bankService.getTerminals().subscribe(
      (next) => {
        if (next.Result) {
          this.terminals = next.PPTerminals;
        }
      },
      (error) => {
        console.log(`No se pudieron obtener los terminales`);
      }
    );
  }
  NameTerminal(id: number) {
    this.terminals.forEach((x) => {
      if (id === x.Id) {
        this.UserNameTerminal = x.TerminalId;
      }
    });
    return this.UserNameTerminal;
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe(
      (data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          let permListtable: any = data.perms;
          data.perms.forEach((Perm) => {
            if (Perm.Name === "V_Print") {
              this.permisos = Perm.Active;
            }
          });
        } else {
          this.permisos = false;
        }
      },
      (error) => {
        console.log(error);
        this.permisos = false;
        this.blockUI.stop();
      }
    );
  }

  // obtiene la lista de las transacciones anuladas
  // no parametros
  getPPTransactionsCanceled() {
    this.PPTransactionsCanceled = [];
    const inv = {
      UserPrefix: this.TransactionCanceledCopy.value.UserPrefix,
      FechaIni: this.TransactionCanceledCopy.value.FechaIni,
      FechaFin: this.TransactionCanceledCopy.value.FechaFin,
    };

    this.blockUI.start("Obteniendo datos de transacciones...");
    this.invSer.GetPPTransactionCenceledStatus(inv).subscribe(
      data => {
        this.blockUI.stop();
        if (data.Result) {
          this.PPTransactionsCanceled = data.PPTransactions;
          // this.PPTransactionsCanceled.forEach((x)=>{   
          //   x.Amount = x.Amount.toString().slice(0, -2) + '.' + (x.Amount.toString()).slice(x.Amount.toString().length-2);;
          // });           
        } else {
          this.alertService.infoInfoAlert('No se encontraron transacciones dentro de estos parámetros de búsqueda') 
        }
      },error=> {  
        this.alertService.errorInfoAlert(
          `Error al intentar conectar con el servidor, Error: ${error}`
        );
        this.blockUI.stop();
      }
    );
  }

  printPPTransactionCanceled(_pPTransaction: IPPTransaction) {  
  _pPTransaction.CreationDate = formatDate(_pPTransaction.CreationDate, 'yyyy-MM-dd', 'en');   
    _pPTransaction.Amount = +(+_pPTransaction.Amount).toFixed(2);
    this.blockUI.start("Generando la impresión...");
    this.repoSer.PrintVoucher(_pPTransaction).subscribe(  
      data => {
        this.blockUI.stop();
        if(data.Result){
        if (this.electronRendererService.CheckElectron()) {
          let fileName = "Invoice_" + _pPTransaction.TransactionId + ".pdf";
          const PRINTERCONFIGURATION = JSON.parse(
            this.storage.getCompanyConfiguration().PrinterConfiguration
          ) as IPrinter;
          let file = {
            fileName: fileName,
            file: data.Data,
            defaultPrinter: PRINTERCONFIGURATION.DisplayName,
          };
          this.electronRendererService.send("Print", file);
        } else {
          printJS({
            printable: data.Data,
            type: "pdf",
            base64: true,
          });
        }          
      }else{
        this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);  
      }
      },error=> {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(
          `Error al intentar conectar con el servidor, Error: ${error}`
        );
      }
    );
  }

  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.paramsService.getParasmView().subscribe(
      (data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.viewParamTitles = data.Params.filter((param) => {
            return param.type === 6;
          });
          this.ChargeParamstoView();
        } else {
          this.alertService.errorAlert(
            "Error al cargar los parámetros de la página - " +
              data.errorInfo.Message
          );
        }
      },
      (error) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(
          `Error al intentar conectar con el servidor, Error: ${error}`
        );
      }
    );
  }

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter((param) => {
      return param.Name === "T_print";
    });
    this.title = obj[0].Text;
  }
}
