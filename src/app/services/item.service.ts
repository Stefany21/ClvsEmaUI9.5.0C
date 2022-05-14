import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// MODELOS
import { AppConstants, IItemModel } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { ILine } from '../models/i-line';
import { Observable } from 'rxjs';
import { IIPriceResponse } from '../models/responses';
import { IResponse } from '../models/i-api-response';
import { SOAndSQActions } from '../enum/enum';
import { DOCUMENT_TYPES } from '../models/constantes';

// PI ES

@Injectable({
  providedIn: 'root'
})
export class ItemService {






  // readonly apiUrl = 'http://localhost:50001/api/';

  hasLines: boolean;
  private lines: ILine[];

  constructor(private http: HttpClient,
    private storage: StorageService) {
  }

  GetDataForGoodReceiptInvocie(ItemCodes: string[],WhsCode:string) {

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemDataForGoodReceiptInvoice?WhsCode=${WhsCode}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IResponse<any>>(url,ItemCodes, { headers });
  }


  GetItemLastPrice(Item: any): any {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemLastPurchagePrice?ItemCode=${Item}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<any>>(url, { headers });
  }



  GetItemAVGPrice(Item: string): any {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemAVGPrice?ItemCode=${Item}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<any>>(url, { headers });
  }





  // funcion para obtener los items desde SAP
  // no recibe parametros
  GetItems() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemNames`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  GetPayTerms() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetPayTermsList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  GetPriceList() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetPriceList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  GetPriceListDefault(_cardCode: string): Observable<IIPriceResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetDefaultPriceList?cardCode=${_cardCode}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IIPriceResponse>(url, { headers });
  }

  GetCurrentDocumentType(): string {
    switch (this.storage.GetDocumentType()) {
      case SOAndSQActions.EditOrder:
      case SOAndSQActions.CopyToOrder:
      case SOAndSQActions.CreateSaleOrder:
        return DOCUMENT_TYPES[3];
        break;
      case SOAndSQActions.EditQuotation:
      case SOAndSQActions.CreateQuotation:
        return DOCUMENT_TYPES[4];
        break;
      case SOAndSQActions.CreateInvoice:
      case SOAndSQActions.CopyToInvoice:
        return DOCUMENT_TYPES[1];
        break;
    }

    return "NOT FOUND DOCUMENT"
  }

  // funcion para obtener la informacion de un producto en  SAP
  // recibe como parametro el codigo del producto
  GetItemByItemCode(itemCode: string, priceList: number, _cardCode: string = 'hardcoded') {
    let session = this.storage.getSession(true);
    let whCode:string;
    if (session) {
      session = JSON.parse(session);
      whCode = session.WhCode;
    }
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetInfoItem?ItemCode=${itemCode}&priceList=${priceList}&cardCode=${_cardCode}&whCode=${whCode}&documentType=${this.GetCurrentDocumentType()}`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  // funcion para obtener la informacion de los disponibles de un item en los almacenes
  // recibe como parametro el codigo del producto
  GetWHAvailableItem(itemCode: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetWHAvailableItem?ItemCode=${itemCode}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  // funcion para obtener la informacion de las series del item en un almacen
  // recibe como parametro el codigo del producto
  GetSeriesByItem(itemCode: string, WhsCode: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetSeriesByItem?ItemCode=${itemCode}&WhsCode=${WhsCode}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  // Crea un item
  CrateItem(_item: IItemModel) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/create`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<any>(url, _item, { headers });
  }
  // Edita un modelo
  UpdateItem(_item: IItemModel) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/updateItem`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<any>(url, _item, { headers });
  }
  // Obtiene el siguiente codigo para crear un item
  getNextCode() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/getNextCode`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  getItemPriceList(_itemCode: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemPriceList?_itemCode=${_itemCode}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  GetBarcodesByItem(_itemCode: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetBarcodesByItem?_itemCode=${_itemCode}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  GetItemsWithDetail() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemsWithDetail`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  GetLines(data: any): ILine[] {
    return this.lines;
  }

  UpdateLines(lines: ILine[]): void {
    this.lines = lines;
  }


  // Metodo para obtener el detail de un item en modo consulta de entrada de mercaderia
  GetItemDetails(ItemCode: string, Cantidad: number, docType: number) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Items/GetItemDetail?ItemCode=${ItemCode}&NumeroEntradas=${Cantidad}&DocType=${docType}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }





}
