import { Injectable } from '@angular/core';

// SERVICIOS
import { StorageService } from './storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppConstants, IUdfTarget } from '../models';
import { ILine } from '../models/i-line';
import { IPurchaseOrderResponse } from '../models/responses';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {

  constructor(private http: HttpClient,
    private storage: StorageService) { }

  // Edita un modelo
  CreatePurchaseOrder(lines: ILine[], cardCode: string, cardName: string, LicTradNum: string, _comment: string, mappedUdfs: IUdfTarget[], _documentID: string): Observable<IPurchaseOrderResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/PurchaseOrder/CreatePurchaseOrder`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IPurchaseOrderResponse>(url, {
      'Lines': lines,
      'Comments': _comment,
      'BusinessPartner': {
        'CardCode': cardCode,
        'CardName': cardName,
        'LicTradNum': LicTradNum
      }, 'UdfTarget': mappedUdfs,
      'U_CLVS_POS_UniqueInvId': _documentID
    }, { headers });
  }

  // Edita un modelo
  UpdatePurchaseOrder(lines: ILine[], cardCode: string, cardName: string, LicTradNum: string, comment: string, numAtCard: string, _docNum: number, mappedUdfs: IUdfTarget[]): Observable<IPurchaseOrderResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/PurchaseOrder/UpdatePurchaseOrder`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IPurchaseOrderResponse>(url, {
      'DocNum': _docNum,
      'Lines': lines,
      'Comments': comment,
      'NumAtCard': numAtCard,
      'BusinessPartner': {
        'CardCode': cardCode,
        'CardName': cardName,
        'LicTradNum': LicTradNum
      },
      'UdfTarget': mappedUdfs
    }, { headers });
  }

  // Edita un modelo
  GetPurchaseOrder(_docNum: number): Observable<IPurchaseOrderResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/PurchaseOrder/GetPurchaseOrder?_docNum=${_docNum}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IPurchaseOrderResponse>(url, { headers });
  }
  //Obtiene orden de compra por fecha
  getPurchaseorderList(InfoSearch: any) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/PurchaseOrder/GetPurchaseOrderList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,
      InfoSearch,
      { headers });
  }
}
