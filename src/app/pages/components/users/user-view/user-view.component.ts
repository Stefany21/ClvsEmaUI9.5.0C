import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Users, UserAssigns, Stores, Company} from '../../../../models/index';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import {PermsService, UserService, ItemService, SalesManService, SeriesService, AlertService} from '../../../../services/index';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-view',
  templateUrl: './user-view.component.html',
  styleUrls: ['./user-view.component.scss']
})
export class UserViewComponent implements OnInit {

  @BlockUI() blockUI: NgBlockUI;
  userId: number;
  userinfo: UserAssigns;
  userList: Users [] = [];
  userAssignsList: UserAssigns [] = [];
  storesList: Stores [] = [];
  companyList: Company [] = [];
  userGroup: FormGroup;
  Id: number;
  disable: boolean;
  salida: boolean;
  PriceList: any[] = []; // lista de las listas de precios
  SalesPersonList: any [] = []; // lista de vendedores
  serieList: any [] = []; // lista de series de numeracion
  InvSerieList: any [] = [];
  QuoSerieList: any [] = [];
  IpaySerieList: any [] = [];

  constructor(private activatedRoute: ActivatedRoute,
              private pService: PermsService,
              private uService: UserService,
              private fbg: FormBuilder,
              private router: Router,
              private itemService: ItemService,
              private smService: SalesManService,
              private sService: SeriesService,
              private alertService: AlertService ) {
    this.Id = 0;
    this.userinfo = new UserAssigns();
  }

