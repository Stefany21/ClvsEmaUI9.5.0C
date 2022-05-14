import { Injectable } from '@angular/core';

// SERVICIOS
import { StorageService } from './storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppConstants, BaseResponse, IUdfTarget } from 'src/app/models/index';
import { ILine } from '../models/i-line';
import { Observable } from 'rxjs';
import { IResponse } from '../models/i-api-response';
@Injectable({
  providedIn: 'root'
})
export class GoodsReciptService {

  constructor(private http: HttpClient,
    private storage: StorageService) {
  }

  // Edita un modelo
  CreateGoodsRecipt(lines: ILine[], cardCode: string, cardName: string, LicTradNum: string, _comment: string, mappedUdfs: IUdfTarget[], uniqueDocumentID: string) {

    const TOKEN = JSON.parse(this.storage.getCurrentSession());
    const URL = `${AppConstants.apiUrl}api/GoodsReceipt/CreateGoodsReceipt`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN.access_token}`
    });
    return this.http.post<any>(URL, {
      'Lines': lines,
      'Comments': _comment,
      'BusinessPartner': {
        'CardCode': cardCode,
        'CardName': cardName,
        'LicTradNum': LicTradNum,
      },
      'U_CLVS_POS_UniqueInvId': uniqueDocumentID,
      'UdfTarget': mappedUdfs
    }, { headers });
  }

  // Edita un modelo
  CreateGoodsReciptReturn(lines: ILine[], cardCode: string, cardName: string, LicTradNum: string, comment: string, numAtCard: string, mappedUdfs: IUdfTarget[], IdDocument: string, _accoount: string) {
    const TOKEN = JSON.parse(this.storage.getCurrentSession());
    const URL = `${AppConstants.apiUrl}api/GoodsReceipt/CreateGoodsReceiptReturn`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN.access_token}`
    });
    return this.http.post<any>(URL, {
      'Lines': lines,
      'Comments': comment,
      'NumAtCard': numAtCard,
      'BusinessPartner': {
        'CardCode': cardCode,
        'CardName': cardName,
        'LicTradNum': LicTradNum
      },
      'U_CLVS_POS_UniqueInvId': IdDocument,
      'GoodsReceiptAccount': _accoount,
      'UdfTarget': mappedUdfs
    }, { headers });
  }

  CreateGoodsReciptXml(_data: FormData) {


    const TOKEN = JSON.parse(this.storage.getCurrentSession());
    const URL = `${AppConstants.apiUrl}api/GoodsReceipt/CreateGoodsReciptXml`;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${TOKEN.access_token}`
    });
     return this.http.post<any> (URL, _data, {headers});

  //   let headers = new HttpHeaders();

  //   headers.append('Content-Type', 'application/json');
  //   headers.append(`Authorization`, `Bearer ${TOKEN.access_token}`);

  //   const httpOptions = {
  //     headers: headers
  //   };

  //   return this.http.post<any>(URL, _data, httpOptions);





  }

}
