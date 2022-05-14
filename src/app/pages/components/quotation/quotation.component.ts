import { Component, ElementRef, ViewChild, OnInit, OnDestroy, HostListener, Renderer2, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Observable, Subject, merge, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, first } from 'rxjs/operators';
import { DatePipe, DecimalPipe, DOCUMENT, formatDate } from '@angular/common';
import { NgbModal, ModalDismissReasons, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
//import { ElectronService } from 'ngx-electron';
const printJS = require('print-js');
// MODELOS
import { Params, UserAssigns, ISaleQuotation, IPrinter, IdentificationType, PayTermsEnum, IUdf, IUdfTarget, Company, IViewGroup, IDocumentLine } from './../../../models/index';
import { ReportType, KEY_CODE, BoDocumentTypes } from '../../../enum/enum';

// RUTAS

// COMPONENTES

// SERVICIOS
import { Router } from '@angular/router';
import {
  CompanyService, UserService, ItemService, BusinessPartnerService, DocumentService, TaxService, AuthenticationService, PermsService,
  ParamsService, ReportsService, AlertService, SalesManService, ExRateService, StorageService, CommonService, JsonDataService
} from '../../../services/index';
import { SOAndSQService } from 'src/app/services/soand-sq.service';

// Electron renderer service
import { ElectronRendererService } from '../../../electronrenderer.service';
import { UdfsService } from 'src/app/services/udfs.service';
import { DOCUMENT_ALIAS } from 'src/app/models/constantes';
import { IudfValue } from 'src/app/models/iudf-value';
import { EventManager } from '@angular/platform-browser';
import { Currency } from 'src/app/models/i-currency';
import { DocumentModel, LinesBaseModel } from 'src/app/models/i-invoice-document';
import { IDocument, IQuotDocument } from 'src/app/models/i-document';

// PIPES


@Component({
  selector: 'app-quotation',
  templateUrl: './quotation.component.html',
  styleUrls: ['./quotation.component.scss'],
  providers: [DecimalPipe, DatePipe]
})
export class QuotationComponent implements OnInit, OnDestroy {
  //VARBOX
  isOnGroupLine: boolean;//Agrupacion de lineas en documento
  isLineMode: boolean;//Orden de lineas en documento al inicio o final 
  isScanning: boolean;
  isLockedByScanner: boolean;
  buildedData: string;
  isLockedIdSearch = false;
  COMPANY: Company; // Usada para guardar las configuraciones del a compania
  TO_FIXED_PRICE: string; // Contiene la cantidad de decimales a usar en el precio unitario
  TO_FIXED_TOTALLINE: string; // Contiene la cantidad de decimales a usar en el total de linea
  TO_FIXED_TOTALDOCUMENT: string; // Contiene la cantidad de decimales a usar en el total del documento
  udfs: IUdf[];
  isAllowedWHChange: boolean;
  typesInvoice: any[] = [];
  cantonId: string; // identificador del canton
  cantonList: any[] = []; // lista de cantones
  provinceId: string; // identificador de la provincia
  provinceList: any[] = [];// provincias
  identificationTypeList: any[] = [];
  feForm: FormGroup;
  typeArrow: boolean; // Hace toggle al darle click
  PriceList: any[] = []; // lista de las listas de precios
  isAllowedPriceListChange = false;
  PayTermsList: any[] = []; // lista de los Terminos de pagos
  $requestViewer: Subject<number>;
  requestViewerSubscription: Subscription;
  currentRequest: number;
  requestsToAwait: number;
  cardNameSearchTerm: string;
  returnedDocEntry: number;
  returnedDocNum: number;
  titleQuotation: string;
  @BlockUI() blockUI: NgBlockUI;

  viewParamList: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListHeader: any[] = []; // llena la lista con los componentes parametrizados
  viewParamListTotales: any[] = []; // llena la lista con los componentes parametrizados
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados

  SlpsList: any[] = []; // lista de los vendedores

  // --------Campos Parametrizados
  txtPriceList: Params = new Params(); // campo para Listas de precios
  lbPriceList: Params = new Params(); // etiqueta para Listas de precios
  lbPayTerms: Params = new Params(); // etiqueta para Terminos de pagos
  lbCardCode: Params = new Params(); // etiqueta para CardCode
  txtCardCode: Params = new Params(); // campo para CardCode
  lbCardName: Params = new Params(); // etiqueta para CardName
  txtCardName: Params = new Params(); // campo para CardName
  lbCurrency: Params = new Params(); // etiqueta para CardName
  txtCurrency: Params = new Params(); // campo para CardName
  txtComments: Params = new Params(); // campo para el comentario
  lbComments: Params = new Params(); // etiqueta para el comentario
  lbSLP: Params = new Params(); // etiqueta para el vendedor
  txtSLP: Params = new Params(); // campo para el vendedor
  txtPayTerms: Params = new Params(); // campo para Terminos de pagos
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

  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual

  public model: any;

  QouForm: FormGroup; // formulario para la cotizacion
  // totalForm: FormGroup; // formulario para el total de la cotizacion
  submitted = false; // variable para reconcer si se envio una peticion o no
  flagForm: boolean; //Validacion flag para evitar reenvio de solicitudes al mismo tiempo 
  isCreatingQuotation: boolean;

  setCurr: string;
  currencyList: Currency[] = []; // lista de tipos de cambio
  allCurrencyList: Currency[] = []; // lista de todos los tipos de cambio existentes en la aplicacion
  itemsList: any[] = []; // lista de items
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  itemsCodeList: string[] = []; // lista de los Códigos de items
  itemsNameList: string[] = []; // lista de los nombres de items
  defaultGroupNum: any;
  bpList: any[] = []; // lista de clientes
  bpCodeList: string[] = []; // lista de los Códigos de clientes
  bpNameList: string[] = []; // lista de los nombres de clientes
  companiesList: any[] = []; // lista de las compannias

  conta: number; // variable contador para colocar un 'id' a la lista de items
  total: number; // variable para almacenar el total de la factura
  totalUSD: number;
  tax: number; // variable para almacenar el total de impuestos
  discount: number; // variable para almacenar el total de descuento
  totalWithoutTax: number; // variable para almacenar el total sin impuesto
  DailyExRate: number;
  DEFAULT_BUSINESS_PARTNER: string;

  taxesList: any[] = []; // lista de los impuestos

  closeResult: string; // variable para saber porque se cerro la modal
  modalReference: any; // instancia de la modal de terminal y sucursal

  WHAvailableItemList: any[] = []; // lista de los items disponibles por almacen
  indexAvaItem: number; // indice de la lista del item seleccionado para la disponibilidad
  itemCode: string; // variable para almacenar el Código del ite seleccionado para buscar la disponibilidad
  seriesList: any[] = []; // lista de las series de un item po almacen
  btnVisibleBool: boolean; // activa y desactiva los botones de envio y nuevo
  hasLines: boolean = false;  //dice si hay elementos a cotizar
  public expandedIndex: number; // variable para manejar el collapse de los items y reconocer sobre cual se va a trabajar
  title: string; // titulo de la vista
  lastQuotation: number;
  @ViewChild("name") nameField: ElementRef;

  userAssignsList: UserAssigns[] = [];
  defaultSlpCode: number = -1;
  pesoBolsa: number = 0.020;
  priceEditable: boolean = false;
  maxWeightTo0: number = 0.01;
  saleQuotation: IDocument;


  //#001 Homolgacion metodo scanner
  searchTypeManual: boolean;
  isProcessing: boolean;
  userCurrency: string;

  Comments: FormControl = new FormControl();
  maxDiscuont: any;
  MapWidth: any;
  tableLength: number;
  permisos: boolean = true;

  isOnSubmit: boolean = false;
  viewGroupList: IViewGroup[]; //contiene lista de agrupaciones en linea
  whCode: string;
  whName: string;
  priceList: number;
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.Enter) {
      this.isOnSubmit = true;
      this.onSubmit();
    }
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.F7) {
      this.redirectToSO();
    }
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.keyCode === KEY_CODE.F8) {
      this.redirectToSOandSQ();
    }
  };

  closeAfterPayModal(): void {
    this.CreateNew()

  }

  redirectToSO() {
    this.router.navigate(['so']);
  }

  redirectToSOandSQ() {
    this.router.navigate(['SOandSQ']);
  }


  constructor(
    private eventManager: EventManager,
    private fb: FormBuilder,
    private renderer: Renderer2,
    private itemService: ItemService,
    private bpService: BusinessPartnerService,
    private decimalPipe: DecimalPipe,
    private documentService: DocumentService,
    private sPerm: PermsService,
    private taxService: TaxService,
    private companyService: CompanyService,
    private uService: UserService,
    private authenticationService: AuthenticationService,
    private modalService: NgbModal,
    private exrate: ExRateService,
    //private _electronService: ElectronService,
    private paramsService: ParamsService,
    private reportsService: ReportsService,
    private router: Router,
    private alertService: AlertService,
    private smService: SalesManService,
    private electronRendererService: ElectronRendererService,
    private storage: StorageService,
    private soAndSqService: SOAndSQService,
    private datePipe: DatePipe,
    private commonService: CommonService,
    @Inject(DOCUMENT) private _document: Document,
    private jsonDataService: JsonDataService
    , private udfService: UdfsService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.expandedIndex = -1;

    //Original
    // const removeGlobalEventListener = this.eventManager.addGlobalEventListener(
    //   'document',
    //   'keyup',
    //   (ev) => {
    //     if (this.ItemInfo && this.ItemInfo.value) {
    //       if (Number(this.ItemInfo.value.toString())) {
    //         this.isScanning = true;
    //         this.buildedData = this.ItemInfo.value;
    //       }

    //       if (ev.key === 'Enter') {
    //         this.isLockedByScanner = true;
    //         this.isScanning = false;
    //       }
    //     }
    //   }
    // );

    //#001 Homolgacion metodo invoice 17/09/2021
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
            if (this._document && this._document.activeElement && this._document.activeElement.id && this._document.activeElement.id == 'ItemCodeManualTrigger') {
              this.isLockedByScanner = true;
              this.isScanning = false;
            }
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



  queryFEData2() {
    let paymentTerm = this.PayTermsList.find(x => x.GroupNum === Number(this.QouForm.controls.PayTerms.value));


    if (paymentTerm.Type === PayTermsEnum.Contado && this.feForm.controls.IdType.value !== "") {
      this.blockUI.start('Obteniendo datos FE...');
      this.bpService.GetCustomersCont(this.feForm.controls.IdType.value, this.feForm.controls.Identification.value).subscribe((data: any) => {
        this.blockUI.stop();
        if (data.result) {
          this.QouForm.patchValue({ cardName: data.FEInfo.CardName });
          this.feForm.patchValue({ Email: data.FEInfo.Email });
        }
        else {
          this.blockUI.start('Obteniendo datos del padrón...');
          if (this.feForm.controls.Identification.value != '') {
            this.bpService.GetCustomersContPadron(this.feForm.controls.Identification.value).subscribe((data: any) => {
              this.blockUI.stop();
              if (data.Result.result) {
                this.QouForm.patchValue({ cardName: data.Result.CardName });
              }
            }, (error: any) => {
              this.blockUI.stop();
              this.alertService.errorInfoAlert(`Error Padrón!!!, Error: ${error.error.Message}`);
            });
          }
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error Obteniendo datos FE!!!, Error: ${error.error.Message}`);
      });
    }
  }

  expandRow(index: number): void {
    this.expandedIndex = index === this.expandedIndex ? -1 : index;
  }


  ngOnInit() {
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);
    this.COMPANY = this.storage.getCompanyConfiguration();
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.identificationTypeList = IdentificationType;
    this.createFEForm();
    this.typeArrow = false;
    this.cardNameSearchTerm = '';
    this.currentRequest = 0;
    this.$requestViewer = new Subject();
    const DOC_ENTRY = this.storage.GetDocEntry();
    if (DOC_ENTRY > 0) {
      const CUSTOMER_DATA = JSON.parse(this.storage.GetCustomerData());
      this.DEFAULT_BUSINESS_PARTNER = CUSTOMER_DATA.CardCode;
    } else {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.getCurrentSession()).DefaultBussinesPartnerUI;
    }


    this.checkPermits();
    this.setWarehouseInfo();
    this.defaultGroupNum = "-1";
    this.tableLength = 1000;
    this.MapWidth = {};
    this.MapWidth["Id"] = 80;
    this.MapWidth["ItemCode"] = 450;
    this.MapWidth["UnitPrice"] = 200;
    this.MapWidth["Marca"] = 200;
    this.MapWidth["Group"] = 200;
    this.MapWidth["Quantity"] = 80;
    this.MapWidth["SubGroup"] = 100;
    this.MapWidth["ItemName"] = 350;
    this.MapWidth["Discount"] = 80;
    this.MapWidth["TaxRate"] = 80;
    this.MapWidth["TaxCode"] = 80;
    this.MapWidth["WhsCode"] = 80;
    this.MapWidth["WhsName"] = 200;
    this.MapWidth["LastDate"] = 100;
    this.MapWidth["LinTot"] = 100;
    this.MapWidth["Serie"] = 100;
    this.MapWidth["Opc"] = 100;
    this.btnVisibleBool = true;
    this.conta = 0;
    this.total = 0;
    this.totalUSD = 0;
    this.DailyExRate = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.saleQuotation = null;
    this.QouForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      SlpList: ['', Validators.required],
      Comment: '',
      PayTerms: [''],
      PriceList: ['']
    });

    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {
        this.typesInvoice = next.InvoiceTypes;
        this.QouForm.patchValue({
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

    this.getMaxDiscout();
    this.getCustomers();
    this.GetParamsViewList();
    //this.GetCurrencyType();
    this.getExRate();
    //this.GetSalesPersonList();
    this.setSalesPerson();
    this.getTaxes();
    //this.GetPayTerms();
    this.GetPriceList();

    //this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.getCurrentSession()).DefaultBussinesPartnerUI;
    this.itemsTypeaheadList = [];
    this.itemsList = [];
    this.itemsCodeList = [];
    this.itemsNameList = [];
    this.getItems();
    this.getCompanies();

    this.Cant.setValue(1);
    //this.nameField.nativeElement.focus();
    this.flagForm = false;
    this.companyService.GetViewGroupList().subscribe(next => {
      if (next.result) {
        ((next.ViewGroupList) as IViewGroup[]).forEach(x => {
          if (x.CodNum === 4) this.isOnGroupLine = x.isGroup;
          if (x.CodNum === 4) this.isLineMode = x.LineMode; //Orden de lineas al inicio o final 
        });
      }
    });
    if (DOC_ENTRY > 0) {
      this.requestsToAwait = 2;

      this.requestViewerSubscription = this.$requestViewer.subscribe(next => {

        if (next === this.requestsToAwait) {
          this.itemsList = [];
          this.isCreatingQuotation = false;
          this.soAndSqService.GetSaleQuotation(DOC_ENTRY)
            .pipe(first())
            .subscribe(next => {
              this.blockUI.stop();
              if (next.Result) {

                this.saleQuotation = next.Data;
                this.saleQuotation.DocDate = formatDate(this.saleQuotation.DocDate, 'yyyy-MM-dd', 'en');
                this.defaultSlpCode = this.saleQuotation.SalesPersonCode;
                this.QouForm.patchValue({
                  DocumentType: this.saleQuotation.U_TipoDocE,
                  cardCode: this.saleQuotation.CardCode,
                  currency: this.saleQuotation.DocCurrency,
                  SlpList: this.saleQuotation.SalesPersonCode,
                  Comment: this.saleQuotation.Comments,
                  PayTerms: this.saleQuotation.PaymentGroupCode
                });

                this.QouForm.patchValue({ cardName: this.saleQuotation.CardName });

                this.QouForm.controls['cardCode'].disable();
                this.QouForm.controls['cardName'].disable();

                if (this.saleQuotation.U_TipoIdentificacion !== null) {
                  this.feForm.patchValue({
                    IdType: this.saleQuotation.U_TipoIdentificacion,
                    Identification: this.saleQuotation.U_NumIdentFE,
                    Email: this.saleQuotation.U_CorreoFE
                  });

                  (<HTMLButtonElement>document.getElementById('triggerFeFormDisplay')).click();
                }

                this.saleQuotation.DocumentLines.forEach(x => {
                  this.conta++;
                  this.total += x.Quantity * x.UnitPrice;
                  let tot = (x.UnitPrice * x.UnitPrice);
                  let itemAux = {
                    'Item': `${x.ItemCode}`,
                    'ItemCode': `${x.ItemCode}`,
                    'ItemName': `${x.ItemName}`,
                    'CodeName': `${x.ItemCode} - ${x.ItemName}`,
                    'UnitPrice': JSON.parse(this.storage.GetCustomerData()).Currency === 'COL' ? x.UnitPrice : (parseFloat(Number(x.UnitPrice / this.DailyExRate).toString())),
                    'UnitPriceCol': x.UnitPrice,
                    'UnitPriceDol': x.UnitPrice,
                    'U_SugPrice': '0',
                    'TaxCode': x.TaxMAGRate ? x.TaxMAGCode : x.TaxCode,
                    'TaxRate': x.TaxMAGRate ? x.TaxMAGRate : x.TaxRate,
                    'Quantity': x.Quantity,
                    'Active': true,
                    'Id': this.conta,
                    'LinTot': tot,
                    'Discount': x.DiscountPercent,
                    'WhsCode': x.WarehouseCode,
                    'WhsName': x.WhsName,
                    'Serie': '',
                    'SysNumber': 0,
                    'OnHand': 0,
                    'LastPurchasePrice': x.LastPurchasePrice
                  }
                  this.isLineMode ? this.itemsList.push(itemAux) : this.itemsList.unshift(itemAux);

                  this.hasLines = true;

                  this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0);

                  this.getTotals();
                  this.itemService.GetWHAvailableItem(x.ItemCode)
                    .subscribe((data: any) => {
                      if (data.result) {
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
              }
            }, () => {
              this.blockUI.stop();
            }, () => {
              this.blockUI.stop();
            });
        }
      });
    }
    else {
      this.isCreatingQuotation = true;
    }
  }
  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.result) {
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Quo") {
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
  }

  //chequea si hay existencias del item a agregar
  CheckAvailableItem(ItemCode) {
    if (ItemCode !== '') {
      this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor'); // Start blocking
      this.itemService.GetWHAvailableItem(ItemCode)
        .subscribe((data: any) => {
          if (data.result) {
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

  setSalesPerson() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.uService.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.result) {
        this.userAssignsList = data.Users;
        this.userAssignsList.forEach(user => {
          if (this.currentUser.userId.toString() === user.UserId.toString()) {
            this.defaultSlpCode = user.SlpCode;
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

  getExRate() {
    this.blockUI.start('Obteniendo tipo de cambio, espere por favor'); // Start blocking
    this.exrate.getExchangeRate().subscribe((data: any) => {
      if (data.result) {
        this.DailyExRate = data.exRate
        this.currentRequest++;
        this.$requestViewer.next(this.currentRequest);
        this.blockUI.stop(); // Stop blocking
      } else {
        this.DailyExRate = 1;
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
      }

    }, (error: any) => {
      this.blockUI.stop(); // Stop blocking
      this.alertService.errorInfoAlert(`Error getCustomers!!!, Error: ${error.error.Message}`);
    });
  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    this.currentUserSubscription.unsubscribe();
    if (this.requestViewerSubscription) this.requestViewerSubscription.unsubscribe();
    this.storage.SaveDocEntry(-1);
    this.storage.SaveCustomerData('{}');
  }

  getMaxDiscout() {
    this.documentService.getMaxDiscout().subscribe((data: any) => {
      if (data.result) {
        this.maxDiscuont = data.discount;
        this.currentRequest++;
        this.$requestViewer.next(this.currentRequest);

      }
      else {
        this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
      }
    }, (error: any) => {
      this.alertService.errorInfoAlert(`Error getCustomers!!!, Error: ${error.error.Message}`);
    });

  }

  // funcion para obtener los clientes desde SAP
  // no recibe parametros
  getCustomers() {
    this.blockUI.start('Obteniendo clientes, espere por favor'); // Start blocking
    this.bpService.GetCustomers()
      .subscribe((data: any) => {
        if (data.result) {
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
          // this.GetPriceList();
          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al cargar clientes - Error: ' + data.errorInfo.Message);
        }
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // establece los valores por defecto
  funcion() {
    /*REF CCPZ*/

    let customer = this.bpList.find(cus =>
      cus.CardCode === this.DEFAULT_BUSINESS_PARTNER
    );

    if (customer) {
      this.getCurrencyByUser(customer.Currency);
      this.QouForm.patchValue({ cardName: this.saleQuotation ? this.saleQuotation.CardName : customer.CardName });
    }
    // //var inputValue = (<HTMLInputElement>document.getElementById("clienteId")).value;
    // var inputValue = this.DEFAULT_BUSINESS_PARTNER
    // //let element :HTMLElement = document.getElementById("clienteId") as HTMLElement;
    // let code = inputValue;
    // let codePos = this.bpCodeList.indexOf(code);
    // let cardName = this.bpNameList[codePos];

    // let customer = this.bpList.filter(cus => {
    //   return cus.CardCode === code;
    // });
    // this.getCurrencyByUser(customer[0].Currency);
    // // tslint:disable-next-line:no-unused-expression
    // if (cardName !== this.QouForm.get('cardName').value) {
    //   this.QouForm.patchValue({ cardName: cardName });
    // }
  }

  // funcion para obtener los items desde SAP
  // no recibe parametros
  getItems() {
    this.blockUI.start('Obteniendo ítems, espere por favor'); // Start blocking
    this.itemService.GetItems()
      .subscribe((data: any) => {
        if (data.result) {

          /*
              this.itemsList.push({
                'ItemCode': '',
                'ItemName': '',
                'UnitPrice': '0',
                'U_SugPrice': '0',
                'TaxCode': 'EXE',
                'Quantity': '1',
                'Active': true,
                'Id': this.conta,
                'LinTot': 0,
                'TaxRate': 0.00,
                'Discount': 0,
                'WhsCode': '01',
                'WhsName': 'Almacen Prueba',
                'Serie': ''
              });
          */
          this.itemsTypeaheadList = data.ItemList.ItemCompleteName;
          this.itemsCodeList = data.ItemList.ItemCode;
          this.itemsNameList = data.ItemList.ItemName;

          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al cargar Los Items - Error: ' + data.errorInfo.Message);
        }
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error.error.Message}`);
      });
  }


  // agrega un item a la linea de cotizacion metodo original
  // addItems(item, _isTriggerdByUser) {
  //   if (this.ItemInfo.value) {
  //     let code = item.item.split(' COD. ')[0];

  //     let mobileNavigatorObject: any = window.navigator;

  //     if (this.isScanning && _isTriggerdByUser) {
  //       console.log(`Overriding code ${this.buildedData}`);
  //       this.isScanning = false;
  //       const ITEM = this.itemsTypeaheadList.find(x => x.includes(this.buildedData));
  //       this.buildedData = ``;
  //       if (!ITEM) {
  //         let oldone = this.ItemInfo.value;
  //         this.alertService.infoInfoAlert(`No existe ${oldone}`);
  //         setTimeout(() => {
  //           this.Cant.setValue(1);
  //           this.ItemInfo.setValue('');
  //           this.nameField.nativeElement.focus();
  //         }, 0);
  //         return;
  //       }
  //       code = ITEM.split(' COD. ')[0];
  //     }

  //     if (mobileNavigatorObject && mobileNavigatorObject.clipboard) {
  //       mobileNavigatorObject.clipboard.readText()
  //         .then(text => {
  //           if (!isNaN(parseInt(text))) {
  //             if (Number(text) > this.maxWeightTo0) {
  //               // this.Cant.setValue(Math.max(Number(text) - this.pesoBolsa, 0.0001));
  //               //this.invForm.patchValue({cardName: cardName});

  //               mobileNavigatorObject.clipboard.writeText("*")
  //                 .then(text => {
  //                   //this.Cant.setValue(Number(text));
  //                   //this.invForm.patchValue({cardName: cardName});

  //                 })
  //                 .catch(err => {
  //                   // console.error('Failed to clear clipboard contents: ', err);
  //                 });
  //             }

  //           }
  //           let cant = Number(this.Cant.value);
  //           let code = item.item.split(' COD. ')[0];
  //           let searchitem = true;
  //           if (this.isOnGroupLine) {
  //             var index: number = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
  //             // this.itemsList.forEach(x => {
  //             if (index != -1) {
  //               this.itemsList[index].Quantity += cant;
  //               this.itemsList[index].LinTot = this.itemsList[index].Quantity * this.itemsList[index].UnitPrice;
  //               searchitem = false;
  //               this.LineTotalCalculate(index)
  //               this.getTotals();


  //             }
  //           }
  //           this.blockUI.start('Obteniendo Información del Artículo, espere por favor'); // Start blocking
  //           //this.itemsList.find(x => x.ItemCode == code).
  //           // this.CheckAvailableItem(code);




  //           this.itemService.GetItemByItemCode(item.item.split(' COD. ')[0], this.QouForm.controls.PriceList.value, this.QouForm.controls.cardCode.value)
  //             .subscribe((data: any) => {
  //               if (data.result) {
  //                 if (searchitem) {
  //                   this.conta++;
  //                   this.total += data.Item.UnitPrice;
  //                   let tot = this.QouForm.controls.currency.value == 'COL' ? (data.Item.UnitPrice * cant) : (cant * (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toFixed(2))));

  //                   let itemAux = {
  //                     'Item': `${code}`,
  //                     'ItemCode': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
  //                     'ItemName': `${data.Item.ItemName}`,
  //                     'CodeName': `${data.Item.ItemCode} - ${data.Item.ItemName}`,
  //                     'LastPurchasePrice': `${data.Item.LastPurchasePrice}`,
  //                     'UnitPrice': this.QouForm.controls.currency.value == 'COL' ? data.Item.UnitPrice : (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toFixed(2))),
  //                     'UnitPriceCol': data.Item.UnitPrice,
  //                     'UnitPriceDol': (parseFloat(Number(data.Item.UnitPrice / this.DailyExRate).toFixed(2))),
  //                     'U_SugPrice': '0',
  //                     'TaxCode': data.Item.TaxRate != '' ? data.Item.TaxCode : 'EXE',
  //                     'Quantity': cant,
  //                     'Active': true,
  //                     'Id': this.conta,
  //                     'LinTot': tot,
  //                     'TaxRate': data.Item.TaxRate != '' ? data.Item.TaxRate : 0.00,
  //                     'Discount': data.Item.Discount,
  //                     'WhsCode': this.whCode,
  //                     'WhsName': this.whName,
  //                     'Serie': '',
  //                     'SysNumber': 0,
  //                     'OnHand': data.Item.OnHand
  //                   }


  //                   this.isLineMode ? this.itemsList.push(itemAux) : this.itemsList.unshift(itemAux)

  //                   this.hasLines = true;
  //                   this.isLineMode ? this.LineTotalCalculate(this.itemsList.length - 1) : this.LineTotalCalculate(0)
  //                   this.getTotals();
  //                 }

  //                 const LastPP = data.Item.LastPurchasePrice ? data.Item.LastPurchasePrice : 0;
  //                 if (data.Item.UnitPrice <= LastPP && data.Item.UnitPrice != 0) {
  //                   this.alertService.infoInfoAlert(`Costo del Artículo: ${data.Item.ItemCode}-${data.Item.ItemName} es mayor o igual al precio de venta. Modifique precio por favor`);//Precio costo:	₡${data.Item.LastPurchasePrice} Precio Venta: ₡${data.Item.UnitPrice} 
  //                 }
  //                 this.Cant.setValue(1);
  //                 this.ItemInfo.setValue('');
  //                 this.itemService.GetWHAvailableItem(code)
  //                   .subscribe((data: any) => {
  //                     if (data.result) {
  //                       if (data.whInfo.length <= 0) {
  //                         index = this.itemsList.indexOf(this.itemsList.find(x => x.Item == code));
  //                         if (index !== -1) {
  //                           this.itemsList[index].Quantity = 0;
  //                           this.itemsList[index].LinTot = 0;
  //                           searchitem = false;
  //                           this.LineTotalCalculate(index)
  //                           this.getTotals();
  //                         }
  //                         this.blockUI.stop(); // Stop blocking
  //                         this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
  //                       }
  //                       this.blockUI.stop(); // Stop blocking
  //                     } else {
  //                       this.blockUI.stop(); // Stop blocking
  //                       this.alertService.errorAlert('Error al Obtener disponibilidad el artículo - ' + data.errorInfo.Message);
  //                     }

  //                   }, (error: any) => {
  //                     this.blockUI.stop(); // Stop blocking
  //                     this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
  //                   });
  //                 this.blockUI.stop(); // Stop blocking
  //               } else {
  //                 this.blockUI.stop(); // Stop blocking
  //                 this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
  //               }

  //             }, (error: any) => {
  //               this.blockUI.stop(); // Stop blocking
  //               this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
  //             });
  //         })
  //         .catch(err => {
  //           // console.error('Failed to read clipboard contents: ', err);
  //         });
  //     }
  //   }
  // }

  //#001 Homolgacion metodo invoice 17/09/2021
  cant: number;
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
            const priceList = this.QouForm.get('PriceList').value;

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
            this.itemService.GetItemByItemCode(code, priceList, this.QouForm.controls.cardCode.value) // TO AVOID BREAK ON GETITEMINFO
              .subscribe((data: any) => {
                this.isProcessing = false;
                this.searchTypeManual = false;
                if (data.result) {
                  if (searchitem) {
                    this.conta++;
                    this.total += data.Item.UnitPrice;
                    let tot = (data.Item.UnitPrice * this.cant);
                    this.QouForm.patchValue({ currency: this.userCurrency });

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
                      this.storage.setLog(`ERROR!, fecha: ${new Date()} ---(${this.QouForm.controls.currency.value})`);
                    }


                    // Eliminar una vez realizadas las pruebas
                    //this.itemsList.push(AUXILIAR_ITEM)

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
                      if (data.result) {
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

  // funcion para obtener los impuestos desde SAP
  // no recibe parametros
  getTaxes() {
    this.blockUI.start('Obteniendo impuestos, espere por favor'); // Start blocking
    this.taxService.GetTaxes()
      .subscribe((data: any) => {
        if (data.result) {
          this.taxesList.length = 0;
          this.taxesList = data.Taxes;

          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al cargar Impuestos - error: ' + data.errorInfo.Message);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  // funcion para obtener los clientes desde SAP
  // recibe como parametros el item y el index
  selectedItem(item, idx) {
    if (item.item !== '') {
      this.blockUI.start('Obteniendo información del artículo, espere por favor'); // Start blocking

      // #REV# revisar de cual lista de precios obtener la cotizacion
      this.itemService.GetItemByItemCode(item.item.split(' COD. ')[0], this.QouForm.controls.PriceList.value, this.QouForm.controls.cardCode.value)

        .subscribe((data: any) => {
          if (data.result) {
            this.itemsList[idx].ItemCode = data.Item.ItemCode;
            this.itemsList[idx].ItemName = data.Item.ItemName;
            this.itemsList[idx].Item = `${data.Item.ItemCode} - ${data.Item.ItemName}`;
            this.itemsList[idx].UnitPrice = data.Item.UnitPrice;
            this.itemsList[idx].U_SugPrice = data.Item.UnitPrice;
            this.itemsList[idx].TaxCode = data.Item.TaxCode;
            this.itemsList[idx].Discount = data.Item.Discount;
            this.itemsList[idx].TaxRate = data.Item.TaxRate;
            this.itemsList[idx].LinTot = parseFloat(data.Item.UnitPrice);
            this.itemsList[idx].Active = false;
            this.conta++;
            this.total += data.Item.UnitPrice;
            this.itemsList.push({
              'ItemCode': '',
              'ItemName': '',
              'UnitPrice': '0',
              'U_SugPrice': '0',
              'TaxCode': 'EXE',
              'Quantity': '1',
              'Active': true,
              'Id': this.conta,
              'LinTot': 0,
              'TaxRate': 0.00,
              'Discount': 0,
              'WhsCode': this.whCode,
              'WhsName': 'Almacén general',
              'Serie': ''
            });
            this.getTotals();
          } else {
            this.alertService.errorAlert('Error al obtener Información del artículo - Error: ' + data.errorInfo.Message);
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
  removeItem(item) {
    const index = this.itemsList.indexOf(item);
    this.itemsList.splice(index, 1);
    if (this.itemsList.length > 0) this.hasLines = true;
    else this.hasLines = false;
    this.getTotals();
  }

  // convenience getter for easy access to form fields
  get f() { return this.QouForm.controls; }



  CreateQuotationDocument(): DocumentModel {


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

    const header: FormGroup = this.QouForm;

    let QuotationLines: IDocumentLine[] = this.itemsList.map(line => {
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
        BaseEntry: null,
        BaseLine: null,
        BaseType: -1,
      } as IDocumentLine;
      return item;
    });






    let Quotation: any = {
      DocEntry: null,
      DocNum: null,
      BaseEntry: null,
      CardCode: header.controls.cardCode.value,
      CardName: header.controls.cardName.value,
      Comments: header.controls.Comment.value,
      DocCurrency: header.controls.currency.value,
      DocDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocDueDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DocType: BoDocumentTypes.dDocument_Items,
      NumAtCard: null,
      PaymentGroupCode: header.controls.PayTerms.value,
      SalesPersonCode: header.value.SlpList,
      U_Online: '0',
      U_TipoDocE: header.value.DocumentType,
      U_TipoIdentificacion: this.feForm.value.IdType === '00' ? null : this.feForm.value.IdType,
      U_CorreoFE: this.feForm.value.Email,
      U_NumIdentFE: this.feForm.value.Identification,
      U_ObservacionFE: this.feForm.value.ObservacionFE,
      U_CLVS_POS_UniqueInvId: '',
      DocumentLines: QuotationLines,
      UdfTarget: mappedUdfs,
      Series: null,

    };
    return Quotation;
  }


  // funcion para el envio de la QO a SAP
  // no recibe parametros
  onSubmit() {
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

    if (this.flagForm) {
      console.log('Intento duplicación documento');
      return;
    }

    if (this.itemsList.length === 0) {
      this.alertService.errorInfoAlert(`Por favor agregue al menos un producto`);
      return;
    }
    const CORRUPTED_QUANTITY = this.itemsList.find(x => x.Quantity <= 0);
    if (CORRUPTED_QUANTITY) {
      this.alertService.errorAlert(`Cantidad del producto ${CORRUPTED_QUANTITY.CodeName}, debe ser mayor a 0`);
      return;
    }
    if (this.QouForm.invalid) {
      this.alertService.infoAlert(
        "Debe haber seleccionado tipo factura, cliente, moneda, término de pago"
      );
      this.isOnSubmit = false;
      return;
    }

    if (!this.SlpsList.find(x => x.SlpCode == this.QouForm.controls.SlpList.value)) {
      this.alertService.infoInfoAlert(`Por favor selecione un vendedor`);
      return;
    }
    if (!this.COMPANY.HasZeroBilling) {

      const CORRUPTED_ITEM = this.itemsList.find(x => x.LinTot == 0);
      if (CORRUPTED_ITEM) {
        this.alertService.errorAlert(`El total de linea del producto "${CORRUPTED_ITEM.CodeName}" es 0, elimínelo por favor.`);
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

    const AVAILABLE_INV = this.itemsList.find(x => +x.available < (this.itemsList.filter(y => y.Item == x.Item).reduce((p, c) => { return p + c.Quantity }, 0)) && x.InvntItem === "Y");

    if (AVAILABLE_INV) {
      this.alertService.infoInfoAlert(`Sin stock, no hay cantidad solicitada para el producto ${AVAILABLE_INV.CodeName}, disponible:${AVAILABLE_INV.available} `);
      return;
    }
    this.submitted = true;

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

    if (this.isCreatingQuotation) {
      this.blockUI.start('Creando cotización, espere por favor'); // Start blocking
      this.flagForm = true;
      this.documentService.CreateQuotation(this.CreateQuotationDocument())
        .subscribe((data: any) => {
          this.blockUI.stop();
          if (data.result) {
            this.returnedDocNum = data.DocNum;
            this.returnedDocEntry = data.DocEntry;
            this.lastQuotation = data.DocEntry;
            this.titleQuotation = `Cotización creada correctamente`;

            (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();


          } else {
            this.blockUI.stop();
            this.flagForm = false;
            this.alertService.errorAlert(`Error al intentar crear la proforma, Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
          }
          this.isOnSubmit = false;

        }, (error: any) => {
          this.flagForm = false;
          this.isOnSubmit = false;
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
    else {
      this.blockUI.start('Actualizando cotización, espere por favor');
      this.flagForm = true;
      const DOC_ENTRY = this.storage.GetDocEntry();

      let QotObject = this.CreateQuotationDocument();
      QotObject.DocEntry = DOC_ENTRY;
      this.documentService.UpdateQuotation(QotObject)
        .subscribe((data: any) => {
          this.blockUI.stop();
          if (data.result) {
            this.returnedDocNum = data.DocNum;
            this.returnedDocEntry = data.DocEntry;
            this.titleQuotation = `Cotización actualizada correctamente`;
            (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();
          } else {
            this.flagForm = false;
            this.alertService.errorAlert(`Error al intentar crear la proforma, Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
          }
          this.isOnSubmit = false;

        }, (error: any) => {
          this.flagForm = false;
          this.isOnSubmit = false;
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
  }
  onSubmit2() {
    let mappedUdfs: IUdfTarget[] = [];
    this.udfs.forEach(x => {
      mappedUdfs.push({
        Name: x.Name,
        Value: (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value,
        FieldType: x.FieldType
      } as IUdfTarget);
    });
    this.submitted = true;
    // stop here if form is invalid
    if (this.QouForm.invalid) {
      this.isOnSubmit = false;
      return;
    }
    this.blockUI.start('Creando cotización, espere por favor'); // Start blocking
    this.documentService.CreateQuotation(this.CreateQuotationDocument())
      .subscribe((data: any) => {
        if (data.result) {
          // this.blockUI.stop(); // Stop blocking
          // this.correctQuotation = true;
          //     this.alertService.successInfoAlert(`Creada con exito, DocNum: ${data.DocNum}, DocEntry: ${data.DocEntry}`);
          //     this.btnVisibleBool = false;
          // this.lastQuotation = data.DocEntry;
          //     //this.printQuotation(data.DocEntry);
          this.blockUI.stop();
          this.alertService.successAlertHtml(`Cotización creada correctamente: DocEntry: ${data.DocEntry}, DocNum: ${data.DocNum} <br/><br/>`);
          let modalOption: NgbModalOptions = {};
          modalOption.backdrop = 'static';
          modalOption.keyboard = false;
          modalOption.ariaLabelledBy = 'modal-basic-title';
          modalOption.size = 'lg';
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert(`Error al intentar crear la cotización, Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
        this.isOnSubmit = false;
      }, (error: any) => {
        this.isOnSubmit = false;
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  searchBPCode = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpCodeList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )
  searchBPName = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpNameList.filter(v => { this.cardNameSearchTerm = term; return v.toLowerCase().indexOf(term.toLowerCase()) > -1 }).slice(0, 10))
    )

  // searchBPName = (text$: Observable<string>) =>
  //   text$.pipe(
  //     debounceTime(200),
  //     distinctUntilChanged(),
  //     map(term => term.length < 1 ? []
  //       : this.bpNameList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
  //   )

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
              let ii = a.indexOf(b[c]);
              if (ii > -1) {
                ii++;
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
  //funcion para detectar el cambio en el input de Código
  // recibe como parametro el Código del item
  changeCode(code) {
    if (code != null) {
      let cardCode = this.bpCodeList.filter(
        book => book.toLowerCase() === code.toLowerCase());
      if (cardCode.length > 0) {
        // tslint:disable-next-line:no-shadowed-variable
        let code = cardCode[0];
        let codePos = this.bpCodeList.indexOf(code);
        let cardName = this.bpNameList[codePos];

        let customer = this.bpList.filter(cus => {
          return cus.CardCode === code;
        });

        if (this.itemsList.length > 0) this.SetupRecalculate();

        this.getCurrencyByUser(customer[0].Currency);
        // tslint:disable-next-line:no-unused-expression
        if (cardName !== this.QouForm.get('cardName').value) {
          this.QouForm.patchValue({ cardName: cardName });
        }

        for (let item of this.bpList) {

          if (item.CardCode === customer[0].CardCode) {
            this.defaultGroupNum = item.GroupNum;

            const DOC_ENTRY = this.storage.GetDocEntry();
            if (DOC_ENTRY === -1) {
              this.QouForm.patchValue({ PayTerms: item.GroupNum.toString() });
            }

            this.QouForm.patchValue({ PriceList: item.ListNum });
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
    const PRICE_LIST = this.QouForm.get('PriceList').value;
    this.itemService.GetItemByItemCode(ITEM.Item, PRICE_LIST, this.QouForm.controls.cardCode.value)
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
      this.QouForm.patchValue({ currency: this.currencyList[0].Id }); //this.currencyList[0].Id
    }
    else {
      this.QouForm.patchValue({ currency: "COL" }); //
    }
    this.SetCurr();
  }

  // funcion para detectar el cambio en el input de descripcion
  // recibe como parametro el descripcion del item
  changeDescription(description) {
    if (description != null) {
      let itemDescription = this.bpNameList.filter(
        book => book.toLowerCase() === description.toLowerCase());
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
        if (cardCode !== this.QouForm.get('cardCode').value) {
          this.QouForm.patchValue({ cardCode: cardCode });
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
    if (this.QouForm.controls.currency.value == 'COL') {
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

  getTotals() {
    this.total = 0;
    this.totalUSD = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.itemsList.forEach(element => {
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

    const MOBJECT = this.saleQuotation;

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
    else if (this.QouForm.value.currency) {
      if (this.QouForm.value.currency == 'COL') {
        this.total += (parseFloat(Number(this.totalWithoutTax + this.tax).toString()));
        this.totalUSD += parseFloat(Number((this.totalWithoutTax + this.tax) / this.DailyExRate).toString());
      }
      else {
        this.total += (parseFloat(Number((this.totalWithoutTax + this.tax) * this.DailyExRate).toString()));
        this.totalUSD += parseFloat(Number(this.totalWithoutTax + this.tax).toString());
      }
    }
    // this.total = this.total.toFixed(2);
    //	this.totalUSD = this.totalUSD.toFixed(2);
  }

  // funcion al cambiar el tipo de taxcode
  // recibe como parametro el taxxode y el indice de la lista
  changeTaxCode(TaxCode: string, idx: number) {
    const rate = this.taxesList.find(i => i.TaxCode === TaxCode.toUpperCase());
    if (typeof rate !== 'undefined') {
      this.itemsList[idx].TaxCode = rate.TaxCode.toUpperCase();
      this.itemsList[idx].TaxRate = parseFloat(this.decimalPipe.transform(rate.TaxRate, '.2'));
      this.LineTotalCalculate(idx);
    }
  }

  // funcion para calcular el total de la linea
  // recibe como parametro el index de la lista de items
  LineTotalCalculate(idx: number) {
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

  printQuo() {
    this.printQuotation(this.lastQuotation);
  }

  // funcion para imprimir la factura
  printQuotation(DocEntry: number) {
    this.blockUI.start('Generando la impresión...'); // Start blocking
    this.reportsService.printReport(DocEntry, ReportType.Quotation)
      .subscribe((data: any) => {
        /*
        printJS({
            printable: data,
            type: 'pdf',
            base64: true
          })
        */
        //var fileBase64 = atob(data);
        //this.playPingPong(fileBase64);
        /*  if(this._electronService.isElectronApp) {
            var fileBase64 = atob(data);
            //this.sendPrintSignal(fileBase64);
            this._electronService.ipcRenderer.send('msgPrint', data);
          }
          else{ */
        if (this.electronRendererService.CheckElectron()) {
          let fileName = 'Quotation_' + DocEntry + '.pdf';
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
        /* 	   } */
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
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
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

  GetParamsViewList() {
    this.blockUI.start('Obteniendo parámetros...'); // Start blocking
    this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.result) {
          this.viewParamList = data.Params.filter(param => {
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
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorInfoAlert('Error al cargar los parámetros de la página - ' + data.errorInfo.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });

  }

  // funcion para obtener la informacion de los disponibles de un item en los almacenes
  // recibe como parametros el item y el index
  GetWHAvailableItem(event, content, ItemCode, idx) {
    if (ItemCode !== '') {
      if (event.type === 'dblclick') {
        this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor'); // Start blocking
        this.itemService.GetWHAvailableItem(ItemCode)
          .subscribe((data: any) => {
            if (data.result) {
              this.itemCode = ItemCode;
              this.indexAvaItem = idx;
              this.WHAvailableItemList = data.whInfo;
              if (data.whInfo.length > 0) {
                // this.openModal(content);
                (<HTMLButtonElement>document.getElementById('triggerWhsPreview')).click();
              } else {
                this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
              }
            } else {
              this.alertService.errorAlert('Error al cargar disponibilidad el artículo - Error: ' + data.errorInfo.Message);
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
      // this.close();
      (<HTMLButtonElement>document.getElementById('triggerWhsClose')).click();
    }
    //  else if (event.type === 'click') {
    //   this.itemService.GetSeriesByItem(this.itemCode, avaItem.WhsCode)
    //     .subscribe((data: any) => {
    //       if (data.result) {
    //         this.seriesList = data.series;
    //         if (data.series.length > 0) {
    //           this.expandRow(idx);
    //         } else {
    //           this.alertService.infoInfoAlert('El item no tiene series en el almacén selecionado');
    //         }
    //       } else {
    //         this.alertService.errorAlert('Error al obtener series de los almacenes - Error: ' + data.errorInfo.Message);
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

  selectSerie(series, avaItem) {
    if (series.Disponible > 0) {
      this.itemsList[this.indexAvaItem].Serie = series.PlacaChasis;
      this.itemsList[this.indexAvaItem].SysNumber = series.SysNumber;
      this.itemsList[this.indexAvaItem].WhsCode = avaItem.WhsCode;
      this.itemsList[this.indexAvaItem].WhsName = avaItem.WhsName;
      this.itemsList[this.indexAvaItem].UnitPrice = series.Precio;
      this.itemsList[this.indexAvaItem].Marca = series.PlacaChasis;
      this.LineTotalCalculate(this.indexAvaItem);
      this.alertService.infoInfoAlert(`Se seleccionó la serie: ${series.PlacaChasis}`);
    } else {
      this.alertService.infoInfoAlert('No puede seleccionar esta serie ya que no posee disponibles');
    }
  }

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizaciones para dtos de cabezera
    this.viewParamListHeader.forEach(element => {
      if (element.Name === 'lbCardCode') { this.lbCardCode = element; }
      if (element.Name === 'txtCardCode') { this.txtCardCode = element; }
      if (element.Name === 'lbCardName') { this.lbCardName = element; }
      if (element.Name === 'txtCardName') { this.txtCardName = element; }
      if (element.Name === 'lbCurrency') { this.lbCurrency = element; }
      if (element.Name === 'txtCurrency') { this.txtCurrency = element; }
      if (element.Name === 'txtComments') { this.txtComments = element; }
      if (element.Name === 'lbComments') { this.lbComments = element; }
      if (element.Name === 'txtSLP') { this.txtSLP = element; }
      if (element.Name === 'lbSLP') { this.lbSLP = element; }
      if (element.Name === "txtPriceList") {
        this.txtPriceList = element;
      }
      if (element.Name === "txtPayTerms") {
        this.txtPayTerms = element;
      }
      if (element.Name === "lbPriceList") {
        this.lbPriceList = element;
      }
      if (element.Name === "lbPayTerms") {
        this.lbPayTerms = element;
      }

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
      return param.Name === 'T_quotation';
    });
    this.title = obj[0].Text;
  }

  // Obtiene los tipos de monedas ya sea Col o Usd desde una vista SQL
  GetCurrencyType() {
    this.blockUI.start('Obteniendo parámetros...'); // Start blocking
    this.paramsService.GetCurrencyType().subscribe(data => {
      this.blockUI.stop();
      if (data.Data.length > 0) {
        this.currencyList = data.Data;
        this.allCurrencyList = data.Data;
        this.funcion();
        this.blockUI.stop();
      } else {
        this.blockUI.stop();
        this.alertService.errorAlert('Error al cargar las monedas - ' + data.Error.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // Retorna el simbolo de la moneda al elegir en el dropdown la moneda
  SetCurr() {
    // let cur = this.currencyList.filter(curr => { return curr.Id === this.QouForm.controls.currency.value });
    // this.setCurr = cur[0].Symbol;

    let cur = this.currencyList.find(curr => curr.Id === this.QouForm.controls.currency.value);

    if (this.storage.GetDocEntry() > 0) {
      cur = this.currencyList.find(curr => curr.Id === JSON.parse(this.storage.GetCustomerData()).Currency);
    }
    if (!cur) return;
    this.setCurr = cur.Symbol;
    this.userCurrency = cur.Id;
  }

  // vacia las listas y recarga los datos para SO
  CreateNew() {
    this.TO_FIXED_PRICE = `1.${this.COMPANY.DecimalAmountPrice}-${this.COMPANY.DecimalAmountPrice}`;
    this.TO_FIXED_TOTALLINE = `1.${this.COMPANY.DecimalAmountTotalLine}-${this.COMPANY.DecimalAmountTotalLine}`;
    this.TO_FIXED_TOTALDOCUMENT = `1.${this.COMPANY.DecimalAmountTotalDocument}-${this.COMPANY.DecimalAmountTotalDocument}`;
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.SALE_QUOTATION);
    this.identificationTypeList = IdentificationType;
    this.createFEForm();
    if (this.typeArrow) (<HTMLButtonElement>(document.getElementById('triggerFeFormDisplay'))).click();
    this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.getCurrentSession()).DefaultBussinesPartnerUI;
    this.storage.SaveDocEntry(-1);
    this.commonService.hasDocument.next(``);
    this.storage.SaveBreadCrum(``);
    this.storage.SaveCustomerData("{}");
    this.cardNameSearchTerm = '';
    this.saleQuotation = null;
    this.isCreatingQuotation = true;
    this.btnVisibleBool = true;
    this.QouForm.reset(true);
    this.itemsList.length = 0;
    const DOC_ENTRY = this.storage.GetDocEntry();
    if (DOC_ENTRY > 0) {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.GetCustomerData()).CardCode;
    } else {
      this.DEFAULT_BUSINESS_PARTNER = JSON.parse(this.storage.getCurrentSession()).DefaultBussinesPartnerUI;
    }
    //this.getItems();
    this.getTotals();
    this.btnVisibleBool = true;
    this.flagForm = false;
    this.conta = 0;
    this.total = 0;
    this.Cant.setValue(1);
    this.totalUSD = 0;
    this.DailyExRate = 0;
    this.tax = 0;
    this.discount = 0;
    this.totalWithoutTax = 0;
    this.QouForm.controls['cardCode'].enable();
    this.QouForm.controls['cardName'].enable();
    this.ItemInfo.setValue('');
    this.QouForm = this.fb.group({
      DocumentType: ['', Validators.required],
      cardCode: [this.DEFAULT_BUSINESS_PARTNER, Validators.required],
      cardName: ['', Validators.required],
      currency: ['', Validators.required],
      SlpList: ['', Validators.required],
      Comment: '',
      PayTerms: [''],
      PriceList: ['']
    });

    this.documentService.GetInvoiceTypes().subscribe(next => {
      if (next.Result) {
        this.typesInvoice = next.InvoiceTypes;
        this.QouForm.patchValue({
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
    this.getMaxDiscout();
    this.getCustomers();
    this.GetParamsViewList();
    //this.GetCurrencyType();
    this.getExRate();
    this.GetSalesPersonList();
    //this.GetPayTerms();
    this.GetPriceList();
    this.getTaxes();
    this.getItems();
    this.funcion();
    this.Cant.setValue(1);
    this.hasLines = false;
    this.nameField.nativeElement.focus();
    //this.QouForm.patchValue({currency: this.currencyList[0].Id });
  }

  GetSalesPersonList() {
    this.blockUI.start('Obteniendo vendedores, espere por favor'); // Start blocking
    this.smService.getSalesMan()
      .subscribe((data: any) => {
        if (data.result) {
          this.SlpsList = data.salesManList;
          this.QouForm.patchValue({ SlpList: this.defaultSlpCode.toString() });

          this.blockUI.stop(); // Stop blocking

        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert(`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para obtener las compañias de la DBLocal
  // no recibe parametros
  getCompanies() {
    this.blockUI.start('Obteniendo compañías, espere por favor'); // Start blocking
    this.companyService.GetCompanies()
      .subscribe((data: any) => {
        if (data.result) {
          this.companiesList.length = 0;
          this.companiesList = data.companiesList;
          this.companiesList.forEach(comp => {
            this.pesoBolsa = comp.ScaleWeightToSubstract;
            this.priceEditable = comp.IsLinePriceEditable;
            this.maxWeightTo0 = comp.ScaleMaxWeightToTreatAsZero;
          });
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

  GetPayTerms() {
    this.blockUI.start('Obteniendo términos de pago, espere por favor');
    this.itemService.GetPayTerms()
      .subscribe((data: any) => {
        if (data.result) {
          const customer = this.bpList.filter(x => x.CardCode === this.DEFAULT_BUSINESS_PARTNER);

          this.PayTermsList = data.payTermsList;

          const DOC_ENTRY = this.storage.GetDocEntry();
          if (DOC_ENTRY === 0 || DOC_ENTRY === -1) {
            this.QouForm.patchValue({ PayTerms: customer[0].GroupNum });
          }
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }
      },
        (error: any) => {
          this.blockUI.stop();
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
  }

  ClearItemList() {
    this.itemsList.length = 0;
    this.getItems();
    this.getTaxes();
  }

  GetPriceList() {
    this.blockUI.start('Obteniendo listas de precios, espere por favor');
    this.itemService.GetPriceList()
      .subscribe((data: any) => {
        if (data.result) {

          this.PriceList = data.priceList;
          // this.QouForm.patchValue({ PriceList: this.PriceList[0].ListNum });
          this.setDefaultList(this.DEFAULT_BUSINESS_PARTNER);
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
          this.alertService.errorAlert(`Error: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
        }

        //this.setDefaultList(this.DEFAULT_BUSINESS_PARTNER);
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  setDefaultList(_cardCode: string) {
    this.itemService.GetPriceListDefault(_cardCode).subscribe(next => {
      if (next.Result) {
        this.QouForm.patchValue({
          PriceList: next.PriceList.ListNum
        });
      }
    });
  }

  toggleArrow(): void { this.typeArrow = !this.typeArrow; }

  createFEForm() {
    this.feForm = this.fb.group({
      IdType: [''],
      Identification: [''],
      Email: [''],
      Provincia: [''],
      Canton: [''],
      Distrito: [''],
      Barrio: [''],
      Direccion: ['']
    });

    this.feForm.patchValue({ IdType: this.identificationTypeList[0].Id });
  }

  get fe() {
    return this.feForm.controls;
  }

  identificationTypeChange(IdentificationValue: string) {
    switch (IdentificationValue) {
      case '00': {
        this.feForm.controls['Identification'].setValidators([]);
        this.feForm.controls['Identification'].updateValueAndValidity();
        this.feForm.controls['Direccion'].setValidators([]);
        this.feForm.controls['Direccion'].updateValueAndValidity();
        this.feForm.controls['Email'].setValidators([]);
        this.feForm.controls['Email'].updateValueAndValidity();
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
    this.feForm.controls['Direccion'].setValidators([Validators.required, Validators.maxLength(250)]);
    this.feForm.controls['Direccion'].updateValueAndValidity();
    this.feForm.controls['Email'].setValidators([Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]);
    this.feForm.controls['Email'].updateValueAndValidity();
  }

  unique(array, propertyName) {
    return array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i);
  }

  getCantons(provinceId) {
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

  getProvinces() {
    this.jsonDataService.getJSONProvinces()
      .subscribe((data: any) => {
        this.provinceList = data.Provinces;
        this.feForm.patchValue({ Provincia: this.provinceList[0].ProvinceId });
        this.getCantons(this.provinceList[0].ProvinceId)
      });
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

  RiseInvoceCompleteModal(): void {
    (<HTMLButtonElement>document.getElementById('triggerAfterPayModal')).click();

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
    // const INDEX = this.itemsList.findIndex(x => x.available !== '' && x.Item === this.itemsList[index].Item);
    // this.itemsList.forEach(x => {
    //   if (x.Item === this.itemsList[index].Item) {
    //     cantsingroupLine += x.Quantity;

    //     if (INDEX !== -1) {
    //       x.available = this.itemsList[INDEX].available
    //       x.InvntItem = this.itemsList[INDEX].InvntItem
    //     }
    //   }
    // });
    const QUANTITYTOTAL = this.itemsList.filter(y => y.Item == this.itemsList[index].Item && this.itemsList[index].InvntItem === "Y").reduce((p, c) => { return p + c.Quantity }, 0);

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
        if (data.result) {
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
