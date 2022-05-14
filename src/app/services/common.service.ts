import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { StorageService } from './storage.service';


@Injectable({
  providedIn: 'root'
})
export class CommonService {

  hasDocument: Subject<string>;
  offlineInformation: Subject<string>;
  exchangeRate: Subject<string>;
  bdCode: Subject<string>;
  offlineInformationPending: Subject<any>; //Estado en Facturación muestre documentos pendientes de sincronizar

  constructor(private storageService: StorageService) {
    this.hasDocument = new Subject();
    this.offlineInformation = new Subject();
    this.offlineInformationPending = new Subject();
    this.exchangeRate = new Subject();
    this.bdCode = new Subject();
  }

  private stringToArrayBuffer(toConvert: string) {
    let buf = new ArrayBuffer(toConvert.length);
    let view = new Uint8Array(buf);
    for (let i = 0; i != toConvert.length; ++i)
      view[i] = toConvert.charCodeAt(i) & 0xff;

    return buf;
  }

  downloadFile(
    base64File: string,
    fileName: string,
    blobType: string,
    fileExtension: string
  ) {
    let report = new Blob([this.stringToArrayBuffer(atob(base64File))], {
      type: blobType,
    });

    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(report);
    link.download = `${fileName}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  isValidFile(file: File, validExtensions: string[]) {
    let fileExtension = this.getFileExtension(file);

    return validExtensions.some((x) => x === fileExtension);
  }
  getFileExtension(file: File): string {
    return file.name.split('.')[file.name.split('.').length - 1].toLowerCase();
  }



  GenerateDocumentUniqueID(): string {

    const USER_PREFIXID = this.storageService.GetPrefix();

    const DATE = new Date();

    const DAYS = DATE.getDate() < 10 ? '0' + DATE.getDate() : DATE.getDate().toString();
    const MONTS = (DATE.getMonth() + 1) < 10 ? '0' + (DATE.getMonth() + 1) : (DATE.getMonth() + 1).toString();
    const YEAR = DATE.getFullYear().toString().slice(2, 4);

    const HOURS = DATE.getHours() < 10 ? '0' + DATE.getHours() : DATE.getHours();
    const MINUTES = DATE.getMinutes() < 10 ? '0' + DATE.getMinutes() : DATE.getMinutes();
    const SECONDS = DATE.getSeconds() < 10 ? '0' + DATE.getSeconds() : DATE.getSeconds();

    const uniqueID = `${USER_PREFIXID + DAYS + MONTS + YEAR + HOURS + MINUTES + SECONDS}`;
    
    console.log('UniqueInvCode ', uniqueID);
    return uniqueID;
  
  }






}
