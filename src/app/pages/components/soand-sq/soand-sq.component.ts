import { Component, OnInit, HostListener } from '@angular/core';
import { formatDate } from '@angular/common';
import { SOAndSQService } from 'src/app/services/soand-sq.service';
import { ISaleOrder, ISaleQuotation, ISaleOrderSearch, IPrinter } from 'src/app/models';
import { NgBlockUI, BlockUI } from 'ng-block-ui';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { debounceTime, map, distinctUntilChanged } from 'rxjs/operators';
import { SalesManService, AlertService, BusinessPartnerService, StoreService, CommonService, ReportsService, StorageService } from 'src/app/services';
import { Router } from '@angular/router';
import { NgbPaginationConfig } from '@ng-bootstrap/ng-bootstrap';
import { DocumentType, SOAndSQActions, ReportType, KEY_CODE, PRINTERS_PER_REPORT } from 'src/app/enum/enum';
import { ElectronRendererService } from 'src/app/electronrenderer.service';
import { IDocument, ISaleDocument } from 'src/app/models/i-document';

const printJS = require('print-js');

@Component({
  selector: 'app-soand-sq',
  templateUrl: './soand-sq.component.html',
  styleUrls: ['./soand-sq.component.scss']
})
export class SOandSQComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  saleOrders: ISaleOrder[];
  saleOrder: ISaleDocument;
  saleQuotations: ISaleQuotation[];
  saleQuotation: IDocument;
  searchForm: FormGroup;
  previewForm: FormGroup;
  nowDate: any;
  bpCodeNameList: string[] = []; // lista de los codigo con nombres de clientes
  bpList: string[];
  StatusFact: String;
  Formadate: string;

  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  SlpsList: string[]; //= []; // lista de los vendedores
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  status: boolean[] = [true, false];
  invoiceSelected = false; //Existe factura seleccionada
  page = 1;
  pageSize = 10;
  collectionSize: number;
  model: any;

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.F6) {
      this.redirectToQuotation();
    }
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.F7) {
      this.redirectToSO();
    }
  };
  constructor(
    private storageService: StorageService,
    private reportsService: ReportsService,
    private electronRendererService: ElectronRendererService,
    private commonService: CommonService,
    private soAndSqService: SOAndSQService,
    private smService: SalesManService,
    private alertService: AlertService,
    private bpService: BusinessPartnerService,
    private router: Router,
    private storeService: StoreService,
    private config: NgbPaginationConfig) {
    this.config.size = 'sm';
  }

  ngOnInit() {
    this.InitVariables();
    this.search();
  }


  searchSLP = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.SlpsList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10)))

  searchBP = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10)))

  search(): void {
    let SEARCH = this.searchForm.value as ISaleOrderSearch;

    //SEARCH.docStatus = 'O';

    if (!this.isNumber(SEARCH.docNum)) {
      SEARCH.docNum = 0;
    }
    SEARCH.docNum = this.searchForm.value.docNum;
    SEARCH.docStatus = this.searchForm.value.docStatus;

    if (SEARCH.slpCode !== 0) {
      const CODE = this.searchForm.value.slpCode + '';
      SEARCH.slpCode = +CODE.split(' ')[0];
    }

    if (SEARCH.cardCode !== '') {
      SEARCH.cardCode = SEARCH.cardCode.split(' ')[0];
    }
    // console.log(SEARCH);
    SEARCH.docNum = +SEARCH.docNum;
    this.saleOrders = [];
    this.saleQuotations = [];
    this.searchForm.patchValue({ docNum: SEARCH.docNum });
    this.blockUI.start(`Obteniendo documentos`);
    if (SEARCH.doctype === 'SO') {
      this.soAndSqService.GetSaleOrders(SEARCH).subscribe(next => {
        if (next.Result) {
          try {
            this.collectionSize = next.SaleOrders.length;
            this.saleOrders = next.SaleOrders.map((so, i) => ({ id: i + 1, ...so }))
              .slice((this.page - 1) * this.pageSize, (this.page - 1) * this.pageSize + this.pageSize);
            this.blockUI.stop();
          }
          catch (err) {
            this.blockUI.stop();
          }
        }
        else {
          this.blockUI.stop();
          this.alertService.errorAlert(`No se pudieron obtener las órdenes de venta, detalle: ${next.Error.Message}`);
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
      }, () => {
        this.blockUI.stop();
      });
    }
    else {
      this.soAndSqService.GetSaleQuotations(SEARCH).subscribe(next => {
        this.blockUI.stop();
        if (next.Result) {
          this.collectionSize = next.Quotations.length;
          this.saleQuotations = next.Quotations.map((sq, i) => ({ id: i + 1, ...sq }))
            .slice((this.page - 1) * this.pageSize, (this.page - 1) * this.pageSize + this.pageSize);
        }
        else {
          this.alertService.errorAlert(`No se pudieron obtener las cotizaciones ${next.Error.Message}`);
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`No se pudieron obtener las cotizaciones, detalle: ${error}`);
      }, () => {
        this.blockUI.stop();
      });
    }
  }

  edit(_docNum: number, _documentType: number, _currency: string, _cardCode: string, _slpCode: number): void {
    let docNum = -1;
    

    if (_documentType === 0) {
      this.saleOrders.forEach(x => {
        if (x.DocEntry === _docNum) docNum = x.DocNum;
      });
    }
    else {
      this.saleQuotations.forEach(x => {
        if (x.DocEntry === _docNum) docNum = x.DocNum;
      });
    }
    this.saleOrder = null;
    this.saleOrders = [];
    this.saleQuotation = null;
    this.saleQuotations = [];
    this.SlpsList = [];
    this.bpList = [];
    let CustomerData: string = JSON.stringify({
      'CardCode': _cardCode,
      'Currency': _currency,
      'SlpCode': _slpCode
    });  

  

    this.commonService.hasDocument.next(`Documento número ${docNum}`);
    this.storeService.SaveBreadCrum(`Documento número ${docNum}`);
    this.storeService.SaveCustomerData(CustomerData);
    if (_documentType === 0) { // SALE ORDER
      this.storeService.saveDocEntry(_docNum);
      this.storeService.SaveUIAction(SOAndSQActions.EditOrder);
      // this.router.navigate(['/', 'so']);   
      this.router.navigate(['/', 'so',`${SOAndSQActions.EditOrder}`]);
    }      
    else {
      this.storeService.saveDocEntry(_docNum);
      this.storeService.SaveUIAction(SOAndSQActions.EditQuotation);
      // this.router.navigate(['/', 'quotation']);
      this.router.navigate(['/', 'quotation',`${SOAndSQActions.EditQuotation}`]);
    }
  }

  preview(_docNum: number, _documentType: number): void {
    this.blockUI.start('Obteniendo documento, espere por favor');
    if (_documentType === 0) { // SALE ORDER
      this.soAndSqService.GetSaleOrder(_docNum).subscribe(next => {
        this.blockUI.stop();
        if (next.Result) {
          this.saleOrder = next.Data;
          this.saleOrder.DocDate = formatDate(this.saleOrder.DocDate, 'yyyy-MM-dd', 'en');
          this.previewForm.patchValue({ ...this.saleOrder });
          (<HTMLButtonElement>document.getElementById('previewTrigger')).click();
        }
        else {
          console.log(next);
          this.alertService.errorAlert(`No se pudo obtener el documento ${next.Error.Message}`);
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`No se pudo obtener el documento ${error}`);
      }, () => {
        this.blockUI.stop();
      });
    }
    else { //SALE QUOTATION
      this.soAndSqService.GetSaleQuotation(_docNum).subscribe(next => {
        this.blockUI.stop();
        if (next.Result) {
          this.saleQuotation = next.Data;
          this.saleQuotation.DocDate = formatDate(this.saleQuotation.DocDate, 'yyyy-MM-dd', 'en');
          this.previewForm.patchValue({ ...this.saleQuotation });
          (<HTMLButtonElement>document.getElementById('previewTrigger')).click();
        }
        else {
          console.log(next);
          this.alertService.errorAlert(`No se pudo obtener el documento ${next.Error.Message}`);
        }
      }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`No se pudo obtener el documento ${error}`);
      }, () => {
        this.blockUI.stop();
      });
    }
  }

  copyTo(_docNum: number, _currency: string, _cardCode: string, _slpCode: number): void {

    localStorage.setItem("DocEntry", _docNum.toString());
    let docNum = -1;
    let CustomerData: string = JSON.stringify({
      'CardCode': _cardCode,
      'Currency': _currency,
      'SlpCode': _slpCode
    });
    this.storeService.SaveCustomerData(CustomerData);
    if (this.searchForm.get("doctype").value === "SO") {
      this.saleOrders.forEach(x => {
        if (x.DocEntry === _docNum) docNum = x.DocNum;
      });
      this.commonService.hasDocument.next(`Basado en órden número ${docNum}`);
      this.storeService.SaveBreadCrum(`Basado en órden número ${docNum}`);
      localStorage.setItem("SOAndSQAction", SOAndSQActions.CopyToInvoice.toString());
      // this.router.navigateByUrl("invo");  
      this.router.navigateByUrl(`invo/${SOAndSQActions.CopyToInvoice}`);         
    } else {
      this.saleQuotations.forEach(x => {  
        if (x.DocEntry === _docNum) docNum = x.DocNum;
      });
      this.commonService.hasDocument.next(`Basado en cotización número ${docNum}`);
      this.storeService.SaveBreadCrum(`Basado en cotización número ${docNum}`);
      localStorage.setItem("SOAndSQAction", SOAndSQActions.CopyToOrder.toString());
    //  this.router.navigateByUrl("so");
      this.router.navigateByUrl(`so/${SOAndSQActions.CopyToOrder}`);
    }
  }


  getPurchaseorderList(): void {

  }

  changeDocumentType(_documentType: string): void {


    this.searchForm.patchValue({ doctype: _documentType });
    this.saleOrders = [];
    this.saleQuotations = [];
    this.page = 1;
    this.pageSize = 10;

    this.search();
  }

  GetSalesPersonList(): void {
    this.blockUI.start('Obteniendo vendedores, espere por favor...');
    this.smService.getSalesMan()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.SlpsList = [];
          data.salesManList.forEach(x => {
            this.SlpsList.push(x.SlpCode + ' - ' + x.SlpName);
          });
        } else {
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
      }, (error: any) => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      }, () => {
        this.blockUI.stop();
      });
  }

  getCustomers(): void {
    this.blockUI.start('Obteniendo clientes, espere por favor...');
    this.bpService.GetCustomers()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data && data.Code === undefined && data.BPS != null) {
          this.bpList = [];
          data.BPS.forEach(x => {
            this.bpList.push(x.CardCode + ' ' + x.CardName);
          });
        } else {
          console.log(data.errorInfo);
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      }, () => {
        this.blockUI.stop();
      });
  }

  InitVariables(): void {
    this.blockUI.start(`Obteniendo información, espere por favor.`);
    const mDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.saleOrders = [];
    this.saleQuotations = [];
    this.saleQuotation = null;
    this.saleOrder = null;
    this.searchForm = new FormGroup({
      slpCode: new FormControl(''),
      cardCode: new FormControl(''),
      fini: new FormControl('', [Validators.required]),
      ffin: new FormControl(mDate, [Validators.required]),
      doctype: new FormControl('SO', [Validators.required]),
      docStatus: new FormControl('O'),
      docNum: new FormControl(0)
    }); // La definicion del formularioFormGroup;

    this.searchForm.patchValue({ ffin: mDate });
    this.searchForm.patchValue({ fini: mDate });
    this.GetSalesPersonList();
    this.getCustomers();
    this.saleQuotations = [];
    this.resetPreviewForm();
    this.pageSize = 10;
  }
  CreateNew() {
    this.InitVariables();
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

  isNumber(value: string | number): boolean {
    return ((value != null) && (value !== '') && !isNaN(Number(value.toString())));
  }

  printQuotation(_docEntry: number) {
    this.blockUI.start('Generando la impresión...');
    this.reportsService.printReport(_docEntry, ReportType.Quotation)
      .subscribe(data => {
        this.blockUI.stop();
        if(data.Result){
        if (this.electronRendererService.CheckElectron()) {
          let fileName = 'Quotation_' + _docEntry + '.pdf';

          const PRINTER: IPrinter = this.storageService.GetPrinterConfiguration(PRINTERS_PER_REPORT.SALE_QUOTATION);
          let file;

          if (PRINTER) {
            file = {
              "fileName": fileName,
              "file": data.Data,
              "defaultPrinter": PRINTER.DisplayName
            };
          }
          else {
            this.alertService.infoAlert('No se ha definido una impresora para este reporte, se usará la configurada por defecto en windows');
            file = {
              "fileName": fileName,
              "file": data.Data
            };
          }
          // let file = { "fileName": fileName, "file": data };
          this.electronRendererService.send('Print', file);
        }
        else {
          printJS({
            printable: data.Data,
            type: 'pdf',
            base64: true
          })
        }
      }else{
        this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);  
      }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  redirectToSO() {
    this.router.navigate(['so']);
  }

  redirectToQuotation() {
    this.router.navigate(['quotation']);
  }

}
