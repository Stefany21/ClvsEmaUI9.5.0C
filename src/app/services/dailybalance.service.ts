import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FileResponse} from '../models/responses';
import { AppConstants, BaseResponse, PaydeskBalance, CashflowModel,CashflowReasonModel} from './../models/index';
import { IResponse } from '../models/i-api-response';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'   
}) 
export class DailybalanceService {
 
  constructor(private http: HttpClient,
    private storage: StorageService) { }

  GetPaydeskBalance(balanceDate:string) : Observable<FileResponse>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.get<FileResponse>(`${AppConstants.apiUrl}api/Paydesk/GetPaydeskBalance?creationDate=${balanceDate}`,
      { headers }
    );
  } 

  PostPaydeskBalance(paydeskBalance: PaydeskBalance): Observable<FileResponse>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.post<FileResponse>(`${AppConstants.apiUrl}api/Paydesk/PostPaydeskBalance`, paydeskBalance,
      { headers }
    );
  }

  PostCashflow(moneyOut: CashflowModel): Observable<BaseResponse>{
    const TOKEN = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN.access_token}`
    });

    return this.http.post<BaseResponse>(`${AppConstants.apiUrl}api/Paydesk/PostCashflow`,
      moneyOut,
      { headers }
    );
  }

  GetCashflowReasons(): Observable<IResponse<CashflowReasonModel[]>> {
    const TOKEN = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN.access_token}`
    });

    return this.http.get<IResponse<CashflowReasonModel[]>>(`${AppConstants.apiUrl}api/Paydesk/GetCashflowReasons`,
      { headers }
    );
  }

}
