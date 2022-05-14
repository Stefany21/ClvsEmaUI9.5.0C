import { Component, OnInit, HostListener } from '@angular/core';
import { LayoutService } from '../../shared/services/layout.service';
import { Router } from '@angular/router';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { ElectronService } from 'ngx-electron';

// MODELOS
import { Globals } from '../../globals';
import { AuthenticationService, ParamsService, PermsService, AlertService, ExRateService } from '../../services/index';
import { StoreService } from '../../services/store.service';
import { StorageService } from '../../services/storage.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-pages-core',
  templateUrl: './pages-core.component.html',
  styleUrls: ['./pages-core.component.scss']
})
export class PagesCoreComponent implements OnInit {
  setNavLayout: string;
  themeLayout: string;
  setDefaultNavbar: string;
  setToggleNavbar: string;
  setToggleStatus: boolean;
  setVerticalNavbarEffect: string;
  setDeviceType: string;
  setHeaderColorTheme: string;
  setLeftHeaderColorTheme: string;
  setNavbarColorTheme: string;
  setActiveNavColorTheme: string;
  setHeaderHeight: number;
  exRateEncontrado: boolean = false;
  adentro: boolean = false; //semaforo para no hacer peticiones por el tipo de cambio cuando hay una peticion activa
  setFooterHeight: number;
  setCollapsedLeftHeader: boolean;
  @BlockUI() blockUI: NgBlockUI;
  currentUser: any;
  exchangeRate: number;
  viewParamListSubMenu: any[] = []; // llena la lista con los componentes parametrizados del menu principal
  viewParamListMenu: any[] = [];
  permList: any[] = [];
  compVisivility: any[] = [];
  constructor(private layoutService: LayoutService,
    private router: Router,
    private authenticationService: AuthenticationService,
    private pService: ParamsService,
    private perService: PermsService,
    private exRateService: ExRateService,
    private globals: Globals,
    private StorageService: StorageService,
    private companyService: CompanyService,
    //private _electronService: ElectronService,
    private alertService: AlertService) {
    this.authenticationService.currentUser.subscribe(x => {this.currentUser = x

    });
  }
  ngDoCheck() {
    // setTimeout(() => {
    //   if (!this.adentro && !this.exRateEncontrado && this.currentUser !== null) {
    //     this.adentro = true;
    //     this.exRateEncontrado = true;
    //     this.exRateService.getExchangeRate().subscribe((data: any) => {
    //       this.exchangeRate = data.exRate;
    //       this.exRateEncontrado = data.result;
    //       this.adentro = false;
    //     });


    //    // this.StorageService.se
    //   }
    // }, 5000);
  }
  ngOnInit() {
   /*  if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.send('msgStart', 1);
    } */
    this.exchangeRate = 0;
    this.layoutService.checkWindowWidth(window.innerWidth);

    this.layoutService.navLayoutCast.subscribe(
      navlayout => (this.setNavLayout = navlayout)
    );

    this.layoutService.dfNavbarCast.subscribe(
      dfNavbar => (this.setDefaultNavbar = dfNavbar)
    );
    this.layoutService.toggleNavbarCast.subscribe(
      tNavbar => (this.setToggleNavbar = tNavbar)
    );
    this.layoutService.tStatusCast.subscribe(
      tStatus => (this.setToggleStatus = tStatus)
    );
    this.layoutService.nvEffectCast.subscribe(
      nvEffect => (this.setVerticalNavbarEffect = nvEffect)
    );
    this.layoutService.headerThemeCast.subscribe(
      headerTheme => (this.setHeaderColorTheme = headerTheme)
    );
    this.layoutService.leftHeaderThemeCast.subscribe(
      leftHeaderTheme => (this.setLeftHeaderColorTheme = leftHeaderTheme)
    );
    this.layoutService.navbarThemeCast.subscribe(
      navbarTheme => (this.setNavbarColorTheme = navbarTheme)
    );
    this.layoutService.activeNavThemeCast.subscribe(
      activeNavTheme => (this.setActiveNavColorTheme = activeNavTheme)
    );
    this.layoutService.themeLayoutCast.subscribe(
      themeLayout => (this.themeLayout = themeLayout)
    );
    this.layoutService.collapsedLeftHeaderCast.subscribe(
      collapsedLeftHeader => (this.setCollapsedLeftHeader = collapsedLeftHeader)
    );
    this.layoutService.deviceTypeCast.subscribe(
      appDeviceType => (this.setDeviceType = appDeviceType)
    );

    this.setHeaderHeight = this.layoutService.headerHeight;

    if (this.currentUser !== null) {
      this.GetParamsViewList();
    }
      //Obtener cantidad de decimales configurables por compañia

      // this.companyService.GetCompanyById(4)
      // .subscribe( (data: any) => {
      //   if (data.result) {
      //     this.StorageService.setDecimalAmount(data.companyAndMail.company.DecimalAmount);
      //   } else {
      //     this.alertService.errorAlert('Error al cargar la información de las compañias - Error: ' + data.errorInfo.Message);
      //   }
      //   this.blockUI.stop(); // Stop blocking
      // }, (error: any) => {
      //   this.blockUI.stop(); // Stop blocking
      //   this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      // });
  }

  logout() {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }

  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.globals.viewParamListSubMenu.length = 0;
    this.globals.viewParamListMenu.length = 0;
    this.pService.getParasmView()
      .subscribe((data: any) => {
        if (data.Result) {
          data.Params.forEach(element => {
            if (element.type === 4) {
              this.globals.viewParamListSubMenu.push(element);
            }
            if (element.type === 5) {
              this.globals.viewParamListMenu.push(element);
            }
          });
          this.getDataPerms();
        } else {
          this.alertService.errorAlert('Error al cargar componentes - ' + data.Error.Message);   
        }
      }, error => {
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }        

  // cambia los permisos en las diferentes tablas, ya sea si estan habilitados o deshabilitados
  getDataPerms() {
    this.globals.permList.length = 0;
    this.perService.getPermsforMenu().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.globals.permList = data.perms;
        this.chargePerms();
      } else {
        this.blockUI.stop();
        this.alertService.infoAlert('Error al cargar la lista de permisos - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  chargePerms() {
    this.globals.compVisivility.length = 0;
    this.globals.viewParamListSubMenu.forEach(param => {
      this.globals.permList.forEach(perm => {
        if (param.Name === perm.Name && param.Visibility && perm.Active) {
          this.globals.compVisivility.push({
            'Name': param.Name,
            'Visibility': param.Visibility,
            'Text': param.Text,
            'active': perm.Active
          });
        }
      });
    });
    // console.log(this.compVisivility);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    //this.layoutService.getVerticalNavbarOnWindowResize(event.target.innerWidth);
  }
  changeTheToggleStatus() {
    this.layoutService.getToggleStatus();
  }

}
