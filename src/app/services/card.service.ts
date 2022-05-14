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
export class CardService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
  }

  // funcion para obtener las tarjetas
  // no recibe parametros
  getCards() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/Cards/GetCards`,
      { headers });
  }

}
