import { Injectable } from '@angular/core';

// SERVICIOS
import { StorageService } from './storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {AppConstants, IUdfTarget,  } from 'src/app/models/index';
import { ILine } from '../models/i-line';
@Injectable({
  providedIn: 'root'
})
export class GoodsReceiptStockService {

  constructor( private http: HttpClient,
    private storage: StorageService ) {
}
  // funcion para obtener la informacion de un producto en  SAP
  // recibe como parametro el codigo del producto
  GetItemChangePrice(lines: ILine[], pricelist: number) {
    const changePrice = {
      'ItemsList': lines,
      'priceList': pricelist
    };
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemChangePrice`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<any>(url, changePrice , { headers });
  }

GetAllPriceList() {
  const token = JSON.parse(this.storage.getCurrentSession());
  const url = `${AppConstants.apiUrl}api/Items/GetAllPriceList`;
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.access_token}`
  });
  return this.http.get<any>(url, { headers });
}


  // Edita un modelo     
  CreateGoodsReceiptStock(lines: ILine[], listPrecio: number, _comment: string, user: string, _GoodsReceiptAccount: string, mappedUdfs: IUdfTarget[], _documentID:string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/GoodsReceipt/CreateGoodsReceiptStock?PriceList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<any>(url,
      {
        'Lines': lines,
        'PriceList': listPrecio,
        'Comments': _comment,
        'UserId':user,
        'GoodsReceiptAccount':_GoodsReceiptAccount,
        'UdfTarget': mappedUdfs,
        'U_CLVS_POS_UniqueInvId':_documentID
      } , { headers });
  }
  
 // Edita un modelo  
 CreateGoodsIssueStock(lines: ILine[], Pricelist: number, _comment: string, mappedUdfs: IUdfTarget[],_documentID:string) {
  const token = JSON.parse(this.storage.getCurrentSession());
  const url = `${AppConstants.apiUrl}api/GoodsReceipt/CreateGoodsIssueStock`;
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.access_token}`
  });
  return this.http.post<any>(url, {
    'Lines': lines, 
    'PriceList': Pricelist,
    'Comments': _comment,
    'UdfTarget': mappedUdfs,
    'U_CLVS_POS_UniqueInvId':_documentID
    } , { headers });
}
  // Edita un modelo
  CreateGoodsReciptReturn(lines: ILine[], cardCode: string, cardName: string, LicTradNum: string, comment: string, numAtCard: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/GoodsReceipt/CreateGoodsReceiptReturn`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<any>(url, {
      'Lines': lines,
      'Comments': comment,
      'NumAtCard': numAtCard,
      'BusinessPartner': {
        'CardCode': cardCode,
        'CardName': cardName,
        'LicTradNum': LicTradNum
    }} , { headers });
  }
}
