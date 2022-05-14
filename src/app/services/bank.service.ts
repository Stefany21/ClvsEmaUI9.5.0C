import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// MODELOS
import { AppConstants, ICommitedTransaction, ITerminal, ITerminalByUser } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { IBaseResponse, ICommitedTransactionsResponse, ITerminalResponse, ITerminalsByUserResponse, ITerminalsResponse } from '../models/responses';
import { Observable } from 'rxjs';
import { IPPBalanceRequest } from '../models/i-ppbalance-request';
import { IResponse } from '../models/i-api-response';
import { IACQTransaction, PPBalance } from '../models/i-pp-transaction';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class BankService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
  }
  
  // funcion para obtener los bancos
  // no recibe parametros
  getAccountsBank() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/Banks/GetAccountsBank`,
      { headers });
  }

  getTerminals(): Observable<ITerminalsResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<ITerminalsResponse>(`${AppConstants.apiUrl}api/Banks/GetTerminals`,
      { headers });
  }

  getTerminal(_id: number): Observable<ITerminalResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<ITerminalResponse>(`${AppConstants.apiUrl}api/Banks/GetTerminal?id=${_id}`, { headers });
  }

  CreateTerminal(_terminal: ITerminal): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(`${AppConstants.apiUrl}api/Banks/CreateTerminal`, _terminal, { headers });
  }

  UpdateTerminal(_terminal: ITerminal): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(`${AppConstants.apiUrl}api/Banks/UpdateTerminal`, _terminal, { headers });
  }

  PreBalance(_balanceRequest: IPPBalanceRequest): Observable<IResponse<PPBalance>> {
    // const token = JSON.parse(this.storage.getCurrentSessionOffline());
    // const headers = new HttpHeaders({
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${token.access_token}`
    // });
    const ppURL = this.storage.GetUrlPinpad();
    return this.http.post<IResponse<PPBalance>>(`${ppURL}api/Banks/PreBalance`, _balanceRequest, {  });
  }

  SavePreBalance(_aCQTransaction: IACQTransaction ): Observable<IResponse<ICommitedTransaction[]>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IResponse<ICommitedTransaction[]>>(`${AppConstants.apiUrl}api/Banks/SavePreBalance`, _aCQTransaction, { headers });
  }

  GetRequestsFromRegisters(_balanceRequest: IPPBalanceRequest): Observable<IResponse<ICommitedTransaction[]>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IResponse<ICommitedTransaction[]>>(`${AppConstants.apiUrl}api/Banks/PreBalanceOnRegister`, _balanceRequest, { headers });
  }
  
  // Balance(_terminalId: number): Observable<ICommitedTransactionsResponse> {
  //   // const token = JSON.parse(this.storage.getCurrentSession());
  //   // const headers = new HttpHeaders({
  //   //   'Content-Type': 'application/json',
  //   //   'Authorization': `Bearer ${token.access_token}`
  //   // });
  //   const ppURL = this.storage.GetUrlPinpad()
  //   return this.http.get<ICommitedTransactionsResponse>(`${ppURL}api/Banks/Balance?terminalId=${_terminalId}`, {  });
  // }


  Balance(_terminal: ITerminal): Observable<IResponse<PPBalance>> {

    const ppURL = this.storage.GetUrlPinpad()
    return this.http.post<IResponse<PPBalance>>(`${ppURL}api/Banks/Balance`, _terminal, { });
  }





  SaveBalance(_aCQTransaction: IACQTransaction): Observable<IResponse<ICommitedTransaction[]>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IResponse<ICommitedTransaction[]>>(`${AppConstants.apiUrl}api/Banks/SaveBalance`, _aCQTransaction, { headers });
  }



  GetTerminalsByUser(_userId: string): Observable<ITerminalsByUserResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<ITerminalsByUserResponse>(`${AppConstants.apiUrl}api/Banks/GetTerminalsByUser?userId=${encodeURIComponent(_userId)}`,
      { headers });
  }

  UpdateTerminalsByUser(_terminalsByUser: ITerminalByUser[], _userId: string): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(`${AppConstants.apiUrl}api/Banks/UpdateTerminalsByUser`,
      {
        'UserId': _userId,
        'TerminalsByUser': _terminalsByUser
      },
      { headers });
  }
  GetTransactionsPinpadTotal(_terminalId: number) : Observable<IResponse<string>>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<string>>(`${AppConstants.apiUrl}api/Banks/GetTransactionsPinpadTotal?terminalId=${_terminalId}`, {  headers });
  }
}
