import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StorageService } from '.';
import { AppConstants } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SynchronizationService {

  constructor(
    private http: HttpClient,
    private storage: StorageService) { }
  
    // Edita un modelo
    ItemsDownload(): any {
      const token = JSON.parse(this.storage.getCurrentSessionOffline());
      const url = `${this.storage.GetUrlOffline()}api/Items/sync`;

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.access_token}`
      });
      return this.http.get(url, { headers });
    }
}
