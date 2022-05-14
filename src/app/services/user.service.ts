import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

// MODELOS
import { AppConstants, UserAssigns, BaseResponse, Users } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService,  } from './storage.service';
import { AlertService } from './alert.service';
import { Observable } from 'rxjs';
import { IUserResponse, IUsersResponse } from '../models/responses';
import { AuthenticationService } from '.';
import { first } from 'rxjs/operators';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class UserService {
  user: UserAssigns;


  constructor( private http: HttpClient, private storage: StorageService, private router: Router, 
  private alertService: AlertService) {
    this.user = new UserAssigns();

    
  }
  @BlockUI() blockUI: NgBlockUI;
// obtiene la lista de ususarios.
  getUserList() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Users/GetUserUserAssignList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
  // obtiene los almacenes
  getStoresList(company: number) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Stores/GetStoresByCompany/?company=` + company;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
// obtiene las compañias
  getGetCompanies() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetCompanies`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<BaseResponse>(url, { headers });
  }

  // obtiene las series, se debe indicar el tipo de documento para obtener las series asignadas a este
  getSeries(_docType: number) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Series/GetSeries`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<BaseResponse>(url, { headers });
  }
  
  UpdateUser(user: UserAssigns): Observable<BaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Users/UpdateUser`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<BaseResponse>(url,user, { headers });
  }
  CreateNewUser(user: UserAssigns): Observable<BaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Users/CreateNewUser`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<BaseResponse>(url,user, { headers });
  }

  getUsersApp(): Observable<IUsersResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Users/GetUsersApp`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IUsersResponse>(url, { headers });
  }

  getUserApp(_id: string): Observable<IUserResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Users/GetUserApp?id=${encodeURIComponent(_id)}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IUserResponse>(url, { headers });
  }

  createUserApp(_user: Users): Observable<BaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Users/CreateUserApp`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<BaseResponse>(url,_user, { headers });
  }
  updateUserApp(_user: Users): Observable<BaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Users/UpdateUserApp`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<BaseResponse>(url,_user, { headers });
  }
}
