import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})  
export class RouterExtServiceService {
  private previousUrl: string = undefined;
  private currentUrl: string = undefined;
  public fromGoodReceipt: boolean = false;
  constructor(private router: Router) {
    this.currentUrl = this.router.url;
    router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.previousUrl = this.currentUrl;
        this.currentUrl = event.url;
      };
    });
  }

  public getCurrentUrl(): string {
    return this.currentUrl;
  }



  public getPreviousUrl(): string {
    return this.previousUrl;
  }
}
