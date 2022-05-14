import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

// MODELOS
import { AppConstants, IPPTransaction, IUdfTarget, ITerminal } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { Observable } from 'rxjs';
import { IBaseResponse, IPPTransactionResponse, IInvoicePaymentDetailResponse } from '../models/responses';
import { IInvoicePaymentDetail } from '../models/i-invoice-payment-detail';
import { CurrencyPP } from '../models/constantes';
import { IResponse } from '../models/i-api-response';

// PIPES

@Injectable({
  providedIn: 'root'
})
export class PaymentService {


  constructor(private http: HttpClient,
    private storage: StorageService) {
  }

  // funcion para obtener los parametros de la vista de facturacion
  // no recibe parametros
  getPayInvoices(searchForm: FormGroup) {

    const code = searchForm.value.customer.split(' - ')[0];

    const view = 1;
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/Payment/GetPayInvoices?CardCode=${code}&Sede=${searchForm.value.sede}&Currency=${searchForm.value.currency}`,
      { headers });
  }
  // funcion para obtener los parametros de la vista de facturacion
  // no recibe parametros
  getPayApInvoices(searchForm: FormGroup) {
    const code = searchForm.value.supplier.split(' - ')[0];
    const view = 1;
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(`${AppConstants.apiUrl}api/Payment/GetPayApInvoices?CardCode=${code}&Sede=${searchForm.value.sede}&Currency=${searchForm.value.currency}`,
      { headers });
  }
  // funcion para crear un pago
  // parametros el modelo de pago
  createPayInvoices(Payments: any, pagocuenta: boolean, _udfs: IUdfTarget[]) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    const url = `${AppConstants.apiUrl}api/Documents/CreatePaymentRecived`;

    return this.http.post(url,
      {
        ...Payments,
        'isPayAccount': pagocuenta,
        'UdfTarget': _udfs

      },
      { headers }
    );
  }

  // funcion para crear un pago
  // parametros el modelo de pago
  createPayApInvoices(Payments: any, _udfs: IUdfTarget[]) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    const url = `${AppConstants.apiUrl}api/Documents/CreatePayApInvoices`;
    return this.http.post(url,
      {
        ...Payments,
        'UdfTarget': _udfs
      },
      { headers });
  }
  // obtiene la lista de facturas
  // parametros modelo con al informacion que se necesita para buscar los documentos
  getInvList(InfoSearch: any) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Payment/GetPaymentList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,
      InfoSearch,
      { headers });
  }
  // envia el pago a anular
  // parametros modelo de pago con la informacion de la factura a cancelar
  CancelPayment(Payments: any) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    const url = `${AppConstants.apiUrl}api/Payment/CancelPayment`;

    return this.http.post(url,
      Payments,
      { headers }
    );
  }

  requestPinPadPayment(_amount: number, _uniqueInvCode: string, _currencyPayment: string, invoiceDocument: string, _bacId: string, _userPrefix: string
    , _terminalId: string, CardName: string, ExpirationDate: string, _terminal: ITerminal): Observable<IResponse<IPPTransaction>> {

    const ppURL = this.storage.GetUrlPinpad();

    const url = `${ppURL}api/Payment/RequestPinPadPayment`; 

    return this.http.post<IResponse<IPPTransaction>>(url, {
      'Amount': _amount,
      'InvoiceNumber': _uniqueInvCode,
      'BacId': _bacId,
      'UserPrefix': _userPrefix,
      'Currency': _currencyPayment == 'COL' ? CurrencyPP.LOCAL_CURRENCY : CurrencyPP.USD,
      'InvoiceDocument': invoiceDocument,
      'TerminalId': _terminalId,
      'Terminal': _terminal,
      'CardName': CardName,
      'ExpirationDate': ExpirationDate
    }, {});
  }

  updatePinPadPayment(_pinPadCards: IPPTransaction[]): Observable<IPPTransactionResponse> {
    // const token = JSON.parse(this.storage.getCurrentSessionOffline());
    // const headers = new HttpHeaders({
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${token.access_token}`
    // });

    const ppURL = this.storage.GetUrlPinpad();

    const url = `${ppURL}api/Payment/UpdatePinPadPayment`;

    return this.http.post<IPPTransactionResponse>(url,
      _pinPadCards,
      {}
    );
  }

  GetCommitedPPCards(_documentKey: string): Observable<IResponse<IPPTransaction[]>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    const url = `${AppConstants.apiUrl}api/Payment/GetPPTransactionByDocumentKey?_documentKey=${_documentKey}`;

    return this.http.get<IResponse<IPPTransaction[]>>(url, { headers });
  }

  CheckTransactionBalanceStatus(_docEntry: number): Observable<IResponse<IPPTransaction[]>> {
    // const token = JSON.parse(this.storage.getCurrentSession());
    // const headers = new HttpHeaders({
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${token.access_token}`
    // });

    const ppURL = this.storage.GetUrlPinpad();
    const url = `${ppURL}api/Payment/GetTransactionsByDocEntry?_docEntry=${_docEntry}`;

    return this.http.get<IResponse<IPPTransaction[]>>(url, {  });
  }

  // cancelPinPadCards(_paymentDetail: IInvoicePaymentDetail): Observable<BaseResponse> {
  //   // const token = JSON.parse(this.storage.getCurrentSessionOffline());
  //   // const headers = new HttpHeaders({
  //   //   'Content-Type': 'application/json',
  //   //   'Authorization': `Bearer ${token.access_token}`
  //   // });
  //   const ppURL = this.storage.GetUrlPinpad();
    
  //   const url = `${ppURL}api/Payment/CancelPinPadCards`;

  //   return this.http.post<BaseResponse>(url, _paymentDetail, { }
  //   );
  // }

  cancelPinPadCard(_pPTransaction: IPPTransaction): Observable<IResponse<IPPTransaction>> {
    // const token = JSON.parse(this.storage.getCurrentSessionOffline());
    // const headers = new HttpHeaders({
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${token.access_token}`
    // });

    const ppURL = this.storage.GetUrlPinpad();
    
    const url = `${ppURL}api/Payment/CancelCard`;

    return this.http.post<IResponse<IPPTransaction>>(url, _pPTransaction, { }
    );
  }

  CommitCanceledCard(_pPTransaction: IPPTransaction, _terminal: ITerminal, _rawData: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    const url = `${AppConstants.apiUrl}api/Payment/CommitCanceledCard`;

    _pPTransaction.Terminal = _terminal;

    _pPTransaction.TerminalId = _terminal.Id;

    const M_OBJECT = {
      Transaction: _pPTransaction,
      Terminal: _terminal,
      RawData: _rawData,
      UserPrefix: token.UserName
    };

    return this.http.post<IResponse<IPPTransaction>>(url, M_OBJECT, { headers });
  }

  getPaymentDetail(_docNum: number): Observable<IInvoicePaymentDetailResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    const url = `${AppConstants.apiUrl}api/Payment/GetInvoicePaymentDetail?_docEntry=${_docNum}`;

    return this.http.get<IInvoicePaymentDetailResponse>(url, { headers });
  }

  GetPPTransactionByInvoiceNumber(_invoiceNumber: string): Observable<IResponse<IPPTransaction>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    const url = `${AppConstants.apiUrl}api/Payment/GetPPTransactionByInvoiceNumber?_documentKey=${_invoiceNumber}`;

    return this.http.get<IResponse<IPPTransaction>>(url, {headers});
  }
}
