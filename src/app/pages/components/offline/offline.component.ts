import { formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription } from 'rxjs';
import { IDocumentToSync, ISaleOrderSearch } from 'src/app/models';
import { DocumentStatus } from 'src/app/models/constantes';
import { IBaseResponse } from 'src/app/models/responses';
import { AlertService, AuthenticationService, CommonService, PermsService, SalesManService } from 'src/app/services';
import { DocumentsToSyncService } from 'src/app/services/documents-to-sync-service.service';
import swal from 'sweetalert2';

@Component({
  selector: 'app-offline',
  templateUrl: './offline.component.html',
  styleUrls: ['./offline.component.scss']
})
export class OfflineComponent implements OnInit, OnDestroy {
  //VARBOX
  syncUpAttemps: number;
  codeError: string;
  detailError: string;
  SlpsList: any[] = []; // lista de los vendedores
  @BlockUI() blockUI: NgBlockUI;
  documents: IDocumentToSync[];
  searchForm: FormGroup;
  previewForm: FormGroup;
  permisos = true;  
  currentUser: any; // variable para almacenar el usuario actual  
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  page = 1;
  pageSize = 10;
  collectionSize: number;
  model: any;
  constructor(
    private documentsToSyncService: DocumentsToSyncService
    , private alertService: AlertService
    , private smService: SalesManService
    , private commonService: CommonService,
    private permService: PermsService,
    private authenticationService: AuthenticationService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }
  
  ngOnDestroy(): void {
    this.commonService.offlineInformation.next(``);
  }

  ngOnInit() {
    this.CheckPermits();
    this.resetPreviewForm();
    this.InitVariables();
    this.requestData();
  }

  InitVariables(): void {
    this.documents = [];
    const mDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.searchForm = new FormGroup({
      fini: new FormControl(mDate, [Validators.required]),
      ffin: new FormControl(mDate, [Validators.required]),
      docStatus: new FormControl('')
    }); // La definicion del formularioFormGroup;
  }

  requestData() {
    //this.search();
    this.getSalesMan();
  }

  DownloadData(): void {
    swal({
      type: 'warning',
      title: '¿ Desea descargar la información?',
      text: '',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {
        this.blockUI.start(`Descargando la información necesaria, este proceso puede tomar mucho tiempo`);
        this.documentsToSyncService.DownloadData().subscribe(next => {
          this.blockUI.stop();
          console.log(next);
          if (next.Result) {
            this.alertService.successAlert(`Descarga de información completada`);
          }
          else {
            console.log(next);
            this.alertService.errorAlert(`Error al descargar la información ${next.Error.Message}`);
          }
        }, error => {
          this.blockUI.stop();
          console.log(error);
          this.alertService.errorAlert(`Error descargar la información ${error}`);
        });
      }
    }, (dismiss) => {
    });
  }

