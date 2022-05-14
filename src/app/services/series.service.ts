import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

// MODELOS
import { AppConstants, Series, SeriesbyUser } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService,  } from './storage.service';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root'
})
export class SeriesService {
  serieModel: Series;

  InvSerieList: SeriesbyUser;
  QuoSerieList: SeriesbyUser;
  IpaySerieList: SeriesbyUser;

  @BlockUI() blockUI: NgBlockUI;
  constructor( private http: HttpClient, private storage: StorageService, 
               private router: Router, private alertService: AlertService ) {
    // console.log(0);
    this.serieModel = new Series();
  }
// obtien ela listas de las series
// no recive paramestros
  getSeriesList() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Series/GetSeries`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
  // obtiene la lista de los tipos de series facturacion/ cotizacion/ pago
  // no recive paramestros
  getSeriesEnumList() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Series/GetSeriesType`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
// obtien ela lista de tipos de series de numeracion (manual o automatica)
// no recive paramestros
  getTypeSeriesEnumList() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Series/GetSeriesTypeNumber`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

    // envia la informacion del usuario para guardar en bd
    // parametros modelo de las series u el ID
    sendUserInfo(grupo: FormGroup, Id: number) {      
      this.serieModel.Id = Id;
      this.serieModel.Name = grupo.value.Name;
      this.serieModel.DocType = grupo.value.typeName;
      this.serieModel.CompanyId = grupo.value.CompanyName;
      this.serieModel.Numbering = grupo.value.Numbering;
      this.serieModel.Serie = grupo.value.Serie;
      this.serieModel.Active = grupo.value.Active ==1 ? true:false;
      this.serieModel.Type = grupo.value.Type;     
      
      let urlApi = '';
      if ( this.serieModel.Id === 0) {
         urlApi = 'api/Series/CreateNewSerie';
      } else { urlApi = 'api/Series/UpdateSerie'; }
      const token = JSON.parse(this.storage.getCurrentSession());
      const url = `${AppConstants.apiUrl}` + urlApi;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.access_token}`
      });

      this.http.post(url, this.serieModel, {headers} ).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.alertService.successInfoAlert( 'Se guardaron los cambios correctamente' );
          this.router.navigate(['series']);
        } else {
          this.alertService.errorAlert('Error al enviar la información de las series - ' + data. errorInfo.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
    }
}
