import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

// MODELOS
import { AppConstants, Perms, PermsUserEdit } from '../models';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService,  } from './storage.service';
import { AlertService } from './alert.service';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class PermsService {

  permsUserEdit: PermsUserEdit;

  @BlockUI() blockUI: NgBlockUI;
  constructor(private http: HttpClient, private storage: StorageService, private alertService: AlertService) {
    this.permsUserEdit = new PermsUserEdit();
    // console.log(0);
  }
// obtine la lista de usuarios
// no recive paramestros
  getUsers() {

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Perms/GetUserList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.get( url, {headers});
  }
// obtiene la lista de permisos
// recive un numero que es el ID del usuario al que se le van a obtener los permisos
  getPerms(numId: any) {
    
    let num = encodeURIComponent(numId);
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Perms/GetPermsByUser/?user=${num}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get( url , {headers});
  }

  getPermsforMenu() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Perms/GetPermsByUserMenu`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get( url , {headers});
  }

  // envia la informacion al api para guardar la informacion y los cambios sobre los permisos por usuario
  // parametros el model de permisos y el id de usuario
  savePermsChange(model: Perms[], user: number): any {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Perms/EditPermsByUser`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    this.permsUserEdit.UserPerms = model;
    this.permsUserEdit.UserId = user;
    // omologo del ajax de Jquery para enviar datos a consumir urls externas
    return this.http.post( url,
    this.permsUserEdit ,
    { headers });
  }

}
