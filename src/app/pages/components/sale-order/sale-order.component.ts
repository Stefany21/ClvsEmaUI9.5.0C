import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, Renderer2, DoCheck } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Observable, Subject, merge, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, first } from 'rxjs/operators';
import { DatePipe, DecimalPipe, formatDate } from '@angular/common';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ElectronService } from 'ngx-electron';
const printJS = require('print-js');

// MODELOS
import { Params, IdentificationType, UserAssigns, IBusinessPartner, IOverdueBalance, IPaymentMethod, ISaleOrder, ISaleQuotation, IDocumentLine, IUdf, IUdfTarget, Company, IViewGroup } from './../../../models/index';
import { ReportType, SOAndSQActions, KEY_CODE, BoDocumentTypes, BaseTypeLines } from '../../../enum/enum';
// RUTAS

// COMPONENTES

// SERVICIOS
import { Router } from '@angular/router';
import {
  CompanyService, UserService, ItemService, BusinessPartnerService, DocumentService, TaxService, PermsService,
  AuthenticationService, ParamsService, ReportsService, AlertService,
  SalesManService, ExRateService, JsonDataService, StorageService, CommonService
} from '../../../services/index';

import { SOAndSQService } from 'src/app/services/soand-sq.service';

// Electron renderer service
import { ElectronRendererService } from '../../../electronrenderer.service';
import { UdfsService } from 'src/app/services/udfs.service';
import { DOCUMENT_ALIAS } from 'src/app/models/constantes';
import { IudfValue } from 'src/app/models/iudf-value';
import { EventManager } from '@angular/platform-browser';
import { LinesBaseModel } from 'src/app/models/i-invoice-document';
import { Currency } from 'src/app/models/i-currency';
import { IDocument, ISaleDocument } from 'src/app/models/i-document';


@Component({
  selector: 'app-sale-order',
  templateUrl: './sale-order.component.html',
  styleUrls: ['./sale-order.component.scss'],
  providers: [DecimalPipe, DatePipe]
})
export class SaleOrderComponent implements OnInit, OnDestroy, DoCheck {
  //VARBOX
  isOnGroupLine: boolean;//Agrupacion de lineas en documento
  isLineMode: boolean;//Orden de lineas en documento al inicio o final 
  isScanning: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  currentNgbIndex = 0;
  COMPANY: Company; // Usada para guardar las configuraciones del a compania
  TO_FIXED_PRICE: string; // Contiene la cantidad de decimales a usar en el precio unitario
  TO_FIXED_TOTALLINE: string; // Contiene la cantidad de decimales a usar en el total de linea
  TO_FIXED_TOTALDOCUMENT: string; // Contiene la cantidad de decimales a usar en el total del documento
  udfs: IUdf[];
  isAllowedWHChange: boolean;
  typesInvoice: any[] = [];
  uniqueInvCode: string;
  documentType: string;
  isRequiredEmail: boolean;
  hasIdentification: boolean;
  isOnPrint: boolean;
  priceList: number;
  subscriptions: Subscription;
  currentRequest: number;
  requestToAwait: number;
  $requestViewer: Subject<number>;
  InvalidCardName: boolean;
  returnedDocEntry: number;
  returnedDocNum: number;
  titleSaleOrder: string;
  overdueBalances: IOverdueBalance[];
  paymentMethods: IPaymentMethod[];
  isEditingPrice: boolean;
  customers: IBusinessPartner[];
  typeArrow: boolean; // Hace toggle al darle click
  saleOrder: IDocument;
  saleQuotation: IDocument;
  hasLines: boolean;
  //#region Cambios Jorge EMA Aromas
  whCode: string;
  whName: string;
  //#endregion
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual

  isAllowedPriceListChange: boolean; // Controla el cambio de lista por parte del usuario
  public model: any;
  @BlockUI() blockUI: NgBlockUI;

  soForm: FormGroup; // formulario para la orden de venta
  feForm: FormGroup;
  // totalForm: FormGroup; // formulario para el total de la orden de venta
  submitted = false; // variable para reconcer si se envio una peticion o no
  maxDiscuont: any;
  setCurr: string; // tipo de moneda escogida en simbolo
  currencyList: Currency[] = []; // lista de tipos de cambio
  allCurrencyList: Currency[] = []; // lista de todos los tipos de cambio existentes en la aplicacion
  itemsList: any[] = []; // lista de items
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  itemsCodeList: string[] = []; // lista de los Códigos de items
  itemsNameList: string[] = []; // lista de los nombres de items
  PayTermsList: any[] = []; // lista de los terminos de pago
  PriceList: any[] = []; // lista de las listas de precio
  SlpsList: any[] = []; // lista de los vendedores

  bpList: any[] = []; // lista de clientes
  bpCodeList: string[] = []; // lista de los Códigos de clientes
  bpNameList: string[] = []; // lista de los nombres de clientes
  companiesList: any[] = []; // lista de las compannias

  userAssignsList: UserAssigns[] = [];
  defaultSlpCode: number = -1;  // para saber cual es el salesperson por default de cada persona

  conta: number; // variable contador para colocar un 'id' a la lista de items
  total: number; // variable para almacenar el total de la factura
  totalUSD: number;
  tax: number; // variable para almacenar el total de impuestos
  discount: number; // variable para almacenar el total de descuento
  totalWithoutTax: number; // variable para almacenar el total sin impuesto
  DailyExRate: number;
  taxesList: any[] = []; // lista de los impuestos

  viewParamList: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListHeader: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListTotales: any[] = []; // llena la lista con los componentes parametrizados
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados

  closeResult: string; // variable para saber porque se cerro la modal
  modalReference: any; // instancia de la modal de terminal y sucursal

  WHAvailableItemList: any[] = []; // lista de los items disponibles por almacen
  indexAvaItem: number; // indice de la lista del item seleccionado para la disponibilidad
  itemCode: string; // variable para almacenar el Código del ite seleccionado para buscar la disponibilidad
  seriesList: any[] = []; // lista de las series de un item po almacen
  lastSO: number;  // guarda el id de la ultima orden de venta generada, se usa para imprimir

  public expandedIndex: number; // variable para manejar el collapse de los items y reconocer sobre cual se va a trabajar

  btnVisibleBool: boolean; // activa y desactiva los botones de envio y nuevo
  flagForm: boolean;  //Validacion flag para evitar reenvio de solicitudes al mismo tiempo 
  // --------Campos Parametrizados cabezera
  lbCardCode: Params = new Params(); // etiqueta para CardCode
  txtCardCode: Params = new Params(); // campo para CardCode
  lbCardName: Params = new Params(); // etiqueta para CardName
  txtCardName: Params = new Params(); // campo para CardName
  lbCurrency: Params = new Params(); // etiqueta para Moneda
  txtCurrency: Params = new Params(); // campo para Moneda
  txtPayTerms: Params = new Params(); // campo para Terminos de pagos
  lbPayTerms: Params = new Params(); // etiqueta para Terminos de pagos
  txtPriceList: Params = new Params(); // campo para Listas de precios
  lbPriceList: Params = new Params(); // etiqueta para Listas de precios
  txtComments: Params = new Params(); // campo para el comentario
  lbComments: Params = new Params(); // etiqueta para el comentario
  lbSLP: Params = new Params(); // etiqueta para el vendedor
  txtSLP: Params = new Params(); // campo para el vendedor
  DEFAULT_BUSINESS_PARTNER: string;
  // -----------------------------
  // -------- Campos para metrizables de totales
  lbTotalExe: Params = new Params(); // etiqueta para Total sin impuestos
  txtTotalExe: Params = new Params(); // campo para Total sin impuestos
  lbDiscount: Params = new Params(); // etiqueta para descuentos
  txtDiscount: Params = new Params(); // campo para descuentos
  lbTaxes: Params = new Params(); // etiqueta para Impuestos
  txtTaxes: Params = new Params(); // campo para Impuestos
  lbTotal: Params = new Params(); // etiqueta para Total
  txtTotal: Params = new Params(); // campo para Total
  // -----------------------------
  TotalCol: FormControl = new FormControl();
  TotalUSD: FormControl = new FormControl();
  Cant: FormControl = new FormControl();
  ItemInfo: FormControl = new FormControl();
  title: string; // titulo de la vista
  defaultGroupNum: any;
  defaultListNum: any;
  identificationTypeList: any[] = [];
  provinceList: any[] = [];// provincias
  cantonList: any[] = []; // lista de cantones
  districtList: any[] = []; // lista de distritos
  neighborhoodList: any[] = []; // lista de barrios


  //#001 Homolgacion metodo scanner
  searchTypeManual: boolean;
  isProcessing: boolean;
  userCurrency: string;


  //Especifica la accion a realizar si actualizar o crear documento.
  documentAction: string;




