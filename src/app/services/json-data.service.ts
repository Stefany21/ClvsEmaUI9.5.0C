import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class JsonDataService {

  constructor(private http: HttpClient) { }

  // metodo para obtener las provincias desde un json local
  getJSONProvinces(): Observable<any> {
    // console.log('getJSONProvinces');
    const apiUrl = 'assets/data/Provinces.Json';
    return this.http.get(apiUrl);
  }

  // metodo para obtener los cantones, distritos, y barrios desde un json local
  getJSONCountryPlaces(): Observable<any> {
    // console.log('getJSONCostaRicaPlaces');                
    const apiUrl = 'assets/data/Country.Json';
    return this.http.get(apiUrl);
  }
  
  // metodo para obtener tipos de factura
  getJSONInvoiceType(): Observable<any> {
    // console.log('getJSONCostaRicaPlaces');                
    const apiUrl = 'assets/data/TipoFactura.Json';
    return this.http.get(apiUrl);
  }
}