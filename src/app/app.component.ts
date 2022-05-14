import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BrowserWindow } from 'electron';
import { ElectronService } from 'ngx-electron';
import swal from 'sweetalert2';
import { ElectronRendererService } from './electronrenderer.service';
import { BlockUI, NgBlockUI } from "ng-block-ui";
import { AlertService, AuthenticationService, ExRateService, StorageService } from './services/index';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  title = 'Clavis Consultores SA';
  currentUser: any;
  currencyExchangeRate: number;
  closeWindow = false; //Bandera para cerrar app electron.

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private exRateService: ExRateService,
    private storageService: StorageService,
    private alertService: AlertService,
    private electronService: ElectronRendererService
  ) {
    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);

    /*
    this.exRateService.getExchangeRate()
      .subscribe( (data: any) => {
        if (data.result) {
          this.currencyExchangeRate = data.exRate;
        } else {
          this.currencyExchangeRate = 0;
        }
      }, (error) => {
        this.currencyExchangeRate = 0;
      });
    */
  }

  ngOnInit(): void {
    if (this.electronService.CheckElectron()) {
      this.logout();
    }

    if (this.electronService.CheckElectron()) {

      window.onbeforeunload = (e) => {

        if (!this.closeWindow) {
          this.blockUI.stop();
          e.returnValue = false;
          swal({
            type: 'warning',
            title: 'Se cerrará la aplicación',
            text: '¿ Desea continuar ?',
            showCancelButton: true,
            confirmButtonColor: '#049F0C',
            cancelButtonColor: '#ff0000',
            confirmButtonText: 'Cerrar',
            cancelButtonText: 'No'
          }).then(next => {
            if (!(Object.keys(next)[0] === 'dismiss')) {
              this.closeWindow = true;
              this.logoutCloseApp();
              this.electronService.CloseApp();
            }
          });
        }
      };
    }
  }  

  logoutCloseApp() {
    this.authenticationService.logoutCloseApp();
  }

  logout() {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }
}
