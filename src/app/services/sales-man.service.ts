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
export class SalesManService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
  }

  // funcion para obtener los vendedores de la compannia
  // no recibe parametros
  getSalesMan() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/SalesMan/GetSalesMan`,
      { headers });
  }
  getSalesManBalance() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/SalesMan/getSalesManBalance`,
      { headers });
  }
}
