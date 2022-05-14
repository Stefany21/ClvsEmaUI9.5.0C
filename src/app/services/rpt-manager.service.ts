import { Injectable } from '@angular/core';
import { AppConstants, BaseResponse, Report, Parameter } from '../models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Email } from '../models/rpt-manager/i-email';
import { StorageService } from './storage.service';


@Injectable({
  providedIn: 'root'
})
export class RptManagerService {

  constructor(private http: HttpClient,private storageService:StorageService) { }
  SaveReportFile(report: File) {

    let session = this.storageService.getSession(true);
    let AppKey:string;
    let CompanyKey:string;
    
    if (session) {
      session = JSON.parse(session);
      AppKey = session.AppKey;
      CompanyKey = session.CompanyKey;
    }

    const formData = new FormData();
    formData.append('report', report);

    return this.http.post<BaseResponse>(
      `${AppConstants.RPTMANAGER_URL}api/Reports/SaveReportFile?companyKey=${CompanyKey}&appKey=${AppKey}`,//#VALORPRUEBA //# EMA SUPER TEST 6, 10  //#EMA SUPER PROD 2,5 //#EMA DISUMED PROD 3,6 //# EMA DISUMED TEST 5,20
      formData
    );
  }

 
  HandlePostOrPutReport(report: Report) {
    let session = this.storageService.getSession(true);
    let AppKey:string;
    if (session) {
      session = JSON.parse(session);
      AppKey = session.AppKey;
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token.access_token}`   
    });
    
     report.ApplicationId = +AppKey; //#VALORPRUEBA //#EMA DISUMED TEST 8//EMA PROD 5   

    if (report.Id > 0) {
      return this.http.put<any>(
        `${AppConstants.RPTMANAGER_URL}api/Reports/PutReport`,
        report,
        { headers }
      );
    } else {
      return this.http.post<any>(
        `${AppConstants.RPTMANAGER_URL}api/Reports/PostReport`,
        report,
        { headers }
      );
    }
  } 
  
  GetReports() {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token.access_token}`
    });


    let session = this.storageService.getSession(true);
    let AppKey:string;
    let CompanyKey:string;
    
    if (session) {
      session = JSON.parse(session);
      AppKey = session.AppKey;
      CompanyKey = session.CompanyKey;
    }

    return this.http.get<any>(
      `${AppConstants.RPTMANAGER_URL}api/Reports/GetReports?companyKey=${CompanyKey}&appKey=${AppKey}`,//#VALORPRUEBA
      { headers }
    );  
  }

  GetParameters(reportId: number) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token.access_token}`
    });

    return this.http.get<any>(
      `${AppConstants.RPTMANAGER_URL}api/Parameter/GetParameters?reportId=${reportId}`,
      { headers }
    );
  }

  PrintReport(parameters: Parameter[], reportId: number) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token.access_token}`
    });

    return this.http.post<any>(
      `${AppConstants.RPTMANAGER_URL}api/Reports/PrintReport?reportId=${reportId}`,
      parameters,
      { headers }
    );
  }

  SendEmail(emailInfo: Email, reportId: number) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token.access_token}`
    });

    return this.http.post<any>(
      `${AppConstants.RPTMANAGER_URL}api/Reports/SendEmail?reportId=${reportId}`,
      emailInfo,
      { headers }
    );
  }

  DownloadFile(reportId: number) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token.access_token}`
    });

    return this.http.get<any>(
      `${AppConstants.RPTMANAGER_URL}api/Reports/DownloadFile?reportId=${reportId}`,
      { headers }
    );
  }

  GetReportUsers() {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token.access_token}`
    });

    return this.http.get<any>(
      `${AppConstants.RPTMANAGER_URL}api/ReportUser/GetReportUsers`,
      { headers }
    );
  }
}     