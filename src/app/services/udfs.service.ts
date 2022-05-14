import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StorageService } from '.';
import { AppConstants, IUdf } from '../models';
import { IBaseResponse, IUdfCategoryResponse, IUdfsByCategoryResponse, IUdfsTargetResponse } from '../models/responses';

@Injectable({
  providedIn: 'root'
})
export class UdfsService {

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) { }

  GetUdfCategories(): Observable<IUdfCategoryResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IUdfCategoryResponse>(`${AppConstants.onlineUrl}api/Udf/GetUdfCategories`,
      { headers });
  }

  GetUdfsByCategory(_name: string): Observable<IUdfsByCategoryResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IUdfsByCategoryResponse>(`${AppConstants.onlineUrl}api/Udf/GetUdfs?category=${_name}`,
      { headers });
  }

  GetConfiguredUdfsByCategory(_name: string): Observable<IUdfsByCategoryResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IUdfsByCategoryResponse>(`${AppConstants.onlineUrl}api/Udf/GetConfiguredUdfs?category=${_name}`,
      { headers });
  }

  SaveUdfs(_udfs: IUdf[], _category: string): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IBaseResponse>(`${AppConstants.onlineUrl}api/Udf/SaveUdfs`,
    {
      "Udfs":_udfs,
      "Category": _category
    }, { headers });
  }

  GetUdfsData(_udfs: IUdf[], _value: string, _category: string): Observable<IUdfsTargetResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.post<IUdfsTargetResponse>(`${AppConstants.onlineUrl}api/Udf/GetUdfsData`,
    {
      "Value": _value,
      "TableId": _category,
      "UdfsTarget": _udfs
    },{ headers });
  }

  GetUdfDevelopment(): Observable<IUdfCategoryResponse> {
    const token = JSON.parse(this.storage.getCurrentSession());
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.http.get<IUdfCategoryResponse>(`${AppConstants.onlineUrl}api/Udf/GetUdfDevelopment`,
      { headers });
  }
}