  SyncUp(): void {
    swal({
      type: 'warning',
      title: '¿ Desea sincronizar los documentos ?',
      text: '',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then(next => {
      if (!(Object.keys(next)[0] === 'dismiss')) {
        this.blockUI.start(`Sincronizando documentos`);
        this.documentsToSyncService.SyncUpDocuments(this.documents.filter(x => x.IsOnSyncUp)).subscribe(next => {
          this.blockUI.stop();
          this.search();
          if (next.Result) {
            this.alertService.successAlert(`Sincronización de documentos completada`);
          }
          else {
            console.log(next);
            this.alertService.infoAlert(`No se puedieron sincronizar los documentos: ${next.Error.Message}`);
          }
        }, error => {
          this.blockUI.stop();
          console.log(error);
          this.alertService.errorAlert(`Error sincronizar los documentos ${error}`);
        });
      }
    }, (dismiss) => {
    });
  }

  search(): void {
    let SEARCH = this.searchForm.value as ISaleOrderSearch;
    SEARCH.docStatus = this.searchForm.value.docStatus;
    this.blockUI.start(`Obteniendo documentos`);
    this.documents = [];
    this.documentsToSyncService.GetDocumentsToSync(SEARCH.docStatus, SEARCH.fini, SEARCH.ffin).subscribe(next => {      
      this.blockUI.stop();
      if (next.Result) {
        this.collectionSize = next.DocumentsToSync.length;
        this.documents = next.DocumentsToSync.map((so, i) => ({ id: i + 1, ...so }));
        this.documents.filter(x => x.DocumentStatus === 'SYNCHRONIZED').forEach(x => x.IsOnSyncUp = false);

        let errorsCounter = 0;
        let pendingCounter = 0;
        let syncupCounter = 0;

        this.documents.forEach(x => {
          switch (x.DocumentStatus) {
            case 'ERROR_ON_SYNCUP':
              errorsCounter++;
              break;
            case 'PENDING_TO_SYNUP':
              pendingCounter++;
              break;
            case 'SYNCHRONIZED':
              syncupCounter++;
          }
        });

        this.commonService.offlineInformation.next(`Sincronizados: ${syncupCounter}  |  Pendientes: ${pendingCounter}  |  Errores: ${errorsCounter}`);
      }
      else {
        console.log(next);
        this.alertService.infoAlert(`No se pudieron obtener los documentos, detalle: ${next.Error.Message}`);
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorAlert(`No se pudieron obtener los documentos, detalle: ${error}`);
    }, () => {
      this.blockUI.stop();
    });
  }

  isNumber(value: string | number): boolean {
    return ((value != null) && (value !== '') && !isNaN(Number(value.toString())));
  }

  preview(_id: number): void {
    this.resetPreviewForm();
    const DOCUMENT = this.documents.find(x => x.Id === _id);
    this.model = JSON.parse(DOCUMENT.ParsedDocument);
    const mDate = formatDate(DOCUMENT.CreationDate, 'yyyy-MM-dd', 'en');
    this.model.DocDate = mDate;
    this.model.DocNum = DOCUMENT.DocEntry;
    this.model.SalesMan = this.SlpsList.find(x => x.SlpCode == this.model.Invoice.SlpCode).SlpName;
    let docTotal = 0;
    this.model.Invoice.InvoiceLinesList.forEach(line => {
      docTotal += (((line.UnitPrice * line.Quantity) - ((line.UnitPrice * line.Quantity) * line.Discount / 100)) + ((line.UnitPrice * line.Quantity) - ((line.UnitPrice * line.Quantity) * line.Discount / 100)) * line.TaxRate / 100);
    });
    this.model.Invoice.DocTotal = docTotal;
    this.previewForm.patchValue({

      CardName: this.model.Invoice.CardName,
      DocDate: mDate,
      DocNum: DOCUMENT.DocEntry ? DOCUMENT.DocEntry : '',
      SalesMan: this.model.SalesMan,
      DocTotal: docTotal

    });
    (<HTMLButtonElement>document.getElementById('previewTrigger')).click();
  }

  showErrorDetail(_id: number): void {
    const DOCUMENT = this.documents.find(x => x.Id === _id);
    const ERROR = JSON.parse(DOCUMENT.ParsedApiResponse) as IBaseResponse;

    if (ERROR && ERROR.Error) {
      this.detailError = ERROR.Error.Message;
      this.codeError = ERROR.Error.Code.toString();
      this.syncUpAttemps = DOCUMENT.SyncUpAttempts;
    }
    else {
      this.detailError = 'Detalle no disponible';
      this.codeError = 'Código no disponible'
      this.syncUpAttemps
    }
    (<HTMLButtonElement>document.getElementById('errorTrigger')).click();
  }

  setForget(_id: number): void {//setForget
    let SELECT = (<HTMLInputElement>document.getElementById(`cb${_id}`));
    this.documents.find(x => x.Id === _id).IsOnSyncUp = SELECT.checked;
  }

  toggleSelects(): void {
    let SELECT = (<HTMLInputElement>document.getElementById('mainToggle'));
    console.log(SELECT.checked);
    this.documents.filter(x => x.DocumentStatus !== 'SYNCHRONIZED').forEach(x => x.IsOnSyncUp = SELECT.checked);
  }

  resetPreviewForm(): void {
    this.previewForm = new FormGroup({
      CardName: new FormControl(''),
      DocDate: new FormControl(''),
      DocNum: new FormControl(''),
      SalesMan: new FormControl(''),
      DocTotal: new FormControl(''),
    }); // La definicion del formularioFormGroup;
  }

  public parsedStatus(_docStatus: number): string {
    return DocumentStatus[_docStatus];
  }

  getSalesMan() {
    this.smService.getSalesMan()
      .subscribe((data: any) => { 
        if (data.Result) {
          this.SlpsList = data.salesManList;
        }
      }, (error: any) => {
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  GetDocumentIndex(_id: number): number {
    return this.documents.indexOf(this.documents.find(y => y.Id === _id)) + 1;
  }

  GetTotalLine(line): string {
    return (((line.UnitPrice * line.Quantity) - ((line.UnitPrice * line.Quantity) * line.Discount / 100)) + ((line.UnitPrice * line.Quantity) -
        ((line.UnitPrice * line.Quantity) * line.Discount / 100)) * line.TaxRate / 100).toFixed(2);
  }
   // Verifica si el usuario tiene permiso para acceder a la pagina
   CheckPermits() {
    this.permService.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();  
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_SyncOff') {
            this.permisos = Perm.Active;
          }
        });
      } else {
        this.permisos = false;
      }
    }, error => {
      this.permisos = false;
      this.blockUI.stop();
    });
  }
}