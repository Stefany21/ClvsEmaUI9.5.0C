import { Globals } from './../../../globals';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal, ModalDismissReasons, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

// MODELOS
import { AppConstants } from './../../../models/constantes';
// RUTAS

// COMPONENTES

// SERVICIOS
import { CompanyService, AuthenticationService, AlertService, PermsService, ParamsService } from '../../../services/index';

// PIPES


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {

  @BlockUI() blockUI: NgBlockUI;

  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  imagePath: string;
  localIp: string;
  AppKey: string;
  httpRoute: string;
  urlSafe: SafeResourceUrl;
  @ViewChild('modalMensaje') Lmodal;


  constructor(private authenticationService: AuthenticationService,
    private companyService: CompanyService,
    private pService: ParamsService,
    private perService: PermsService,
    private globals: Globals,
    private alertService: AlertService,
    private modalService: NgbModal,
    public sanitizer: DomSanitizer
  ) {
    // console.log('HomeComponent constructor');

    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit() {
    // this.ChekNewPoll();       
    this.companyService.GetCompanies();
    this.imagePath = this.globals.imagePath;
    this.getCompanyLogo();
    this.GetParamsViewList();    
  }

  ChekNewPoll() {
    this.AppKey = AppConstants.AppKey.valueOf();
    this.authenticationService.ChekNewPoll(this.currentUser.UserName).subscribe((data: any) => {
      console.log(data);
      if (data.Result) {
        console.log(location.host);
        this.httpRoute = `${AppConstants.modalAnswer}UserAnswers/${this.currentUser.UserName}/${this.AppKey}/0`;
        this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.httpRoute);
        this.abrirModal(this.Lmodal);
      }
    }, (error: any) => {
      console.log(error);
    });
  }

  abrirModal(modal: any) {
    this.modalService.open(modal, { size: 'lg' });
  }
  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.currentUserSubscription.unsubscribe();
  }

  // funcion para obtener el logo de la compannia  de la DBLocal para su modificacion
  // no recibe parametros
  getCompanyLogo() {
    // console.log("getCompanyLogo");
    if (this.imagePath === '../../../../assets/img/placeholder_600x400.svg') {
      this.companyService.GetCompanyLogo()
        .subscribe((data: any) => {
          // console.log(data);
          if (data.Result) {
            this.imagePath = data.LogoB64;
            this.globals.imagePath = this.imagePath;
          } else {
          }
        }, (error: any) => {
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
    }
  }

  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {

    this.pService.getParasmView()
      .subscribe((data: any) => {
        if (data.Result) {
          this.globals.viewParamListSubMenu.length = 0;
          this.globals.viewParamListMenu.length = 0;
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
        this.alertService.errorAlert('Error al cargar la lista de Permisos - ' + data.Error.Message);
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
  }

}
