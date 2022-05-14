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
export class SapService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
  }

  // funcion para obtener las conexiones de SAP de la DBLocal
  // no recibe parametros
  GetSapConnection() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/SapConnection/GetSapConnection`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }


}
