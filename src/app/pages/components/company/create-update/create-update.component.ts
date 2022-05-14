import { AfterViewChecked, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

// MODELOS
import { ExchangeRate, HandleItem, BillItem, Company, IViewGroup, Mail, KeyValue, IPrice, settings, settingsJson, CONFIG_VIEW } from '../../../../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { CompanyService, SapService, AlertService, ReportsService, CommonService, ExRateService, AuthenticationService } from '../../../../services/index';
import { AngularWaitBarrier } from 'blocking-proxy/built/lib/angular_wait_barrier';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from '../../../../services/storage.service';
import { ElectronRendererService } from 'src/app/electronrenderer.service';
import { IPrinter } from 'src/app/models/i-printer';
import { SynchronizationService } from 'src/app/services/synchronization.service';
import { catchError, first } from 'rxjs/operators';
import { Reports } from 'src/app/enum/enum';
import swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { CompanyMargins } from 'src/app/models/company';
import { Settings } from 'http2';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { DBObjectName } from 'src/app/models/i-dbObjects';
import { getMatIconFailedToSanitizeUrlError } from '@angular/material';
import { Listener } from 'selenium-webdriver';

// PIPES

@Component({
  selector: 'app-create-update',
  templateUrl: './create-update.component.html',
  styleUrls: ['./create-update.component.scss']
})
export class CreateUpdateComponent implements OnInit, AfterViewChecked {

  companyId: number; // id de la compañia, si es cero es creacion, si es diferente de cero es edicion
  mailDataId: number; // id del correo, si es cero es creacion, si es diferente de cero es edicion

  companyMailForm: FormGroup; // formulario de compañia y correo
  @BlockUI() blockUI: NgBlockUI;
  title: string; // titulo del componente
  create: boolean; // variable para reconcer si se esta creando o modificando una compannia
  isDecimalsFormValid: boolean; // Controla la validez del formulario de los decimales
  exchangeRateList: any[] = []; // lista de tipos de cambio
  handleItemList: any[] = []; // lista de tipos de manejo de items
  billItemList: any[] = []; // lista de tipos de facturacion de items
  sapConnectionList: any[] = []; // lista con las conexiones de SAP de la DBLocal
  isLockedPrintersRequest: boolean;

  // adjunto
  selectedFile: File = null; // archivo para  guardar el logo

  PrintInvFile: File = null; // Arcivo de imprecion de las facturas
  PrintQuoFile: File = null; // Archivo de imprecion para cotizaciones
  fileInvenFile: File = null; // Archivo de imprecion para inventario
  PrintCopyFile: File = null; // Archivo de imprecion para reimpreciones
  PrintSOFile: File = null; // Archivo de imprecion para reimpreciones
  PrintOinvPPFile: File = null; // Archivo de imprecion para reimpreciones
  PrintOinvCopyFile: File = null; 
  PrintBalanceFile = null; // Archivo de imprecion para reimpreciones
  modalPay: any; // instancia de la modal de envio de documentos
  groupForm: FormGroup; // Formulario de Agrupacion de lineas
  decimalsForm: FormGroup; // Formulario de Agrupacion de lineas
  viewGroupList: IViewGroup[]; //contiene lista de agrupaciones en linea
  printersList: IPrinter[];
  defaultPrinter: IPrinter;
  // modal de envio de Docuemntos
  closeResult: string;

  // nombre de los files

  imgFileName: string;
  InvFileName: string;
  QuoFileName: string;
  InvenFileName: string;
  CopyFileName: string;
  SOFileName: string;
  OinvPPFileName: string;
  OinvCopyFileName: string;
  BalanceFileName: string;

  reports: KeyValue[];

  // 001 - Margenes aceptados de las vistas 
  ViewMargins: CompanyMargins[];
  // Configuracion campos de  vistas
  Settings: settings[];
  DbObjectNames: DBObjectName[];
  SettingEdit: any;
  // Pinpad: boolean;
  settingInventory: FormGroup;
  settingInvoice: FormGroup;
  settingDefaultSN: FormGroup;
  settingOfflinePP: FormGroup;
  settingModalPayment: FormGroup;
  constructor(
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private companyService: CompanyService,
    private sapService: SapService,
    private router: Router,
    private alertService: AlertService,
    private modalService: NgbModal,
    private storageService: StorageService,
    private authenticationService: AuthenticationService,
    private electronRenderService: ElectronRendererService,
    private synchronizationService: SynchronizationService,
    private reportService: ReportsService,
    private commonService: CommonService,
    private exRateService: ExRateService,
  ) {
    this.isLockedPrintersRequest = false;
  }

  ngOnInit() {
    // tslint:disable-next-line:radix
    // this.Pinpad = false;
    this.viewGroupList = [];
    this.ViewMargins = [];
    this.Settings = [];
    this.DbObjectNames = [];
    this.GetSettings();
    this.GetDbObjectNames();

    this.defaultPrinter = null;
    this.isLockedPrintersRequest = false;
    this.companyId = parseInt(this.activatedRoute.snapshot.paramMap.get('companyId'));
    this.mailDataId = 0;
    this.exchangeRateList = ExchangeRate;
    this.handleItemList = HandleItem;
    this.billItemList = BillItem;
    this.setNewFormData();
    this.getSapConnection();
    this.groupForm = this.fb.group({
      CodNum: ['', Validators.required],
      NameView: ['', Validators.required],
      isGroup: ['', Validators.required],
    });

    this.decimalsForm = new FormGroup({
      price: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(6)]),
      totalLine: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(6)]),
      totalDocument: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(6)])
    });
    this.settingInventory = new FormGroup({
      Comments: new FormControl(''),
      GoodsReceiptAccount: new FormControl('')
    });
    this.settingDefaultSN = new FormGroup({
      DefaultBussinesPartnerCustomer: new FormControl(''),
      DefaultBussinesPartnerSupplier: new FormControl('')
    });
    this.settingInvoice = new FormGroup({
      Name: new FormControl(''),
      Quantity: new FormControl('')
    });
    this.settingOfflinePP = new FormGroup({
      RouteOfflineUrl: new FormControl(''),
      RoutePinpadUrl: new FormControl('')
    });

    this.settingModalPayment = new FormGroup({
      CardValid: new FormControl(''),
      Pinpad: new FormControl(''),
      CardNumber: new FormControl(''),
      RequiredCashAccount: new FormControl(''),
      RequiredTransferAccount: new FormControl(''),
      RequiredCardAccount: new FormControl('')
    });


    this.getViewGroup();
    this.getReports();

    //001
    this.GetMargins();

  }
  ngAfterViewChecked() {
  }

  raisePrintersModal(): void {
    this.printersList = [];

    this.printersList = this.electronRenderService.GetPrinters();

    if (this.defaultPrinter !== null) {
      this.printersList.forEach(x => {
        x.IsDefault = false;

        if (x.DisplayName === this.defaultPrinter.DisplayName) {
          x.IsDefault = true;
        }
      });
    }
    (<HTMLButtonElement>document.getElementById('triggerModalPrintersList')).click();
  }
  setDefaultPrinter(_index: number): void {

    if (this.printersList[_index].IsDefault) return;

    this.printersList.forEach(x => { x.IsDefault = false });
    this.printersList[_index].IsDefault = true;
    this.defaultPrinter = this.printersList[_index];
  }
  // CheckGroup(status: any, lineAgrupation: any) {
  //   // this.invoiceSelected = status.target.checked;  
  //   this.viewGroupList.forEach(vgl => {
  //     if (vgl.Id === lineAgrupation) {
  //       vgl.isGroup = status.target.checked;

  //     }
  //   });
  // }
  getViewGroup() {
    this.companyService.GetViewGroupList().subscribe(response => {
      if (response.Result) {
        this.viewGroupList = response.ViewGroupList;

      }
    });
  }
  updateViewGroup(_index: number): void {
    // this.isUpdatingBarcode = true;
    this.groupForm.patchValue({
      CodNum: this.viewGroupList[_index].CodNum,
      NameView: this.viewGroupList[_index].NameView,
      isGroup: this.viewGroupList[_index].isGroup
    });
  }
  clearGroup(): void {
    this.groupForm.patchValue({
      NameView: '',
      isGroup: ''
    });
    // this.isUpdating = false;
  }
  SaveAgrupation(): void {
    const ViewGroupList = {
      viewLineAgrupationList: this.viewGroupList
    };
    this.blockUI.start('Actualizando agrupaciones, espere por favor...'); // Start blocking
    this.companyService.UpdateViewLineAgrupation(ViewGroupList)
      .subscribe(result => {
        if (result) {
          this.alertService.successAlertHtml(`Agrupaciones actualizadas correctamente`);
          this.close();
          this.getViewGroup();

        } else {
          this.alertService.errorAlert('Error al actualizar la información - Error: ' + result);
        }
        this.blockUI.stop(); // Stop blocking
      });
  }
  close() {
    this.modalPay.close();
    this.getViewGroup();
  }
  closeDbObjectName() {
    this.modalPay.close();
    this.GetDbObjectNames();
  }
  openModal(content) {
    this.modalPay = this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg', windowClass: 'Modal-sm' });
    this.modalPay.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
    });
  }

  cancel() {
    this.router.navigate(['/companies']);
  }

  // funcion para obtener las conexiones de SAP de la DBLocal
  // no recibe parametros
  getSapConnection() {
    this.blockUI.start('Obteniendo conexiones de SAP, espere por favor...'); // Start blocking
    this.sapService.GetSapConnection()
      .subscribe((data: any) => {
        if (data.Result) {
          this.sapConnectionList = data.SAPConnections;
          this.setData();
        } else {
          this.alertService.errorAlert('Error al establecer conexión con SAP - error: ' + data.Error.Message);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  // funcion para colocar cierta informacion de acuerdo al tipo de accion, ya sea creacion o edicion
  setData() {
    if (this.companyId === 0) {
      this.create = true;
      this.title = 'Crear';
    } else {
      this.create = false;
      this.title = 'Actualizar';
      this.getCompanyById();
    }
  }

  // funcion para obtener la info de la compannia  de la DBLocal para su modificacion
  // no recibe parametros
  getCompanyById() {
    this.blockUI.start('Obteniendo información de la compañía, espere por favor...'); // Start blocking
    this.companyService.GetCompanyById(this.companyId)
      .subscribe((data: any) => {
        if (data.Result) {
          this.setUpdateFormData(data.companyAndMail.company, data.companyAndMail.mail);
          console.log('print', this.storageService.getCompanyConfiguration().PrinterConfiguration)
          if (this.storageService.getCompanyConfiguration() !== null && this.storageService.getCompanyConfiguration().PrinterConfiguration !== '') {
            this.defaultPrinter = JSON.parse(this.storageService.getCompanyConfiguration().PrinterConfiguration) as IPrinter;
            // console.log(this.storageService.getCompanyConfiguration().PrinterConfiguration);
          }
        } else {
          this.alertService.errorAlert('Error al cargar la información de las compañias - Error: ' + data.Error.Message);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para colocar la informacion de la companni y correo al actualizar
  setUpdateFormData(company: Company, mail: Mail) {
    this.companyMailForm.patchValue({ DBName: company.DBName });
    this.companyMailForm.patchValue({ DBCode: company.DBCode });
    this.companyMailForm.patchValue({ SAPConnectionId: company.SAPConnectionId });
    this.companyMailForm.patchValue({ ExchangeRate: company.ExchangeRate });
    this.companyMailForm.patchValue({ ExchangeRateValue: company.ExchangeRateValue });
    this.companyMailForm.patchValue({ HandleItem: company.HandleItem });
    this.companyMailForm.patchValue({ BillItem: company.BillItem });
    this.companyMailForm.patchValue({ Active: company.Active });
    this.companyMailForm.patchValue({ Editable: company.IsLinePriceEditable });
    this.companyMailForm.patchValue({ maxAs0: company.ScaleMaxWeightToTreatAsZero });
    this.companyMailForm.patchValue({ ignoreWeight: company.ScaleWeightToSubstract });
    this.companyMailForm.patchValue({ LineMode: company.LineMode });


    this.decimalsForm.patchValue({
      price: company.DecimalAmountPrice,
      totalLine: company.DecimalAmountTotalLine,
      totalDocument: company.DecimalAmountTotalDocument
    });

    if (mail != null) {
      this.companyMailForm.patchValue({ subject: mail.subject });
      this.companyMailForm.patchValue({ from: mail.from });
      this.companyMailForm.patchValue({ user: mail.user });
      this.companyMailForm.patchValue({ pass: mail.pass });
      this.companyMailForm.patchValue({ port: mail.port });
      this.companyMailForm.patchValue({ Host: mail.Host });
      this.companyMailForm.patchValue({ SSL: mail.SSL });
    }

    this.companyMailForm.patchValue({ hasOfflineMode: this.storageService.getConnectionType() });
    this.companyMailForm.patchValue({ hasZeroBilling: company.HasZeroBilling });


    this.MatchMargins(company);
  }

  // funcion para colocar inicializar el form de compannia y correo
  setNewFormData() {
    this.companyMailForm = this.fb.group({
      DBName: ['', [Validators.required, Validators.minLength(1)]],
      DBCode: ['', [Validators.required, Validators.minLength(1)]],
      SAPConnectionId: ['', Validators.required],
      ExchangeRate: ['', Validators.required],
      ExchangeRateValue: ['', Validators.required],
      HandleItem: ['', Validators.required],
      BillItem: ['', Validators.required],
      Active: [false],
      LineMode: [true],
      subject: [''],
      from: [''],
      user: [''],
      pass: [''],
      port: [''],
      Host: [''],
      SSL: [false],
      maxAs0: [''],
      ignoreWeight: [''],
      Editable: [''],
      hasOfflineMode: [''],
      hasZeroBilling: ['']
    });
    this.decimalsForm = new FormGroup({
      price: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(6)]),
      totalLine: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(6)]),
      totalDocument: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(6)])
    });
    this.printersList = [];
  }

  // convenience getter for easy access to company and maildata form fields
  get fCM() { return this.companyMailForm.controls; }
  //confirmación cambio en toggle

  ChangeConnectiontype() {
    if (!this.storageService.getConnectionType()) {
      this.blockUI.start('Verificando conexión a servicios locales...')
      this.authenticationService.VerifyOfflineConecction().subscribe(response => {
        this.blockUI.stop();
        if (response.status == 200) {
          setTimeout(() => {
            this.swalconfirm();
          }, 500);
        } else {
          this.blockUI.stop();
          this.companyMailForm.patchValue({ hasOfflineMode: this.storageService.getConnectionType() });
          this.alertService.errorInfoAlert('No es posible conectar con los servicios locales');
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert('No es posible conectar con los servicios locales');
        this.companyMailForm.patchValue({ hasOfflineMode: this.storageService.getConnectionType() });

      });
    } else {
      if (navigator.onLine) {
        this.swalconfirm();
      } else {
        this.alertService.errorInfoAlert('No es posible conectar con los servicios en línea, verifique su conexión a internet.');
        this.companyMailForm.patchValue({ hasOfflineMode: this.storageService.getConnectionType() });
      }
    }
  }


  swalconfirm(): void {
    swal({
      type: 'warning',
      title: `La conexión de la aplicación permanecerá en modo ${this.companyMailForm.value.hasOfflineMode == 0 ? 'Online' : 'Offline'}, Desea Continuar?`,
      text: '¿ Desea continuar ?',
      showCancelButton: true,
      confirmButtonColor: '#049F0C',
      cancelButtonColor: '#ff0000',
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then(next => {
      if ((Object.keys(next)[0] === 'dismiss')) {
        this.companyMailForm.patchValue({ hasOfflineMode: this.storageService.getConnectionType() });
      }
    });
  }

  // 001 - Actualiza los margenes que acepta una compañia.
  SaveMargins(): void {
    if (!this.ViewMargins || this.ViewMargins.length == 0) {
      this.alertService.infoAlert('No hay información que actualizar');
      return;
    }


    if (this.ViewMargins.find(i => i.Value > 100)) {
      this.alertService.infoAlert('Margen máximo permitido es de 100');
      return;
    }
    if (this.ViewMargins.find(i => i.Value < 0)) {
      this.alertService.infoAlert('Margen mínimo permitido es de 0');
      return;
    }



    this.blockUI.start('Actualizando márgenes');
    this.companyService.UpdateMargins(this.companyId, this.ViewMargins).subscribe(response => {
      this.blockUI.stop();
      if (response) {

        this.raiseAlertToSave();
        this.modalService.dismissAll();
      } else {
        console.log(response);
        this.alertService.errorAlert('Error al actualizar la información - Error: ' + response);
      }
    }, err => {
      this.blockUI.stop();
      console.log(err);
      this.alertService.errorAlert('Error al actualizar la información - Error: ' + err);
    });
  }

  SaveMemoryInvoiceConfig() {
    let setting = this.Settings.find(s => s.Codigo == CONFIG_VIEW.Invoice);
    if (setting) {
      setting.Json = JSON.stringify(this.settingInvoice.value);
    } else {
      setting = {
        Id: null,
        Codigo: CONFIG_VIEW.Invoice,
        Vista: 'Facturación',
        Json: JSON.stringify(this.settingInvoice.value)
      };
    }
    this.companyService.SaveSettings(setting).subscribe(response => {
      if (response.Result) {
        this.alertService.successAlertHtml(`Configuraciones actualizadas correctamente`);
        this.close();
        this.GetSettings();
      } else {
        //  this.alertService.errorAlert('Ocurrio un error actualizando Configuraciones' + response.errorInfo);
      }

    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de vistas ' + err);
    });
  }



  GetMargins(): void {
    this.companyService.GetMargins().subscribe(response => {
      if (response.Result) {
        this.ViewMargins = response.Data;
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo margenes ' + response.Error.Message);
      }

    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo margenes ' + err);
    });

  }

  MatchMargins(company: Company): void {
    if (company.AcceptedMargins) {
      let MarginsFromCompany: CompanyMargins[] = JSON.parse(company.AcceptedMargins);
      MarginsFromCompany.forEach(x => {
        let exist = this.ViewMargins.findIndex(i => i.Code === x.Code);
        if (exist !== -1) {
          this.ViewMargins[exist] = x;
        }
      });
    }

  }





  // funcion de creacion de compannia
  onSubmit() {
    // stop here if form is invalid
    if (this.companyMailForm.invalid) {
      this.alertService.warningInfoAlert('El formulario de compañía contiene errores');
      // this.alertService.error('El formato del usuario debe ser ejemplo@ejemplo.com');
      return;
    }


    this.storageService.setHasOfflineMode(this.companyMailForm.value.hasOfflineMode);
    if (this.companyId === 0) {
      this.blockUI.start('Creando compañías, espere por favor...'); // Start blocking

      this.companyService.CreateCompanyAndMail(this.companyMailForm, this.companyId, this.mailDataId,
        this.selectedFile, this.PrintInvFile, this.PrintQuoFile, this.PrintSOFile, this.PrintBalanceFile,
        this.fileInvenFile,this.PrintOinvPPFile,this.PrintOinvCopyFile, this.router, this.alertService, this.decimalsForm, this.defaultPrinter);


      this.storageService.setCompanyConfiguration(
        this.decimalsForm.value.price,
        this.decimalsForm.value.totalLine,
        this.decimalsForm.value.totalDocument,
        null, this.companyMailForm.value.hasZeroBilling, this.companyMailForm.value.LineMode, JSON.stringify(this.ViewMargins));
      this.storageService.setConnectionType(this.companyMailForm.value.hasOfflineMode);
      this.exRateService.getExchangeRate().subscribe(next => {
        if (next.Result) {
          this.commonService.exchangeRate.next(next.exRate);
        }
        else {
          console.log(`GetExrateError ${next}`);
        }
      }, error => {
        console.log(`GetExrateError ${error}`);
      });
    } else {
      this.blockUI.start('Actualizando compañias, espere por favor...'); // Start blocking   

      // let setting = this.Settings.find(s => s.Codigo == CONFIG_VIEW.Pinpad);  
      // if (setting) {          
      //   setting.Json = JSON.stringify({ Pinpad: this.Pinpad});    
      // } else {     
      //   setting = {
      //     Id: null,
      //     Codigo: CONFIG_VIEW.Pinpad,
      //     Vista: 'Facturación uso pinpad',
      //     Json: JSON.stringify({ Pinpad: this.Pinpad})        
      //   };
      // } 

      // this.companyService.SaveSettings(setting).subscribe(response => {
      //   if (response.Result) {        
      //     this.GetSettings();
      //   } else {
      //     console.log(response);
      //     //  this.alertService.errorAlert('Ocurrio un error actualizando Configuraciones' + response.errorInfo);
      //   }

      // }, err => {
      //   console.log(err);
      //   this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de vistas ' + err);
      // });
      // test
      let setting = this.Settings.find(s => s.Codigo == CONFIG_VIEW.Payment);
      if (setting) {
        setting.Json = JSON.stringify(this.settingModalPayment.value);
      } else {
        setting = {
          Id: null,
          Codigo: CONFIG_VIEW.Payment,
          Vista: 'Payment',
          Json: JSON.stringify(this.settingModalPayment.value)
        };
      }
      this.companyService.SaveSettings(setting).subscribe(response => {
        if (response.Result) {
          this.alertService.successAlertHtml(`Configuraciones actualizadas correctamente`);
          this.GetSettings();
        } else {
          console.log(response.Error.Message);
        }

      }, err => {
        console.log(err);
      });

      this.companyService.UpdateCompanyAndMail(this.companyMailForm, this.companyId, this.mailDataId,
        this.selectedFile, this.PrintInvFile, this.PrintQuoFile, this.PrintSOFile, this.PrintBalanceFile,
        this.fileInvenFile, this.PrintOinvPPFile,this.PrintOinvCopyFile, this.router, this.alertService, this.decimalsForm, this.defaultPrinter);
      this.storageService.setCompanyConfiguration(
        this.decimalsForm.value.price,
        this.decimalsForm.value.totalLine,
        this.decimalsForm.value.totalDocument,
        this.defaultPrinter, this.companyMailForm.value.hasZeroBilling, this.companyMailForm.value.LineMode, JSON.stringify(this.ViewMargins));
      this.storageService.setConnectionType(this.companyMailForm.value.hasOfflineMode);

      this.exRateService.getExchangeRate().subscribe(next => {
        if (next.Result) {
          this.commonService.exchangeRate.next(next.exRate);
        }
        else {
          console.log(`GetExrateError ${next}`);
        }
      }, error => {
        console.log(`GetExrateError ${error}`);
      });

      //this.router.navigate(['/companies']);
    }



  }

  // funcion para seleccionar un archivo a guardar
  onFileSelected(event, n: number) {
    switch (n) {
      case 1:
        this.selectedFile = <File>event.target.files[0]; // guarda el logo
        this.imgFileName = this.selectedFile.name;
        break;
      case 2:
        this.PrintInvFile = <File>event.target.files[0]; // imprimir facturas
        this.InvFileName = this.PrintInvFile.name;
        break;
      case 3:
        this.PrintQuoFile = <File>event.target.files[0]; // imprimir Cotizacion
        this.QuoFileName = this.PrintQuoFile.name;
        break;
      case 4:
        this.fileInvenFile = <File>event.target.files[0]; // imprimir Orden de venta
        this.InvenFileName = this.fileInvenFile.name;
        break;
      case 5:
        this.PrintBalanceFile = <File>event.target.files[0]; // imprimir reimprecion
        this.BalanceFileName = this.PrintBalanceFile.name;
        break;
      case 6:
        this.PrintSOFile = <File>event.target.files[0]; // imprimir reimprecion
        this.SOFileName = this.PrintSOFile.name;
        break;  
      case 7:
        this.PrintOinvPPFile = <File>event.target.files[0]; // imprimir reimprecion
        this.OinvPPFileName = this.PrintOinvPPFile.name;
        break;
      case 8:
        this.PrintOinvCopyFile = <File>event.target.files[0]; // imprimir reimprecion
        this.OinvCopyFileName = this.PrintOinvCopyFile.name;
        break;
    }
  }

  raiseAlertToSave(): void {
    this.alertService.warningInfoAlert('Recuerde presionar el boton actualizar, para guardar sus cambios');
  }

  downloadData(): void {
    this.synchronizationService.ItemsDownload().subscribe(x => {
      console.log(x);
    });
  }

  uploadData(): void {

  }

  getReports() {  
    this.reports = [];
    this.reportService.getReports()
      .subscribe(response => {
        if (response.Result) {
          this.reports = response.Reports;
          this.setFilesNames();
        } else {
          this.alertService.errorAlert(response.Error.Message);
        }
      }, err => {
        this.alertService.errorAlert(err);
      });
  }

  downloadReportFile(reportKey: number, reportName: string) {
    this.blockUI.start();
    this.reportService.downloadReportFile(reportKey)
      .subscribe(response => {
        this.blockUI.stop();

        if (response.Result) {
          this.commonService.downloadFile(
            response.File,
            reportName.substring(0, reportName.length - 4),
            'application/octet-stream',
            'rpt');
        } else {
          this.alertService.errorAlert(response.Error.Message);
        }
      }, err => {
        this.blockUI.stop();
        this.alertService.errorAlert(err);
      });
  }

  setFilesNames() {
    this.reports.forEach(x => {
      switch (x.Key) {
        case Reports.Balance:
          this.BalanceFileName = x.Value;
          break;
        case Reports.Inventory:
          this.InvenFileName = x.Value;
          break;
        case Reports.Invoice:
          this.InvFileName = x.Value;
          break;
        case Reports.Quotation:
          this.QuoFileName = x.Value;
          break;
        case Reports.SaleOrder:
          this.SOFileName = x.Value;
          break;
        case Reports.InvoicePP:
          this.OinvPPFileName = x.Value;
          break;
        case Reports.InvoiceCopy:
          this.OinvCopyFileName = x.Value;
          break;
      }
    });
  }
  //#region settings
  GetSettings(): void {
    this.companyService.GetSettings().subscribe(response => {
      if (response.Result) {
        this.Settings = response.Data;

        if (this.Settings.filter(x => x.Codigo == CONFIG_VIEW.Invoice && x.Json !== '').find(i => i.Codigo == CONFIG_VIEW.Invoice)) {
          this.settingInvoice.patchValue({
            Name: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Invoice).Json)).Name,
            Quantity: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Invoice).Json)).Quantity,
          });
        }
        if (this.Settings.filter(x => x.Codigo == CONFIG_VIEW.OIGN && x.Json !== '').find(i => i.Codigo == CONFIG_VIEW.OIGN)) {
          this.SettingEdit = JSON.parse(this.Settings.filter(x => x.Json !== '').find(i => i.Codigo == CONFIG_VIEW.OIGN).Json);
          this.settingInventory.patchValue({
            Comments: this.SettingEdit.Comments,
            GoodsReceiptAccount: this.SettingEdit.GoodsReceiptAccount,
          });
        }
        if (this.Settings.filter(x => x.Codigo == CONFIG_VIEW.BussinesPartner && x.Json !== '').find(i => i.Codigo == CONFIG_VIEW.BussinesPartner)) {
          this.settingDefaultSN.patchValue({
            DefaultBussinesPartnerCustomer: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.BussinesPartner).Json)).DefaultBussinesPartnerCustomer,
            DefaultBussinesPartnerSupplier: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.BussinesPartner).Json)).DefaultBussinesPartnerSupplier,
          });
        }

        if (this.Settings.filter(x => x.Codigo == CONFIG_VIEW.OFFLINE_PP && x.Json !== '').find(i => i.Codigo == CONFIG_VIEW.OFFLINE_PP)) {
          this.settingOfflinePP.patchValue({
            RouteOfflineUrl: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.OFFLINE_PP).Json)).RouteOfflineUrl,
            RoutePinpadUrl: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.OFFLINE_PP).Json)).RoutePinpadUrl,
          });
        }
        if (this.Settings.filter(x => x.Codigo == CONFIG_VIEW.Payment && x.Json !== '').find(i => i.Codigo == CONFIG_VIEW.Payment)) {
          this.settingModalPayment.patchValue({
            CardValid: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Payment).Json)).CardValid,
            Pinpad: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Payment).Json)).Pinpad,
            CardNumber:(JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Payment).Json)).CardNumber,
            RequiredTransferAccount: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Payment).Json)).RequiredTransferAccount,
            RequiredCashAccount: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Payment).Json)).RequiredCashAccount,
            RequiredCardAccount: (JSON.parse(this.Settings.find(i => i.Codigo == CONFIG_VIEW.Payment).Json)).RequiredCardAccount
          });
        }
      } else {
        console.log(response.Error.Message);
        // this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de vistas ' + response.errorInfo.Message);
      }

    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de vistas ' + err);
    });

  }

  SaveSettingsInventory() {

    let setting = this.Settings.find(s => s.Codigo == CONFIG_VIEW.OIGN);
    if (setting) {
      setting.Json = JSON.stringify(this.settingInventory.value);
    } else {
      setting = {
        Id: null,
        Codigo: CONFIG_VIEW.OIGN,
        Vista: 'Ajuste de Inventario',
        Json: JSON.stringify(this.settingInventory.value)
      };
    }
    this.companyService.SaveSettings(setting).subscribe(response => {
      if (response.Result) {
        this.alertService.successAlertHtml(`Configuraciones actualizadas correctamente`);
        this.close();
        this.GetSettings();
      } else {
        this.alertService.errorAlert('Ocurrió un error actualizando Configuraciones' + response.Error);
      }

    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de vistas ' + err);
    });
  }
  SaveSettingsDefaultSN() {

    let setting = this.Settings.find(s => s.Codigo == CONFIG_VIEW.BussinesPartner);
    if (setting) {
      setting.Json = JSON.stringify(this.settingDefaultSN.value);
    } else {
      setting = {
        Id: null,
        Codigo: CONFIG_VIEW.BussinesPartner,
        Vista: 'DefaultSN',
        Json: JSON.stringify(this.settingDefaultSN.value)
      };
    }
    this.companyService.SaveSettings(setting).subscribe(response => {
      if (response.Result) {
        this.alertService.successAlertHtml(`Configuraciones actualizadas correctamente`);
        this.close();
        this.GetSettings();
      } else {
        this.alertService.errorAlert('Ocurrió un error actualizando Configuraciones' + response.Error);
      }

    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de vistas ' + err);
    });
  }
  SaveSettingsOfflinePP() {

    let setting = this.Settings.find(s => s.Codigo == CONFIG_VIEW.OFFLINE_PP);
    if (setting) {
      setting.Json = JSON.stringify(this.settingOfflinePP.value);
    } else {
      setting = {
        Id: null,
        Codigo: CONFIG_VIEW.OFFLINE_PP,
        Vista: 'Offline Pinpad',
        Json: JSON.stringify(this.settingOfflinePP.value)
      };
    }
    this.companyService.SaveSettings(setting).subscribe(response => {
      if (response.Result) {
        this.alertService.successAlertHtml(`Configuraciones actualizadas correctamente`);
        this.storageService.SetUrlOffilePP(this.settingOfflinePP.value);
        this.close();
        this.GetSettings();
      } else {
        this.alertService.errorAlert('Ocurrió un error actualizando Configuraciones' + response.Error);
      }

    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de vistas ' + err);
    });
  }
  //#endregion settings

  //#region DbObjectName
  GetDbObjectNames(): void {
    this.companyService.GetDbObjectNames().subscribe(response => {
      if (response) {
        this.DbObjectNames = response.Data;



      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuracion nombre de objetos ' + response.Error.Message);
        console.log(response.Error.Message);
      }

    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion de nombre de objetos ' + err);
    });
  }

  UpdateDbObjectNames(): void {
    this.blockUI.start('Actualizando nombres de objetos, espere por favor...');
    this.companyService.UpdateDbObjectNames(this.DbObjectNames)
      .subscribe(result => {
        if (result) {
          this.alertService.successAlertHtml(`Nombres de objetos actualizados correctamente`);
          this.closeDbObjectName();
          this.GetDbObjectNames();

        } else {
          this.alertService.errorAlert('Error al actualizar nombres de objetos - Error: ' + result);
        }
        this.blockUI.stop();
      });
  }
  //#endregion  
  // ChangePinpad(event: any) {   
  //   if (event.target.checked) {
  //     this.Pinpad = event.target.checked
  //   }
  // }
}
