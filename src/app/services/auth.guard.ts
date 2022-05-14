import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CommonService } from './common.service';
import { AuthenticationService } from './index';
import { StorageService } from './storage.service';


@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(       
        private router: Router,
        private storageService: StorageService,
        private commonService: CommonService,
        private authenticationService: AuthenticationService
    ) {   
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const currentUser = this.authenticationService.currentUserValue;
        if (currentUser) {
            // authorised so return true
            return true;
        }
        this.commonService.hasDocument.next(``);
        this.storageService.SaveBreadCrum(``);
        this.storageService.SaveDocEntry(-1);
        // not logged in so redirect to login page with the return url
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
        return false;
    }
}
