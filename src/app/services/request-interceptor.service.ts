import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AppConstants, IToken } from '../models';
import { StorageService } from './storage.service';
import { TokenService } from './token.service';

@Injectable()
export class RequestInterceptorService implements HttpInterceptor {

  constructor(
    private storageService: StorageService, private tokenService: TokenService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const USER_SESSION = JSON.parse(this.storageService.getCurrentSession());

    if (request.url.endsWith('Json')) return next.handle(request);
    const URL_ = new URL(request.url);

    if (URL_.pathname.includes('token')) return next.handle(request);

    if (USER_SESSION !== null && USER_SESSION['.expires'] !== undefined) {
      const EXPIRATION_DATE = new Date(USER_SESSION['.expires']);
      const CURRENT_DATE = new Date();

      const MINUTES_TO_EXPIRE = 10;

      let MINUTES_LEFT = ((EXPIRATION_DATE.getTime() - CURRENT_DATE.getTime()) / 60000);

      if (MINUTES_LEFT <= MINUTES_TO_EXPIRE && MINUTES_LEFT > 0) { // La sesion esta a punto de terminar
        this.tokenService.iToken.next({
          IsSessionExpired: false,
          IsRequiredToken: true
        } as IToken
        );

      }
    }
    //001                                                

    // Asi estaba antes de la unificacion de CRMarine
    // if (this.storageService.GetUrlOffline().includes(URL_.hostname)) {
    //   const OFFLINE_SESSION = JSON.parse(this.storageService.getCurrentSessionOffline());
    //   let CLONED_REQUEST = null;
    //   if (URL_.pathname === '/') return next.handle(request);
    //   if (OFFLINE_SESSION && OFFLINE_SESSION.access_token && JSON.parse(this.storageService.getSession(false))) {
    //     CLONED_REQUEST = request.clone({
    //       headers: request.headers.set('Authorization', `Bearer ${OFFLINE_SESSION.access_token}`)
    //     });
    //   }
    //   else {
    //     const BODY = {
    //       errorInfo: {
    //         Code: 401,
    //         Message: 'No existen credenciales guardados, intentando recuperarlos...'
    //       }
    //     };
    //     return of(new HttpResponse(
    //       { status: 500, body: BODY }
    //     ));
    //   }
    //   return next.handle(CLONED_REQUEST);
    // }
      
    //Cambio por unificacion de CRMarine es la validacion actual que se usa.
    if (this.storageService.GetUrlOffline().includes(URL_.hostname)) {
      const OFFLINE_SESSION = JSON.parse(this.storageService.getCurrentSessionOffline());
      let CLONED_REQUEST = null;
      if (URL_.pathname === '/') return next.handle(request);
      CLONED_REQUEST = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${OFFLINE_SESSION.access_token}`)
      });
      return next.handle(CLONED_REQUEST);
    }

    // Aqui se setean las credenciales de offline si estamos trabajando en dicho modo.
    if (this.storageService.getConnectionType()) {
      const OFFLINE_SESSION = JSON.parse(this.storageService.getCurrentSessionOffline());
      let CLONED_REQUEST = null;
      if (OFFLINE_SESSION && OFFLINE_SESSION.access_token && URL_.host !== 'padronapi.clavisco.com') {
        const TARGET = `${(AppConstants.getOffLine()).slice(0, -1)}${URL_.pathname}${URL_.search}`;
        CLONED_REQUEST = request.clone({
          url: TARGET,
          headers: request.headers.set('Authorization', `Bearer ${OFFLINE_SESSION.access_token}`)
        });
      }
      else {
        const BODY = {
          errorInfo: {
            Code: 401,
            Message: 'No existen credenciales guardados, intentando recuperarlos...'
          }
        };
        return of(new HttpResponse(
          { status: 500, body: BODY }
        ));
      }
      return next.handle(CLONED_REQUEST);
    } else {
      // Validacion para cuando estemos trabajando online pero no haya internet
      if (!navigator.onLine) {
        const BODY = { errorInfo: { Code: 404, Message: 'No se pudo conectar con el servidor, verifique su conexión' } };
        return of(new HttpResponse({ status: 404, body: BODY }));
      }
    }

    return next.handle(request);
  }
}
