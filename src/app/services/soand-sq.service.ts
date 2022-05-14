import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StorageService } from './storage.service';
import { AppConstants, ISaleQuotation, ISaleOrderSearch, IPrinter } from '../models';
import { Observable, Subject, timer } from 'rxjs';
import { ISaleOrdersResponse, ISaleOrderResponse, ISaleQuotationsResponse, ISaleQuotationResponse } from '../models/responses';
import { retry, share, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NgBlockUI, BlockUI } from 'ng-block-ui';
import { SOAndSQActions } from './../../app/enum/enum';
import { IResponse } from '../models/i-api-response';
import { IDocument } from '../models/i-document';
@Injectable({
  providedIn: 'root'
})
export class SOAndSQService {

  //VARBOX
  @BlockUI() blockUI: NgBlockUI;

  private allCurrencies$: Observable<ISaleOrdersResponse>

  private stopPolling = new Subject();

  constructor(
    private httpClient: HttpClient,
    private storage: StorageService) {
    // this.allCurrencies$ = timer(0, 3000).pipe(
    //   switchMap(() => httpClient.get<ISaleOrdersResponse[]>('http://localhost:8000/currencyInfo')),
    //   retry(),
    //   tap(console.log),
    //   share(),
    //   takeUntil(this.stopPolling)
    // );
  }
  // getAllCurrencies(): Observable<ISaleOrdersResponse> {
  //   console.log(7);
  //     return this.allCurrencies$.pipe(
  //       tap(() => console.log('data sent to subscriber')));
  //}

  GetSaleOrders(searchModel_: ISaleOrderSearch): Observable<ISaleOrdersResponse> {
    //searchModel_.U_Almacen = this.storage.getBranchOffice().Code;
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetSaleOrders`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.post<ISaleOrdersResponse>(url, searchModel_, { headers });
  }

  GetSaleOrder(_docEntry: number): Observable<IResponse<IDocument>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetSaleOrder?DocEntry=${_docEntry}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.get<IResponse<IDocument>>(url, { headers });
  }

  GetSaleQuotations(searchModel_: ISaleOrderSearch): Observable<ISaleQuotationsResponse> {
    // searchModel_.U_Almacen = this.storage.getBranchOffice().Code;
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api//Documents/GetQuotations`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.post<ISaleQuotationsResponse>(url, searchModel_, { headers });
  }
  
  GetSaleQuotation(_docEntry: number): Observable<IResponse<IDocument>> {

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetQuotation?DocEntry=${_docEntry}&allLines=true`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.get<IResponse<IDocument>>(url, { headers });
  }

  GetSaleQuotationToCopy(_docEntry: number): Observable<IResponse<IDocument>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetQuotation?DocEntry=${_docEntry}&allLines=false`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.get<IResponse<IDocument>>(url, { headers });
  }
  //#obtener orden de venta
  GetSaleOrderToCopy(_docEntry: number):  Observable<IResponse<IDocument>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetSaleOrder?DocEntry=${_docEntry}&allLines=false`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.get<IResponse<IDocument>>(url, { headers });
  }

  //#documento base
  GetDocument(_docEntry: number,_documentType:number): Observable<IResponse<IDocument>> {
    let endPoint = '';     

    switch (_documentType) {
     
      case SOAndSQActions.EditQuotation:
        endPoint += `api/Documents/GetQuotation?DocEntry=${_docEntry}&allLines=true`;
        break;
      case SOAndSQActions.CopyToInvoice:
        endPoint += `api/Documents/GetSaleOrder?DocEntry=${_docEntry}&allLines=false`;  
        break;
      case SOAndSQActions.EditOrder:
        endPoint += `api/Documents/GetSaleOrder?DocEntry=${_docEntry}`;
        break; 
      case SOAndSQActions.CopyToOrder:
        endPoint += `api/Documents/GetQuotation?DocEntry=${_docEntry}&allLines=false`;
        break; 
    }

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}${endPoint}`;//api/Documents/GetSaleOrder?DocEntry=${_docEntry}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.get<IResponse<IDocument>>(url, { headers });
  }

}