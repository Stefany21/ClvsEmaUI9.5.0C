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
export class SerieService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
  }

  // funcion para obtener las series desde la DBLocal
  // no recibe parametros
  getSeries() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Series/GetSeries`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

}
