import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthenticationService } from './index';
import { AlertService } from './alert.service';

@Injectable()  
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private authenticationService: AuthenticationService
    , private alertService: AlertService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // console.error('net status', navigator.onLine);
        return next.handle(request).pipe(catchError(err => {
            
            if (err.status === 401) { // unauthorized
                this.authenticationService.logout();
                try {
                    const PARSED_ERROR = JSON.stringify(err);
                    this.alertService.errorAlert(`ERROR: ${PARSED_ERROR}`);
                } 
                catch (error) {
                    console.log(error);
                }
            }
            if (err.status === 500) { // Internal error server
                return throwError(err);    
            }
            // const error = err.error.message || err.statusText;
            const error = err.error.error_description || err.error.error || err.error.message || err.statusText;
            return throwError(error);
        }));
    }
}
