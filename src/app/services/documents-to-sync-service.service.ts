import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StorageService } from '.';
import { AppConstants, IDocumentToSync, ISaleOrderSearch } from '../models';
import { IBaseResponse, IDocumentsToSyncReponse } from '../models/responses';

@Injectable({
  providedIn: 'root'
})
export class DocumentsToSyncService {

  constructor(
    private storage: StorageService,
    private httpClient: HttpClient
  ) { }

  GetDocumentsToSync(_state: string, _dateTop: string, _dateBottom: string): Observable<IDocumentsToSyncReponse> {
    const token = JSON.parse(this.storage.getCurrentSessionOffline());
    const url = `${this.storage.GetUrlOffline()}api/Sync/GetDocuments?state=${_state}&dateTop=${_dateTop}&dateBottom=${_dateBottom}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.get<IDocumentsToSyncReponse>(url, { headers });
  }



  DownloadData(): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSessionOffline());
    const url = `${this.storage.GetUrlOffline()}api/Sync/DownloadData`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.post<IBaseResponse>(url, { headers });
  }

  SyncUpDocuments(_documents: IDocumentToSync[]): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSessionOffline());
    const url = `${this.storage.GetUrlOffline()}api/Sync/SyncUpDocuments`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.post<IBaseResponse>(url, _documents, { headers });
  }

  UpdateDocuments(_documents: IDocumentToSync[]): Observable<IBaseResponse> {
    const token = JSON.parse(this.storage.getCurrentSessionOffline());
    const url = `${this.storage.GetUrlOffline()}api/Sync/UpdateDocumentsToSync`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.access_token}`
    });
    return this.httpClient.post<IBaseResponse>(url, _documents , { headers });
  }
}