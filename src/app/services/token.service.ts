import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IToken } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  iToken: Subject<IToken>;

  constructor() {
    this.iToken = new Subject();
  }
}
