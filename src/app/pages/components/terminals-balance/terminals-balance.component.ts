import { formatDate } from '@angular/common';
import { Component, DoCheck, OnInit, Renderer2 } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BlockUI } from 'ng-block-ui';
import { NgBlockUI } from 'ng-block-ui/models/block-ui.model';
import { Subscription } from 'rxjs/internal/Subscription';
import { finalize } from 'rxjs/operators';
import { ICommitedTransaction, IPPBalance, ITerminal } from 'src/app/models';
import { RequestDocumentType } from 'src/app/models/constantes';
import { IACQTransaction } from 'src/app/models/i-pp-transaction';
import { IPPBalanceRequest } from 'src/app/models/i-ppbalance-request';
import { IInvoicePaymentDetailResponse } from 'src/app/models/responses';
import { AlertService, AuthenticationService, BankService, PermsService } from 'src/app/services';
import swal from 'sweetalert2';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-terminals-balance',
  templateUrl: './terminals-balance.component.html',
  styleUrls: ['./terminals-balance.component.scss']
})
export class TerminalsBalanceComponent implements OnInit, DoCheck {
  //VARBOX
  terminal: ITerminal;
  terminals: ITerminal[];
  commitedTransactions: ICommitedTransaction[];
  balanceRequest: IPPBalanceRequest;
  @BlockUI() blockUI: NgBlockUI;
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  terminalModalTitle: string;
  TRANSFER_DATE = new Date(Date.now() - 1);
  terminalTarget: ITerminal;
  terminalForm = new FormGroup({
    TerminalId: new FormControl(''),
    From: new FormControl(''),
    To: new FormControl('')
  });
  requestTypeForm: FormControl = new FormControl();

  constructor(private banksService: BankService
    , private alertService: AlertService
    , private renderer: Renderer2
    , private storageService:StorageService,
    private authenticationService: AuthenticationService,
    private permService: PermsService,) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngDoCheck(): void {
    // this.commitedTransactions.forEach(x => {
    //   if (x.TotalTransactions > 0) {
    //     let TR = <HTMLElement>document.getElementById(`tr_${x.Id}`);
    //     if (TR) {
    //       // const MTR = this.renderer.createElement('tr');
    //       // const MTD = this.renderer.createElement('td');
    //       // this.renderer.appendChild(MTR, MTD);

    //       // this.renderer.appendChild(TR, MTD);
    //       // TR.append(`
    //       //   <tr>
    //       //   <th scope="col"></th>
    //       //     <th scope="col"></th>
    //       //     <th scope="col"></th>
    //       //     <th scope="col"></th>
    //       //     <th scope="col"></th>
    //       //     <th scope="col"></th>
    //       //     <th scope="col"></th>
    //       //     <th scope="col">Total</th>
    //       //     <th scope="col">${x.TotalTransactions}</th>
    //       //   </tr>
    //       // `);
    //       console.log(`tring to append? ${x.TotalTransactions}`);
    //     }
    //   }
    // });
  }

  ngOnInit() {
    this.initVariables();
    this.getTerminals();
  }

  GetBalance(): void {

  }

  // Balance_ORIGINAL(): void {
  //   this.commitedTransactions = [];
  //   this.balanceRequest = this.terminalForm.value as IPPBalanceRequest;
  //   if (this.balanceRequest.TerminalId != -1) {
  //     this.blockUI.start(`Generando cierre de tarjetas, esto puede tomar tiempo. Espere por favor.`);
  //     this.banksService.Balance(this.balanceRequest.TerminalId).subscribe(next => {
  //       this.blockUI.stop();
  //       if (next.Result) {
  //         this.commitedTransactions = next.CommittedTransactions;
  //         this.alertService.infoInfoAlert(`Cierre de tarjetas terminado exitosamente`);
  //         if (this.commitedTransactions.length > 0) {
  //           this.mapRequest();
  //         }
  //         else {
  //           this.alertService.infoAlert(`No hay pre cierres realizados en el sistema`);
  //         }
  //       }
  //       else {
  //         this.alertService.errorAlert(`No se pudo realizar el cierre de tarjetas, error: ${next.Error.Message}`);
  //       }
  //     }, error => {
  //       this.blockUI.stop();
  //       console.log(error);
  //       this.alertService.errorAlert(`No se pudo realizar el cierre de tarjetas, error: ${error}`);
  //     });
  //   }
  // }


