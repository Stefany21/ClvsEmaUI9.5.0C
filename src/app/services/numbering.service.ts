import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';


// MODELOS
import { AppConstants, FeNumbering, FeNumberingResponce, BaseResponse } from './../models/index';


// RUTAS

// COMPONENTES

// SERVICIOS
import { StorageService } from './storage.service';
import { AlertService } from './alert.service';

// PIPES
@Injectable({
  providedIn: 'root'
})


export class NumberingService {

  constructor(private http: HttpClient,
    private storage: StorageService,
    private router: Router,
    private alertService: AlertService
    ) { }


  // funcion para el envio de peticion tipo get, para obtener una lista de numeraciones.
  GetAllFeNumbering() {
    const token = JSON.parse(this.storage.getCurrentSessionOffline());
    const url = `${this.storage.GetUrlOffline()}api/FeNumbering/GetNumberingList`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<FeNumberingResponce>(url, { headers });
   }

   GetNumberingById(Id: number) {
    const token = JSON.parse(this.storage.getCurrentSessionOffline());
    const url = `${this.storage.GetUrlOffline()}api/FeNumbering/GetNumberingById?Id=${Id}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<FeNumberingResponce>(url, { headers });
   }

   UpdateNumbering(numberingForm: FormGroup, Id:number) {  
      let model: FeNumbering =  { 
          Id : Id,
          DocType : numberingForm.value.DocType,
          NextNumber : numberingForm.value.NextNumber,
          Orbservacion : numberingForm.value.Orbservacion,
          Sucursal : numberingForm.value.Sucursal,
          Terminal : numberingForm.value.Terminal,
          active : numberingForm.value.active
      }
      const token = JSON.parse(this.storage.getCurrentSessionOffline());
      const url = `${this.storage.GetUrlOffline()}api/FeNumbering/UpdateFeNumbering`;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.access_token}`
      });
      return this.http.post<BaseResponse>(url, model, { headers } );
    }

    CreateNumbering(numberingForm: FormGroup, Id:number) {  
      let model: FeNumbering =  { 
          Id : Id,
          DocType : numberingForm.value.DocType,
          NextNumber : numberingForm.value.NextNumber,
          Orbservacion : numberingForm.value.Orbservacion,
          Sucursal : numberingForm.value.Sucursal,
          Terminal : numberingForm.value.Terminal,
          active : numberingForm.value.active
      }
      const token = JSON.parse(this.storage.getCurrentSessionOffline());
      const url = `${this.storage.GetUrlOffline()}api/FeNumbering/CreateFeNumbering`;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.access_token}`
      });
      return this.http.post<BaseResponse>(url, model, { headers } );
    }
}



