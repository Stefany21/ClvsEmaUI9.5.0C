import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { timeStamp } from 'console';
import { Observable, Subject } from 'rxjs';
import { IMemoryInvoice } from '../models/i-memory-invoice';
import { AppConstants, Company, User, IPrinter, IPrinterPerReport, ITerminalByUser, ITerminal } from './../models/index';
import { ConnectionStatusService } from './connection-status.service';
import { MemoryInvoiceService } from './memory-invoice.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  AuthenticationService

  private localStorageService;
  public UpdateMemoryInvoicesList: Subject<any>;


  constructor(private router: Router,
    private conectionStatusService: ConnectionStatusService) {
    this.localStorageService = localStorage;
    this.UpdateMemoryInvoicesList = new Subject();

    //this.setCurrentSessionOffline('1');
    //this.setCurrentSession('1');
  }


  // coloca los datos de la sesion actual, token y expiracion, usuario logueado
  setCurrentSession(currentUser): void {
    this.localStorageService.setItem('currentUser', JSON.stringify(currentUser));
  }
  // coloca los datos de la sesion actual, token y expiracion, usuario logueado
  setTokenPadron(padronToken): void {
    this.localStorageService.setItem('padronInfo', JSON.stringify(padronToken));
  }
  // coloca los datos de la sesion actual, token y expiracion, usuario logueado
  setStatusOffline(currentUser): void {
    this.localStorageService.setItem('status', JSON.stringify(currentUser));
  }
  // coloca los datos de la sesion actual, token y expiracion, usuario logueado
  setStatusOnline(currentUser): void {
    this.localStorageService.setItem('status', JSON.stringify(currentUser));
  }
  // coloca los datos de la sesion actual, token y expiracion, usuario logueado
  setCurrentSessionOffline(currentUser): void {
    this.localStorageService.setItem('currentUserOff', JSON.stringify(currentUser));
  }
  // Actualiza la moneda que usa la compania
  // setCompanyCurrency(_currency: string, _lock: boolean = true): boolean {

  //   if (_lock && _currency !== 'COL' && _currency !== 'USD') return false;

  //   this.localStorageService.setItem('COMPANY_CURRENCY', _currency);

  //   return true;
  // }
  // // Obtiene el tipo de moneda de la compania
  // getCompanyCurrency(): string {
  //   return this.localStorageService.getItem('COMPANY_CURRENCY');
  // }
  setOnline(): string {
    let a: string = `${AppConstants.sOnline}api/`;
    this.localStorageService.setItem('conexion', 'online');
    return a;
  }

  setOffline(): string {
    let a: string = `${AppConstants.sOffline}api/`;
    this.localStorageService.setItem('conexion', 'offline');
    return a;
  }

  estaOnline(): boolean {
    if (this.localStorageService.getItem('conexion') === 'online') return true;
    return false;
  }








  // remueve la sesion actual    
  removeCurrentSession(): void {
    this.localStorageService.removeItem('currentUser');
    this.localStorageService.removeItem('currentUserOff');
    this.localStorageService.removeItem('padronInfo');
    this.localStorageService.removeItem('purchaseOrderDocNum');
    this.localStorageService.removeItem('HasOfflineMode');
    this.localStorageService.removeItem('conexion');
    this.localStorageService.removeItem('Decimal');
    this.localStorageService.removeItem('padronInfo');
    this.localStorageService.removeItem('DecimalsConfiguration');
    this.localStorageService.removeItem('reToken');
    this.localStorageService.removeItem('COMPANY_CURRENCY');
    this.localStorageService.removeItem('breadCrumDetail');
    this.localStorageService.removeItem('DocEntry');
    this.localStorageService.removeItem('CustomerData');
    // this.localStorageService.removeItem('CompanyConfiguration');
    this.localStorageService.removeItem('padronInfo');
    // this.localStorageService.removeItem('ConnectionType');
    this.localStorageService.removeItem('MemoryInvoices');
    this.localStorageService.removeItem('UrlOfflinePP');
  }
  // obtiene el token de la sesion actual
  getCurrentSession(): string {


    // if (this.localStorageService.getItem('ConnectionType') == 'true') {
    //   if (this.localStorageService.getItem('currentUserOff') == null) {
    //     return '{"access_token": "empty_token"}';
    //   }
    //   return this.localStorageService.getItem('currentUserOff')

    // } else {
    //   if (this.localStorageService.getItem('currentUser') === null) {
    //     this.logout();
    //   }
    //   return this.localStorageService.getItem('currentUser');

    // }

    if (navigator.onLine) {
      if (this.localStorageService.getItem('ConnectionType') == 'true') {
        return this.localStorageService.getItem('currentUserOff');
      } else {
        if (this.localStorageService.getItem('currentUser') === null) {
          this.logout();
        }
        return this.localStorageService.getItem('currentUser');
      }
    }
    else {
      if (!this.getHasOfflineMode()) {
        return '{"access_token": "empty_token"}';
      }
      return this.localStorageService.getItem('currentUserOff');
    }
  }

  GetDefaultBussinesPartner(): string {
    return JSON.parse(this.localStorageService.getItem('currentUser')).DefaultBussinesPartnerUI;
  }

  GetPrefix(): string {
    return JSON.parse(this.localStorageService.getItem('currentUser')).PrefixId;
  }

  GetDefaultInvoiceType(): string {
    return JSON.parse(this.localStorageService.getItem('currentUser')).InvoiceType;
  }

  setReToken(_reToken: boolean): void {
    this.localStorageService.setItem('reToken', _reToken);
  }

  getRetoken(): boolean {
    return this.localStorageService.getItem('reToken');
  }

  getSession(isOnline: boolean) {
    return this.localStorageService.getItem(isOnline ? 'currentUser' : 'currentUserOff');
  }
  // obtiene el token de la sesion actual
  getCurrentSessionOffline(): string {
    let token = this.localStorageService.getItem('currentUserOff');
    if (!token) token = '{"access_token": "empty_token"}';
    return token;
  }
  // obtiene el token de la sesion actual
  getTokenPadron(): string {
    return this.localStorageService.getItem('padronInfo');
  }
  // deslogueo
  logout(): void {
    this.removeCurrentSession();
    this.router.navigate(['/login']);
  }

  // Establece la cantidad de decimales que usara la app para el redondeo
  setCompanyConfiguration(
    _decimalAmountPrice: number,
    _decimalAmountTotalLine: number,
    _decimalAmountTotalDocument: number,
    _printerConfiguracion: IPrinter,
    _hasZeroBilling: boolean,
    lineMode: boolean,
    _Margins: string,
    _bdCode = undefined): void {


    const company = {} as Company;

    company.AcceptedMargins = _Margins;
    company.LineMode = lineMode;
    company.DecimalAmountPrice = _decimalAmountPrice;
    company.DecimalAmountTotalLine = _decimalAmountTotalLine;
    company.DecimalAmountTotalDocument = _decimalAmountTotalDocument;
    company.DBCode = _bdCode;

    if (_printerConfiguracion !== null) {
      company.PrinterConfiguration = JSON.stringify(_printerConfiguracion);
    }
    else {
      company.PrinterConfiguration = this.getCompanyConfiguration().PrinterConfiguration;
    }
    company.HasZeroBilling = _hasZeroBilling;

    this.localStorageService.setItem('CompanyConfiguration', JSON.stringify(company));
  }
  // Obiene la cantidad de decimales que usara la app para el redondeo
  getCompanyConfiguration(): Company {
    const company = {} as Company;

    const PARSED_JSON = JSON.parse(this.localStorageService.getItem('CompanyConfiguration'));

    if (PARSED_JSON) {
      company.DecimalAmountPrice = PARSED_JSON.DecimalAmountPrice;
      company.DecimalAmountTotalLine = PARSED_JSON.DecimalAmountTotalLine;
      company.DecimalAmountTotalDocument = PARSED_JSON.DecimalAmountTotalDocument;
      company.PrinterConfiguration = PARSED_JSON.PrinterConfiguration;
      company.HasZeroBilling = PARSED_JSON.HasZeroBilling;
      company.DBCode = PARSED_JSON.DBCode;
      company.LineMode = PARSED_JSON.LineMode;
      company.AcceptedMargins = PARSED_JSON.AcceptedMargins;
    }
    else {
      company.DecimalAmountPrice = 2;
      company.DecimalAmountTotalLine = 2;
      company.DecimalAmountTotalDocument = 2;
      company.PrinterConfiguration = '';//'{"DecimalAmountPrice":4,"DecimalAmountTotalLine":2,"DecimalAmountTotalDocument":2,"PrinterConfiguration":"{\"Description\":\"\",\"DisplayName\":\"EPSON TM-T20II Receipt\",\"IsDefault\":true,\"Name\":\"EPSON TM-T20II Receipt\",\"Status\":0,\"Options\":{\"printer-location\":\"\",\"printer-make-and-model\":\"EPSON TM-T20II Receipt5\",\"system_driverinfo\":\"EPSON TM-T20II Receipt5;10.0.18362.1198 (WinBuild.160101.0800);Microsoft® Windows® Operating System;10.0.18362.1198\"}}","HasZeroBilling":false}';
      company.HasZeroBilling = false;
      company.DBCode = 'No configurada';

      company.LineMode = true;
    }


    return company;
  }
  // Establece la cantidad de decimales que usara la app para el redondeo
  setHasOfflineMode(_hasOfflineMode: boolean): void {
    this.localStorageService.setItem('HasOfflineMode', _hasOfflineMode);
  }
  // Obtiene el uso del modo offline
  getHasOfflineMode(): boolean {
    return this.localStorageService.getItem('HasOfflineMode') === 'true';
  }

  setPurchaseOrder(_docNum: number): void {
    this.localStorageService.setItem('purchaseOrderDocNum', _docNum.toString());
  }

  setLog(data: string): void {
    this.localStorageService.setItem('log value: ', data);
  }

  getPurchaseOrder(): number {
    return +this.localStorageService.getItem('purchaseOrderDocNum');
  }

  SaveDocEntry(_docNum: number): void {
    this.localStorageService.setItem('DocEntry', _docNum.toString());
  }

  GetDocEntry(): number {
    return +this.localStorageService.getItem('DocEntry');
  }

  SaveCustomerData(_customerData: string): void {
    this.localStorageService.setItem('CustomerData', _customerData);
  }

  GetCustomerData(): string {
    return this.localStorageService.getItem('CustomerData');
  }

  SaveUIAction(_action: number) {
    this.localStorageService.setItem('SOAndSQAction', _action);
  }

  GetUIAction(): number {
    return +this.localStorageService.getItem('SOAndSQAction');
  }
  SaveBreadCrum(_detail: string): void {
    this.localStorageService.setItem('breadCrumDetail', _detail);
  }

  GetBreadCrum(): string {
    return this.localStorageService.getItem('breadCrumDetail');
  }

  addUserCredentials(_email: string, _password: string): void {
    let usersCredentials = JSON.parse(this.localStorageService.getItem('usersCredentials')) as User[];
    let notFound = false;
    if (usersCredentials !== null) {
      usersCredentials.forEach(x => {
        if (x.Email === _email) notFound = true;
      });

      if (!notFound) {
        usersCredentials.push({ Email: _email, Password: _password } as User);
      }
    }
    else {
      usersCredentials = [];
      usersCredentials.push({ Email: _email, Password: _password } as User);
    }
    this.localStorageService.setItem('usersCredentials', JSON.stringify(usersCredentials));
  }

  getUserCredentials(): User[] {
    const usersCredentials = JSON.parse(this.localStorageService.getItem('usersCredentials')) as User[];
    if (usersCredentials !== null) return usersCredentials;
    return [];
  }
  GetPrinterConfiguration(_index: number): IPrinter {
    // IPrinterPerReport[]
    const PRINTERS = JSON.parse(localStorage.getItem('PRINTERS_CONF')) as IPrinterPerReport[];
    if (PRINTERS) return PRINTERS[_index].Printer;
    return null;
  }
  setConnectionType(pConectionType: boolean) {
    this.localStorageService.setItem('ConnectionType', pConectionType)
    this.conectionStatusService.ConnectionStatusMsg.next(pConectionType ? 'Conectado al servidor local' : 'Conectado al servidor en línea')
  }
  public getConnectionType(): boolean {
    return this.localStorageService.getItem('ConnectionType') === 'true';
  }


  // 001 Funcionalidad de facturas en memoria

  // Metodo para notificar a la subscripcion que ubo un cambio en la lista de invoices en memori
  private ChangeMemoryInvoicesList(pParam: any): void {
    this.UpdateMemoryInvoicesList.next(pParam);
  }


  // Agrega los datos de una factura al localstorage
  public AddMemoryInvoiceList(Invoice: IMemoryInvoice): void {
    let Invoices: IMemoryInvoice[] = this.GetMemoryInvoices();
    //Invoice.Id = Invoices.reduce((a, b) => a = a > b.Id ? a : b.Id, 0) + 1; //(Invoices.length + 1) //
    Invoices.push(Invoice);
    this.localStorageService.setItem('MemoryInvoices', JSON.stringify(Invoices));
    //this.ChangeMemoryInvoicesList(0);
    this.UpdateMemoryInvoiceSelection(Invoice.Id);
  }

  public RemoveMemoryInvoice(InvoiceID: number): void {

    let Invoices: IMemoryInvoice[] = this.GetMemoryInvoices();
    Invoices.splice(Invoices.findIndex(i => i.Id == InvoiceID), 1);

    // Se actualizan los indices de las facturas


    Invoices.forEach((i, index) => {
      i.Id = index + 1;
    });
    this.localStorageService.setItem('MemoryInvoices', JSON.stringify(Invoices));
    this.ChangeMemoryInvoicesList(0);

  }

  public GetMemoryInvoices(): IMemoryInvoice[] {
    let Invoices: IMemoryInvoice[] = JSON.parse(this.localStorageService.getItem('MemoryInvoices'));
    if (!Invoices) Invoices = [];
    return Invoices;
  }

  public UpdateMemoryInvoice(Invoice: IMemoryInvoice): void {
    let Invoices: IMemoryInvoice[] = this.GetMemoryInvoices();
    Invoices[Invoices.findIndex(i => i.Id == Invoice.Id)] = Invoice;
    this.localStorageService.setItem('MemoryInvoices', JSON.stringify(Invoices));
    this.ChangeMemoryInvoicesList(0);
  }

  public GetMemoryInvoice(InvoiceID: number): IMemoryInvoice {
    let Invoices: IMemoryInvoice[] = this.GetMemoryInvoices();
    return Invoices.find(i => i.Id == InvoiceID);
  }

  public GetMemoryInvoicesInfo(): any {
    let Invoices: IMemoryInvoice[] = this.GetMemoryInvoices();
    let nextID = Invoices.reduce((a, b) => a = a > b.Id ? a : b.Id, 0) + 1;


    return {
      nextID: nextID,
      Size: Invoices.length,
      lastOne: Invoices[Invoices.length - 1]
    }
  }


  public GetEmptyMemoryInvoice(): IMemoryInvoice {
    let Invoices: IMemoryInvoice[] = this.GetMemoryInvoices();
    return Invoices.find(i => i.ItemsList.length === 0) || null;
  }



  public UpdateMemoryInvoiceSelection(invoID: number): void {
    let invoices = this.GetMemoryInvoices();
    invoices.forEach(i => {
      i.Id == invoID ? i.IsSelected = true : i.IsSelected = false;
    });
    this.localStorageService.setItem('MemoryInvoices', JSON.stringify(invoices));
    this.ChangeMemoryInvoicesList(0);
  }

  GetPPTerminalsbyUser(): ITerminalByUser[] {
    try {
      let terminalbyUser: ITerminalByUser[] = [];
      const PARSED_JSON = JSON.parse(this.localStorageService.getItem('currentUser'));
      if (PARSED_JSON) {
        terminalbyUser = JSON.parse(PARSED_JSON.Terminals) as ITerminalByUser[];
      }
      return terminalbyUser;

    } catch (error) {
      console.log(error);
      return [];
    }
  }

  GetPPTerminals(): ITerminal[] {
    try {
      let terminals: ITerminal[] = [];
      const PARSED_JSON = JSON.parse(this.localStorageService.getItem('currentUser'));
      if (PARSED_JSON) {
        terminals = JSON.parse(PARSED_JSON.Terminals) as ITerminal[];
      }
      return terminals;

    } catch (error) {
      console.log(error);
      return [];
    }
  }

  GetTerminal(): ITerminal {
    try {
      const SESSION = JSON.parse(this.localStorageService.getItem('currentUser'));

      return JSON.parse(SESSION.Terminal) as ITerminal;
    }
    catch (error) {
      console.info(error);
      return null;
    }
  }





  SaveDocumentType(_documentType: number) {
    this.localStorageService.setItem('DocumentType', _documentType);
  }

  GetDocumentType(): number {
    return +this.localStorageService.getItem('DocumentType');
  }

  SetUrlOffilePP(_urlOfflinePP): void {
    this.localStorageService.setItem('UrlOfflinePP', JSON.stringify(_urlOfflinePP));
  }

  GetUrlOffline(): string {
    try {
      let RouteOfflineUrl = '';
      const PARSED_JSON = JSON.parse(this.localStorageService.getItem('UrlOfflinePP')).RouteOfflineUrl;
      if (PARSED_JSON) {
        RouteOfflineUrl = PARSED_JSON;
      }
      return RouteOfflineUrl;
    } catch (error) {
      console.log(error);
      return '';
    }
  }
  GetUrlPinpad(): string {
    try {
      let RoutePinpadUrl = '';
      const PARSED_JSON = JSON.parse(this.localStorageService.getItem('UrlOfflinePP')).RoutePinpadUrl;
      if (PARSED_JSON) {
        RoutePinpadUrl = PARSED_JSON;
      }
      return RoutePinpadUrl;
    } catch (error) {
      console.log(error);
      return '';
    }
  }

}