  Balance(): void {
    this.commitedTransactions = [];
    this.balanceRequest = this.terminalForm.value as IPPBalanceRequest;
    // this.terminal = this.storageService.GetTerminal();
    this.terminal = this.terminals.find(x => x.Id == this.terminalForm.value.TerminalId); 

    if (!this.terminal) {
      this.alertService.infoAlert(`No se encontró configuración del terminal solicitado`);
      return;
    }

    if (this.terminal) {
      this.blockUI.start(`Generando cierre de tarjetas, esto puede tomar tiempo. Espere por favor.`);
      this.banksService.Balance(this.terminal).subscribe(next => {
        if (next.Result) {
          this.blockUI.update(`Preparando reporte, espere por favor.`);
          const ACQ_TRANSACTION: IACQTransaction = {
            Terminal: this.terminal,
            BalanceRequest: this.balanceRequest,
            OverACQ: next.Data
          };
          console.log(ACQ_TRANSACTION);
          this.banksService.SaveBalance(ACQ_TRANSACTION).pipe(finalize(() => this.blockUI.stop())).subscribe(nexti => {
            try {
              if (nexti.Result) {
                this.commitedTransactions = nexti.Data;

                if (this.commitedTransactions.length > 0) {
                  this.mapRequest();
                }
                else {
                  this.alertService.infoAlert(`No hay cierres realizados en el sistema`);
                }
              }
              else {
                this.alertService.errorAlert(`Error: ${nexti.Error.Message}`);
              }
            }
            catch (errori) {
              console.info(errori);
              this.alertService.errorAlert(JSON.stringify(errori));
            }
          }, error => {
            console.info(error);
            this.alertService.errorAlert(JSON.stringify(error));
          });
        }
        else {
          this.blockUI.stop();
          this.alertService.errorAlert(`No se pudo realizar el cierre de tarjetas, error: ${next.Error.Message}`);
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`Error: ${JSON.stringify(error)}`);
      });
    }
    else {
      this.alertService.infoAlert(`No se encontraron terminales asignados al usuario`);
    }
  }



  //Este es el original de ema core
  PreBalance_EMACORE(): void {
    this.commitedTransactions = [];
    this.balanceRequest = this.terminalForm.value as IPPBalanceRequest;
    if (this.balanceRequest.TerminalId != -1) {
      this.blockUI.start(`Obteniendo pre cierre, esto puede tomar tiempo. Espere por favor.`);

      this.banksService.PreBalance(this.balanceRequest).subscribe(next => {
        this.blockUI.stop();
        if (next.Result) {
          //this.commitedTransactions = next.CommittedTransactions;
          this.alertService.successInfoAlert(`Se ha obtenido el pre cierre exitosamente`);
          if (this.commitedTransactions.length > 0) {
            this.mapRequest();
          }
          else {
            this.alertService.infoAlert(`No hay pre cierres realizados en el sistema`);
          }
        }
        else {
          this.alertService.infoAlert(`No se encontraron transacciones de tarjetas pedientes de cerrar`);
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`No se pudo obtener el pre cierre, error: ${error}`);
      });
    }
  }


