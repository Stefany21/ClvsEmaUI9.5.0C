import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// MODELOS
import { AppConstants } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class ExRateService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
  }

  // funcion para obtener el tipo de cambio
  // no recibe parametros
  getExchangeRate() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(`${AppConstants.apiUrl}api/ExchangeRate/GetExchangeRate`,
      { headers });
  }

}
