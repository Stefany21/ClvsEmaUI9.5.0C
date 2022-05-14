import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Router } from '@angular/router';

// MODELOS
import { AppConstants, IPurchaseOrder } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService,  } from './storage.service';
import { AlertService } from './alert.service';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  @BlockUI() blockUI: NgBlockUI;
  constructor( private http: HttpClient,
    private storage: StorageService,
    private router: Router,
    private alertService: AlertService ) {
      // console.log(0);
  }

  // funcion para obtener los stores desde la DBLocal
  // no recibe parametros
  getStores() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Stores/GetStoresByCompany`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  // funcion para obtener un almacen de la db local
  // como parametro el ID del almacen
  GetStorebyId(Id: number) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Stores/GetStorebyId?store=${Id}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  getallStores() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Stores/GetAllStores`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  GetStoresList(company: number) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Stores/GetStoresList?company=${company}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
  // envia la informacion del usuario para guardar en bd
    // parametros modelo de las series u el ID
    sendStoreInfo(grupo: FormGroup, Id: number, nombre: string) {
      let urlApi = '';
      const store = {
       'Id': Id,
       'StoreName': nombre,
       'StoreCode': grupo.value.StoreName,
       'StoreStatus': grupo.value.StoreStatus,
       'Name': grupo.value.Name,
       'CompanyName': grupo.value.CompanyName
      };

      if ( Id === 0) {
         urlApi = 'api/Stores/CreateStore';
      } else { urlApi = 'api/Stores/UpdateStore'; }

      const token = JSON.parse(this.storage.getCurrentSession());
      const url = `${AppConstants.apiUrl}` + urlApi;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.access_token}`
      });

      this.http.post(url, store, {headers} ).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.alertService.successInfoAlert( 'Se guardaron los cambios correctamente' );
        } else {
          this.alertService.errorAlert('Error al enviar la información de las series - ' + data. errorInfo.Message);
        }
        this.router.navigate(['store']);
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
    }  

    getStoresv2() {
      const token = JSON.parse(this.storage.getCurrentSession());
      const url = `${AppConstants.apiUrl}api/Stores/GetAllStores`;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.access_token}`
      });
      return this.http.get<any>(url, { headers });
    }

    savePurchaseOrderDocNum(_docNum: number): void {
      this.storage.setPurchaseOrder(_docNum);
    }

    restorePurchaseOrderDocNum(): number {
      return this.storage.getPurchaseOrder();
    }

  
    saveDocEntry(_docEntry: number): void {
      this.storage.SaveDocEntry(_docEntry);
    }

    restoreDocEntry(): number {
      return +this.storage.GetDocEntry();
    }

    SaveCustomerData(_customerData: string): void {
      this.storage.SaveCustomerData(_customerData);
    }

    GetCustomerData(): string {
      return this.storage.GetCustomerData();
    }

    SaveUIAction(_action: number): void {
      this.storage.SaveUIAction(_action);
    }

    GetUIAction(): number {
      return this.storage.GetUIAction();
    }

    SaveBreadCrum(_detail: string): void {
      this.storage.SaveBreadCrum(_detail);
    }

    GetBreadCrum(): string {
      return this.storage.GetBreadCrum();
    }

  

}
