import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// MODELOS
import { AppConstants } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService,  } from './storage.service';
import { AlertService } from './alert.service';
import { IResponse } from '../models/i-api-response';
import { IContableAccounts } from '../models/i-contableaccounts';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  constructor( private http: HttpClient,
    private storage: StorageService,
    private alertService: AlertService ) {
  }

  // funcion para obtener las cuentas
  // no recibe parametros
  getAccount() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<IContableAccounts>>(`${AppConstants.apiUrl}api/Account/GetAccounts`,
      { headers });
  }
}
