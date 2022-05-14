import { Component, OnInit } from '@angular/core';
import { ParamsService, ItemService, AlertService, AuthenticationService, PermsService, StorageService } from '../../../services/index';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  selector: 'app-info-item',
  templateUrl: './info-item.component.html',
  styleUrls: ['./info-item.component.scss']
})
export class InfoItemComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;

  title: string; // titulo de la vista
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  itemsTypeaheadList: any[] = []; // lista de los items 
  PriceList: any[] = []; // lista de precios 
  whCode: string;
  WHAvailableItemList: any[] = []; // lista de los items disponibles por almacen

  ItemCode: FormControl;
  Lista: FormControl;
  PriceItem: number;
  price: number;
  tax: number;
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;

  constructor(private paramsService: ParamsService,private storageService:StorageService, private itemService: ItemService, private sPerm: PermsService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit() {
    this.setWarehouseInfo();
    this.checkPermits();
    this.ItemCode = new FormControl();
    this.Lista = new FormControl();
    this.PriceItem = 0;
    this.GetParamsViewList();
    this.GetPriceList();
    this.getItems();
    // console.log(0);
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        // console.log(data);
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Inf") {
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
    // console.log(this.permisos);
  }

  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.blockUI.start('Cargando datos, espere por favor...');
    this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.viewParamTitles = data.Params.filter(param => {

            return param.type === 6;
          });
          this.ChargeParamstoView();
          this.blockUI.stop();
        } else {
          this.blockUI.stop();
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
      return param.Name === 'T_Inf';
    });
    this.title = obj[0].Text;
  }
  // obtiene la lista de articulos
  getItems() {
    this.blockUI.start('Obteniendo informacion de artículos, espere por favor...'); // Start blocking
    this.itemService.GetItems()
      .subscribe((data: any) => {
        if (data.Result) {
          this.itemsTypeaheadList.length = 0;
          this.itemsTypeaheadList = data.ItemList.ItemCompleteName;
          this.blockUI.stop(); // Stop blocking
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.infoAlert('Error al cargar los artículos - ' + data.errorInfo.Message);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.infoInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }
  // carga el typbyhead
  searchItemCode = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.itemsTypeaheadList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )
  // obtiene la listas de precios
  GetPriceList() {
    this.blockUI.start('Obteniendo listas de precios, espere por favor...'); // Start blocking
    this.itemService.GetPriceList()
      .subscribe((data: any) => {
        if (data.Result) {
          this.PriceList = data.priceList;
          this.Lista.patchValue(this.PriceList[0].ListNum);
          this.blockUI.stop(); // Stop blocking

        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.infoAlert('Error al cargar los parámetros de la página - ' + data.errorInfo.Message); (`Error: Código: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  setWarehouseInfo(): void {
    let session = this.storageService.getSession(true);
    if (session) {
      session = JSON.parse(session);
      this.whCode = session.WhCode;
    }
  }
  // obtiene la informacion del articulo seleccionado
  GetItemPrice() {
    if (this.ItemCode.value != null) {
      this.blockUI.start('Obteniendo información del artículo, espere por favor...'); // Start blocking
      this.itemService.GetItemByItemCode(this.ItemCode.value.split(' COD. ')[0], this.Lista.value)
        .subscribe((data: any) => {
          if (data.Result) { 
            this.price = data.Item.UnitPrice;
            this.tax = data.Item.TaxRate;   
            this.PriceItem = this.price + (this.price * (this.tax / 100));
            this.GetWHAvailableItem(this.ItemCode.value.split(' COD. ')[0]);
            this.blockUI.stop(); // Stop blocking
          } else {
            this.blockUI.stop(); // Stop blocking
            this.PriceItem = 0;
            this.alertService.errorAlert(`Error: no se pudo obtener la información del item solicitado: código: ${data.errorInfo.Code}, mensaje: ${data.errorInfo.Message}`);
          }
        }, (error: any) => {
          this.blockUI.stop(); // Stop blocking
          this.PriceItem = 0;
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
        });
    }
    else {
      this.PriceItem = 0;
      alert(' Seleccione un artículo');
    }
  }
  // obtien los almacenes donde estan disponible el articulo selecionado
  GetWHAvailableItem(ItemCode: any) {
    this.blockUI.start('Obteniendo disponibilidad del artículo, espere por favor...'); // Start blocking
    this.itemService.GetWHAvailableItem(ItemCode)
      .subscribe((data: any) => {
        if (data.Result) {
          this.WHAvailableItemList.length = 0;
          // this.itemCode = ItemCode;
          // this.indexAvaItem = idx;
          this.WHAvailableItemList = data.whInfo;
          if (data.whInfo.length <= 0) {
            this.blockUI.stop(); // Stop blocking
            this.alertService.infoInfoAlert('Este artículo no posee disponibles en ningún almacén.');
          }
          else {
            this.blockUI.stop(); // Stop blocking
          }
        } else {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorAlert('Error al obtener Items del almacén - Error: ' + data.errorInfo.Message);
        }

      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

}
