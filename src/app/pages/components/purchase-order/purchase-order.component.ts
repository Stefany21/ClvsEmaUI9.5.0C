import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { debounceTime, distinctUntilChanged, filter, map, pairwise } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
// MODELOS 
// SERVICIOS
import { BusinessPartnerService, ParamsService, AlertService, AuthenticationService, PermsService, StoreService, CommonService } from '../../../services/index';
import { NavigationEnd, NavigationStart, Router, RoutesRecognized } from '@angular/router';
import { IPurchaseOrdersResponse } from '../../../models/responses';
import { IPurchaseOrder } from 'src/app/models';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { RouterExtServiceService } from 'src/app/services/router-ext-service.service';
 
@Component({
  selector: 'app-purchase-order',
  templateUrl: './purchase-order.component.html',
  styleUrls: ['./purchase-order.component.scss']
})
export class PurchaseOrderComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  date: Date;
  nowDate: any;
  InfogetPurchase: FormGroup;
  bpCodeNameList: string[] = []; // lista de los codigo con nombres de clientes
  poList: IPurchaseOrder[] = [];
  StatusFact: String;
  Formadate: string;

  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  status: boolean[] = [true, false];
  invoiceSelected = false; //Existe factura seleccionada
  page = 1;
  pageSize = 6;
  collectionSize: number;
  fromGoodReceipt: boolean;
  constructor(
    private fbl: FormBuilder,
    private bps: BusinessPartnerService,
    private paramsService: ParamsService,
    private alertService: AlertService,
    private sPerm: PermsService,
    private authenticationService: AuthenticationService,
    private router: Router,
    private storeService: StoreService,
    private purchaseOrderService: PurchaseOrderService,
    private commonService: CommonService,
    private extRuterService: RouterExtServiceService
  ) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.date = new Date();
    this.nowDate = `${this.date.getFullYear()}-${('0' + (this.date.getMonth() + 1)).slice(-2)}-${('0' + this.date.getDate()).slice(-2)}`;
  }

  ngOnInit() {
    this.checkPermits();
    this.GetParamsViewList();
    this.InfogetPurchase = this.fbl.group({
      Suplier: ['', Validators.required],
      FechaIni: ['', Validators.required],
      FechaFin: ['', Validators.required]
    });

    this.InfogetPurchase.controls.FechaIni.setValue(this.nowDate);
    this.InfogetPurchase.controls.FechaFin.setValue(this.nowDate);
    this.getSuplier();

    this.fromGoodReceipt = false;


    if (this.extRuterService.getPreviousUrl() === '/goodReceipt' && this.extRuterService.fromGoodReceipt) {
      this.getPurchaseorderList();
      this.extRuterService.fromGoodReceipt = false;
      this.fromGoodReceipt = true;
    }






    // let events = this.router.events
    //   .pipe(filter((evt: any) => evt instanceof RoutesRecognized), pairwise())
    //   .subscribe((events: RoutesRecognized[]) => {
    //     if (events[0].urlAfterRedirects && events[0].urlAfterRedirects == '/goodReceipt' && events[1].urlAfterRedirects && events[1].urlAfterRedirects == '/purchaseorderList') {
    //       this.getPurchaseorderList();
    //     }

    //     // console.log('previous url', events[0].urlAfterRedirects);
    //     // console.log('current url', events[1].urlAfterRedirects);
    //   });

  }
  // chequea que se tengan los permisos para acceder a la pagina de orden de compra
  checkPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Cpay") {
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
  // obtiene la informacion de los proveedores
  // no recive paramestros
  getSuplier() {
    this.blockUI.start('Obteniendo proveedores, espere por favor...'); // Start blocking
    this.bps.GetSuppliers()
      .subscribe((data: any) => {
        if (data.Result) {
          for (let item of data.BPS) {
            this.bpCodeNameList.push(`${item.CardCode} - ${item.CardName}`);
          }
          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener la lista de Proveedores - error: ' + data.errorInfo.Message);
        }
      }, (error) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error.error.Message}`);
      });
  }
  // llena el typehead
  searchBP = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.bpCodeNameList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  // trae la lista de orden de compras
  // no recive parametros
  getPurchaseorderList() {
    this.poList = [];
    const InfoSearch = {
      CardCode: this.InfogetPurchase.value.Suplier.split(' ')[0],
      FIni: this.InfogetPurchase.value.FechaIni,
      FFin: this.InfogetPurchase.value.FechaFin
    };

    this.blockUI.start('Obteniendo órdenes de compra...');
    this.purchaseOrderService.getPurchaseorderList(InfoSearch).subscribe((data: IPurchaseOrdersResponse) => {
      if (data.Result) {
        this.poList = [];
        this.poList = data.PurchaseOrders;

        if (this.fromGoodReceipt) this.poList.reverse();

        this.collectionSize = data.PurchaseOrders.length;
        this.poList = data.PurchaseOrders.map((po, i) => ({ id: i + 1, ...po }))
          .slice((this.page - 1) * this.pageSize, (this.page - 1) * this.pageSize + this.pageSize);

        this.blockUI.stop(); // Stop blocking
        if (data.PurchaseOrders.length == 0) {
          this.alertService.infoAlert('No se encontraron órdenes con los datos especificados en la búsqueda');
        }
      } else {
        this.blockUI.stop(); // Stop blocking
        console.log(data);
        this.alertService.errorAlert('Error al obtener órdenes de compra - error: ' + data.Error.Message);
      }
    }, (error) => {
      this.blockUI.stop(); // Stop blocking
      console.log(error);
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }
  // Guarda el docnum de la orden de compra en el local storage para ser cargada al editar la orden de compra
  editPurchaseOrder(DocNum: number) {
    this.commonService.hasDocument.next(`Documento número ${DocNum}`);
    this.storeService.SaveBreadCrum(`Documento número ${DocNum}`);

    this.storeService.savePurchaseOrderDocNum(DocNum);
    this.router.navigate(['/', 'purchaseOrder']);



  }
  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.viewParamTitles = data.Params.filter(param => {
            return param.type === 6;
          });
          this.ChargeParamstoView();
        } else {
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data.errorInfo.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }
  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter(param => {
      return param.Name === 'T_cancelPay';
    });
    this.title = obj[0].Text;
  }
}
