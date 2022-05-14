import { Component, OnInit, Input, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, Observable, Subscription } from 'rxjs';

import { LayoutService } from '../../../shared/services/layout.service';
import { AuthenticationService, ExRateService, StorageService, AlertService, TokenService, CommonService } from '../../../services/index';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { first, tap } from 'rxjs/operators';
import { IToken } from 'src/app/models';
import { DocumentsToSyncService } from 'src/app/services/documents-to-sync-service.service';
import swal from 'sweetalert2';
import { ConnectionStatusService } from 'src/app/services/connection-status.service';
import { EventManager } from '@angular/platform-browser';
  
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  bdCode: string;
  @Input() navLayout: string;
  @Input() defaultNavbar: string;
  @Input() toggleNavbar: string;
  @Input() toggleStatus: boolean;
  @Input() navbarEffect: string;
  @Input() deviceType: string;
  @Input() headerColorTheme: string;
  @Input() leftHeaderColorTheme: string;
  @Input() navbarColorTheme: string;
  @Input() activeNavColorTheme: string;
  @Input() headerHeight: number;
  @Input() collapsedLeftHeader: boolean;
  @Input() currentUser: string;
  @Input() currencyChange: number;

  onlineEvent: Observable<Event>;
  offlineEvent: Observable<Event>;
  subscriptions: Subscription[] = [];
  connectionStatusMessage: string;
  connectionStatus: string;
  conectado: boolean;//= navigator.onLine;
  conectadoOffline: boolean;// = !navigator.onLine;
  errorConnection = false;
  documentPendingSync: number;//ref Offline view
  documentInformationSync = false;
  TextHeaderSync: string;

  // monto del tipo de cambio
  successCurrencyChange: number;
  @BlockUI() blockUI: NgBlockUI;

  isCtrlPressed: boolean;
  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent) {
    this.isCtrlPressed = event.ctrlKey;
  };

  @HostListener('window:keyup', ['$event'])
  keyeEvent(event: KeyboardEvent) {
    this.isCtrlPressed = event.ctrlKey;
  };

  // Bandera para que no se abra la ventana de reconectar si la conexion se pierde
  // Pero vuelve rapido.
  openModal: Boolean;








  constructor(private layoutService: LayoutService,
    private router: Router,
    private authenticationService: AuthenticationService,
    private storage: StorageService,
    private exRateService: ExRateService,
    private alertService: AlertService,
    private tokenService: TokenService,
    private commonService: CommonService,
    private connecStatus: ConnectionStatusService,
    private eventManager: EventManager,
    private documentsToSyncService: DocumentsToSyncService
  ) {
    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);
    this.tokenService.iToken.subscribe(next => {
      if (next.IsRequiredToken && !next.IsSessionExpired) { // Sesion a punto de expirar
        const _SESSION = JSON.parse(this.storage.getCurrentSession());

        if (_SESSION === null || _SESSION["UserName"] === undefined || _SESSION['Password'] === undefined) {
          this.alertService.warningAlert('No se pudieron recuperar los crendeciales, la sesión expira en menos de 10 minutos, vuelva a iniciar sesión por favor');
        }
        else {
          this.authenticationService.login(_SESSION["UserName"], _SESSION["Password"])
            .pipe(first()).subscribe(next => {

            }, error => {
              console.log('request token status on error: ', error);
            }, () => {

            });
        }
        this.tokenService.iToken.next({
          IsRequiredToken: false,
          IsSessionExpired: false
        } as IToken);
      }

      if (next.IsSessionExpired && next.IsSessionExpired) { // Sesion expirada
        const _SESSION = JSON.parse(this.storage.getCurrentSession());

        this.alertService.warningAlert('Sesión expirada, intentando recuperar la sesión...');

        this.authenticationService.login(_SESSION["UserName"], _SESSION["Password"])
          .pipe(first()).subscribe(next => {
            this.alertService.successInfoAlert('Sesión recuperada satisfactoriamente');
            console.log('request token status on complete ', next);
          }, error => {
            this.alertService.errorAlert(`No se pudo recuperar la sesión, Error ${error}, vuelva a iniciar sesión nuevamente gracias`);
            console.log('request token status on error: ', error);
          }, () => {

          });

        this.tokenService.iToken.next({
          IsRequiredToken: false,
          IsSessionExpired: false
        } as IToken);
      }
    }); 

  }

  ngOnInit() {
    //Esto puede dar problema en caso que no haya conexion a ningun lado, puede dar informacion 'falsa'
    this.connectionStatusMessage = this.storage.getConnectionType() ? 'Conectado al servidor local' : 'Conectado al servidor en línea'
    this.commonService.offlineInformationPending.subscribe(next => {
      setTimeout(() => {

        const _SESSION = JSON.parse(this.storage.getSession(false));
        this.documentInformationSync = next.documentInformationSync;
        if (next.connectionType && _SESSION != null) {
          this.searchDocumentSyn();
        }

      })
    });

    this.bdCode = this.storage.getCompanyConfiguration().DBCode;

    this.commonService.bdCode.subscribe(next => {
      this.bdCode = next;
    });

    this.commonService.exchangeRate.subscribe(next => {
      this.currencyChange = +next;
    });

    const token = JSON.parse(this.storage.getCurrentSession());

    if (token && token.access_token) this.GetExchangeRate();

    this.errorConnection = false;
    this.successCurrencyChange = 0;

    this.onlineEvent = fromEvent(window, 'online');
    this.offlineEvent = fromEvent(window, 'offline');

    this.conectadoOffline = this.storage.getConnectionType();
    this.conectado = !this.conectadoOffline

    this.connecStatus.ConnectionStatusMsg.subscribe(next => {
      this.connectionStatusMessage = next
      this.conectadoOffline = this.storage.getConnectionType();
      this.conectado = !this.conectadoOffline
      this.errorConnection = false;
    });

    this.subscriptions.push(this.onlineEvent.subscribe(e => {
      const _SESSION = JSON.parse(this.storage.getSession(false));
      if (_SESSION != null) {
        if (!this.openModal) {
          swal({
            type: 'warning',
            title: 'Se ha recuperado la conexión a internet',
            text: '¿ Desea cambiar a modo Online?',
            showCancelButton: true,
            confirmButtonColor: '#049F0C',
            cancelButtonColor: '#ff0000',
            confirmButtonText: 'Sí',
            cancelButtonText: 'No',
            allowOutsideClick: false

          }).then(next => {

            if (!(Object.keys(next)[0] === 'dismiss')) {
              this.online(_SESSION)

            }

          });

        }
      }

    }));

    this.subscriptions.push(this.offlineEvent.subscribe(e => {
      const _SESSION = JSON.parse(this.storage.getSession(true));

      if (!this.storage.getConnectionType()) {
        if (_SESSION != null) {
          this.alertService.warningInfoAlert('Se ha perdido la conexión a internet');
          this.openModal = true;
          swal({
            type: 'warning',
            title: 'Perdida de conexión detectada',
            text: '¿ Desea cambiar a modo offline?',
            showCancelButton: true,
            confirmButtonColor: '#049F0C',
            cancelButtonColor: '#ff0000',
            confirmButtonText: 'Sí',
            cancelButtonText: 'No',
            allowOutsideClick: false
          }).then(next => {

            if (!(Object.keys(next)[0] === 'dismiss')) {
              this.offline(_SESSION)
            }
            this.openModal = false;
          });
        }

      }



    }));



    this.authenticationService.getTokenPadron()
      .pipe(first())
      .subscribe(next => {
        this.errorConnection = false;
      }, error => {
      });



  }
  //Busqueda de Facturas pendientes de sincronizar
  searchDocumentSyn(): void {
    this.documentsToSyncService.GetDocumentsToSync('PENDING_TO_SYNUP', '', '').subscribe(next => {
      if (next.Result) {
        this.documentPendingSync = next.DocumentsToSync.length;
        if (this.documentPendingSync > 0) {
          this.TextHeaderSync = `Facturas pendientes sincronizar: ${this.documentPendingSync}`;
        } else {
          this.TextHeaderSync = '';
        }
      }
      else {
        this.TextHeaderSync = '';
        this.documentInformationSync = false;
      }
    }, error => {
      this.TextHeaderSync = '';
      this.documentInformationSync = false;
      console.log(error);
      // }, () => {
      //   this.documentInformationSync = false;
    });
  }


  connect() {
    // this.connectionStatusMessage = 'Estado: Conectado';
    // this.connectionStatus = 'online';
    // this.conectado = true;
    // this.noconectado = false;
    // this.authenticationService.logout();
    // this.router.navigate(['/login']);
  }

  disconnect() {

    this.connectionStatusMessage = ' No conectado';
    this.connectionStatus = 'offline';
    this.conectado = false;
    this.conectadoOffline = false;
    this.errorConnection = false;
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }

  changeConectionType() {
    const _SESSION = JSON.parse(this.storage.getSession(!this.storage.getConnectionType()));
    if (!this.storage.getConnectionType()) {

      this.blockUI.start('Verificando conexión a servicios locales...')
      this.authenticationService.VerifyOfflineConecction().subscribe(data => {
        this.blockUI.stop();
        if (data.status == 200) {
          setTimeout(() => {
            this.SwetAlert('locales?', _SESSION, false)
          }, 500);

        } else {
          this.alertService.errorInfoAlert('No es posible conectar con los servicios locales');
        }
      }, error => {
        console.log(error);
        this.blockUI.stop();
        this.alertService.errorInfoAlert('No es posible conectar con los servicios locales');
      });
    } else if (this.storage.getConnectionType()) {
      this.SwetAlert('línea?', _SESSION, true)
    }

  }


  SwetAlert(textModal: string, _SESSION: any, opcion: boolean) {
    let text = '¿Cambiar los servicios de conexión a '.concat(textModal)
    swal({
      type: 'warning',
      title: 'Cambio del tipo de conexión',
      text: text,
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      allowOutsideClick: false

    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {

        opcion ? navigator.onLine ? this.online(_SESSION) : this.alertService.warningInfoAlert(`No es posible conectarse a los servicios en línea, favor revisar su conexión a internet`) : this.offline(_SESSION)

      }
    });

  }

  online(_SESSION): void {
    this.blockUI.start('Conectando con el servidor en línea...');
    this.errorConnection = false;
    this.authenticationService.login(_SESSION.UserName, _SESSION.Password)
      .pipe(first())
      .subscribe(
        data => {
          this.blockUI.stop();

          this.storage.setConnectionType(false);

          this.alertService.infoInfoAlert('Conectado con el servidor en línea');
          this.exRateService.getExchangeRate().subscribe(next => {
            if (next.Result) {
              this.currencyChange = next.exRate;
              this.commonService.exchangeRate.next(next.exRate);
            }
            else {
              this.currencyChange = 0;
              this.commonService.exchangeRate.next('0');
              this.alertService.warningInfoAlert(`Error: ${next.Error ? next.Error.Message : 'No se ha definido tipo de cambio'}`);
            }
          }, error => {
            this.currencyChange = 0;
            this.commonService.exchangeRate.next('0');
            console.log(error);
            this.blockUI.stop();
            this.alertService.warningInfoAlert(`Error: ${error}`);
          });
          this.authenticationService.getTokenPadron()
            .pipe(first())
            .subscribe(next => {
            },
              error => {
                this.blockUI.stop();
                this.alertService.errorAlert(error);
              });
        },
        error => {
          this.blockUI.stop();
          this.conectado = false
          this.conectadoOffline = true
          this.alertService.warningInfoAlert(`Se ha dectectado una anomalía en el servidor: ${error}`);
        });
  }

  offline(_SESSION): void {
    this.blockUI.start('Conectando a servicios locales...');
    this.errorConnection = false;
    this.authenticationService.loginOffline(_SESSION.UserName, _SESSION.Password, true)
      .subscribe(
        data => {
          this.blockUI.stop();
          this.storage.setConnectionType(true);
          this.alertService.infoInfoAlert('Se ha conectado con el servidor local');
          this.exRateService.getExchangeRate().subscribe(next => {
            if (next.Result) {
              this.currencyChange = next.exRate;
              this.commonService.exchangeRate.next(next.exRate);
            }
            else {
              this.currencyChange = 0;
              this.commonService.exchangeRate.next('0');
              this.alertService.warningInfoAlert(`Error: ${next.Error ? next.Error.Message : 'No se ha definido tipo de cambio'}`);
            }
          }, error => {
            this.currencyChange = 0;
            this.commonService.exchangeRate.next('0');
            console.log(error);
            this.blockUI.stop();
            this.alertService.warningInfoAlert(`Error: ${error}`);
          });
        },
        error => {
          this.blockUI.stop();
          if (!navigator.onLine) {
            this.errorConnection = true
            this.connectionStatusMessage = 'Sin conexión a ningun servidor';
          }
          this.conectado = !this.errorConnection
          this.conectadoOffline = false
          console.log(error);
          this.alertService.errorAlert(`Error en el servidor local, por favor contacte al administrador, Error: ${error}`);
        });
  }

  changeTheToggleStatus() {
    this.layoutService.getToggleStatus();

  }

  logout() {
    this.TextHeaderSync = '';
    this.documentInformationSync = false;
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }
   
  imprimir() {
    
   }

  GetExchangeRate(): void {
    this.blockUI.start(`Obteniendo tipo de cambio`);
    this.exRateService.getExchangeRate().subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.currencyChange = next.exRate;
      }
      else {
        this.alertService.warningInfoAlert(`Error: ${next.Error ? next.Error.Message : 'No se ha definido tipo de cambio'}`);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.warningInfoAlert(`Error: ${error}`);
    });
  }

  DisplayBdCode(_event: any): void {
    if (_event.ctrlKey) {
      console.log(`showing bd code`);
    }
  }

  ViewOffline(): void {
    this.router.navigateByUrl("offline");
  }
}