  // Este viene de EMA CRMArine
  PreBalance(): void {
    this.commitedTransactions = [];
    this.balanceRequest = this.terminalForm.value as IPPBalanceRequest;
    this.terminal = this.terminals.find(x => x.Id == this.terminalForm.value.TerminalId);
    
    if (!this.terminal) {
      this.alertService.infoAlert(`No se encontró configuración del terminal solicitado`);
      return;
    }

    if (this.balanceRequest.TerminalId != -1) {

      this.balanceRequest.Terminal = this.terminal;

      this.blockUI.start(`Generando precierre de tarjetas, espere por favor.`);

      this.banksService.PreBalance(this.balanceRequest).subscribe(next => {
        try {
          if (next.Result) {
            this.blockUI.update(`Preparando reporte, espere por favor.`);

            const ACQ_TRANSACTION: IACQTransaction = {
              Terminal: this.terminal,
              BalanceRequest: this.balanceRequest,
              OverACQ: next.Data
            };

            this.banksService.SavePreBalance(ACQ_TRANSACTION).pipe(finalize(() => this.blockUI.stop())).subscribe(nexti => {
              try {
                if (nexti.Result) {
                  this.commitedTransactions = nexti.Data;

                  if (this.commitedTransactions.length > 0) {
                    this.mapRequest();
                  }
                  else {
                    this.alertService.infoAlert(`No hay pre cierres realizados en el sistema`);
                  }
                }
                else {
                  if (nexti.Error) {
                    this.alertService.errorAlert(`Error: ${nexti.Error.Code} - ${nexti.Error.Message}`);
                  }
                  else {
                    this.alertService.errorAlert(`Error: ${nexti.Error.Message}`);
                  }
                }
              }
              catch (errori) {
                console.info(errori);
                this.alertService.errorAlert(JSON.stringify(errori));
              }
            }, error => {
              console.info(error);
              this.alertService.errorAlert(JSON.stringify(error));
            });
          }
          else {
            this.blockUI.stop();
            this.alertService.infoAlert(`No se encontraron transacciones de tarjetas pedientes de cerrar`);
          }
        }
        catch (error) {
          console.info(error);
          this.blockUI.stop();
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`No se pudo obtener el pre cierre, error: ${error}`);
      });
    }
  }



  GetRequestsFromRegisters(_requestType: string, _documentType: string): void {
    this.commitedTransactions = [];
    this.balanceRequest = this.terminalForm.value as IPPBalanceRequest;
    if (this.balanceRequest.TerminalId != -1) {
      this.blockUI.start(`Obteniendo ${_documentType} guardados en el sistema. Espere por favor.`);
      this.balanceRequest.DocumentType = _requestType;
      this.banksService.GetRequestsFromRegisters(this.balanceRequest).subscribe(next => {
        this.blockUI.stop();
        if (next.Result) {
          this.commitedTransactions = next.Data;
          this.alertService.successInfoAlert(`Operación terminada`);
          if (this.commitedTransactions.length > 0) {
            this.mapRequest();
          }
          else {
            this.alertService.infoInfoAlert(`No hay  ${_documentType} realizados en el sistema`);
          }
        }
        else {
          if (next.Error) {
            this.alertService.errorAlert(`Error: ${next.Error.Code} - ${next.Error.Message}`)
          }
          else {
            this.alertService.infoInfoAlert(`No hay  ${_documentType} realizados en el sistema entre las fechas seleccionadas`);
          }
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`No se pudo obtener el  ${_documentType}, error: ${error}`);
      });
    }
  }

