import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

// MODELOS

// RUTAS

// COMPONENTES

// SERVICIOS
import { ParamsService, ReportsService, ItemService, AlertService, AuthenticationService, PermsService, } from '../../../services/index';

// PIPES

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  inventoryReport: FormGroup;
  viewParamTitles: any [] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  itemsTypeaheadList: any[] = [];
  itemsGroupList: any[] = [];
  itemsFirmList: any[] = [];
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean  = true;

  constructor( private fbs: FormBuilder,
               private rService: ReportsService,
               private paramsService: ParamsService,
			   private sPerm: PermsService,
			   private authenticationService: AuthenticationService,
               private itemService: ItemService, 
               private alertService: AlertService) {
				 this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
                  this.currentUser = user;
                });
                 // console.log(0);
              }

  ngOnInit() {
	this.checkPermits();
    this.GetParamsViewList();
    this.inventoryReport = this.fbs.group({
      Articulo: [''] ,
      Marca: [''],
      Grupo: [''],
      subGrupo: [''],
    });
    this.getItems();
  }
  
  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits(){
	  
	  this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
		  this.blockUI.stop();
		  if (data.Result) {
			// console.log(data);
			let permListtable: any = data.perms;  
			data.perms.forEach(Perm => {
				if (Perm.Name === 'V_Inven') {
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

  searchItemCode = (text$: Observable<string>) =>
  text$.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    map(term => term.length < 1 ? []
      : this.itemsTypeaheadList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
  )

  getItems() {
    this.blockUI.start('Obteniendo informacion de artículos, grupos, subgrupos y marcas, espere por favor...'); // Start blocking
    this.itemService.GetItems()
    .subscribe( (data: any) => {
      if (data.Result) {
        this.itemsTypeaheadList.length = 0;
        this.itemsGroupList.length = 0;
        this.itemsFirmList.length = 0;
        this.itemsTypeaheadList = data.ItemList.ItemCompleteName;
        this.itemsGroupList = data.ItemList.ItemGroupName;
        this.itemsFirmList = data.ItemList.ItemFirmName;
      } else {
        this.blockUI.stop(); // Stop blocking
      }
    }, (error: any) => {
      this.blockUI.stop(); // Stop blocking
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

// funcion que llama al servicio que envia la informacion al api para procesar el reporte
// no lleva parametros
  printInventory() {
    this.blockUI.start('Generando la impresión...'); // Start blocking

    let Articulo = '';
    let Marca = '';
    let Grupo = '';
    let subGrupo = '';

    Articulo =  this.inventoryReport.controls.Articulo.value.split(' COD. ')[0];
    Grupo = this.inventoryReport.controls.Grupo.value;
    Marca = this.inventoryReport.controls.Marca.value;

    const PrintInventory = {
      'Articulo': Articulo,
      'Marca': Marca,
      'Grupo': Grupo,
      'subGrupo': subGrupo
    };

    this.rService.printInventory(PrintInventory)
    .subscribe(data => {
      this.blockUI.stop(); // Stop blocking
      if(data.Result){
      var fileBase64 = atob(data.Data);
      var length = fileBase64.length;
      var arrayBuffer = new ArrayBuffer(length);
      var uintArray = new Uint8Array(arrayBuffer);
      for (var i = 0; i < length; i++) {
        uintArray[i] = fileBase64.charCodeAt(i);
        }
      var tab = window.open();
      var pdfFile = new Blob([uintArray], { type: 'application/pdf'});
      var fileUrl = URL.createObjectURL(pdfFile);
      tab.location.href = fileUrl;
    }else{
      this.alertService.errorInfoAlert(`Error obteniendo reporte, error: ${data.Error.Code}-${data.Error.Message}`);  
    }
    }, error => {
      this.blockUI.stop(); // Stop blocking
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error} `);
    });
  }

  // llena los campos de la tabla de items con los campos parametriados
  GetParamsViewList() {
    this.paramsService.getParasmView()
    .subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.viewParamTitles = data.Params.filter( param => {
          return param.type === 6;
        });
        this.ChargeParamstoView();
      } else {
        this.alertService.errorAlert('Error al cargar los parámetros de la pagina - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

     // Carga los datos parametrizados en las variables
     ChargeParamstoView() {
      // parametrizacion del titulo
      let obj = this.viewParamTitles.filter( param => {
        return  param.Name === 'T_inventory';
      });
      this.title = obj[0].Text;
    }

}
