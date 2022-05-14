import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

// MODELOS
import { AppConstants, IBusinessPartner, IUdf, IUdfTarget } from './../models/index';

// SERVICIOS
import { StorageService } from './storage.service';
import { IPadronInfo } from '../models/i-padron-info';

// PIPES
@Injectable({
  providedIn: 'root'
})
export class BusinessPartnerService {

  constructor( private http: HttpClient,
               private storage: StorageService ) {
  }

  // funcion para obtener los clientes desde SAP
  // no recibe parametros
  GetCustomers() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/GetBusinessPartners`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }  

  // funcion para obtener la informacion de un cliente en  SAP
  // recibe como parametro el codigo del cliente
  GetCustomerByCardCode(cardCode: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartner/GetCustomerByCardCode`;
    const bp = {
      'CardCode': cardCode
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });

    return this.http.post(url,
    bp,
    { headers }
    );
  }
  
  // funcion para obtener los datos de fe de un cliente cuando es un cliente de contado
  // no recibe parametros
  GetCustomersCont(idType: string, idNumber: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/GetBusinessPartnerFEInfo?idType=${idType}&idNumber=${idNumber}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }
  
  // funcion para obtener los datos de fe de un cliente cuando es un cliente de credito
  // no recibe parametros
  GetCustomersCred(cardCode: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/GetBusinessPartnerFEInfo?cardCode=${cardCode}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

  // funcion para obtener los datos de fe de un cliente cuando es un cliente de contado desde el padron
  // no recibe parametros
  GetCustomersContPadron(idNumber: string) {
   // const token = JSON.parse(this.storage.getCurrentSession());
   // const padronToken = JSON.parse(this.storage.getTokenPadron());
    //const url = `${AppConstants.apiUrl}api/BusinessPartners/GetBusinessPartnerPadronInfo?&idNumber=${idNumber}&token=${padronToken.access_token}`;
    // const headers = new HttpHeaders({
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${token.access_token}`
    // });

    const url = `${AppConstants.padronInfoURl}ae?identificacion=${idNumber}`;
    return this.http.get<IPadronInfo>(url, {});
  }

  GetSuppliers() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/GetSuppliers`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<any>(url, { headers });
  }

  // función para obtener un Cliente
  GetCustomerById(customerId: string) {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/GetCustomerbyCode?CardCode=${customerId}`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }   

  // actualizar Socio de Negocio
  UpdateCustomer(businesspartnerForm: FormGroup, U_PROVINCIA: string, U_CANTON: string, U_DISTRITO: string, U_BARRIO: string, _udfs: IUdfTarget[]) {
    const businesspartner: IBusinessPartner = {
      CardCode: businesspartnerForm.value.CardCode,
      CardName: businesspartnerForm.value.CardName,
      CardType: businesspartnerForm.value.CardType,
      Phone1: businesspartnerForm.value.Phone1,
      LicTradNum: businesspartnerForm.value.LicTradNum,
      E_Mail: businesspartnerForm.value.E_Mail,
      U_TipoIdentificacion: businesspartnerForm.value.U_TipoIdentificacion,
      // U_provincia: businesspartnerForm.value.U_provincia,
      // U_canton: businesspartnerForm.value.U_canton,
      // U_distrito: businesspartnerForm.value.U_distrito,
      // U_barrio: businesspartnerForm.value.U_barrio,
      U_provincia: U_PROVINCIA,
      U_canton: U_CANTON,
      U_distrito: U_DISTRITO,
      U_barrio: U_BARRIO,
      U_direccion: businesspartnerForm.value.U_direccion,
      UdfTarget: _udfs
    }
       
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/UpdateCustomer`;     
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<any>(url,businesspartner,{ headers });
    
  }  
  
  // funcion para crear Clientes
  CreateCustomer(businesspartnerForm: FormGroup, U_PROVINCIA: string, U_CANTON: string, U_DISTRITO: string, U_BARRIO: string, _udfs: IUdfTarget[]){
    const businesspartner: IBusinessPartner = {
      CardType: businesspartnerForm.value.CardType,
      CardCode: businesspartnerForm.value.CardCode,
      CardName: businesspartnerForm.value.CardName,
      Phone1: businesspartnerForm.value.Phone1,
      LicTradNum: businesspartnerForm.value.LicTradNum,
      E_Mail: businesspartnerForm.value.E_Mail,
      U_TipoIdentificacion: businesspartnerForm.value.U_TipoIdentificacion,
      // U_provincia: businesspartnerForm.value.U_provincia,
      // U_canton: businesspartnerForm.value.U_canton,
      // U_distrito: businesspartnerForm.value.U_distrito,
      // U_barrio: businesspartnerForm.value.U_barrio,
      U_provincia: U_PROVINCIA,
      U_canton: U_CANTON,
      U_distrito: U_DISTRITO,
      U_barrio: U_BARRIO,
      U_direccion: businesspartnerForm.value.U_direccion,
      UdfTarget: _udfs
    }
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/CreateCustomer`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<any>(url,businesspartner, { headers });
     
  }

  // funcion para obtener clientes y proveedores
  // no recibe parametros
  GetAllBusinessPartner() {
    const token = JSON.parse(this.storage.getCurrentSession());
    const url = `${AppConstants.apiUrl}api/BusinessPartners/GetCustomer`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get(url, { headers });
  }

}