  generate(): void {
    const REQUEST_TYPE = +this.requestTypeForm.value === 1 ? 'cierre' : 'pre cierre';
    swal({
      type: 'warning',
      title: 'Esta solicitud no puede ser cancelada',
      text: `¿ Desea generar el ${REQUEST_TYPE} ?`,
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then(next => {
      console.log(Object.keys(next));
      if (!(Object.keys(next)[0] === 'dismiss')) {
        if (+this.requestTypeForm.value === 1) {
          this.Balance();
        }
        else {
          this.PreBalance();
        }
      }
    }, (dismiss) => { });
  }

  getRequest(): void {
    let documentType = 'pre cierres';
    let requestType = RequestDocumentType[RequestDocumentType.PRE_BALANCE];

    if (+this.requestTypeForm.value === 1) {
      documentType = 'cierres';
      requestType = RequestDocumentType[RequestDocumentType.BALANCE];
    }

    this.GetRequestsFromRegisters(requestType, documentType);

  }

  mapRequest(): void {
    this.commitedTransactions.forEach(x => {
      if (parseInt(x.SalesAmount) !== 0) {
        const salesAmount = x.SalesAmount;
        const LEFT_OFFSET = salesAmount.slice(0, x.SalesAmount.length - 2);
        const RIGHT_OFFSET = salesAmount.slice(x.SalesAmount.length - 2, x.SalesAmount.length);
        x.SalesAmount = `${LEFT_OFFSET}.${RIGHT_OFFSET}`;
      }
      else {
        x.SalesAmount = parseInt(x.SalesAmount).toString();
      }

      try {
        x.HostDate = this.convertDate(x.HostDate);
      } catch (error) {
        this.alertService.infoAlert(`No se pudo convertir la fecha del servidor`);
      }
    });

    let root = 0;
    let updatedValues = [];
    for (let c = 0; c < this.commitedTransactions.length; c++) {
      for (let y = 0; y < this.commitedTransactions.length; y++) {
        if ((this.commitedTransactions[c].ACQ === this.commitedTransactions[y].ACQ) && !updatedValues.find(u => u === this.commitedTransactions[c].ACQ)) {
          updatedValues.push(this.commitedTransactions[c].ACQ);
          let lastNode = {} as ICommitedTransaction;
          let totalTransactions = 0;
          if ((root % 2) === 0) {
            this.commitedTransactions.forEach(x => {
              if (x.ACQ === this.commitedTransactions[c].ACQ) {
                x.BlurredBackground = 'Y';
                x.TotalTransactions = 0;
                lastNode = x;
                totalTransactions += +(+x.SalesAmount).toFixed(2);
              }
            });
          }
          else {
            this.commitedTransactions.forEach(x => {
              if (x.ACQ === this.commitedTransactions[c].ACQ) {
                x.BlurredBackground = 'N';
                x.TotalTransactions = 0;
                lastNode = x;
                totalTransactions += +x.SalesAmount;
              }
            });
          }

          let TMP = this.commitedTransactions.find(x => x.ACQ === lastNode.ACQ); //.TotalTransactions = totalTransactions;
          let MITEM = { ...TMP };
          MITEM.AuthorizationNumber = '';
          MITEM.TerminalCode = '';
          MITEM.ReferenceNumber = '';
          MITEM.TransactionType = '';
          MITEM.ACQ = -1;
          MITEM.CreationDate = '';
          MITEM.InvoiceNumber = 'TOTAL';
          MITEM.SalesAmount = totalTransactions.toString();

          this.commitedTransactions.splice(this.commitedTransactions.findIndex(x => x.ACQ === lastNode.ACQ), 0,
            { ...MITEM });
          root++;
        }
      }
    }

    this.commitedTransactions = this.commitedTransactions.reverse();
  }

  getTerminals(): void {
    this.blockUI.start(`Obteniendo terminales, espere por favor.`);
    this.banksService.getTerminals().subscribe(next => {
      if (next.Result) {
        this.terminals = next.PPTerminals.filter(x => x.Status);
        if (this.terminals.length > 0) {
          this.terminalForm.patchValue({
            TerminalId: this.terminals[0].Id
          });
        }
      }
      else {
        if (next.PPTerminals.length === 0) this.alertService.infoInfoAlert(`No hay terminales registrados en el sistema`);
        else {
          this.alertService.errorAlert(`No se pudieron obtener los terminales, detalle ${next.Error.Message}`)
        }
      
      }
      this.blockUI.stop();
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.errorAlert(`No se pudieron obtener los terminales, detalle ${error}`);
    });
  }

  convertDate(strA: string) {
    return strA.slice(0, 2) + '/' + strA.slice(2, 4) + '/' + strA.slice(4);
  }

  initVariables(): void {
    this.terminal = this.storageService.GetTerminal();
    this.CheckPermits();
    this.resetTerminalForm();
    this.terminalTarget = null;
    this.commitedTransactions = [];
    this.getTerminals();
  }

  resetTerminalForm(): void {
    const DATE = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.terminalForm.patchValue({
      TerminalId: -1,
      From: DATE,
      To: DATE
    });

    this.requestTypeForm.setValue('0');
  }
  // Verifica si el usuario tiene permiso para acceder a la pagina
  CheckPermits() {
    this.permService.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_CloseCardPP') {
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
