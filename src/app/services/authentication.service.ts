import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { CONFIG_VIEW, CustomURLEncoder } from '../models';

// MODELOS
import { AppConstants, User, StringModel } from './../models/index';
// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { CompanyService } from './company.service';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  getOffLine = '';
  currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  constructor(private http: HttpClient,
    private storage: StorageService,
    private router: Router,
    private companyService: CompanyService,) {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser')));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    // console.log('currentUser',this.currentUserSubject.value);
    return this.currentUserSubject.value;

  }

  
   VerifyOfflineConecction() {
    return this.http.get(this.storage.GetUrlOffline(), { observe: 'response', responseType: 'text' });
  }
  // funcion para el logueo a la aplicacion
  // recibe como parametro el usuario y contrasenna
  login(email: string, password: string) {
    const body = new HttpParams({ encoder: new CustomURLEncoder() })
      .set('grant_type', 'password')
      .set('username', email)
      .set('password', password)
      .set('is_login', 'true');

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    return this.http.post<any>(`${AppConstants.onlineUrl}token`, body.toString(), { headers })
      .pipe(map(user => {
        // login successful if there's a owin token in the response
        if (user && user.access_token) {
          // store user details and jwt token in local storage to keep user logged in between page refreshes
          user.Password = password;
          // this.storage.setCurrentSession(user);
          // this.currentUserSubject.next(user);  
        }
        return user;
      }));

  }

  // permite obtener los tokens para el api offline
  // principal dice si es el metodo de login principal, si el api online no esta disponible
  loginOffline(email: string, password: string, principal: boolean) {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('username', email)
      .set('password', password)
      .set('is_login', 'true');

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    return this.http.post<any>(`${this.storage.GetUrlOffline()}token`, body.toString(), { headers })
      .pipe(map(user => {
        // login successful if there's a owin token in the response

        if (user && user.access_token) {
          user.Password = password;
          // store user details and jwt token in local storage to keep user logged in between page refreshes
          this.storage.setCurrentSessionOffline(user);

          if (this.storage.getConnectionType()) this.storage.setCurrentSession(user)
          //   
          if (principal) {
            this.currentUserSubject.next(user);
            // }
          }
          return user;
        }
      }));

  }

  loginOfflinePinPad(email: string, password: string, principal: boolean): void {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('username', email)
      .set('password', password)
      .set('is_login', 'true');

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    this.http.post<any>(`${this.storage.GetUrlOffline()}token`, body.toString(), { headers }).subscribe(next => {
      next.Password = password;
      if (next && next.access_token) {
        this.storage.setCurrentSessionOffline(next);
      }
    }, error => {
      console.error('Servicios pin pad no disponibles', error);
    });
  }

  authPinPadCredentials(email: string, password: string) {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('username', email)
      .set('password', password)
      .set('is_login', 'true');

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<any>(`${this.storage.GetUrlOffline()}token`, body.toString(), { headers });
  }

  // funcion para el deslogueo de la aplicacion
  // no recibe parametros
  logout() {
    // remove user from local storage to log user out
    this.storage.removeCurrentSession();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Funcion para el registro del usuario
   * @param {FormGroup} user Formulario para registrar el usuario
   */
  register(user: FormGroup) {
    const REGISTERUSER = new User(user.value.email, user.value.password, user.value.fullName);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${AppConstants.apiUrl}api/Account/RegisterUser`,
      REGISTERUSER,
      { headers });
  }

  /**
   * Funcion para el envio del correo para recuperar la contrasenna de una cuenta
   * @param {FormGroup} user Formulario para recuperar la contrasenna del usuario
   */
  sendRecoverPswdEmail(user: FormGroup) {
    const userEmail = new StringModel(user.value.email);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${AppConstants.apiUrl}api/Account/SendRecoverPswdEmail`,
      userEmail,
      { headers });
  }

  /**
  * Funcion para el recuperar la contrasenna de una cuenta
  * @param {FormGroup} user Formulario para recuperar la contrasenna del usuario
  */
  recoverPswd(user: FormGroup) {
    const recoverPswd = new User(user.value.email, user.value.password, '');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${AppConstants.apiUrl}api/Account/RecoverPswd`,
      recoverPswd,
      { headers });
  }

  // verificacion de correo del usuario propietario de la cuenta
  ConfirmEmail(token) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/Account/ConfirmEmail`,
      { headers }
    );
  }

  // verificacion de correo del usuario propietario de la cuenta
  ConfirmEmailInOwnerAccount(token, userForm: FormGroup) {
    const confirmEmailIOA = {
      'word': userForm.value.password,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(`${AppConstants.apiUrl}api/Account/ConfirmEmailInOwnerAccount/`,
      confirmEmailIOA,
      { headers }
    );

  }

  ChekNewPoll(Currentuser: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const appKey = AppConstants.AppKey;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    const _url = `${AppConstants.apiAnswer}api/AnswersController/GetNextTimeStatus?AppKey=${appKey}&User=${Currentuser}`;
    console.log('checking new poll ->', _url);
    return this.http.get(`${_url}`,
      { headers });
  }

  getTokenPadron() {

    // console.log('Token padron');
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('username', 'sys@clavisco.com')
      .set('password', 'ClvsP4d')
      .set('is_login', 'true');

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<any>(`${AppConstants.TokenPadron}token`, body.toString(), { headers })
      .pipe(map(user => {
        // login successful if there's a owin token in the response
        if (user && user.access_token) {
          // store user details and jwt token in local storage to keep user logged in between page refreshes
          this.storage.setTokenPadron(user);
          //this.currentUserSubject.next(user);
        }
        return user;
      }));

  }
   // funcion para limpiar datos cuando se cierra aplicacion desde la x
  // no recibe parametros
  logoutCloseApp() {
    // remove user from local storage to log user out
    this.storage.removeCurrentSession();
    this.currentUserSubject.next(null);
    // this.router.navigate(['/login']);
  }
 
}
