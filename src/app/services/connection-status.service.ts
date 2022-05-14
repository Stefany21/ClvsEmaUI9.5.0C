import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class ConnectionStatusService {

ConnectionStatusMsg:Subject<string>;

  constructor() {
  this.ConnectionStatusMsg = new Subject();
   }
}
