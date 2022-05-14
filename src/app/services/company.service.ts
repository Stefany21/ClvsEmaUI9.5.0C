import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Router } from '@angular/router';

// MODELOS
import { AppConstants, IPrinter, settings } from './../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { AlertService } from './alert.service';
import { Observable } from 'rxjs';
import { IBaseResponse, ICompanySapResponse } from '../models/responses';
import { IResponse } from '../models/i-api-response';
import { CompanyMargins } from '../models/company';
import { Settings } from 'http2';
import { DBObjectName } from '../models/i-dbObjects';


// PIPES

@Injectable({
  providedIn: 'root'
})
export class CompanyService {



  @BlockUI() blockUI: NgBlockUI;

  constructor(private http: HttpClient,
    private storage: StorageService,
    private router: Router) {
    
  }



  // 001 - Metodo para actualizar los margenes de las vistas.
  UpdateMargins(companyId: number, Margins: any[]) {
    let str = JSON.stringify(Margins)
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/UpdateCompanyMargins?IdCompany=${companyId}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post(url,Margins, { headers });
  }

  GetMargins():Observable<IResponse<CompanyMargins[]>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetViewMargins`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<CompanyMargins[]>>(url, { headers });
  }


  // funcion para obtener las compañias de la DBLocal
  // no recibe parametros
  GetCompanies() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetCompanies`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  // funcion para obtener las informacion de la compañia de la DBLocal
  // recibe como parametro el id de la compannia
  GetCompanyById(companyId: number) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetCompanyById?companyId=${companyId}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
  // Servicio para obtener la información de la compania por defecto
  GetDefaultCompany(): Observable<ICompanySapResponse> {

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetDefaultCompany`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<ICompanySapResponse>(url, { headers });
  }

  // funcion para crear una compañía nueva y el correo
  // recibe como parametro el formulario de la compañía con el correo, ademas del id de la compannia y el del correo
  CreateCompanyAndMail(companyMailForm: FormGroup, companyId: number, mailDataId: number, selectedFile: File,
    PrintInvFile: File, PrintQuoFile: File, PrintSOFile: File, PrintCopyFile: File,
    fileInvenFile: File,_fileOinvPP: File,_fileOinvCopy: File, r: Router, alertService: AlertService, decimalsForm: FormGroup, printerConfiguration: IPrinter) {
    const companyAndMail = this.CreateCompanyMailModel(companyMailForm, companyId, mailDataId, decimalsForm, printerConfiguration);

    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/CreateCompany`;
    // const headers = new HttpHeaders({
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${token.access_token}`
    // });
    // return this.http.post(url,
    //   companyAndMail,
    //   { headers }
    // );
    let XHR = new XMLHttpRequest();
    const FD = new FormData();
    // se agregan los archivos de logo y de imprecion
    FD.append('file', selectedFile);
    FD.append('fileInv', PrintInvFile);
    FD.append('fileQuo', PrintQuoFile);
    FD.append('fileSO', PrintSOFile);  
    // FD.append('fileCopy', PrintCopyFile);
    FD.append('fileInven', fileInvenFile);
    FD.append('fileOinvPP', _fileOinvPP);
    FD.append('fileOinvCopy', _fileOinvCopy);
    FD.append('companyAndMail', JSON.stringify(companyAndMail));

    XHR.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        let response = JSON.parse(XHR.responseText);
        if (response.Result) {
          alertService.successInfoAlert('Compañía Creada con éxito');
          r.navigate(['/companies']);
        } else {
          alertService.errorAlert('Error al cargar la información de las compañias - Error: ' + response.errorInfo.Message);
        }
      }
    };
    this.blockUI.stop(); // Stop blocking
    XHR.open('POST', url, true);
    XHR.setRequestHeader('Authorization', `Bearer ${token.access_token}`);
    // Send our FormData object; HTTP headers are set automatically
    XHR.send(FD);
  }

  
  // funcion para modificar una compañía y el correo
  // recibe como parametro el formulario de la compañía con el correo, ademas del id de la compannia y el del correo
  UpdateCompanyAndMail(companyMailForm: FormGroup, companyId: number, mailDataId: number, selectedFile: File,
    PrintInvFile: File, PrintQuoFile: File, PrintSOFile: File, PrintBalanceFile: File,
    fileInvenFile: File,_fileOinvPP: File,_fileOinvCopy: File, r: Router, alertService: AlertService, decimalsForm: FormGroup, printerConfiguration: IPrinter) {
    const companyAndMail = this.CreateCompanyMailModel(companyMailForm, companyId, mailDataId, decimalsForm, printerConfiguration);

    console.log('company to update', companyAndMail);
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/UpdateCompany`;

    let XHR = new XMLHttpRequest();
    const FD = new FormData();
    // se agregan los archivos de logo y de imprecion
    FD.append('file', selectedFile);
    FD.append('fileInv', PrintInvFile);
    FD.append('fileQuo', PrintQuoFile);
    FD.append('fileSO', PrintSOFile);
    FD.append('fileBalance', PrintBalanceFile);
    FD.append('fileInven', fileInvenFile);
    FD.append('fileOinvPP', _fileOinvPP);
    FD.append('fileOinvCopy', _fileOinvCopy);
    FD.append('companyAndMail', JSON.stringify(companyAndMail));

    XHR.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        let response = JSON.parse(XHR.responseText);
        if (response.Result) {
          alertService.successInfoAlert('Compañía actualizada con éxito');
          r.navigate(['/companies']);
        } else {
          alertService.errorAlert('Error al cargar la información de las compañias - Error: ' + response.errorInfo.Message);
        }
      }
    };
    this.blockUI.stop(); // Stop blocking
    XHR.open('POST', url, true);
    XHR.setRequestHeader('Authorization', `Bearer ${token.access_token}`);

    // Send our FormData object; HTTP headers are set automatically
    XHR.send(FD);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  }

  // metodo para la creacion del objeto compannia y mailDataId
  // recibe como parametro el formulario de la compannia y correo, ademas del id de la compannia y el del correo
  CreateCompanyMailModel(companyMailForm: FormGroup, companyId: number, mailDataId: number, decimalsForm: FormGroup, printerConfiguration: IPrinter) {
    return {
      'company': {
        'Id': companyId,
        'DBName': companyMailForm.value.DBName,
        'DBCode': companyMailForm.value.DBCode,
        'SAPConnectionId': companyMailForm.value.SAPConnectionId,
        'Active': companyMailForm.value.Active,
        'ExchangeRate': companyMailForm.value.ExchangeRate,
        'ExchangeRateValue': companyMailForm.value.ExchangeRateValue,
        'HandleItem': companyMailForm.value.HandleItem,
        'BillItem': companyMailForm.value.BillItem,
        // 'SP_ItemInfo': companyMailForm.value.SP_ItemInfo,
        // 'SP_InvoiceInfoPrint': companyMailForm.value.SP_InvoiceInfoPrint,
        // 'SP_WHAvailableItem': companyMailForm.value.SP_WHAvailableItem,
        // 'SP_SeriesByItem': companyMailForm.value.SP_SeriesByItem,
        // 'SP_PayDocuments': companyMailForm.value.SP_PayDocuments,
        // 'SP_CancelPayment': companyMailForm.value.SP_CancelPayment,
        // 'V_BPS': companyMailForm.value.V_BPS,
        // 'V_Items': companyMailForm.value.V_Items,
        // 'V_ExRate': companyMailForm.value.V_ExRate,
        // 'V_Taxes': companyMailForm.value.V_Taxes,
        // 'V_GetAccounts': companyMailForm.value.V_GetAccounts,
        // 'V_GetCards': companyMailForm.value.V_GetCards,
        // 'V_GetBanks': companyMailForm.value.V_GetBanks,
        // 'V_GetSalesMan': companyMailForm.value.V_GetSalesMan,
        'ScaleWeightToSubstract': companyMailForm.value.ignoreWeight,
        'IsLinePriceEditable': companyMailForm.value.Editable,
        'ScaleMaxWeightToTreatAsZero': companyMailForm.value.maxAs0,
        'DecimalAmountPrice': decimalsForm.value.price,
        'DecimalAmountTotalLine': decimalsForm.value.totalLine,
        'DecimalAmountTotalDocument': decimalsForm.value.totalDocument,
        'HasOfflineMode': companyMailForm.value.hasOfflineMode,
        'PrinterConfiguration': JSON.stringify(printerConfiguration),
        'HasZeroBilling': companyMailForm.value.hasZeroBilling,
        'LineMode': companyMailForm.value.LineMode
      },
      'mail': {
        'Id': mailDataId !== null ? mailDataId : 0,
        'Host': companyMailForm.value.Host,
        'from': companyMailForm.value.from,
        'pass': companyMailForm.value.pass,
        'SSL': companyMailForm.value.SSL,
        'port': companyMailForm.value.port !== '' ? companyMailForm.value.port : 0,
        'subject': companyMailForm.value.subject,
        'user': companyMailForm.value.user
      }
    };
  }

  // funcion para obtener el logo de la compañia de la DBLocal
  // no recibe parametros
  GetCompanyLogo() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetCompanyLogo`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  retornar() {
    this.router.navigate(['/companies']);
  }
  GetViewGroupList() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetViewGroupList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }
  UpdateViewLineAgrupation(ViewGroupList: any): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/UpdateViewLineAgrupation`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(url,
      ViewGroupList,
      { headers }
    );  
  }
  
  GetSettings(): Observable<IResponse<settings[]>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Settings/GetViewSettings`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<settings[]>>(url, { headers });
  }
  GetSettingsbyId(Code: number): Observable<IResponse<settings>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Settings/GetViewSettingbyId?Code=${Code}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<settings>>(url, { headers });
  }     

  SaveSettings(Settings: settings): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Settings/SaveSettings`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(url,
      Settings,
      { headers }
    );
  }
  GetDbObjectNames():Observable<IResponse<DBObjectName[]>> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/GetDbObjectName`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IResponse<DBObjectName[]>>(url, { headers });
  }

  UpdateDbObjectNames(DBObjectNameList: DBObjectName[]): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/Company/UpdateDbObjectNames`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(url,
      DBObjectNameList,
      { headers }
    );
  }

}