  provinceId: string; // identificador de la provincia
  cantonId: string; // identificador del canton
  districtId: string; // identificador del distrito
  neighborhoodId: string; // identificador del barrio
  @ViewChild("name") nameField: ElementRef;
  permisos: boolean = true;
  pesoBolsa: number = 0.020;
  priceEditable: boolean = false;
  maxWeightTo0: number = 0.01;
  MapWidth: any;
  tableLength: number;
  isOnSubmit: boolean = false;
  baseLines: IDocumentLine[];
  isOnCreation: boolean;
  onSubmitButtonPrefix: string;

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.Enter) {
      this.isOnSubmit = true;
      this.onSubmit();
    }
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.F6) {
      this.redirectToQuotation();
    }
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.F8) {
      this.redirectToSOandSQ();
    }
  };


  constructor(private fb: FormBuilder,
    private itemService: ItemService,
    private bpService: BusinessPartnerService,
    private decimalPipe: DecimalPipe,
    private documentService: DocumentService,
    private sPerm: PermsService,
    private companyService: CompanyService,
    private taxService: TaxService,
    private uService: UserService,
    private datePipe: DatePipe,
    private authenticationService: AuthenticationService,
    private modalService: NgbModal,
    private renderer: Renderer2,
    //private _electronService: ElectronService,
    private paramsService: ParamsService,
    private reportsService: ReportsService,
    private router: Router,
    private exrate: ExRateService,
    private alertService: AlertService,
    private smService: SalesManService,
    private jsonDataService: JsonDataService,
    private electronRendererService: ElectronRendererService,
    private storage: StorageService,
    private commonService: CommonService,
    private soAdnSQService: SOAndSQService
    , private storageService: StorageService
    , private udfService: UdfsService
    , private eventManager: EventManager) {
    this.$requestViewer = new Subject();
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.expandedIndex = -1;

    // la variable no se usa pero se usa para almacenar el evento
    const removeGlobalEventListener = this.eventManager.addGlobalEventListener(
      'document',
      'keyup',
      (ev) => {
        if (this.ItemInfo && this.ItemInfo.value) {
          if (Number(this.ItemInfo.value.toString())) {
            this.isScanning = true;
            this.buildedData = this.ItemInfo.value;
          }

          if (ev.key === 'Enter') {
            this.isLockedByScanner = true;
            this.isScanning = false;
          }
        }
      }
    );
  }


  ngDoCheck(): void {
    const parent: HTMLElement = document.getElementById('scrollable-dropdown-menu');
    if (parent) {
      if (parent.children.length > 0) {
        const child = parent.children[1];
        if (child) {
          this.renderer.setStyle(child, 'max-height', '300px');
          this.renderer.setStyle(child, 'overflow-y', 'auto');
        }
      }
    }

    // if (this.ItemInfo && this.ItemInfo.value && this.ItemInfo.value.includes('*')) {
    //   try {
    //     setTimeout(() => {
    //       let buttons = document.getElementsByClassName('dropdown-item');
    //       if (buttons && buttons.length > 0) {
    //         for (let c = 0; c < 1; c++) {
    //           let button = document.getElementById(buttons[c].getAttribute('id'));

    //           if (button.childNodes[0]) {
    //             let child = button.childNodes[0];
    //           }
    //           
    //         }
    //       }
    //     });
    //   }
    //   catch (error) {

    //   }
    // }

    if ((this.isLockedByScanner && this.itemsTypeaheadList.find(x => x.indexOf(this.buildedData) > -1))) {
      try {
        let buttons = document.getElementsByClassName('dropdown-item');
        setTimeout(() => {
          let dynamicId = `hardcodedId`;
          if (buttons[0]) {
            dynamicId = buttons[0].getAttribute('id');
            if (dynamicId.indexOf('ngb-typeahead') < 0 || !(<HTMLButtonElement>document.getElementById(dynamicId))) {
              this.alertService.infoAlert('No se pudo identificar la generación dinámica del componente, por favor seleccione el producto manualmente');
            }
            else {
              (<HTMLButtonElement>document.getElementById(dynamicId)).click();
            }
          }
          else {
            (<HTMLButtonElement>document.getElementById('helperClick')).focus();
            (<HTMLButtonElement>document.getElementById('helperClick')).click();
            (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).focus();
            (<HTMLButtonElement>document.getElementById('ItemCodeManualTrigger')).click();
            this.isScanning = false;
            this.addItems(null, true);


            //this.ItemInfo.setValue(``);
          }
        }, 100);
        this.isLockedByScanner = false;
      }
      catch (error) {
        this.alertService.infoAlert(`Error: ${error}`);
        this.isLockedByScanner = false;
        console.log(error);
      }
    }
    else {
      if (this.isLockedByScanner && !this.isScanning && !(this.itemsTypeaheadList.find(x => x.indexOf(this.ItemInfo.value) > -1))) {
        this.alertService.infoInfoAlert(`No existe ${this.ItemInfo.value}`);
        this.ItemInfo.setValue(``);
        this.isLockedByScanner = false;
      }
    }
  }

  expandRow(index: number): void {
    this.expandedIndex = index === this.expandedIndex ? -1 : index;
  }

  ngOnInit() {
    // this.jsonDataService.getJSONInvoiceType()
    //   .subscribe((data: any) => {
    //     this.typesInvoice = data
    //   });   
    this.udfs = [];
    //this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.hasIdentification = false;
    this.isOnPrint = false;
    this.currentRequest = 0;
    this.requestToAwait = 2;
    this.InvalidCardName = false;
    this.overdueBalances = [];
    const DOC_ENTRY = this.storage.GetDocEntry();
    this.isOnCreation = false;
    this.typeArrow = false;
    this.isAllowedPriceListChange = false;
    this.onSubmitButtonPrefix = 'Crear';
    this.documentAction = 'Create';
    if (DOC_ENTRY > 0) {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.GetCustomerData()).CardCode;
    } else {
      this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.getCurrentSession()).DefaultBussinesPartnerUI;
      this.storage.SaveUIAction(-1);
      this.isOnCreation = true;
    }
    /**/

    this.checkPermits();
    this.setWarehouseInfo();
    this.defaultGroupNum = "-1";
    this.defaultListNum = "-1";
    this.MapWidth = {};
    this.tableLength = 0;
    this.MapWidth["Id"] = 80;
    this.MapWidth["ItemCode"] = 450;
    this.MapWidth["UnitPrice"] = 70;
    this.MapWidth["Marca"] = 0;
    this.MapWidth["Group"] = 100;
    this.MapWidth["Quantity"] = 80;
    this.MapWidth["SubGroup"] = 100;
    this.MapWidth["ItemName"] = 350;
    this.MapWidth["Discount"] = 80;
    this.MapWidth["TaxRate"] = 80;
    this.MapWidth["TaxCode"] = 50;
    this.MapWidth["WhsCode"] = 50;
    this.MapWidth["WhsName"] = 200;
    this.MapWidth["LastDate"] = 80;
    this.MapWidth["LinTot"] = 100;
    this.MapWidth["Serie"] = 100;
    this.MapWidth["Opc"] = 100;

    this.btnVisibleBool = true;
    this.conta = 0;
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.DailyExRate = 0;
    this.provinceId = "0";
    this.cantonId = "0";
    this.districtId = "0";
    this.neighborhoodId = "0";

    this.isEditingPrice = false;
    this.saleOrder = null;
    this.saleQuotation = null;
    this.soForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      PayTerms: ['', Validators.required],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      Comment: '',
    });
    // this.soForm.patchValue({ DocumentType: this.storageService.GetDefaultInvoiceType() });
    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {
        this.typesInvoice = next.InvoiceTypes;
        this.soForm.patchValue({
          DocumentType: this.typesInvoice.find(x => x.IsDefault).Name,
        });
      }
      else {
        console.log(next);
        this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${next.Error ? next.Error.Message : ''}`);
      }
    }, error => {
      console.log(error);
      this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${error}`);
    });
    this.identificationTypeList = IdentificationType;
    //this.getProvinces()
    this.getExRate();
    this.getMaxDiscout();

    this.GetParamsViewList();
    this.getCustomers();
    this.setSalesPerson();
    //this.GetCurrencyType();
    //this.GetPriceList();
    //this.GetSalesPersonList();
    this.itemsTypeaheadList = [];
    this.itemsList = [];
    this.itemsCodeList = [];
    this.itemsNameList = [];
    this.getItems();
    this.getTaxes();
    this.getCompanies();
    //this.GetPayTerms();
    this.createFEForm();
    this.generateUniqueInvoiceId();
    this.flagForm = false;

    if (DOC_ENTRY > 0) {
      this.subscriptions = this.$requestViewer.subscribe(next => {
        if (next === this.requestToAwait) {
          switch (Number(localStorage.getItem("SOAndSQAction"))) {
            case SOAndSQActions.EditOrder: {
              this.documentAction = 'Update';
              this.onSubmitButtonPrefix = 'Actualizar';
              this.soForm.controls['cardName'].disable();
              this.soForm.controls['cardCode'].disable();
              this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
              this.GetSaleOrder(DOC_ENTRY);
              this.defaultSlpCode = JSON.parse(this.storage.GetCustomerData()).SlpCode;
              break;
            }
            case SOAndSQActions.CopyToOrder: {
              this.documentAction = 'Create';
              this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);
              this.getBaseLines(DOC_ENTRY);
              break;
            }
          }
        }
      });
    }


    this.companyService.GetViewGroupList().subscribe(next => {
      if (next.Result) {
        ((next.ViewGroupList) as IViewGroup[]).forEach(x => {
          if (x.CodNum === 1) this.isOnGroupLine = x.isGroup;
          if (x.CodNum === 1) this.isLineMode = x.LineMode;
        });
      }
    });

  }
  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        // console.log(data);
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_SO") {
            this.permisos = Perm.Active;
            if (this.permisos) {
              this.nameField.nativeElement.focus();
            }
          }
          if (Perm.Name === 'V_LstChng') this.isAllowedPriceListChange = Perm.Active;
          if (Perm.Name === 'V_WHChng') this.isAllowedWHChange = Perm.Active;

        });

      } else {
        this.permisos = false;
      }
    }, error => {
      this.permisos = false;
      this.blockUI.stop();
    });
    // console.log(this.permisos);
  }

  setSalesPerson() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.uService.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.userAssignsList = data.Users;
        this.userAssignsList.forEach(user => {
          if (this.currentUser.userId.toString() === user.UserId.toString()) {
            this.defaultSlpCode = user.SlpCode;
            this.defaultListNum = user.PriceListDef;
            // console.log(this.defaultSlpCode);
            //this.invForm.patchValue({SlpList: user.SlpCode});
          }
        });
        this.GetSalesPersonList();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // obtiene el tipo de cambio
  getExRate() {
    this.blockUI.start('Obteniendo tipos de cambio, espere por favor...'); // Start blocking
    this.exrate.getExchangeRate().subscribe((data: any) => {
      if (data.Result) {
        this.blockUI.stop(); // Stop blocking
        this.DailyExRate = data.exRate;
        this.currentRequest++;
        this.$requestViewer.next(this.currentRequest);
      } else {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
      }

    }, (error: any) => {
      this.blockUI.stop(); // Stop blocking
      this.alertService.errorInfoAlert(`Error getCustomers!!!, error: ${error.error.Message}`);
    });
  }

  createFEForm() {
    this.feForm = this.fb.group({
      IdType: ['', Validators.required],
      Identification: ['', Validators.required],
      Email: ['', Validators.required],
      ObservacionFE: ['']
    });

    this.feForm.patchValue({ IdType: this.identificationTypeList[0].Id });

  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.currentUserSubscription.unsubscribe();

    // unsubscribe to ensure no memory leaks
    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    this.currentUserSubscription.unsubscribe();
    this.storage.SaveDocEntry(-1);
    this.storage.SaveCustomerData('{}');
    if (this.subscriptions) this.subscriptions.unsubscribe();
    localStorage.removeItem("SOAndSQAction");
  }

  getMaxDiscout() {
    this.documentService.getMaxDiscout().subscribe((data: any) => {
      if (data.Result) {
        this.currentRequest++;
        this.maxDiscuont = data.discount;
        this.$requestViewer.next(this.currentRequest);
      }
      else {
        this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
      }
    }, (error: any) => {
      this.alertService.errorInfoAlert(`Error getCustomers!!!, Error: ${error.error.Message}`);
    });

  }
  // funcion para obtener los clientes desde SAP
  // no recibe parametros
  getCustomers() {
    this.blockUI.start('Obteniendo clientes, espere por favor...'); // Start blocking
    this.bpService.GetCustomers()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.bpList.length = 0;
          this.bpCodeList.length = 0;
          this.bpNameList.length = 0;
          this.bpList = data.BPS;
          for (let item of data.BPS) {
            this.defaultGroupNum = item.GroupNum;
            this.bpCodeList.push(item.CardCode);
            this.bpNameList.push(item.CardName);
          }

          this.GetCurrencyType();
          this.GetPayTerms();
          this.GetPriceList();


        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error getCustomers!!!, Error: ${error.error.Message}`);
      });
  }
  // funcion para obtener los items desde SAP
  // no recibe parametros
  getItems() {
    this.blockUI.start('Obteniendo ítems, espere por favor...'); // Start blocking
    this.itemService.GetItems()
      .subscribe((data: any) => {
        // console.log(data);
        if (data.Result) {

          this.itemsTypeaheadList = data.ItemList.ItemCompleteName;
          //console.log(this.itemsTypeaheadList);
          this.itemsCodeList = data.ItemList.ItemCode;
          this.itemsNameList = data.ItemList.ItemName;
          this.Cant.setValue(1);
          this.blockUI.stop(); // Stop blocking

        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error getItems!!!, Error: ${error.error.Message}`);
      });
  }
  // funcion para obtener los impuestos desde SAP
  // no recibe parametros
  getTaxes() {
    this.blockUI.start('Obteniendo impuestos, espere por favor...'); // Start blocking
    this.taxService.GetTaxes()
      .subscribe((data: any) => {
        if (data.Result) {
          this.taxesList.length = 0;
          this.taxesList = data.Taxes;
          // this.taxesList.push({
          //   "TaxCode": 'EXE',
          //   "TaxRate": '0.00'
          // }) 
        } else {
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error getTaxes!!!, Error: ${error.error.Message}`);
      });
  }
  // funcion para obtener los clientes desde SAP
  // recibe como parametros el item y el index
  selectedItem(item, idx) {
    if (item.item !== '') {
      // console.log(item);
      // console.log(idx);

      this.blockUI.start('Obteniendo información del artículo, espere por favor...'); // Start blocking
      this.itemService.GetItemByItemCode(item.item.split(' COD. ')[0], this.soForm.controls.PriceList.value, this.soForm.controls.cardCode.value)
        .subscribe((data: any) => {
          // console.log(data);
          if (data.Result) {
            this.itemsList[idx].ItemCode = data.Item.ItemCode;
            this.itemsList[idx].Marca = data.Item.Marca;
            this.itemsList[idx].ItemName = data.Item.ItemName;
            this.itemsList[idx].Item = `${data.Item.ItemCode} - ${data.Item.ItemName}`;
            this.itemsList[idx].UnitPrice = data.Item.UnitPrice;
            this.itemsList[idx].U_SugPrice = data.Item.UnitPrice;
            this.itemsList[idx].TaxCode = data.Item.TaxCode;
            this.itemsList[idx].Discount = data.Item.Discount;
            this.itemsList[idx].TaxRate = data.Item.TaxRate;
            this.itemsList[idx].LinTot = parseFloat(data.Item.UnitPrice);
            this.itemsList[idx].Active = false;

            // this.itemsList[idx].Quantity = data.Item.Quantity;
            this.conta++;
            this.total += data.Item.UnitPrice;
            this.itemsList.push({
              'Item': '',
              'ItemCode': '',
              'ItemName': '',
              'UnitPrice': '0',
              'UnitPriceCol': 0,
              'UnitPriceDol': 0,
              'U_SugPrice': '0',
              'TaxCode': 'EXE',
              'Quantity': '1',
              'Active': true,
              'Id': this.conta,
              'LinTot': 0,
              'TaxRate': 0.00,
              'Discount': 0,
              'WhsCode': this.whCode,
              'WhsName': this.whName,
              'Serie': '',
              'SysNumber': 0
            });
            this.getTotals();
          } else {
            this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
          }
          this.blockUI.stop(); // Stop blocking
        }, (error: any) => {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
  }
  // funcion para eliminar el item de la lista
  // recibe como parametro el item a eliminar
  removeItem(idx: number, item) {
    // console.log(item);
    if (item !== null) {
      // const index = this.itemsList.indexOf(item) ;   
      // this.itemsList.splice(i, 1);
      this.itemsList = this.itemsList.filter((x, i) => i !== idx);
      this.getTotals();
      if (this.itemsList.length > 0) this.hasLines = true;
      else this.hasLines = false;
    } else {
      this.alertService.warningInfoAlert('No se puede eliminar la última línea del documento');
    }
  }
  // convenience getter for easy access to form fields
  get f() { return this.soForm.controls; }
  get fe() { return this.feForm.controls; }

  // funcion para el envio de la SO a SAP
  // no recibe parametros
  onSubmit() {
    if (this.flagForm) {
      console.log('Intento duplicación documento');
      return;
    }
    let udfName = '';
    let isValid = true;
    this.udfs.forEach(x => {
      if (x.IsRequired && (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value == '') {
        udfName = x.Description;
        isValid = false;
        return;
      }
    });

    if (!isValid) {
      this.alertService.infoInfoAlert(`El campo ${udfName} es requerido`);
      return;
    }

    if (this.itemsList.length === 0) {
      this.alertService.errorInfoAlert(`Por favor agregue un producto al menos`);
      return;
    }

    this.submitted = true;
    // stop here if form is invalid
    if (this.soForm.invalid) {
      this.isOnSubmit = false;
      this.alertService.infoAlert(
        "Debe haber seleccionado tipo factura, cliente, moneda, término de pago"
      );
      return;
    }
 
    if (!this.soForm.controls.cardName.value) {
      let cardName = '';
      if (this.storage.GetDocEntry() > 0) {
        let customer = this.bpList.find(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);
        if (customer) {
          cardName = customer.CardName;
        }
      } else {
        cardName = this.temtem;
      }

      this.soForm.patchValue({
        cardName: cardName
      });
    }

    // if (this.itemsList.some(x => x.LinTot == 0)) {
    //   this.alertService.errorInfoAlert(`Existen líneas con costo 0`);
    //   return;
    // }

    if (!this.SlpsList.find(x => x.SlpCode == this.soForm.controls.SlpList.value)) {
      this.alertService.infoInfoAlert(`Por favor selecione un vendedor`);
      return;
    }
    const AVAILABLE_INV = this.itemsList.find(x => +x.available < (this.itemsList.filter(y => y.Item == x.Item).reduce((p, c) => { return p + c.Quantity }, 0)) && x.InvntItem === "Y");
    if (AVAILABLE_INV) {
      this.alertService.infoInfoAlert(`Sin stock, no hay cantidad solicitada para el producto ${AVAILABLE_INV.CodeName}, disponible:${AVAILABLE_INV.available} `);
      return;
    }

    if (!this.COMPANY.HasZeroBilling) {

      const CORRUPTED_ITEM = this.itemsList.find(x => x.LinTot == 0);
      if (CORRUPTED_ITEM) {
        this.alertService.errorAlert(`El total de linea del producto "${CORRUPTED_ITEM.CodeName}" es 0, elimínelo por favor.`);
        return;
      }

      const CORRUPTED_QUANTITY = this.itemsList.find(x => x.Quantity <= 0);
      if (CORRUPTED_QUANTITY) {
        this.alertService.errorAlert(`Cantidad del producto  ${CORRUPTED_QUANTITY.CodeName}, debe ser mayor a 0`);
        return;
      }

      const DIFERENCECOST_ITEM = this.itemsList.find(x => +x.UnitPrice <= (x.LastPurchasePrice ? +x.LastPurchasePrice : 0) && +x.UnitPrice != 0);
      if (DIFERENCECOST_ITEM) {
        this.alertService.errorAlert(`Costo del artículo "${DIFERENCECOST_ITEM.CodeName}" es mayor o igual al precio de venta, modifique precio por favor. Precio venta: ${DIFERENCECOST_ITEM.UnitPrice} Precio costo: ${DIFERENCECOST_ITEM.LastPurchasePrice} `);
        return;
      }

    } else {
      const DIFERENCECOST_ITEM = this.itemsList.find(x => +x.UnitPrice <= (x.LastPurchasePrice ? +x.LastPurchasePrice : 0) && +x.UnitPrice != 0);
      if (DIFERENCECOST_ITEM) {
        this.alertService.errorAlert(`Costo del artículo "${DIFERENCECOST_ITEM.CodeName}" es mayor o igual al precio de venta, modifique precio por favor. Precio venta: ${DIFERENCECOST_ITEM.UnitPrice} Precio costo: ${DIFERENCECOST_ITEM.LastPurchasePrice} `);
        return;
      }
    }

    this.btnVisibleBool = false;
    let documentType = '';



    // || () ? 'FE' : 'TE',
    switch (this.storage.GetUIAction()) {
      case SOAndSQActions.EditOrder: {
        this.UpdateSaleOrder(documentType);
        break;
      }
      default: {
        this.CreateSaleOrder(documentType);
      }
    }

    // this.blockUI.start('Creando Orden de Venta, espere por favor...'); // Start blocking
    // this.documentService.CreateSaleOrder(this.soForm, this.itemsList, this.feForm, '')
    //   .subscribe((data: any) => {
    //     if (data.result) {
    //       this.lastSO = data.DocEntry;
    //       //this.printSaleOrder(data.DocEntry);
    //       this.btnVisibleBool = false;
    //       this.correctSO = true;
    //       this.alertService.successAlert(` Orden de venta creada con éxito, DocNum: ${data.DocNum}, DocEntry: ${data.DocEntry}`);
    //     } else {
    //       this.alertService.errorAlert(`Error al intentar crear el documento, Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
    //     }
    //     this.blockUI.stop(); // Stop blocking
    //     this.isOnSubmit = false;
    //   }, (error: any) => {
    //     this.isOnSubmit = false;
    //     this.blockUI.stop(); // Stop blocking
    //     this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    //   });
  }


  searchBPCode = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpCodeList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )
  temtem: string;
  searchBPName = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpNameList.filter(v => {
          this.temtem = term;
          return v.toLowerCase().indexOf(term.toLowerCase()) > -1;
        }).slice(0, 10))
    )

  searchItemCode = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(15),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.itemsTypeaheadList.filter(v => {

          let a = v.toLowerCase();

          const stringSize = a.length;

          const t = term.toLowerCase();

          if (this.itemsTypeaheadList.find(r => r === t)) return true;

          const b = t.split('*').filter(x => x !== '');

          const size = b.length;

          let isSorted = true;

          if (size > 1) {

            let indexes = [];

            for (let c = 0; c < size; c++) {
              b[c] = b[c].replace(' ', '');
              // const invalid = /[°"§%()\[\]{}=\\?´`'#<>|,;.:+_-]+/g;
              // b[c] = b[c] .replace(invalid, '');
              const ii = a.indexOf(b[c]);
              if (ii > -1) {
                a = a.slice(ii, stringSize);
                if (indexes.length > 0) indexes.push(indexes[indexes.length - 1] + ii);
                else indexes.push(ii);
              }
            }

            let sizeIndexes = indexes.length;

            if (sizeIndexes === size) {
              for (let c = 0; c < sizeIndexes - 1; c++) {
                if (indexes[c] > indexes[c + 1]) {
                  isSorted = false;
                  c = sizeIndexes;
                }
              }
              return isSorted;
            }
          }
          return v.toLowerCase().indexOf(term.toLowerCase()) > -1;
        }).sort((x, y) => x.toLowerCase().indexOf(term.toLowerCase()) - y.toLowerCase().indexOf(term.toLowerCase())).slice(0, 50))
    )

  // funcion para detectar el cambio en el input de Código
  // recibe como parametro el Código del item
  changeCode(code) {
    if (code != null) {
      let cardCode = this.bpCodeList.filter(
        customer => customer.toLowerCase() === code.toLowerCase());
      if (cardCode.length > 0) {
        // tslint:disable-next-line:no-shadowed-variable
        let code = cardCode[0];
        let codePos = this.bpCodeList.indexOf(code);
        let cardName = this.bpNameList[codePos];
        let customer = this.bpList.filter(cus => {
          return cus.CardCode === code;
        });
        this.getCurrencyByUser(customer[0].Currency);

        // tslint:disable-next-line:no-unused-expression
        if (cardName !== this.soForm.get('cardName').value) {
          this.soForm.patchValue({ cardName: cardName });
        }

        if (this.itemsList.length > 0) this.SetupRecalculate();

        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;

            const DOC_ENTRY = this.storage.GetDocEntry();
            if (DOC_ENTRY === -1) {
              this.soForm.patchValue({ PayTerms: item.GroupNum.toString() });
            }


            this.soForm.patchValue({ PriceList: item.ListNum });
          }
        }

      }
    }
  }

  SetupRecalculate(): void {
    this.conta = 0;
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    let itemsToCalculate: any[] = []; // lista de items

    this.itemsList.forEach(x => itemsToCalculate.push(x));
    this.blockUI.start('Recalculando precios, espere por favor');
    setTimeout(() => {
      this.PollItemsData(itemsToCalculate);
    }, 1000);
  }

  PollItemsData(_itemsList: any[]): void {
    if (_itemsList.length === 0) {
      this.blockUI.stop();
      return;
    }
    const ITEM_INDEX = _itemsList.length - 1;
    const ITEM = _itemsList[ITEM_INDEX];
    const PRICE_LIST = this.soForm.get('PriceList').value;
    this.itemService.GetItemByItemCode(ITEM.Item, PRICE_LIST, this.soForm.controls.cardCode.value)
      .subscribe((data: any) => {
        if (data.result) {
          this.total += ITEM.UnitPrice;
          this.itemsList[ITEM_INDEX].Discount = data.Item.Discount;
          this.LineTotalCalculateExt(_itemsList.length - 1);
          this.getTotals();
          _itemsList.pop();
          this.PollItemsData(_itemsList);
        } else {
          this.PollItemsData([]);
          this.alertService.errorAlert(`Error no se pudo recalcular los precios, motivo: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
      }, (error: any) => {
        this.PollItemsData([]);
        this.alertService.errorInfoAlert(`Error no se pudo recalcular los precios, motivo: ${error}`);
      });
  }

  /**
  * Funcion que permite llenar el select de moneda segun las monedas que posee el cliente
  * @param {string} currency Variable que contiene el tipo de moneda del cliente
  */
  getCurrencyByUser(currency: string) {
    this.currencyList = this.allCurrencyList;
    if (currency === 'COL' || currency === 'USD') {
      this.currencyList = this.currencyList.filter(cur => cur.Id === currency);
    }
    if (this.currencyList.length === 1) {
      this.soForm.patchValue({ currency: this.currencyList[0].Id }); //this.currencyList[0].Id
    }
    else {
      this.soForm.patchValue({ currency: "COL" }); //
    }

    const DOC_ENTRY = this.storage.GetDocEntry();

    if (DOC_ENTRY > 0) {
      const CUSTOMER_DATA = JSON.parse(this.storage.GetCustomerData());
      this.soForm.patchValue({ currency: CUSTOMER_DATA.Currency });
    }

    this.SetCurr();
  }

  // funcion para detectar el cambio en el input de descripcion
  // recibe como parametro el descripcion del item
  changeDescription(description) {
    if (description != null && description !== '') {
      let itemDescription = this.bpNameList.filter(
        customer => customer.toLowerCase() === description.toLowerCase());
      if (itemDescription.length > 0) {
        // tslint:disable-next-line:no-shadowed-variable
        let description = itemDescription[0];
        let descriptionPos = this.bpNameList.indexOf(description);
        let cardCode = this.bpCodeList[descriptionPos];



        let customer = this.bpList.filter(cus => {
          return cus.CardCode === cardCode;
        });
        this.getCurrencyByUser(customer[0].Currency);
        // tslint:disable-next-line:no-unused-expression


        if (cardCode !== this.soForm.get('cardCode').value) {
          this.soForm.patchValue({ cardCode: cardCode });

        }

        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;
            const DOC_ENTRY = this.storage.GetDocEntry();
            if (DOC_ENTRY === -1) {
              this.soForm.patchValue({ PayTerms: item.GroupNum.toString() });
            }
            this.soForm.patchValue({ PriceList: item.ListNum });


          }
        }


      }
    }
  }

  // funcion para calcular los totales de la SO
  // calcula por separado los precios en dolares y colones para poder evitar inconsistencias en
  // las conversiones
  // no recibe parametros
  getTotals2() {
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.itemsList.forEach(element => {
      const lintot = parseFloat(Number(element.UnitPrice * element.Quantity).toFixed(2));
      const disc = parseFloat(Number(lintot * (element.Discount / 100)).toFixed(2));
      this.discount = parseFloat(Number(disc + this.discount).toFixed(2));
      this.totalWithoutTax = parseFloat(Number((lintot - disc) + this.totalWithoutTax).toFixed(2));
      this.tax = parseFloat(Number(((lintot - disc) * (element.TaxRate / 100)) + this.tax).toFixed(2));
    });
    //this.total += parseFloat(Number(this.totalWithoutTax + this.tax).toFixed(2));
    if (this.soForm.controls.currency.value == 'COL') {
      this.total += (parseFloat(Number(this.totalWithoutTax + this.tax).toFixed(2)));
      this.totalUSD += parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toFixed(2));
    }
    else {
      this.total += (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toFixed(2)));
      this.totalUSD += parseFloat(Number(this.totalWithoutTax + this.tax).toFixed(2));
    }
    // this.total = this.total.toFixed(2);
    //	this.totalUSD = this.totalUSD.toFixed(2);
  }

  // funcion para calcular los totales de la SO
  // calcula por separado los precios en dolares y colones para poder evitar inconsistencias en
  // las conversiones
  // no recibe parametros
  getTotals() {
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.itemsList.forEach((element) => {
      const lintot = parseFloat(
        (element.UnitPrice * element.Quantity).toString()
      );
      const disc = parseFloat(
        Number(lintot * (element.Discount / 100)).toString()
      );
      this.discount = parseFloat(Number(disc + this.discount).toString());
      this.totalWithoutTax = parseFloat(Number((lintot - disc) + this.totalWithoutTax).toString());
      this.tax = parseFloat(Number(((lintot - disc) * (element.TaxRate / 100)) + this.tax).toString());

      this.discount = +this.discount.toFixed(this.COMPANY.DecimalAmountTotalDocument);
      this.totalWithoutTax = +this.totalWithoutTax.toFixed(this.COMPANY.DecimalAmountTotalDocument);
    });

    this.tax = +this.tax.toFixed(this.COMPANY.DecimalAmountTotalDocument);

    const MOBJECT = this.saleOrder || this.saleQuotation;

    if (MOBJECT) {
      if (MOBJECT.DocCurrency == 'COL') {
        this.total += (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
        this.totalUSD += parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
      }
      else {
        this.total += (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
        this.totalUSD += parseFloat(Number(this.totalWithoutTax + this.tax).toString());
      }
    }
    else if (this.soForm.value.currency) {
      if (this.soForm.value.currency == 'COL') {
        this.total += (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
        this.totalUSD += parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
      }
      else {
        this.total += (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
        this.totalUSD += parseFloat(Number(this.totalWithoutTax + this.tax).toString());
      }
    }

    // this.total = +this.total.toFixed(2);
    // this.totalUSD = +this.totalUSD.toFixed(2);
  }

  // funcion al cambiar el tipo de taxcode
  // recibe como parametro el taxxode y el indice de la lista
  changeTaxCode(index: number, item: any) {


    const rate = this.taxesList.find(i => i.TaxCode === item.TaxCode.toUpperCase());
    //const index =( this.itemsList.length - 1) - idx ;
    // const idx: number = this.itemsList.indexOf(this.itemsList.find(x => x.ItemCode == item.ItemCode));

    if (typeof rate !== 'undefined') {
      this.itemsList[index].TaxRate = parseFloat(this.decimalPipe.transform(rate.TaxRate, '.2'));
      this.itemsList[index].TaxCode = rate.TaxCode.toUpperCase();
      this.LineTotalCalculate(index);
    }
  }

  // funcion para calcular el total de la linea
  // recibe como parametro el index de la lista de items
  LineTotalCalculate(idx: number) {

    //idx = (this.itemsList.length - 1) - idx;
    let disc = 0;
    if (this.itemsList[idx].Discount <= this.maxDiscuont) {
      disc = this.itemsList[idx].Discount;
    }
    else {
      disc = this.maxDiscuont;
      this.alertService.infoInfoAlert('El descuento no puede ser mayor a ' + this.maxDiscuont + ' que es lo permitido para este usuario');
      this.itemsList[idx].Discount = this.maxDiscuont;
    }

    if (this.itemsList[idx].Discount == null) { this.itemsList[idx].Discount = 0; }

    const qty = this.itemsList[idx].Quantity;
    const price = this.itemsList[idx].UnitPrice;
    let lineTotal = Number((qty * price).toString());
    const taxamount = Number(
      (lineTotal * (this.itemsList[idx].TaxRate / 100)).toString()
    );
    lineTotal = Number((lineTotal + taxamount).toString());
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toString());
    this.itemsList[idx].LinTot = lineTotal.toString();
    this.getTotals();
  }

  LineTotalCalculateExt(idx: number) {
    //idx =( this.itemsList.length - 1) - idx ;
    let disc = 0;
    if (this.itemsList[idx].Discount <= this.maxDiscuont) {
      disc = this.itemsList[idx].Discount;
    }
    else {
      disc = this.maxDiscuont;
      this.alertService.infoInfoAlert('El descuento no puede ser mayor a ' + this.maxDiscuont + ' que es lo permitido para este usuario');
      this.itemsList[idx].Discount = this.maxDiscuont;
    }
    if (this.itemsList[idx].Discount == null) { this.itemsList[idx].Discount = 0; }

    const qty = this.itemsList[idx].Quantity;
    const price = this.itemsList[idx].UnitPrice;
    let lineTotal = Number((qty * price).toFixed(2));
    const taxamount = Number((lineTotal * (this.itemsList[idx].TaxRate / 100)).toFixed(2));
    lineTotal = Number((lineTotal + taxamount).toFixed(2));
    lineTotal = Number((lineTotal - (lineTotal * (disc / 100))).toFixed(2));
    this.itemsList[idx].LinTot = lineTotal.toString();
    this.getTotals();
  }

  // funcion que se llama desde la ui para hacer la impresion de la orden de venta
  printSO() {
    this.printSaleOrder(this.lastSO);
  }

  // funcion para imprimir la factura
  printSaleOrder(DocEntry: number) {
    this.blockUI.start('Generando la impresión...'); // Start blocking
    this.reportsService.printReport(DocEntry, ReportType.SaleOrder)
      .subscribe((data: any) => {
        this.blockUI.stop(); // Stop blocking
        /*
        printJS({
            printable: data,
            type: 'pdf',
            base64: true
          })
        */
        /* if(this._electronService.isElectronApp) {
           var fileBase64 = atob(data);
           //this.sendPrintSignal(fileBase64);
           this._electronService.ipcRenderer.send('msgPrint', data);
         }
         else{ */
        if (this.electronRendererService.CheckElectron()) {
          let fileName = 'InvoiceCopy_' + DocEntry + '.pdf';
          let file = { "fileName": fileName, "file": data };
          this.electronRendererService.send('Print', file);
          // this.electronRendererService.send('Test',file);
        }
        else {
          printJS({
            printable: data,
            type: 'pdf',
            base64: true
          })
        }
        /*    } */
        //var fileBase64 = atob(data);
        //this.playPingPong(fileBase64);
        /*
        var length = fileBase64.length;
          var arrayBuffer = new ArrayBuffer(length);
          var uintArray = new Uint8Array(arrayBuffer);
          for (var i = 0; i < length; i++) {
            uintArray[i] = fileBase64.charCodeAt(i);
            }
          var tab = window.open();
          var pdfFile = new Blob([uintArray], { type: 'application/pdf' });
          var fileUrl = URL.createObjectURL(pdfFile);
          tab.location.href = fileUrl;
        */
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error getItems!!!, Error: ${error.error.Message}`);
      });
  }
  openModal(content) {
    this.modalReference = this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg' });
    this.modalReference.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.viewParamList = data.Params.filter(param => {
            // return param.type === 1;
            return param.type === 1 && param.Visibility && param.ParamsId != 80; // Se añade para no mostrar la columna de bonificado
          });

          this.tableLength = 0;
          for (var i = 0; i < this.viewParamList.length; i++) {
            this.tableLength += this.MapWidth[this.viewParamList[i].Name];
          }
          this.viewParamListHeader = data.Params.filter(param => {
            return param.type === 2;
          });
          this.viewParamListTotales = data.Params.filter(param => {
            return param.type === 3;
          });
          this.viewParamTitles = data.Params.filter(param => {
            return param.type === 6;
          });
          this.ChargeParamstoView();
        } else {
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data.errorInfo.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }
  // funcion para obtener la información de los disponibles de un item en los almacenes
  // recibe como parametros el item y el index
  GetWHAvailableItem(event, content, ItemCode, idx) {
    if (ItemCode !== '') {
      if (event.type === 'dblclick') {
        this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor...'); // Start blocking
        // this.itemService.GetWHAvailableItem(item.item.split(' - ')[0])
        this.itemService.GetWHAvailableItem(ItemCode)
          .subscribe((data: any) => {
            if (data.Result) {
              this.WHAvailableItemList.length = 0;
              this.itemCode = ItemCode;
              this.indexAvaItem = idx;
              this.WHAvailableItemList = data.whInfo;
              if (data.whInfo.length > 0) {
                this.expandedIndex = -1;
                // this.expandRow(this.expandedIndex);
                // this.openModal(content);

                (<HTMLButtonElement>document.getElementById('triggerWhsPreview')).click();
              } else {
                this.alertService.errorInfoAlert('Este artículo no está disponibles en ningún almacén.');
              }
            } else {
              this.alertService.errorAlert('Error al obtener Items del almacén - Error: ' + data.errorInfo.Message);
            }
            this.blockUI.stop(); // Stop blocking
          }, (error: any) => {
            this.blockUI.stop(); // Stop blocking
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
          });
      }
    }
  }

  // funcion para seleccionar un almacen nuevo para el item a facturar
  avaItemSelected(event, avaItem, idx: number) {
    if (event.type === 'dblclick') {
      if (!this.isAllowedWHChange) {
        this.alertService.infoInfoAlert(`No tiene permiso para cambiar el almacén`);
        return;
      }

      this.itemsList[this.indexAvaItem].WhsCode = avaItem.WhsCode;
      this.itemsList[this.indexAvaItem].WhsName = avaItem.WhsName;
      this.itemsList[this.indexAvaItem].Serie = '';
      this.itemsList[this.indexAvaItem].SysNumber = 0;
      // this.close();
      (<HTMLButtonElement>document.getElementById('triggerWhsClose')).click();
    }
    // else if (event.type === 'click') {
    //   this.itemService.GetSeriesByItem(this.itemCode, avaItem.WhsCode)
    //     .subscribe((data: any) => {
    //       if (data.result) {
    //         this.seriesList.length = 0;
    //         this.seriesList = data.series;
    //         if (data.series.length > 0) {
    //           this.expandRow(idx);
    //         } else {
    //           this.alertService.infoInfoAlert('El item no tiene series en el almacén selecionado');
    //         }
    //       } else {
    //         this.alertService.errorAlert('error al obtener la series del almacen - Error: ' + data.errorInfo.Message);
    //       }
    //       this.blockUI.stop(); // Stop blocking
    //     }, (error: any) => {
    //       this.blockUI.stop(); // Stop blocking
    //       this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    //     });
    // }
  }

  // funcion para cerrar la modal para escoger la terminal y sucursal
  close() {
    this.modalReference.close();
  }

  // funcion para selecccionar una seria
  // recibe como parametro el objeto de serie y del almacen en el que se selecciono la serie
  selectSerie(series, avaItem) {
    // console.log(series);
    const idx: number = this.itemsList.indexOf(this.itemsList.find(x => x.ItemCode == this.itemCode));
    if (series.Disponible > 0) {
      this.itemsList[this.indexAvaItem].Serie = series.PlacaChasis;
      this.itemsList[this.indexAvaItem].SysNumber = series.SysNumber;
      this.itemsList[this.indexAvaItem].WhsCode = avaItem.WhsCode;
      this.itemsList[this.indexAvaItem].WhsName = avaItem.WhsName;
      this.itemsList[this.indexAvaItem].UnitPrice = series.Precio;
      this.itemsList[this.indexAvaItem].Marca = series.PlacaChasis;
      this.LineTotalCalculateExt(idx);
      this.alertService.infoInfoAlert(`Se seleccionó la serie: ${series.PlacaChasis}`);
    } else {
      this.alertService.infoInfoAlert('No puede seleccionar esta serie ya que no posee disponibles');
    }
  }

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizaciones para dtos de cabezera
    // console.log(this.viewParamListHeader);
    this.viewParamListHeader.forEach(element => {
      if (element.Name === 'lbCardCode') { this.lbCardCode = element; }
      if (element.Name === 'txtCardCode') { this.txtCardCode = element; }
      if (element.Name === 'lbCardName') { this.lbCardName = element; }
      if (element.Name === 'txtCardName') { this.txtCardName = element; }
      if (element.Name === 'lbCurrency') { this.lbCurrency = element; }
      if (element.Name === 'txtCurrency') { this.txtCurrency = element; }
      if (element.Name === 'txtPayTerms') { this.txtPayTerms = element; }
      if (element.Name === 'lbPayTerms') { this.lbPayTerms = element; }
      if (element.Name === 'txtPriceList') { this.txtPriceList = element; }
      if (element.Name === 'lbPriceList') { this.lbPriceList = element; }
      if (element.Name === 'txtComments') { this.txtComments = element; }
      if (element.Name === 'lbComments') { this.lbComments = element; }
      if (element.Name === 'txtSLP') { this.txtSLP = element; }
      if (element.Name === 'lbSLP') { this.lbSLP = element; }
    });

    // parametrizaciones datos de totales
    this.viewParamListTotales.forEach(element => {
      if (element.Name === 'lbTotalExe') { this.lbTotalExe = element; }
      if (element.Name === 'txtTotalExe') { this.txtTotalExe = element; }
      if (element.Name === 'lbDiscount') { this.lbDiscount = element; }
      if (element.Name === 'txtDiscount') { this.txtDiscount = element; }
      if (element.Name === 'lbTaxes') { this.lbTaxes = element; }
      if (element.Name === 'txtTaxes') { this.txtTaxes = element; }
      if (element.Name === 'lbTotal') { this.lbTotal = element; }
      if (element.Name === 'txtTotal') { this.txtTotal = element; }
    });

    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter(param => {
      return param.Name === 'T_so';
    });
    this.title = obj[0].Text;
  }

  // Obtiene los tipos de monedas ya sea Col o Usd desde una vista SQL
  GetCurrencyType() {
    this.paramsService.GetCurrencyType().subscribe(data => {
      this.blockUI.stop();
      if (data.Data.length > 0) {
        this.currencyList = data.Data;
        this.allCurrencyList = data.Data;
        this.funcion();
      } else {
        this.alertService.errorAlert('Error al cargar las monedas - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // Retorna el simbolo de la moneda al elegir en el dropdown la moneda
  SetCurr() {
    let cur = this.currencyList.find(curr => curr.Id === this.soForm.controls.currency.value);

    if (this.storage.GetDocEntry() > 0) {
      cur = this.currencyList.find(curr => curr.Id === JSON.parse(this.storage.GetCustomerData()).Currency);
    }

    if (!cur) return;
    this.setCurr = cur.Symbol
    this.userCurrency = cur.Id;
    //let cur = this.currencyList.filter(curr => { return curr.Id === this.soForm.controls.currency.value });
    //if (cur === null || cur[0] === null) return;

  }

  // vacia las listas y recarga los datos para SO
  CreateNew() {
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_ORDER);
    this.DEFAULT_BUSINESS_PARTNER = this.storage.GetDefaultBussinesPartner();
    this.generateUniqueInvoiceId();
    this.storage.SaveBreadCrum(``);
    this.hasIdentification = false;
    if (this.subscriptions) this.subscriptions.unsubscribe();
    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    if (this.typeArrow) (<HTMLButtonElement>(document.getElementById('triggerFECollapser'))).click();
    this.storage.SaveDocEntry(-1);
    this.storage.SaveUIAction(-1);
    this.onSubmitButtonPrefix = 'Crear';
    this.isOnCreation = true;
    this.btnVisibleBool = true;
    const DOC_ENTRY = this.storage.GetDocEntry();
    if (DOC_ENTRY > 0) {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.GetCustomerData()).CardCode;
    } else {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.getCurrentSession()).DefaultBussinesPartnerUI;
    }
    this.flagForm = false;
    this.soForm.reset(true);
    this.feForm.reset(true);
    this.itemsList.length = 0;
    this.cantonId = '0';
    this.districtId = '0';
    this.Cant.setValue(1);
    this.neighborhoodId = '0';
    this.provinceId = '0';
    //this.getItems();
    this.getTaxes();
    this.getTotals();
    this.soForm.patchValue({ currency: this.currencyList[0].Id });
    // this.soForm.patchValue({ DocumentType: this.storageService.GetDefaultInvoiceType() });
    this.total = 0;
    this.totalUSD = 0;
    this.changeCode(this.DEFAULT_BUSINESS_PARTNER);
    this.btnVisibleBool = true;
    this.conta = 0;
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.DailyExRate = 0;
    this.provinceId = "0";
    this.cantonId = "0";
    this.districtId = "0";
    this.neighborhoodId = "0";
    this.hasLines = false;
    // this.currencyList = CurrencyType;
    this.soForm.controls['cardName'].enable();
    this.soForm.controls['cardCode'].enable();
    this.ItemInfo.setValue('');
    this.soForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      PayTerms: ['0'],
      PriceList: ['', Validators.required],
      SlpList: ['', Validators.required],
      Comment: '',
    });

    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {
        this.typesInvoice = next.InvoiceTypes;
        this.soForm.patchValue({
          DocumentType: this.typesInvoice.find(x => x.IsDefault).Name,
        });
      }
      else {
        console.log(next);
        this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${next.Error ? next.Error.Message : ''}`);
      }
    }, error => {
      console.log(error);
      this.alertService.errorInfoAlert(`Tipos de factura no encontrados ${error}`);
    });

    this.identificationTypeList = IdentificationType;
    this.getProvinces()
    this.getExRate();
    this.createFEForm();
    this.getMaxDiscout();
    this.getCustomers();
    this.GetParamsViewList();
    //this.GetCurrencyType();
    this.GetPriceList();
    this.GetSalesPersonList();
    this.getItems();
    //this.GetPayTerms();
    this.nameField.nativeElement.focus();
  }
  // obtiene los terminos de pago
  GetPayTerms() {
    this.blockUI.start('Obteniendo términos de pago, espere por favor...'); // Start blocking
    this.itemService.GetPayTerms()
      .subscribe((data: any) => {
        this.blockUI.stop(); // Stop blocking
        if (data.Result) {
          const customer = this.bpList.filter(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);
          this.PayTermsList = data.payTermsList;
          const DOC_ENTRY = this.storage.GetDocEntry();
          if (DOC_ENTRY === -1) {
            this.soForm.patchValue({ PayTerms: customer[0].GroupNum });
          }
        } else {
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }
  // obtiene la lista de pago
  GetPriceList() {
    this.blockUI.start('Obteniendo listas de precios, espere por favor...'); // Start blocking
    this.itemService.GetPriceList()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          const customer = this.bpList.find(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);
          this.PriceList = data.priceList;
          this.soForm.patchValue({ PriceList: customer.ListNum });
        } else {
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // obtiene la lista de personas vendedoras
  GetSalesPersonList() {
    this.blockUI.start('Obteniendo vendedores, espere por favor...'); // Start blocking
    this.smService.getSalesMan()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.SlpsList = data.salesManList;
          const DOC_ENTRY = this.storage.GetDocEntry();

          if (DOC_ENTRY > 0) {
            const CUSTOMER_DATA = JSON.parse(this.storage.GetCustomerData());
            this.soForm.patchValue({ SlpList: CUSTOMER_DATA.SlpCode });
          }
          else {
            this.soForm.patchValue({ SlpList: this.defaultSlpCode.toString() });
          }
        } else {
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  ClearItemList() {
    this.itemsList.length = 0;
    this.getTotals();
    // this.total = 0;
    // this.totalUSD = 0;
    // this.conta = 0;
    // this.tax = 0;
    // this.discount = 0;
    // this.totalWithoutTax = 0;
    // this.DailyExRate = 0;
    this.getItems();
  }

  //chequea si hay existencias del item a agregar
  CheckAvailableItem(ItemCode) {
    if (ItemCode !== '') {
      this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor...'); // Start blocking
      this.itemService.GetWHAvailableItem(ItemCode)
        .subscribe((data: any) => {
          // console.log(data);
          if (data.Result) {
            this.WHAvailableItemList.length = 0;
            this.itemCode = ItemCode;
            this.WHAvailableItemList = data.whInfo;
            if (data.whInfo.length <= 0) {
              this.blockUI.stop(); // Stop blocking
              this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
            }
            this.blockUI.stop(); // Stop blocking
          } else {
            this.blockUI.stop(); // Stop blocking
            this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
          }

        }, (error: any) => {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
  }
  // agrega un item a la lista
  cant: number;
  addItems_original(item) {
    if (this.ItemInfo.value !== '') {
      let code = item.item.split(' COD. ')[0];

      let mobileNavigatorObject: any = window.navigator;

      if (this.isScanning) {
        console.log(`Overriding code ${this.buildedData}`);
        this.isScanning = false;
        const ITEM = this.itemsTypeaheadList.find(x => x.includes(this.buildedData));
        this.buildedData = ``;
        if (!ITEM) {
          let oldone = this.ItemInfo.value;
          this.alertService.infoInfoAlert(`No existe ${oldone}`);
          setTimeout(() => {
            this.Cant.setValue(1);
            this.ItemInfo.setValue('');
            this.nameField.nativeElement.focus();
          }, 0);
          return;
        }
        code = ITEM.split(' COD. ')[0];
      }

      if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
        mobileNavigatorObject.clipboard.readText()
          .then(text => {
            if (!isNaN(parseInt(text))) {
              if (Number(text) > this.maxWeightTo0) {
                this.Cant.setValue(Math.max(Number(text) - this.pesoBolsa, 0.0001));
                //this.invForm.patchValue({cardName: cardName});
                //console.log('Pasted content: ', text);
                mobileNavigatorObject.clipboard.writeText("*")
                  .then(text => {
                    //this.Cant.setValue(Number(text));
                    //this.invForm.patchValue({cardName: cardName});
                    //console.log('Clipboard cleared ');
                  })
                  .catch(err => {
                    // console.error('Failed to clear clipboard contents: ', err);
                  });
              }

            }

            this.cant = Number(this.Cant.value);
            let cant2 = Number(this.Cant.value);

            let code = item.item.split(' COD. ')[0];
            let searchitem = true;
            this.hasLines = true;
            //this.itemsList.find(x => x.ItemCode == code).
            //this.CheckAvailableItem(code);
            var index: number = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
            // this.itemsList.forEach(x => {
            if (this.isOnGroupLine) {
              var index: number = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
              if (index != -1) {
                this.itemsList[index].Quantity += this.cant;
                this.itemsList[index].LinTot = this.itemsList[index].Quantity * this.itemsList[index].UnitPrice;
                searchitem = false;
                this.LineTotalCalculate(index);
                this.getTotals();
                this.ItemInfo.setValue('');
                this.Cant.setValue(1);
                return;
              }
            }
            this.blockUI.start('Obteniendo información del artículo, espere por favor...'); // Start blocking
            this.hasLines = true;
            this.itemService.GetItemByItemCode(code, this.soForm.controls.PriceList.value, this.soForm.controls.cardCode.value)
              .subscribe((data: any) => {
                if (data.Result) {
                  if (searchitem) {
                    this.conta++;
                    this.total += data.Item.UnitPrice;
                    let tot = this.soForm.controls.currency.value == 'COL' ? (data.Item.UnitPrice * this.cant) : (this.cant * (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toFixed(2))));
                    let itemAux = {
                      'Item': `${code}`,
                      'ItemCode': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
                      'ItemName': `${data.Item.ItemName}`,
                      'CodeName': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
                      'LastPurchasePrice': `${data.Item.LastPurchasePrice}`,
                      'UnitPrice': this.soForm.controls.currency.value == 'COL' ? data.Item.UnitPrice : (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toFixed(2))),
                      'UnitPriceCol': data.Item.UnitPrice,
                      'UnitPriceDol': (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toFixed(2))),
                      'U_SugPrice': '0',
                      'TaxCode': data.Item.TaxRate != '' ? data.Item.TaxCode : 'EXE',
                      'Quantity': this.cant,
                      'Active': true,
                      'Id': this.conta,
                      'LinTot': tot,
                      'TaxRate': data.Item.TaxRate != '' ? data.Item.TaxRate : 0.00,
                      'Discount': data.Item.Discount,
                      'WhsCode': this.whCode,
                      'WhsName': this.whName,
                      'Serie': '',
                      'SysNumber': 0,
                      'OnHand': data.Item.OnHand
                    }

                    this.isLineMode ? this.itemsList.push(itemAux) : this.itemsList.unshift(itemAux)
                    this.isLineMode ? this.LineTotalCalculateExt(this.itemsList.length - 1) : this.LineTotalCalculateExt(0)

                    this.getTotals();
                  }
                  const LastPP = data.Item.LastPurchasePrice ? data.Item.LastPurchasePrice : 0;
                  if (data.Item.UnitPrice <= LastPP && data.Item.UnitPrice != 0) {
                    this.alertService.infoInfoAlert(`Costo del Artículo: ${data.Item.ItemCode}-${data.Item.ItemName} es mayor o igual al precio de venta. Modifique precio por favor`);//Precio costo:	₡${data.Item.LastPurchasePrice} Precio Venta: ₡${data.Item.UnitPrice} 
                  }
                  this.Cant.setValue(1);
                  this.ItemInfo.setValue('');
                  this.itemService.GetWHAvailableItem(code)
                    .subscribe((data: any) => {
                      // console.log(data);
                      if (data.Result) {
                        if (data.whInfo.length <= 0) {
                          index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
                          if (index !== -1) {
                            this.itemsList[index].Quantity = 0;
                            this.itemsList[index].LinTot = 0;
                            searchitem = false;
                            this.LineTotalCalculate(index)
                            this.getTotals();
                          }
                          this.blockUI.stop(); // Stop blocking
                          this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
                        }
                        this.blockUI.stop(); // Stop blocking
                      } else {
                        this.blockUI.stop(); // Stop blocking
                        this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
                      }

                    }, (error: any) => {
                      this.blockUI.stop(); // Stop blocking
                      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
                    });
                } else {
                  this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
                }
                this.blockUI.stop(); // Stop blocking
              }, (error: any) => {
                this.blockUI.stop(); // Stop blocking
                this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
              });

          })
          .catch(err => {
            // console.error('Failed to read clipboard contents: ', err);
          });
      }
    }
  }

  addItems(item, _isManualOverride = false) {
    if (this.ItemInfo.value) {
      let code = `harcodedCode`;
      let mobileNavigatorObject: any = window.navigator;
      if (_isManualOverride) {
        if (this.searchTypeManual) {
          this.ItemInfo.setValue('');
          this.Cant.setValue(1);
          this.buildedData = ``;
          return;
        }

        for (let c = 0; c < this.itemsTypeaheadList.length; c++) {
          const BARCODE = this.itemsTypeaheadList[c].split(' COD. ')[1];
          if (BARCODE === this.ItemInfo.value || BARCODE === this.ItemInfo.value.split(' COD. ')[1]) {
            code = this.itemsTypeaheadList[c].split(' COD. ')[0];
          }
        }
        if (code == `harcodedCode`) {
          const ITEM = this.itemsTypeaheadList.find((x) => x.includes(this.ItemInfo.value));
          if (!ITEM) {
            this.alertService.infoInfoAlert(`No existe coincidencia para ${this.ItemInfo.value}`);
            this.ItemInfo.setValue('');
            this.nameField.nativeElement.focus();
            return;
          }
          code = ITEM.split(" COD. ")[0];

        }

        if (code == `harcodedCode` && item && item.item) {
          code = item.item.split(' COD. ')[0];
        }
        this.searchTypeManual = false;
      }
      else {
        code = item.item.split(' COD. ')[0];
        this.searchTypeManual = true;

      }

      if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
        mobileNavigatorObject.clipboard.readText()
          .then(text => {
            const priceList = this.soForm.get('PriceList').value;

            if (!isNaN(parseInt(text))) {
              if (Number(text) > this.maxWeightTo0) {
                // this.Cant.setValue(Math.max(Number(text) - this.pesoBolsa, 0.0001)); // REVISAR EN CASO DE ALGUN PROBLEMA
                //this.invForm.patchValue({cardName: cardName});
                //console.log('Pasted content: ', text);
                mobileNavigatorObject.clipboard.writeText("") // * antes de limpiar string
                  .then(text => {
                    //this.Cant.setValue(Number(text));
                    //this.invForm.patchValue({cardName: cardName});
                    //console.log('Clipboard cleared ');
                  })
                  .catch(err => {
                    // console.error('Failed to clear clipboard contents: ', err);
                  });
              }

            }

            this.cant = Number(this.Cant.value);
            let cant2 = Number(this.Cant.value);
            let searchitem = true;
            if (this.isOnGroupLine) {
              var index: number = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
              if (index != -1) {
                this.itemsList[index].Quantity += this.cant;
                this.itemsList[index].LinTot = this.itemsList[index].Quantity * this.itemsList[index].UnitPrice;
                searchitem = false;
                this.LineTotalCalculate(index);
                this.getTotals();
                this.GetAvailableItemInventory(code, this.itemsList[index].Quantity);
                this.ItemInfo.setValue('');
                this.Cant.setValue(1);
                this.searchTypeManual = false;

                return;
              }
            }

            if (this.isProcessing) {
              this.ItemInfo.setValue('');
              this.Cant.setValue(1);
              this.buildedData = ``;
              return;
            }


            this.isProcessing = true;
            this.blockUI.start('Obteniendo información del artículo, espere por favor...');
            this.hasLines = true;
            this.itemService.GetItemByItemCode(code, priceList, this.soForm.controls.cardCode.value) // TO AVOID BREAK ON GETITEMINFO
              .subscribe((data: any) => {
                this.isProcessing = false;
                this.searchTypeManual = false;
                if (data.Result) {
                  if (searchitem) {
                    this.conta++;
                    this.total += data.Item.UnitPrice;
                    let tot = (data.Item.UnitPrice * this.cant);
                    this.soForm.patchValue({ currency: this.userCurrency });
                    let AUXILIAR_ITEM = {
                      'Item': `${code}`,
                      'ItemCode': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
                      'ItemName': `${data.Item.ItemName}`,
                      'CodeName': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
                      'UnitPrice': this.userCurrency === 'COL' ? data.Item.UnitPrice : (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toString())),
                      'LastPurchasePrice': `${data.Item.LastPurchasePrice}`,
                      'U_SugPrice': '0',
                      'TaxCode': data.Item.TaxRate != 0.0 ? data.Item.TaxCode : 'EXE',
                      'Quantity': this.cant,
                      'Active': true,
                      'Id': this.conta,
                      'LinTot': tot,
                      'TaxRate': data.Item.TaxRate != 0.0 ? data.Item.TaxRate : 0.00,
                      'Discount': data.Item.Discount,
                      'WhsCode': this.whCode,
                      'WhsName': this.whName,
                      'Serie': '',
                      'SysNumber': 0,
                      'InvntItem': data.Item.InvntItem,
                      'OnHand': data.Item.OnHand,

                    };

                    AUXILIAR_ITEM.UnitPrice = AUXILIAR_ITEM.UnitPrice.toFixed(this.COMPANY.DecimalAmountPrice);

                    if (this.userCurrency != 'COL' && this.userCurrency != 'USD') {
                      AUXILIAR_ITEM.Quantity = 1;
                      AUXILIAR_ITEM.LinTot = 0;
                      AUXILIAR_ITEM.UnitPrice = 0;
                      this.storage.setLog(`ERROR!, fecha: ${new Date()} ---(${this.soForm.controls.currency.value})`);
                    }

                    this.isLineMode ? this.itemsList.push(AUXILIAR_ITEM) : this.itemsList.unshift(AUXILIAR_ITEM)

                    this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0)
                    this.getTotals();
                  }

                  this.Cant.setValue(1);
                  this.ItemInfo.setValue('');

                  const LastPP = data.Item.LastPurchasePrice ? data.Item.LastPurchasePrice : 0;
                  if (data.Item.UnitPrice <= LastPP && data.Item.UnitPrice != 0) {
                    this.alertService.infoInfoAlert(`Costo del Artículo: ${data.Item.ItemCode}-${data.Item.ItemName} es mayor o igual al precio de venta. Modifique precio por favor`);//Precio costo:	₡${data.Item.LastPurchasePrice} Precio Venta: ₡${data.Item.UnitPrice}
                  }

                  let cantsingroupLine: number = 0;
                  this.itemsList.forEach(x => {
                    if (x.Item === code) {
                      cantsingroupLine += x.Quantity;
                    }
                  });

                  //if (_isManualTrigger)
                  (<HTMLElement>document.getElementById('helperClick')).click();
                  this.itemService.GetWHAvailableItem(code)
                    .subscribe((data: any) => {
                      if (data.Result) {
                        let available: boolean = false;
                        let cantAvailable: number = 0;
                        // index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
                        data.whInfo.forEach(wh => {
                          if (wh.InvntItem === "Y") {
                            available = true;
                          }
                          cantAvailable = wh.Disponible;
                          // if (wh.Disponible >= this.cant) {
                          //   available = true;
                          // }


                        });
                        this.itemsList.filter(x => x.Item == code).forEach(x => {
                          x.available = cantAvailable
                        });

                        // this.itemsList[index].available = cantAvailable;
                        if (cantAvailable < cantsingroupLine && available) {
                          this.alertService.infoInfoAlert(`Sin stock, solicitud de ${cantsingroupLine}, disponible:${cantAvailable} `);
                        }

                        // if (!available) {
                        //   // index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
                        //   if (index !== -1) {
                        //     this.itemsList[index].Quantity = 0;
                        //     this.itemsList[index].LinTot = 0;
                        //     searchitem = false;
                        //     this.LineTotalCalculate(index)
                        //     this.getTotals();
                        //   }
                        //   this.blockUI.stop();
                        //   this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
                        // }
                        this.blockUI.stop();
                      } else {
                        this.blockUI.stop();
                        this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
                      }

                    }, (error: any) => {
                      this.blockUI.stop();
                      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
                    });

                } else {
                  this.blockUI.stop();
                  this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
                }
                this.blockUI.stop();
              }, (error: any) => {
                this.isProcessing = false;
                this.searchTypeManual = false;
                this.blockUI.stop();
                this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
              });


          })
          .catch(err => {
            this.isProcessing = false;
            this.searchTypeManual = false;
            this.blockUI.stop();
            // console.error('Failed to read clipboard contents: ', err);
          });
      }
    }
  }



  cantChange() {
    if (this.Cant.value < 1) {
      this.Cant.setValue(1);
    }
  }

  identificationTypeChange(IdentificationValue: string) {
    // console.log(IdentificationValue);
    switch (IdentificationValue) {
      case '00': {
        this.feForm.controls['Identification'].setValidators([]);
        this.feForm.controls['Identification'].updateValueAndValidity();
        // this.feForm.controls['Direccion'].setValidators([]);
        // this.feForm.controls['Direccion'].updateValueAndValidity();
        this.feForm.controls['Email'].setValidators([]);
        this.feForm.controls['Email'].updateValueAndValidity();
        this.neighborhoodList.length = 0;
        this.districtList.length = 0;
        this.cantonList.length = 0;
        this.provinceList.length = 0;
        break;
      }
      case '01': {
        this.validatorFeForm(9, 9);
        this.getProvinces();
        break;
      }
      case '02':
      case '04': {
        this.validatorFeForm(10, 10);
        this.getProvinces();
        break;
      }
      case '03': {
        this.validatorFeForm(11, 12);
        this.getProvinces();
        break;
      }
    }
  }

  validatorFeForm(min: number, max: number) {
    this.feForm.controls['Identification'].setValidators([Validators.required, Validators.minLength(min), Validators.maxLength(max)]);
    this.feForm.controls['Identification'].updateValueAndValidity();
    // this.feForm.controls['Direccion'].setValidators([Validators.required, Validators.maxLength(250)]);
    // this.feForm.controls['Direccion'].updateValueAndValidity();
    this.feForm.controls['Email'].setValidators([Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]);
    this.feForm.controls['Email'].updateValueAndValidity();
  }



  getProvinces() {
    this.jsonDataService.getJSONProvinces()
      .subscribe((data: any) => {
        this.provinceList = data.Provinces;
        this.feForm.patchValue({ Provincia: this.provinceList[0].ProvinceId });
        this.getCantons(this.provinceList[0].ProvinceId)
      });
  }


  getCantons(provinceId): void {
    this.provinceId = provinceId;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.cantonList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId), 'CantonId');
        if (typeof this.feForm.value.Canton !== 'undefined') {
          if (this.provinceId === '0') {
            this.feForm.patchValue({ Canton: this.cantonList[0].CantonId });
          }
          else {
            this.feForm.patchValue({ Canton: this.cantonId });
          }
        }
      });
  }
  // funcion para obtener la nueva lista de distritos segun la provincia y canton
  // recibe como parametro el id del canton y utiliza el id de la provincia para filtrar
  getDistrics(cantonId) {
    this.cantonId = cantonId;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.districtList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId), 'DistrictId');
        if (typeof this.feForm.value.Distritos !== 'undefined') {
          if (this.provinceId === '0') {
            this.feForm.patchValue({ Distritos: this.districtList[0].DistrictId });
          }
          else {
            this.feForm.patchValue({ Distritos: this.districtId });

          }
        }
      });
  }
  // funcion para obtener la nueva lista de barrios segun la provincia, canton y distrito
  // recibe como parametro el id del distrito, y utiliza el id de la provincia y del canton para filtrar
  getNeighborhood(districtId) {
    this.districtId = districtId;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.neighborhoodList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId && x.DistrictId === this.districtId), 'NeighborhoodId');
        if (typeof this.feForm.value.Barrio !== 'undefined') {
          if (this.neighborhoodId === '0') {
            this.feForm.patchValue({ Barrio: this.neighborhoodList[0].neighborhoodId });
          }
          else {
            this.feForm.patchValue({ Barrio: this.neighborhoodId });

          }
        }
      });
  }
  // pone los valores por defecto
  funcion() {
    //var inputValue = (<HTMLInputElement>document.getElementById("clienteId")).value;
    var inputValue = this.DEFAULT_BUSINESS_PARTNER;
    //let element :HTMLElement = document.getElementById("clienteId") as HTMLElement;
    let code = inputValue;
    let codePos = this.bpCodeList.indexOf(code);
    let cardName = this.bpNameList[codePos];

    let customer = this.bpList.filter(cus => {
      return cus.CardCode === code;
    });
    this.getCurrencyByUser(customer[0].Currency);

    // tslint:disable-next-line:no-unused-expression
    // if (cardName !== this.soForm.get('cardName').value) {
    // }
    const DOC_ENTRY = this.storage.GetDocEntry();
    let MOBJECT;
    if (DOC_ENTRY > 0) {
      MOBJECT = this.saleQuotation || this.saleOrder;
    }
    else {
      this.soForm.patchValue({ cardCode: this.DEFAULT_BUSINESS_PARTNER });
    }


    // this.soForm.patchValue({ cardName: MOBJECT ? MOBJECT.CardName : cardName });
    this.priceList = MOBJECT ? this.bpList.find(x => x.CardCode === MOBJECT.CardCode).ListNum : customer[0].ListNum;
  }



  unique(array, propertyName) {
    return array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i);
  }

  getFEDAta() {
    this.identificationTypeChange('00')

    this.feForm.reset();
    let codePos = this.bpCodeList.indexOf(this.soForm.controls['cardCode'].value);
    if (this.bpList[codePos].IdType != "00") {
      this.identificationTypeChange(this.bpList[codePos].IdType);
      this.feForm.patchValue({ IdType: this.bpList[codePos].IdType });
      this.feForm.patchValue({ Identification: this.bpList[codePos].Cedula });
      this.feForm.patchValue({ Email: this.bpList[codePos].E_mail });
      // this.provinceId = this.bpList[codePos].Provincia;
      // this.getProvinces();
      // this.cantonId = this.bpList[codePos].Canton;
      // this.getCantons(this.provinceId)
      // this.districtId = this.bpList[codePos].Distrito;
      // this.getDistrics(this.cantonId);
      // this.neighborhoodId = this.bpList[codePos].Barrio;
      // this.getNeighborhood(this.districtId);
      this.feForm.patchValue({ Direccion: this.bpList[codePos].Direccion });

    }
    /**REF CCPZ */
    // this.identificationTypeChange('00')
    // this.feForm.reset(true);
    // // console.log(this.soForm.controls['cardCode'].value);
    // let codePos = this.bpCodeList.indexOf(this.soForm.controls['cardCode'].value);
    // if (this.bpList[codePos].IdType != "00") {
    //   this.identificationTypeChange(this.bpList[codePos].IdType);
    //   this.feForm.patchValue({ IdType: this.bpList[codePos].IdType });
    //   this.feForm.patchValue({ Identification: this.bpList[codePos].Cedula });
    //   this.feForm.patchValue({ Email: this.bpList[codePos].E_mail });
    //   this.provinceId = this.bpList[codePos].Provincia;
    //   this.getProvinces();
    //   this.cantonId = this.bpList[codePos].Canton;
    //   this.getCantons(this.provinceId)
    //   this.districtId = this.bpList[codePos].Distrito;
    //   this.getDistrics(this.cantonId);
    //   this.neighborhoodId = this.bpList[codePos].Barrio;
    //   this.getNeighborhood(this.districtId);
    //   this.feForm.patchValue({ Direccion: this.bpList[codePos].Direccion });

    // }
  }
  queryFEData2() {
    let paymentTerm = this.PayTermsList.find(x => x.GroupNum === Number(this.soForm.controls.PayTerms.value));

    this.hasIdentification = false;
    // if (paymentTerm.Type === PayTermsEnum.Contado && this.feForm.controls.IdType.value && this.feForm.controls.Identification.value) {
    if (this.feForm.controls.IdType.value && this.feForm.controls.Identification.value) {
      this.blockUI.start('Obteniendo datos FE...');
      this.bpService.GetCustomersCont(this.feForm.controls.IdType.value, this.feForm.controls.Identification.value).subscribe((data: any) => {
        this.blockUI.stop();
        this.hasIdentification = true;
        if (data.Result) {
          if (this.isOnCreation) this.soForm.patchValue({ cardName: data.FEInfo.CardName });
          this.feForm.patchValue({ Email: data.FEInfo.Email });
        }
        else {
          // busca info del cliente en el padron
          this.blockUI.stop();
          this.blockUI.start('Obteniendo datos del padrón...');
          if (this.feForm.controls.Identification.value != '') {
            this.bpService.GetCustomersContPadron(this.feForm.controls.Identification.value).subscribe((data: any) => {
              this.blockUI.stop();
              if (data.Result.result) {
                this.soForm.patchValue({ cardName: data.Result.CardName });
              }
            }, (error: any) => {
              this.blockUI.stop();
              this.alertService.errorInfoAlert(`Error Padrón!!!, error: ${error.error.Message}`);
            });
          }
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error Obteniendo datos FE!!!, error: ${error.error.Message}`);
      });
    }
  }

  getCompanies() {
    this.blockUI.start('Obteniendo compañías, espere por favor...'); // Start blocking
    this.companyService.GetCompanies()
      .subscribe((data: any) => {
        if (data.Result) {
          this.companiesList.length = 0;
          this.companiesList = data.companiesList;
          // console.log(this.companiesList);
          this.companiesList.forEach(comp => {
            // console.log(comp.IsLinePriceEditable);
            this.pesoBolsa = comp.ScaleWeightToSubstract;
            this.priceEditable = comp.IsLinePriceEditable;
            this.maxWeightTo0 = comp.ScaleMaxWeightToTreatAsZero;
          });
          // console.log(this.companiesList);
        } else {
          this.alertService.errorAlert('Error al cargar compañías - Error: ' + data.errorInfo.Message);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  setWarehouseInfo() {
    let session = this.storage.getSession(navigator.onLine);
    if (session) {
      session = JSON.parse(session);

      this.whCode = session.WhCode;
      this.whName = session.WhName;
    }
  }

  // Usa para invertir flecha que despliega la data de fe
  toggleArrow(): void { this.typeArrow = !this.typeArrow; }


  GetSaleOrder(quotationDocEntry: number) {
    this.soAdnSQService.GetSaleOrder(quotationDocEntry).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.conta = 0;
        this.total = 0;
        this.itemsList = [];

        //this.itemsList = next.Data.DocumentLines;
        this.saleOrder = next.Data;
        if (this.bpList.length > 0) {
          const CUSTOMER = this.bpList.find(x => x.CardCode === this.saleOrder.CardCode);
          if (CUSTOMER) this.priceList = CUSTOMER.ListNum;
        }

        if (this.saleOrder.U_NumIdentFE !== null) {
          this.feForm.patchValue({
            IdType: this.saleOrder.U_TipoIdentificacion,
            Identification: this.saleOrder.U_NumIdentFE,
            Email: this.saleOrder.U_CorreoFE,
            ObservacionFE: this.saleOrder.U_ObservacionFE
          });

          (<HTMLButtonElement>document.getElementById('triggerFECollapser')).click();
        }


        setTimeout(() => {
          this.soForm.patchValue({
            PayTerms: this.saleOrder.PaymentGroupCode,
            SlpList: this.saleOrder.SalesPersonCode,
            currency: this.saleOrder.DocCurrency,
            DocumentType: this.saleOrder.U_TipoDocE,
            cardName: this.saleOrder.CardName,
            Comment: this.saleOrder.Comments
          });
        }, 500);


        next.Data.DocumentLines.forEach(x => {
          this.conta++;
          this.total += x.UnitPrice;
          const tot = x.UnitPrice * x.Quantity;
          let itemAux = {
            'Item': `${x.ItemCode}`,
            'ItemCode': `${x.ItemCode} - ${x.ItemCode}`,
            'ItemName': `${x.ItemName}`,
            'CodeName': `${x.ItemCode} - ${x.ItemName}`,
            'UnitPrice': JSON.parse(this.storage.GetCustomerData()).Currency === 'COL' ? x.UnitPrice : (parseFloat(Number(x.UnitPrice / this.DailyExRate).toString())),
            'UnitPriceCol': x.UnitPrice,
            'UnitPriceDol': x.UnitPrice,
            'U_SugPrice': '0',
            'TaxCode': x.TaxCode,
            'Quantity': x.Quantity,
            'Active': true,
            'Id': this.conta,
            'LinTot': tot,
            'TaxRate': x.TaxRate != 0.0 ? x.TaxRate : 0.00,
            'Discount': x.DiscountPercent,
            'WhsCode': x.WarehouseCode,
            'WhsName': x.WhsName,
            'Serie': '',
            'SysNumber': 0,
            'OnHand': 0,
            'BaseEntry': x.BaseEntry,
            'BaseType': x.BaseType,
            'BaseLine': x.BaseLine,
            'LineNum': x.LineNum,
            // 'U_NVT_ServicioMedico': x.U_NVT_ServicioMedico,
            //'TaxCode_BCK': x.TaxCode_BCK,
            //'TaxRate_BCK': x.TaxRate_BCK,
            'ItemGroupCode': x.ItemGroupCode,
            'LastPurchasePrice': x.LastPurchasePrice,

          }

          this.isLineMode ? this.itemsList.push(itemAux) : this.itemsList.unshift(itemAux);
          this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0);
          this.getTotals();

          this.itemService.GetWHAvailableItem(x.ItemCode)
            .subscribe((data: any) => {
              if (data.Result) {
                let isInventoryItem: string;
                let cantAvailable: number = 0;
                // var index = this.itemsList.indexOf(this.itemsList.find(y => y.Item == x.ItemCode));
                data.whInfo.forEach(wh => {
                  if (wh.InvntItem === "Y") {
                    isInventoryItem = wh.InvntItem
                    cantAvailable = wh.Disponible;
                  }
                });
                if (data.whInfo.length <= 0) {
                  isInventoryItem = 'Y';
                  cantAvailable = 0;
                }
                this.itemsList.filter(y => y.Item == x.ItemCode).forEach(x => {
                  x.available = cantAvailable
                  x.InvntItem = isInventoryItem;
                });
                // this.itemsList[index].available = cantAvailable;
                // this.itemsList[index].InvntItem = isInventoryItem;
              }
            });


        });
      } else {
        console.log(next);
        this.alertService.errorAlert(next.Error.Message);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.alertService.errorAlert(error);
    });
  }
  getBaseLines(quotationDocEntry: number) {
    this.soAdnSQService.GetSaleQuotationToCopy(quotationDocEntry).pipe(first()).subscribe(response => {
      if (response.Result) {
        this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);

        this.conta = 0;
        this.total = 0;
        this.itemsList = [];
        this.saleQuotation = response.Data;

        this.soForm.patchValue({ cardName: this.saleQuotation.CardName });
        if (this.bpList.length > 0) {
          const CUSTOMER = this.bpList.find(x => x.CardCode === this.saleQuotation.CardCode);
          if (CUSTOMER) this.priceList = CUSTOMER.ListNum;
        }
        this.baseLines = response.Data.DocumentLines;

        this.soForm.patchValue({
          DocumentType: this.saleQuotation.U_TipoDocE,
          Comment: this.saleQuotation.Comments,
          PayTerms: this.saleQuotation.PaymentGroupCode
        });

        if (this.saleQuotation.U_TipoIdentificacion !== null) {
          this.feForm.patchValue({
            IdType: this.saleQuotation.U_TipoIdentificacion,
            Identification: this.saleQuotation.U_NumIdentFE,
            Email: this.saleQuotation.U_CorreoFE
          });

          (<HTMLButtonElement>document.getElementById('triggerFECollapser')).click();
        }

        response.Data.DocumentLines.forEach(x => {
          this.conta++;
          //this.total += x.Quantity * x.UnitPrice;

          const tot = x.UnitPrice * x.Quantity;
          let itemAux = {
            'Item': `${x.ItemCode}`,
            'ItemCode': `${x.ItemCode} - ${x.ItemCode}`,
            'ItemName': `${x.ItemName}`,
            'CodeName': `${x.ItemCode} - ${x.ItemName}`,
            'UnitPrice': JSON.parse(this.storage.GetCustomerData()).Currency === 'COL' ? x.UnitPrice : (parseFloat(Number(x.UnitPrice / this.DailyExRate).toString())),
            'UnitPriceCol': x.UnitPrice,
            'UnitPriceDol': x.UnitPrice,
            'U_SugPrice': '0',
            'TaxCode': x.TaxCode,
            'Quantity': x.Quantity,
            'Active': true,
            'Id': this.conta,
            'LinTot': tot,
            'TaxRate': x.TaxRate != 0.0 ? x.TaxRate : 0.00,
            'Discount': x.DiscountPercent,
            'WhsCode': x.WarehouseCode,
            'WhsName': x.WhsName,
            'Serie': '',
            'SysNumber': 0,
            'OnHand': 0,
            'BaseEntry': quotationDocEntry,
            'BaseType': BaseTypeLines.SALE_ORDER,
            'BaseLine': x.BaseLine,
            'LineNum': x.LineNum,
            // 'U_NVT_ServicioMedico': x.U_NVT_ServicioMedico,
            //'TaxCode_BCK': x.TaxCode_BCK,
            //'TaxRate_BCK': x.TaxRate_BCK,
            'ItemGroupCode': x.ItemGroupCode,
            'LastPurchasePrice': x.LastPurchasePrice
          }

          this.isLineMode ? this.itemsList.push(itemAux) : this.itemsList.unshift(itemAux);
          this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0);
          this.getTotals();

          this.itemService.GetWHAvailableItem(x.ItemCode)
            .subscribe((data: any) => {
              if (data.Result) {
                let isInventoryItem: string;
                let cantAvailable: number = 0;
                // var index = this.itemsList.indexOf(this.itemsList.find(y => y.Item == x.ItemCode));
                data.whInfo.forEach(wh => {
                  if (wh.InvntItem === "Y") {
                    isInventoryItem = wh.InvntItem
                    cantAvailable = wh.Disponible;
                  }
                });
                if (data.whInfo.length <= 0) {
                  isInventoryItem = 'Y';
                  cantAvailable = 0;
                }
                this.itemsList.filter(y => y.Item == x.ItemCode).forEach(x => {
                  x.available = cantAvailable
                  x.InvntItem = isInventoryItem;
                });
                // this.itemsList[index].available = cantAvailable;
                // this.itemsList[index].InvntItem = isInventoryItem;
              }
            });
        });
      } else {
        this.alertService.errorAlert(response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert(err);
    });
  }

  UpdateSaleOrder(_documentType: string): void {
    let mappedUdfs: IUdfTarget[] = [];
    this.udfs.forEach(x => {
      let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;

      if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();

      mappedUdfs.push({
        Name: x.Name,
        Value: parsedValue,
        FieldType: x.FieldType
      } as IUdfTarget);
    });

    const AVAILABLE_INV = this.itemsList.find(x => +x.available < (this.itemsList.filter(y => y.ItemCode == x.ItemCode).reduce((p, c) => { return p + c.Quantity }, 0)) && x.InvntItem === "Y");
    if (AVAILABLE_INV) {
      this.alertService.infoInfoAlert(`Sin stock, no hay cantidad solicitada para el producto ${AVAILABLE_INV.ItemName}, disponible:${AVAILABLE_INV.available} `);
      return;
    }

    this.blockUI.start('Actualizando órden de venta, espere por favor...');
    this.flagForm = true;
    this.documentService.UpdateSaleOrder(this.CreateSalesOrderObject())
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.isOnPrint = true;
          this.baseLines = null;
          this.lastSO = data.DocEntry;
          this.returnedDocEntry = data.DocEntry;
          this.returnedDocNum = data.DocNum;
          this.btnVisibleBool = false;
          this.titleSaleOrder = 'Órden de venta actualizada correctamente';
          (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();
          // this.printSO();

        } else {
          this.flagForm = false;
          this.alertService.errorAlert(`Error al intentar actualizar el documento, Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
        this.isOnSubmit = false;
      }, (error: any) => {
        this.blockUI.stop();
        this.flagForm = false;
        this.isOnSubmit = false;
        console.log(error);
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }




  CreateSalesOrderObject(): ISaleDocument {


    let OrderLines: IDocumentLine[] = this.itemsList.map((line,index) => {

      let item = {
        ItemCode: line.ItemCode.split('-')[0].trim(),
        DiscountPercent: line.Discount,
        Quantity: line.Quantity,
        Serie: '',
        TaxCode: line.TaxCode,
        TaxRate: line.TaxRate,
        UnitPrice: line.UnitPrice,
        WarehouseCode: line.WhsCode,
        TaxOnly: line.TaxOnly ? 'tYES' : 'tNO',
        BaseEntry: line.BaseEntry>0? line.BaseEntry:null,
        BaseLine: line.BaseLine,
        BaseType: line.BaseType || -1,

      } as IDocumentLine;

      return item;

    });


    // if (this.storage.GetDocEntry() > 0) {
    //   if (this.baseLines)
    //     this.baseLines.forEach(i => {
    //       let aux = OrderLines.find(x => x.ItemCode === i.ItemCode);
    //       if (aux) {
    //         aux.BaseEntry = this.storage.GetDocEntry();
    //         aux.BaseLine = i.BaseLine;
    //         aux.BaseType = BaseTypeLines.SALE_ORDER;
    //       }
    //     });
    // }

 
    let mappedUdfs: IUdfTarget[] = [];
    this.udfs.forEach(x => {
      mappedUdfs.push({
        Name: x.Name,
        Value: (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value,
        FieldType: x.FieldType
      } as IUdfTarget);
    });




    let DocEntry: number = this.documentAction === 'Update' ? this.storage.GetDocEntry() : 0;

    const SaleOrder: any = {
      'U_Online': '0',
      'DocEntry': DocEntry,
      'BaseEntry': this.storage.GetDocEntry(),
       DocumentLines: OrderLines,
      'CardCode': this.soForm.controls.cardCode.value,
      'CardName': this.soForm.controls.cardName.value,
      'DocCurrency': this.soForm.controls.currency.value,
      'PaymentGroupCode': this.soForm.controls.PayTerms.value,
      'SalesPersonCode': this.soForm.controls.SlpList.value,
      'Comments': this.soForm.controls.Comment.value,
      'DocType': BoDocumentTypes.dDocument_Items,
      "U_TipoIdentificacion": (this.feForm.controls.IdType.value != '00') ? this.feForm.controls.IdType.value : null,
      "U_NumIdentFE": this.feForm.controls.Identification.value,
      "U_CorreoFE": this.feForm.controls.Email.value,
      'U_ObservacionFE': this.feForm.value.ObservacionFE,
      'U_CLVS_POS_UniqueInvId': this.uniqueInvCode,
      'UdfTarget': mappedUdfs,
      U_TipoDocE: this.soForm.controls.DocumentType.value,
      DocDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocNum: 0,
      NumAtCard: '',
      Series: -1,
      DocDueDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd')
    };



    return SaleOrder;

  }








  CreateSaleOrder(_documentType: string): void {


    this.isRequiredEmail = false;
    if (this.hasIdentification && this.feForm.value.Email === '') {
      this.isRequiredEmail = true;
      this.alertService.infoInfoAlert(`El correo es requerido para completar la factura electrónica`);
      return;
    }
    this.isRequiredEmail = false;
    this.blockUI.start('Creando órden de venta, espere por favor...');
    this.flagForm = true;


    this.documentService.CreateSaleOrder(this.CreateSalesOrderObject())
      .subscribe((data: any) => {
        this.blockUI.stop(); // Stop blocking
        if (data.Result) {
          this.baseLines = null;
          this.lastSO = data.DocEntry;
          this.returnedDocEntry = data.DocEntry;
          this.returnedDocNum = data.DocNum;
          this.btnVisibleBool = false;
          // this.printSO();
          this.titleSaleOrder = 'Órden de venta creada con éxito';
          (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();
          // this.alertService.successAlert(` Orden de venta creada con éxito, número documento: ${data.DocNum}, DocEntry: ${data.DocEntry}`);
        } else {
          this.flagForm = false;
          this.alertService.errorAlert(`Error al intentar crear el documento, Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
        this.isOnSubmit = false;
      }, (error: any) => {
        this.flagForm = false;
        this.isOnSubmit = false;
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  closeAfterPayModal(): void {
    this.CreateNew()
  }

  redirectToQuotation() {
    this.router.navigate(['quotation',]);
  }

  redirectToSOandSQ() {
    this.router.navigate(['SOandSQ']);
  }
  generateUniqueInvoiceId(): void {
    const USER_PREFIXID = JSON.parse(this.storage.getCurrentSession()).PrefixId;

    const DATE = new Date();

    const DAYS = DATE.getDate() < 10 ? '0' + DATE.getDate() : DATE.getDate().toString();
    const MONTS = (DATE.getMonth() + 1) < 10 ? '0' + (DATE.getMonth() + 1) : (DATE.getMonth() + 1).toString();
    const YEAR = DATE.getFullYear().toString().slice(0, 2);

    const HOURS = DATE.getHours() < 10 ? '0' + DATE.getHours() : DATE.getHours();
    const MINUTES = DATE.getMinutes() < 10 ? '0' + DATE.getMinutes() : DATE.getMinutes();
    const SECONDS = DATE.getSeconds() < 10 ? '0' + DATE.getSeconds() : DATE.getSeconds();

    this.uniqueInvCode = `${USER_PREFIXID + DAYS + MONTS + YEAR + HOURS + MINUTES + SECONDS}`;

    console.log('UIC ', this.uniqueInvCode);
  }

  GetConfiguredUdfs(_documentAlias: string): void {
    this.blockUI.start(`Obteniendo datos, espere por favor`);
    this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.udfs = next.Udfs;
        this.udfs.filter(x => x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));
        const DOC_ENTRY = this.storage.GetDocEntry();

        if (DOC_ENTRY > 0 && this.udfs.length > 0) {
          this.GetUdfsData(this.udfs, _documentAlias, DOC_ENTRY);
        }
      }
      else {
        console.log(next);
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  GetUdfsData(_udfs: IUdf[], _category: string, _docEntry): void {
    this.blockUI.start(`Obteniendo datos de udfs, espere por favor`);
    this.udfService.GetUdfsData(_udfs, _docEntry, _category).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        next.UdfsTarget.forEach(x => {
          if (x.FieldType === 'DateTime') {
            if (x.Value !== '') (<HTMLInputElement>document.getElementById(`dynamicRender_${x.Name}`)).value = formatDate(x.Value, 'yyyy-MM-dd', 'en');
          }
          else {
            (<HTMLInputElement>document.getElementById(`dynamicRender_${x.Name}`)).value = x.Value;
          }
        });
      }
      else {
        console.log(next);
        this.alertService.errorAlert(`Error ${next.Error ? next.Error.Message : JSON.stringify(next)}`);
      }
    }, error => {
      console.log(error);
    });
  }

  MapDataType(_dataType): string {
    let mappedDataType = 'No definido';

    switch (_dataType) {
      case 'String':
        mappedDataType = "text";
        break;
      case 'Int32':
        mappedDataType = "number";
        break;
      case 'DateTime':
        mappedDataType = "date";
        break;
    }
    return mappedDataType;
  }
  LineStatus(venta: number, costo: number, disp: number, index: number): string {
    if (+venta <= +costo && +venta !== 0) {
      return `Costo del artículo es mayor o igual al precio de venta. Precio venta: ${+venta} Precio costo: ${+costo} `;
    } else
      if (+venta == 0) {
        return "No tiene precio";
      }
    if (disp === 0) {
      return "Sin stock";
    }

    // let cantsingroupLine: number = 0;
    const QUANTITYTOTAL = this.itemsList.filter(y => y.Item == this.itemsList[index].Item && this.itemsList[index].InvntItem === "Y").reduce((p, c) => { return p + c.Quantity }, 0);

    // const INDEX = this.itemsList.findIndex(x => x.available !== '' && x.Item === this.itemsList[index].Item);
    // this.itemsList.forEach(x => {
    //   if (x.Item === this.itemsList[index].Item) {
    //     cantsingroupLine += x.Quantity;

    // if (INDEX !== -1) {
    //   x.available = this.itemsList[INDEX].available
    //   x.InvntItem = this.itemsList[INDEX].InvntItem
    // }
    //   }   
    // });

    if (this.itemsList[index].available < +QUANTITYTOTAL && this.itemsList[index].InvntItem === "Y") {
      return `Sin stock, solicitado: ${+QUANTITYTOTAL}, disponible: ${this.itemsList[index].available}`;
    }
  }
  LineColor(venta: number, costo: number): string {
    if (+venta <= +costo || +venta == 0) {
      return "mOrange"
    }
  }

  AvailableItemColor(item: any): boolean {
    let cantsingroupLine: number = 0;

    this.itemsList.forEach(x => {
      if (x.Item === item.Item) {
        cantsingroupLine += x.Quantity;
      }
    });

    if (+item.available < +cantsingroupLine && item.InvntItem === "Y") {
      return true;
    }
  }
  GetAvailableItemInventory(code: string, cant: number): void {
    this.itemService.GetWHAvailableItem(code)
      .subscribe((data: any) => {
        if (data.Result) {
          let available: boolean = false;
          data.whInfo.forEach(wh => {
            if (wh.Disponible >= cant && wh.InvntItem === "Y") {
              available = true;
            }
          });
          if (data.whInfo.length > 0) {
            if (!available) {
              this.alertService.infoInfoAlert(`Sin stock, solicitud de ${cant}, disponible:${data.whInfo[0].Disponible} `);
            }
          } else {
            this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
          }
        } else {
          this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
        }

      }, (error: any) => {
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
}

