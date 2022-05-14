import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';
import { UserService, StoreService, AlertService} from '../../../../services/index';
import { ActivatedRoute } from '@angular/router';
import { constants } from 'os';
import { Router } from '@angular/router';
import { routerNgProbeToken } from '@angular/router/src/router_module';

@Component({
  selector: 'app-store-conf',
  templateUrl: './store-conf.component.html',
  styleUrls: ['./store-conf.component.scss']
})
export class StoreConfComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  btnSendInfo: string; // cambia el titulo de el boton de envio
  Title: string;
  storeId: number;
  companyList: any [] = [];
  storeList: any [] = [];
  whCode: string;
  storeGroup: FormGroup;

  constructor(private fbs: FormBuilder, private uService: UserService, private sService: StoreService,
              private activatedRoute: ActivatedRoute, private router: Router, 
              private alertService: AlertService) { console.log(0); }

  ngOnInit() {
     // tslint:disable-next-line:radix
    this.storeId = parseInt(this.activatedRoute.snapshot.paramMap.get('storeId'));
  
    if (this.storeId > 0) {
      this.btnSendInfo = 'Actualizar';
    } else { this.btnSendInfo = 'Crear Almacén'; }
  
    this.whCode = '';
  
    this.storeGroup = this.fbs.group({
        Name: ['', Validators.required],
        StoreCode: [{value: '', disabled: true}],
        StoreName: [],
        StoreStatus: [],
        CompanyName: []
    });
  
    this.GetCompanies();
  }

  // envia el almacen a crear o modificar
  onSubmitCreate() {
    this.blockUI.start('Enviando informacion del Almacén');
    let name = '';
    this.storeList.forEach(x => {
        if ( x.WhsCode === this.storeGroup.controls.StoreName.value) {
            name = x.WhsName;
        }
    });
    this.sService.sendStoreInfo(this.storeGroup, this.storeId, name);
  }
  get f() { return this.storeGroup.controls; }
   // obtiene las compañias de las cuales dispone la empresa.
   GetCompanies() {
    this.blockUI.start('Cargando listas de Compañias...');
    this.uService.getGetCompanies().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.companyList = data.companiesList;
        this.storeGroup.patchValue({CompanyName: this.companyList[0].Id});
        this.GetSapStores(this.companyList[0].Id);
      } else {
        this.alertService.errorAlert('Error al cargar la lista de Compañias - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
   // obtiene los Almacenes de las cuales dispone la empresa.
   GetSapStores(copany: number) {
    this.blockUI.start('Cargando listas de almacenes...');
    this.sService.GetStoresList(copany).subscribe((data: any) => {
      this.storeList.length = 0;
      this.storeGroup.controls.StoreCode.setValue('');
      if (data.Result) {
        this.storeList = data.WHPlaceList;
        this.storeGroup.patchValue({StoreName: this.storeList[0].WhsCode});
        this.storeGroup.controls.StoreCode.setValue(this.storeList[0].WhsCode);
          if (this.storeId > 0) {
              this.chargeStore();
          }
      } else {
        this.alertService.errorAlert('Error al cargar la lista de almacenes - ' + data. errorInfo.Message);
      }
      this.blockUI.stop();
    }, error => {
      this.storeList.length = 0;
      this.storeGroup.controls.StoreCode.setValue('');
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
  // carga los almacenes disponibles por compañia
  ChangeCompany() {
    this.GetSapStores(this.storeGroup.controls.CompanyName.value);
  }
  // carga el codigo del almacen cuando se cambia
  ChangeCode() {
    this.storeGroup.controls.StoreCode.setValue(this.storeGroup.controls.StoreName.value);
  }

  // se utiliza si la opcion es la editar, carga la informacion del almacen
  chargeStore() {
    this.blockUI.start('Cargando Almacen...');
    this.sService.GetStorebyId(this.storeId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.storeGroup.patchValue({StoreName: data.Store.StoreCode});
        this.storeGroup.controls.StoreCode.setValue(data.Store.StoreCode);
        this.storeGroup.controls.StoreStatus.setValue(data.Store.StoreStatus);
        this.storeGroup.patchValue({CompanyName: data.Store.companyName});
        this.storeGroup.controls.Name.setValue(data.Store.Name);
      } else {
        this.alertService.errorAlert('Error al cargar la lista de Compañias - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  cancel(){
    this.router.navigate(['/store']);
  }
}
