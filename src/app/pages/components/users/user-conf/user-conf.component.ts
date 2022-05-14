import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Users, UserAssigns, Stores, Company, SeriesbyUser, Series } from '../../../../models/index';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { PermsService, ItemService, UserService, SeriesService, SalesManService, AlertService } from '../../../../services/index';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { SerieService } from '../../../../services/serie.service';

@Component({
  selector: 'app-user-conf',
  templateUrl: './user-conf.component.html',
  styleUrls: ['./user-conf.component.scss']
})
export class UserConfComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  userId: number;
  user: UserAssigns;
  userList: Users[];
  userAssignsList: UserAssigns[];
  storesList: Stores[];
  companyList: Company[];
  serieList: Series[];
  InvSerieList: Series[];
  QuoSerieList: Series[];
  IpaySerieList: Series[];
  SOSerieList: Series[];
  ncSerieList: Series[];
  CustomerSerieList: Series[];
  SupplierSerieList: Series[];
  ApInvoiceSerieList: Series[];
  ApPaymentSerieList: Series[];
  SeriesbyUser: SeriesbyUser[];
  userGroup: FormGroup;
  disable: boolean;
  btnSendInfo: string; // cambia el titulo de el boton de envio
  PriceList: any[] = []; // lista de las listas de precios
  SalesPersonList: any[] = [];
  UserAssing: UserAssigns;

  constructor(private activatedRoute: ActivatedRoute,
    private pService: PermsService,
    private uService: UserService,
    private sService: SeriesService,
    private fbg: FormBuilder,
    private router: Router,
    private itemService: ItemService,
    private smService: SalesManService,
    private alertService: AlertService,
    private serieService: SerieService) {

  }
  initVariables() {

    this.UserAssing = {} as UserAssigns;

    this.userGroup = this.fbg.group({
      cUserName: [{ value: '', disabled: this.disable }, [Validators.required]],
      cSAPUser: ['', [Validators.required]],
      SAPPass: ['', [Validators.required]],
      StoreId: ['', [Validators.required]],
      CompanyId: [{ value: '', disabled: this.disable }, [Validators.required]],
      minDiscount: ['', [Validators.required, Validators.max(100), Validators.min(0)]],
      SlpCode: ['', [Validators.required]],
      CenterCost: [''],
      PriceListDef: ['', [Validators.required]],
      InvSerie: ['', [Validators.required]],
      IPaySerie: ['', [Validators.required]],
      QuoSerie: ['', [Validators.required]],
      SOSerie: ['', [Validators.required]],
      NcSerie: ['', [Validators.required]],
      CustomerSerie: ['', [Validators.required]],
      SupplierSerie: ['', [Validators.required]],
      ApInvoiceSerie: ['', [Validators.required]],
      ApPaymentSerie: ['', [Validators.required]],
      Active: [''],
      SuperUser: ['']
    });


    this.user = null;
    this.userList = [];
    this.userAssignsList = [];
    this.storesList = [];
    this.companyList = [];
    this.serieList = [];
    this.InvSerieList = [];
    this.QuoSerieList = [];
    this.IpaySerieList = [];
    this.SOSerieList = [];
    this.ncSerieList = [];
    this.CustomerSerieList = [];
    this.SupplierSerieList = [];
    this.ApInvoiceSerieList = [];
    this.ApPaymentSerieList = [];
    this.SeriesbyUser = [];

    this.getGetCompanies(); //Obtiene companias
    this.getUsers();//Obtiene lista de usuarios      
    this.getSeriesList();//Obtiene series
    this.GetSalesPersonList();//Obtiene vendedores
    this.GetPriceList();//Obtiene lista de precios
    this.getUserAssing();//Obtiene usuarios asignados   

    if (this.userId > 0) {
      this.disable = true;
      this.btnSendInfo = 'Actualizar';
      this.getUserData(this.userId);
    } else { this.btnSendInfo = 'Crear'; }



  }
  ngOnInit() {
    this.userId = parseInt(this.activatedRoute.snapshot.paramMap.get('userId'));

    this.disable = false;
    if (this.userId > 0) {
      this.disable = true;
    }
    this.initVariables();
    // tslint:disable-next-line:radix
  }
  // carga la informacion de los usuarios en el dropdown de usuarios
  // parametro -> no recive.
  getUsers(): void {
    this.blockUI.start('Cargando listas de usuarios...');
    this.pService.getUsers().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userList = data.users;
        if (this.userId > 0) { this.getUserData(this.userId); }
        this.userGroup.patchValue({ cUserName: this.userList[0].Id });
      } else {
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
  // obtiene las compañias de las cuales dispone la empresa.
  // parametro -> no recive.
  getGetCompanies(): void {
    this.blockUI.start('Cargando listas de almacenes...');
    this.uService.getGetCompanies().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.companyList = data.companiesList;
        this.userGroup.patchValue({ CompanyId: this.companyList[0].Id });
        this.getStoresList(this.companyList[0].Id);
      } else {
        this.alertService.errorAlert('Error al cargar la lista de almacenes - ' + data.errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });

  }
  // obtiene las tiendas que pertenecen a la compañia seleccionada.
  // parametro -> recibe el numero de compañia
  getStoresList(company: number): void {
    this.blockUI.start('Cargando listas de almacenes...');
    this.uService.getStoresList(company).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.storesList.length = 0;
        this.storesList = data.Stores;
      } else {
        this.alertService.errorAlert('Error al cargar la lista de Almacenes - ' + data.errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });

  }

  get f() { return this.userGroup.controls; }
  // cambia las sucursales en caso de que se cambie la compañia
  // parametro -> no recive.
  onCompanyChange() {
    this.storesList.length = 0;
    this.getStoresList(this.userGroup.controls.CompanyId.value);
  }

  // carga la informacion del usuario en caso que sea opcion de ediccion
  // parametro -> no recive.
  getUserAssing(): void {
    this.blockUI.start('Cargando listas de usuarios...');
    this.uService.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userAssignsList = data.Users;
        if (this.userId > 0) { this.getUserData(this.userId); }
      } else {
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }


  // carga la informacion del usuarios en los formscontrols
  // parametro -> recivel el ID de usuario
  getUserData(Id: number): void {
    this.UserAssing = this.userAssignsList.find(x => x.Id === Id);
    if (!this.UserAssing) {
      return;
    }
    this.userAssignsList.forEach(user => {
      if (Id === user.Id) {
        this.userList.forEach(us => {
          if (us.Id.toString() === user.UserId) {
            this.userGroup.patchValue({ cUserName: us.Id });
          }
        });

      }
    });

    this.userGroup.controls.cSAPUser.setValue(this.UserAssing.SAPUser);
    this.userGroup.patchValue({ CompanyId: this.UserAssing.CompanyId });
    this.userGroup.patchValue({ StoreId: this.UserAssing.StoreId });
    this.userGroup.patchValue({ PriceListDef: this.UserAssing.PriceListDef });
    this.userGroup.controls.minDiscount.setValue(this.UserAssing.minDiscount);
    this.userGroup.patchValue({ SlpCode: this.UserAssing.SlpCode });
    this.userGroup.controls.SAPPass.setValue(this.UserAssing.SAPPass);
    this.userGroup.controls.CenterCost.setValue(this.UserAssing.CenterCost);
    this.userGroup.controls.Active.setValue(this.UserAssing.Active);
    this.userGroup.controls.SuperUser.setValue(this.UserAssing.SuperUser);
    this.userGroup.controls.StoreId.setValue(this.UserAssing.StoreId);

    this.UserAssing.Series.forEach(serie => {

      switch (serie.type) {
        case 1:
          this.userGroup.patchValue({ InvSerie: serie.SerieId });
          break;
        case 2:
          this.userGroup.patchValue({ QuoSerie: serie.SerieId });
          break;
        case 3:
          this.userGroup.patchValue({ IPaySerie: serie.SerieId });
          break;
        case 4:
          this.userGroup.patchValue({ SOSerie: serie.SerieId });
          break;
        case 5:
          this.userGroup.patchValue({ CustomerSerie: serie.SerieId });
          break;
        case 6:
          this.userGroup.patchValue({ SupplierSerie: serie.SerieId });
          break
        case 7:
          this.userGroup.patchValue({ NcSerie: serie.SerieId });
          break;
        case 8:
          this.userGroup.patchValue({ ApInvoiceSerie: serie.SerieId });
          break;
        case 9:
          this.userGroup.patchValue({ ApPaymentSerie: serie.SerieId });
          break;
      }
    });
  }

  // envia la info al api para guardarla en internet.
  // parametro -> no recive.
  onSubmitCreate() {
    if(!this.userGroup.controls.StoreId.value){
      this.alertService.errorInfoAlert(`Por favor seleccione almacén`);
      return;
    }
    if (this.userId > 0) {
    } else {
      this.userId = 0;
    }
    const InvSerie = {
      SerieId: this.userGroup.controls.InvSerie.value ? this.userGroup.controls.InvSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(InvSerie);

    const QuoSerie = {
      SerieId: this.userGroup.controls.QuoSerie.value ? this.userGroup.controls.QuoSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(QuoSerie);

    const IpaySerie = {
      SerieId: this.userGroup.controls.IPaySerie.value ? this.userGroup.controls.IPaySerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(IpaySerie);

    const SOSerie = {
      SerieId: this.userGroup.controls.SOSerie.value ? this.userGroup.controls.SOSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(SOSerie);

    const ncSerie = {
      SerieId: this.userGroup.controls.NcSerie.value ? this.userGroup.controls.NcSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(ncSerie);

    const CustomerSerie = {
      SerieId: this.userGroup.controls.CustomerSerie.value ? this.userGroup.controls.CustomerSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(CustomerSerie);

    const SupplierSerie = {
      SerieId: this.userGroup.controls.SupplierSerie.value ? this.userGroup.controls.SupplierSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(SupplierSerie);

    const ApInvoiceSerie = {
      SerieId: this.userGroup.controls.ApInvoiceSerie.value ? this.userGroup.controls.ApInvoiceSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(ApInvoiceSerie);

    const ApPaymentSerie = {
      SerieId: this.userGroup.controls.ApPaymentSerie.value ? this.userGroup.controls.ApPaymentSerie.value : -1,
      UsrMappId: this.userId
    } as SeriesbyUser;
    this.SeriesbyUser.push(ApPaymentSerie);


    this.user = {
      Id: this.userId,
      UserId: this.userGroup.controls.cUserName.value,
      SAPUser: this.userGroup.controls.cSAPUser.value,
      UserName: this.userGroup.controls.cUserName.value,
      CompanyId: this.userGroup.controls.CompanyId.value,
      StoreId: this.userGroup.controls.StoreId.value,
      minDiscount: this.userGroup.controls.minDiscount.value,
      SlpCode: this.userGroup.controls.SlpCode.value,
      SAPPass: this.userGroup.controls.SAPPass.value,
      CenterCost: this.userGroup.controls.CenterCost.value !== '' ? this.userGroup.controls.CenterCost.value : 0,
      PriceListDef: this.userGroup.controls.PriceListDef.value,
      Active: this.userGroup.controls.Active.value !== '' ? this.userGroup.controls.Active.value : false,
      SuperUser: this.userGroup.controls.SuperUser.value !== '' ? this.userGroup.controls.SuperUser.value : false,
      Series: this.SeriesbyUser,
      CompanyName: '',
      StoreName: ''
    }
    if (this.userId > 0) {
      this.blockUI.start('Actualizando asignación de usuario, espere por favor');
      this.uService.UpdateUser(this.user).subscribe(next => {
        if (next.Result) {
          this.alertService.successInfoAlert('El usuario seleccionado debe cerrar sesión para aplicar los cambios');
          this.user = null;
          this.router.navigate(['AssignsUsers']);
        }
        else {
          this.alertService.errorAlert(`Error al crear el usuario, detalle: ${next.Error.Message}`);
        }
        this.blockUI.stop();
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`Error al crear el usuario, detalle: ${error}`);
      }, () => { });
    } else {
      this.blockUI.start('Creando asignación de usuario, espere por favor');
      this.uService.CreateNewUser(this.user).subscribe(next => {
        if (next.Result) {
          this.alertService.successInfoAlert('El usuario seleccionado debe cerrar sesión para aplicar los cambios');
          this.user = null;
          this.router.navigate(['AssignsUsers']);
        }
        else {
          this.alertService.errorAlert(`Error al crear el usuario, detalle: ${next.Error.Message}`);
        }
        this.blockUI.stop();
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`Error al crear el usuario, detalle: ${error}`);
      }, () => { });

    }

  }
  // trae la informacion de las series de numeracion y lo guardan en listas segun
  // su tipo para mostrar en el dropdow respectivo
  // parametro -> no recive.
  getSeriesList(): void {
    this.blockUI.start('Cargando listas de series..');
    this.sService.getSeriesList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.serieList = data.Series;
        this.ChargeSeriesListbyType();//Alimenta drops con series existente        
      } else {
        this.alertService.errorAlert('Error al cargar la lista de series - ' + data.errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // separa las series de numeracion por tipo de serie, si es pago o facturacion  cotizacion
  // REVC -> POR EL MOMENTO SE LE ASIGNA UN NUMERO POR QUE NO ENCONTRE MANERA DE ASIGNAR EL DATO CORRECTO
  // YA QUE LOS ENUMS VIENEN DESDE EL BACKEND - IDEAS?
  // parametro -> no recive.
  ChargeSeriesListbyType(): void {
    this.serieList.forEach(serie => {

      switch (serie.DocType) {
        case 1:
          this.InvSerieList.push(serie);
          break;
        case 2:
          this.QuoSerieList.push(serie);
          break;
        case 3:
          this.IpaySerieList.push(serie);
          break;
        case 4:
          this.SOSerieList.push(serie);
          break;
        case 5:
          this.CustomerSerieList.push(serie);
          break;
        case 6:
          this.SupplierSerieList.push(serie);
          break;
        case 7:
          this.ncSerieList.push(serie);
          break;
        case 8:
          this.ApInvoiceSerieList.push(serie);
          break;
        case 9:
          this.ApPaymentSerieList.push(serie);
          break;
      }
    });
  }

  // trae la lista de precios para seleccionar cualquiera en la vusta de facturacion
  GetPriceList(): void {
    this.blockUI.start('Obteniendo listas de precios, espere por favor...'); // Start blocking
    this.itemService.GetPriceList()
      .subscribe((data: any) => {
        if (data.Result) {
          this.PriceList = data.priceList;
        } else {
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  GetSalesPersonList(): void {
    this.blockUI.start('Obteniendo vendedores, espere por favor...'); // Start blocking
    this.smService.getSalesMan()
      .subscribe((data: any) => {
        if (data.Result) {
          this.SalesPersonList = data.salesManList;
          if (this.userId > 0) { this.getUserData(this.userId); }
        } else {
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }
  cancel() {
    this.router.navigate(['/AssignsUsers']);
  }
}


