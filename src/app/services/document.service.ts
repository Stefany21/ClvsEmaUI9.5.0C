import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

// MODELOS
import { AppConstants, IDocumentLine, IDocumentSaleLine, ISaleOrder, IUdf, IUdfTarget } from './../models/index';
import { SOAndSQActions } from './../../app/enum/enum';


// RUTAS
// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { Observable } from 'rxjs';
import { IInvoiceTypeResponse, IPPTransactionsResponse } from '../models/responses';
import { CreateInvoice, DocumentModel } from '../models/i-invoice-document';
import { IResponse } from '../models/i-api-response';
import { IQuotDocument, ISaleDocument } from '../models/i-document';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  constructor(private http: HttpClient,
    private storage: StorageService) {

  }
  // funcion para enviar la informacion de una orden de venta a SAP
  // recibe como parametro el formulario del cliente, la lista de items
  CreateSaleOrder(_SaleOrder: ISaleDocument) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/CreateSaleOrder`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,
      _SaleOrder,
      { headers }
    );
  }



  //Actualizar Orden de venta
  // UpdateCreateSaleOrder(header: FormGroup, itemsList: any, FeData: FormGroup, Comentario: string, baseLines: IDocumentLine[]) {
  UpdateSaleOrder(_SaleOrder: ISaleDocument) {
    _SaleOrder.DocEntry = this.storage.GetDocEntry();  
       
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/UpdateSaleOrder`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,
      _SaleOrder,
      { headers }
    );
  }

  // funcion para enviar la informacion de una factura a SAP
  // recibe como parametro el formulario del cliente, la lista de items
  CreateQuotation(_Quotation: DocumentModel) {

    // const linesList: any[] = [];
    // itemsList.forEach(element => {
    //   if (element.ItemCode !== '') {
    //     element.ItemCode = element.ItemCode.split('-')[0].trim();
    //     linesList.push(element);
    //   }
    // });

    // const Quotation = {
    //   'U_Online': '0',
    //   'PayTerms': header.value.PayTerms,
    //   'QuotationsLinesList': linesList,
    //   'CardCode': header.value.cardCode,
    //   'CardName': header.value.cardName,
    //   'Currency': header.value.currency,
    //   'Comment': header.value.Comment,
    //   'SlpCode': header.value.SlpList,
    //   'DocumentType': header.value.DocumentType,
    //   "IdType": (FeData.value.IdType != null) ? FeData.value.IdType : 99,
    //   "Identification": FeData.value.Identification,
    //   "Email": FeData.value.Email,
    //   'U_ObservacionFE': FeData.value.ObservacionFE,
    //   'UdfTarget': _udfs
    // };

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/CreateQuotation`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.post(url,
      _Quotation,
      { headers }
    );
  }
  UpdateQuotation(_Quotation: DocumentModel) {

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/UpdateQuotation`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,
      _Quotation,
      { headers }
    );
  }

  GetInvList(inv: any) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetInvPrintList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, inv, { headers });
  }


  GetInvBalanceList(BalanceModel: any) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetBalanceInvoices_UsrOrTime`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, BalanceModel, { headers });
  }



  CreateInvoice(createInvoice: CreateInvoice ) {
    /*IMPORTANTE
      El formato que vamos a usar para la creacion de uniqueInvCode es

      eeeddmmyyyyhhmmss

      en donde:

      eee = estacion
      dd = dia
      mm = mes
      yyyy = annio
      hh = hora
      mm = minuto
      ss = segundo
    */

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/CreateInvoice`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, createInvoice, { headers });
  }


  CreateapInvoice(Invo: FormGroup, Payment: any, InvoLines: any, feForm: FormGroup, _udfs: IUdfTarget[],uniqueInvCode:string) {

    // let invoiceId = new Date();
    // let dateTime = new Date();
    // let dateString = dateTime.toLocaleDateString();
    // let hrs = dateTime.getHours();
    // let min = dateTime.getMinutes();
    // let milli = dateTime.getMilliseconds();
    // let uniqueInvCode = `${Invo.value.cardCode}_${dateString}_${hrs}${min}_${milli}`;

    const linesList: any[] = [];
    InvoLines.forEach(element => {
      if (element.ItemCode !== '') {
        element.ItemCode = element.ItemCode.split('-')[0].trim();
        linesList.push(element);
      }
    });
    let FE = {
      'IdType': feForm.value.IdType,
      'Email': feForm.value.Email,
      'Identification': feForm.value.Identification
    }
    const Invoice = {
      'InvoiceLinesList': linesList,
      'DocumentType': Invo.value.DocumentType,
      'CardCode': Invo.value.cardCode,
      'CardName': Invo.value.cardName,
      'DocCurrency': Invo.value.currency,
      'PaymentGroupCode': Invo.value.PayTerms,
      'Comments': Invo.value.Comment,
      'SalesPersonCode': Invo.value.SlpList,
      'FEInfo': FE,
      'CLVS_POS_UniqueInvId': uniqueInvCode,
      'UdfTarget': _udfs
    };
    const createInvoice = {
      'Invoice': Invoice,
      'Payment': Payment
    };


    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/CreateapInvoice`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, createInvoice, { headers });
  }

  createInvOnline(Invo: FormGroup, Payment: any, InvoLines: any, feForm: FormGroup, Clave: string, Consecutivo: string) {

    const linesList: any[] = [];
    InvoLines.forEach(element => {
      if (element.ItemCode !== '') {
        element.ItemCode = element.ItemCode.split('-')[0].trim();
        linesList.push(element);
      }
    });
    let FE = {
      'IdType': feForm.value.IdType,
      'Email': feForm.value.Email,
      'Provincia': feForm.value.Provincia,
      'Canton': feForm.value.Canton,
      'Distrito': feForm.value.Distrito,
      'Barrio': feForm.value.Barrio,
      'Direccion': feForm.value.Direccion,
      'Identification': feForm.value.Identification
    }
    const Invoice = {
      'InvoiceLinesList': linesList,
      'CardCode': Invo.value.cardCode,
      'CardName': Invo.value.cardName,
      'Currency': Invo.value.currency,
      'PayTerms': Invo.value.PayTerms,
      'Comment': Invo.value.Comment,
      'SlpCode': Invo.value.SlpList,
      'U_ClaveFe': Clave,
      'U_NumFE': Consecutivo,
      'FEInfo': FE

    };
    const createInvoice = {
      'Invoice': Invoice,
      'Payment': Payment
    };

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.onlineUrl}api/Documents/CreateInvoice`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, createInvoice, { headers });
  }

  CreateInvoiceNc(Invo: FormGroup, Payment: any, InvoLines: any, feForm: FormGroup, _udfs: IUdfTarget[],uniqueInvCode:string, _userCurr : string) {

    // let invoiceId = new Date();
    // let dateTime = new Date();
    // let dateString = dateTime.toLocaleDateString();
    // let hrs = dateTime.getHours();
    // let min = dateTime.getMinutes();
    // let milli = dateTime.getMilliseconds();
    // let uniqueInvCode = `${Invo.value.cardCode}_${dateString}_${hrs}${min}_${milli}`;

    const linesList: any[] = [];
    InvoLines.forEach(element => {
      if (element.ItemCode !== '') {
        element.ItemCode = element.ItemCode.split('-')[0].trim();
        linesList.push(element);
      }
    });
    let FE = {
      'IdType': feForm.value.IdType,
      'Email': feForm.value.Email,
      'Identification': feForm.value.Identification
    }
    const Invoice = {
      'InvoiceLinesList': linesList,
      'CardCode': Invo.value.cardCode,
      'CardName': Invo.value.cardName,
      'DocCurrency': _userCurr,
      'PaymentGroupCode': Invo.value.PayTerms,
      'Comments': Invo.value.Comment,
      'SalesPersonCode': Invo.value.SlpList,
      'NumAtCard': Invo.value.NumAtCard,
      'FEInfo': FE,
      'CLVS_POS_UniqueInvId': uniqueInvCode,
      'UdfTarget': _udfs
    };
    const createInvoice = {
      'Invoice': Invoice,
      'Payment': Payment
    };

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/CreateInvoiceNc`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, createInvoice, { headers });
  }

  getMaxDiscout() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/getDiscount`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
  

  DeleteOffLineInvoice(Id: number) {
    const IdModel = {
      'Id': Id,
    };
    const token = JSON.parse(this.storage.getCurrentSessionOffline());
    const url = `${this.storage.GetUrlOffline()}api/Documents/DeleteOffLineInvoice`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url, IdModel, { headers });
  }

  GetInvoiceTypes(): Observable<IInvoiceTypeResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/GetInvoiceTypes`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.get<IInvoiceTypeResponse>(url, { headers });
  }

  GetPPTransactionCenceledStatus(inv: any): Observable<IPPTransactionsResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Payment/GetPPTransactionCenceledStatus`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IPPTransactionsResponse>(url, inv, { headers });
  }  
   
  PostDocumentSaleOrder(_saleDocument: ISaleDocument): Observable<IResponse<ISaleDocument>>{
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/CreateSaleOrder`; //api/Documents/UpdateQuotation;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });  

    return this.http.post<IResponse<ISaleDocument>>(url,
      _saleDocument,
      { headers }
    );
  }
  // PostUpdateSaleOrder(_saleDocument: ISaleDocument): Observable<ApiResponse<ISaleDocument>>{
  //   const token = JSON.parse(this.storage.getCurrentSession());
  //   const url = `${AppConstants.apiUrl}api/Documents/UpdateSaleOrder`; //api/Documents/UpdateQuotation;
  //   const headers = new HttpHeaders({
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${token.access_token}`
  //   });  

  //   return this.http.post<ApiResponse<ISaleDocument>>(url,
  //     _saleDocument,
  //     { headers }
  //   );
  // }
  PostDocumentQuotation(_saleDocument: IQuotDocument): Observable<IResponse<IQuotDocument>>{
   
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/CreateQuotation`; 
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });  

    return this.http.post<IResponse<IQuotDocument>>(url,
      _saleDocument,
      { headers }
    );
  }

  // PostUpdateQuotation(_saleDocument: IQuotDocument): Observable<ApiResponse<IQuotDocument>>{
   
  //   const token = JSON.parse(this.storage.getCurrentSession());
  //   const url = `${AppConstants.apiUrl}api/Documents/UpdateQuotation`; 
  //   const headers = new HttpHeaders({
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${token.access_token}`
  //   });  

  //   return this.http.post<ApiResponse<IQuotDocument>>(url,
  //     _saleDocument,
  //     { headers }
  //   );
  // }

  PostUpdateQuotation(_saleDocument: IQuotDocument) {

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/UpdateQuotationDIAPI`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,
      _saleDocument,
      { headers }
    );
  }

  PostUpdateSaleOrder(_SaleOrder: ISaleDocument) {
    _SaleOrder.DocEntry = this.storage.GetDocEntry();  
       
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Documents/UpdateSaleOrderDIAPI`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,
      _SaleOrder,
      { headers }
    );
  }

}
  