  ngOnInit() {
    // tslint:disable-next-line:radix
    this.userId = parseInt(this.activatedRoute.snapshot.paramMap.get('userId'));
    this.salida = true;

    this.userGroup = this.fbg.group({
      cUserName: [{value: '', disabled: true}],
      cSAPUser: [{value: '', disabled: true}],
      SAPPass: [{value: '', disabled: true}],
      StoreId: [{value: '', disabled: true}],
      CompanyId: [ {value: '', disabled: true}],
      minDiscount: [{value: '', disabled: true}],
      SlpCode: [{value: '', disabled: true}],
      CenterCost: [{value: '', disabled: true}],
      PriceListDef: [{value: '', disabled: true}],
      Active: [{value: '', disabled: true}],
      SuperUser: [{value: '', disabled: true}],
      InvSerie: [{value: '', disabled: true}],
      IPaySerie: [{value: '', disabled: true}],
      QuoSerie: [{value: '', disabled: true}]
    });
    this.chargeUser();
  }
// carga la informacion de los usuarios en el dropdown de usuarios
  chargeUser() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.pService.getUsers().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userList = data.users;
        if ( this.userId > 0) {this.chargeUserAsing(); }
        this.getGetCompanies();
        this.userGroup.patchValue({cUserName: this.userList[0].Id});
      } else {
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
  // obtiene las compañias de las cuales dispone la empresa.
  getGetCompanies() {
    this.blockUI.start('Cargando listas de almacenes...');
    this.uService.getGetCompanies().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.companyList = data.companiesList;
        this.userGroup.patchValue({CompanyId: this.companyList[0].Id});
        this.getStoresList(this.companyList[0].Id);
      } else {
        this.alertService.errorAlert('Error al cargar la lista de almacenes - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });

  }
// obtiene las tiendas que pertenesen a la compañia seleccionada.
  getStoresList(company: number) {
    this.blockUI.start('Cargando listas de compañías...');
    this.uService.getStoresList(company).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.storesList = data.Stores;
        this.userGroup.patchValue({StoreId: this.storesList[0].Id});
        this.chargeSeriesList();
      } else {
        this.alertService.errorAlert('Error al cargar la lista de compañías - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });

  }

  // trae la informacion de las series de numeracion y lo guardan en listas segun
  // su tipo para mostrar en el dropdow respectivo
  // parametro -> no recive.
  chargeSeriesList() {
    this.blockUI.start('Cargando listas de series..');
    this.sService.getSeriesList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.serieList = data.Series;
        this.ChargeSeriesListbyType();
        this.GetPriceList();
      } else {
        this.alertService.errorAlert('Error al cargar la lista de series - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  ChargeSeriesListbyType() {
    this.serieList.forEach( serie => {
      if ( serie.DocType === 1) {
        this.InvSerieList.push(serie);
      }
      if ( serie.DocType === 2) {
        this.QuoSerieList.push(serie);
      }
      if ( serie.DocType === 3) {
        this.IpaySerieList.push(serie);
      }
    });
    this.userGroup.patchValue({InvSerie: this.InvSerieList[0].Id});
    this.userGroup.patchValue({QuoSerie: this.QuoSerieList[0].Id});
    this.userGroup.patchValue({IPaySerie: this.IpaySerieList[0].Id});
  }
  get f() { return this.userGroup.controls; }
// cambia las sucursales en caso de que se cambie la compañia
// carga la informacion del usuario en caso que sea opcion de ediccion
  chargeUserAsing() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.uService.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userAssignsList = data.Users;
      } else {
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
// carga la informacion del usuarios en los formscontrols
  chargeUserData(Id: number) {
  this.userAssignsList.forEach(user => {
      if ( Id === user.Id) {
        this.userList.forEach( us => {
          if (us.Id.toString() === user.UserId) {
            this.userGroup.patchValue({cUserName: us.Id});
          }
        });
        this.userGroup.controls.cSAPUser.setValue(user.SAPUser);
        this.userGroup.patchValue({CompanyId: user.CompanyId});
        this.userGroup.patchValue({StoreId: user.StoreId});
        this.userGroup.patchValue({PriceListDef: user.PriceListDef});
        this.userGroup.controls.minDiscount.setValue(user.minDiscount);
        // this.userGroup.controls.SlpCode.setValue(user.SlpCode);
        this.userGroup.patchValue({SlpCode: user.SlpCode});
        this.userGroup.controls.SAPPass.setValue(user.SAPPass);
        this.userGroup.controls.CenterCost.setValue(user.CenterCost);
        this.userGroup.controls.Active.setValue(user.Active);
        this.userGroup.controls.SuperUser.setValue(user.SuperUser);
        this.salida = false;
        user.Series.forEach( serie => {
          if ( serie.type === 1) {
            this.userGroup.patchValue({InvSerie: serie.SerieId});
          }
          if ( serie.type === 2) {
            this.userGroup.patchValue({QuoSerie: serie.SerieId});
          }
          if ( serie.type === 3) {
            this.userGroup.patchValue({IPaySerie: serie.SerieId});
          }
        });
      }
    });
    if (this.salida) { this.router.navigate(['users']); }
  }
// vuelve a la vista de users
  onSubmitCreate() {
    this.router.navigate(['users']);
  }
  // vuelve a la vista de la configuracion de usuarios
  confPage() {
    this.router.navigate(['userConf/' + this.userId]);
  }
  // carga las listas de precios
  GetPriceList() {
    this.blockUI.start('Obteniendo listas de precios, espere por favor...'); // Start blocking
    this.itemService.GetPriceList()
    .subscribe( (data: any) => {
      if (data.Result) {
        this.PriceList = data.priceList;
        this.userGroup.patchValue({PriceListDef: this.PriceList[0].ListNum});
        this.GetSalesPersonList();
      } else {
        this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
      }
      this.blockUI.stop(); // Stop blocking
    }, (error: any) => {
      this.blockUI.stop(); // Stop blocking
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
  GetSalesPersonList() {
    this.blockUI.start('Obteniendo vendedores, espere por favor...'); // Start blocking
    this.smService.getSalesMan()
    .subscribe( (data: any) => {
      if (data.Result) {
        this.SalesPersonList = data.salesManList;
        this.userGroup.patchValue({SlpCode: this.SalesPersonList[0].SlpCode});
        if (this.userId > 0) { this.chargeUserData(this.userId); }
      } else {
        this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
      }
      this.blockUI.stop(); // Stop blocking
    }, (error: any) => {
      this.blockUI.stop(); // Stop blocking
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
  cancel(){
    this.router.navigate(['/users']);
  }
}
