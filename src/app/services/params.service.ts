import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// MODELOS
import { AppConstants } from './../models/index';
import { IResponse } from '../models/i-api-response';
import { Currency} from '../models/i-currency';
// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { Observable } from 'rxjs';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class ParamsService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
  }

  // funcion para obtener los parametros de la vista de facturacion
  // no recibe parametros
  getParasmView() {
    const view = 1;
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/Param/GetViewParam?view=1`,
      { headers });
  }  

  UpdateParasmView( Params: any[] = []) {
    const view = 1;
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(`${AppConstants.apiUrl}api/Param/UpdateParamsViewState`,
    Params, { headers });
  }
  // funcion para obtener las monedas desde una vista SQL (COL o USD)
  // no recibe parametros
  GetCurrencyType(): Observable<IResponse<Currency[]>>{
    const view = 1;
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<Currency[]>>(`${AppConstants.apiUrl}api/Company/GetCurrencyType`,
      { headers });
  }

}
