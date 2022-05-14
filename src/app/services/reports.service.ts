import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

// MODELOS
import { AppConstants, IPPTransaction } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { ReportsResponse, FileResponse, IPPReportResponse, IBaseResponse } from '../models/responses';
import { Observable } from 'rxjs';
import { ITransactionPrint } from '../models/i-transaction-print';
import { IResponse } from '../models/i-api-response';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
 
  constructor(private http: HttpClient,
    private storage: StorageService) {
    // console.log(0);
  } 
  // funcion para obtener el reporte del inventario
  // recive el for group que tiene la informacion de los parametros que ocupa el reporte.
  printInventory(PrintInventory: any):Observable<IResponse<string>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Report/PrintInventory`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IResponse<string>>(url,
      PrintInventory,
      { headers }
    );

  }
  // funcion para obtener el reporte impresion
  printReport(DocEntry: number, reportType: number): Observable<IResponse<string>>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Report/PrintReport?DocEntry=${DocEntry}&ReportType=${reportType}`;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<string>>(url, { headers });
  }

  PrintReportPP(_iTransactionPrint: ITransactionPrint): Observable<IPPReportResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Report/PrintReportPP`;
     
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token.access_token}`
    });
    
    return this.http.post<IPPReportResponse>(url, _iTransactionPrint, { headers });
  }

  PrintVoucher(_pTransaction: IPPTransaction) : Observable<IResponse<string>>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Report/PrintVoucher`;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IResponse<string>>(url,
      {
        "SaleAmount":_pTransaction.Amount,// (+_pTransaction.Amount).toFixed(2),
        "AuthorizationNumber": _pTransaction.AuthorizationNumber,
        "CreationDate": _pTransaction.CreationDate,
        "ReferenceNumber": _pTransaction.ReferenceNumber,
        "SystemTrace": _pTransaction.SystemTrace,
        "TransactionId": _pTransaction.TransactionId
      }, { headers });
  }

  printBalanceReport(BalanceModel: any):Observable<FileResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Report/GetBalanceReport`;
    const headers = new HttpHeaders({
      'responseType': 'blob',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<FileResponse>(url, BalanceModel, { headers });
  }

  printARInvoiceCopy(DocEntry: number, reportType: number): Observable<IResponse<string>>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Report/GetARInvCopyReport?DocEntry=${DocEntry}&ReportType=${reportType}`;
    const headers = new HttpHeaders({
      'responseType': 'blob',
      'Authorization': `Bearer ${token.access_token}`  
    });
    return this.http.get<IResponse<string>>(url, { headers });

  }
  sendDocument(DocumentModel: any):Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Mails/CreatePDFToSendMail`;
    const headers = new HttpHeaders({
      'responseType': 'blob',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(url, DocumentModel, { headers });
  }
  SendWhatsappDocument(DocumentModel: any) {
    console.log(DocumentModel);
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Mails/CreatePDFToSendWhatsapp`;
    const headers = new HttpHeaders({
      'responseType': 'blob',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, DocumentModel, { headers });
  }

  getnamePdf(DocumentModel: any) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Mails/DownloadPDF`;
    const headers = new HttpHeaders({
      'responseType': 'blob',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, DocumentModel, { headers });
  }

  getReports():Observable<ReportsResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'responseType': 'blob',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.get<ReportsResponse>(`${AppConstants.apiUrl}api/Report/GetReports`, { headers });
  }

  downloadReportFile(reportKey: number) : Observable<FileResponse>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'responseType': 'blob',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.get<FileResponse>(`${AppConstants.apiUrl}api/Report/downloadReportFile?reportKey=${reportKey}`, { headers });
  }


}
