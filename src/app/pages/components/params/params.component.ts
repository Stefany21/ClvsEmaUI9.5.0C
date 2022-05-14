import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription } from 'rxjs';

// MODELOS
import { Globals } from './../../../globals';

// RUTAS

// COMPONENTES

// SERVICIOS
import { ParamsService, PermsService, AlertService, AuthenticationService } from '../../../services/index';

// PIPES

@Component({
  selector: 'app-params',
  templateUrl: './params.component.html',
  styleUrls: ['./params.component.scss']
})
export class ParamsComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  viewParamListItem: any[] = []; // llena la lista con los componentes parametrizados de items
  viewParamListHeader: any[] = []; // llena la lista con los componentes parametrizados de cabezera
  viewParamListTotals: any[] = []; // llena la lista con los componentes parametrizados de totales
  viewParamListSubMenu: any[] = []; // llena la lista con los componentes parametrizados del sub menu principal
  viewParamListMenu: any[] = []; // llena la lista con los componentes parametrizados del menu principal
  viewParamTitles: any [] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean  = true;

  constructor( private pService: ParamsService,
               private globals: Globals,
               private perService: PermsService,
			   private authenticationService: AuthenticationService,
               private alertService: AlertService ) {
				this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
                  this.currentUser = user;
                });
                // // console.log('ParamsComponent constructor');

   }

  ngOnInit() {
	this.checkPermits();
    this.GetParamsViewList();
  }
  // chequea que se tengan los permisos necesarios para acceder a la pagina
  checkPermits(){
	  
	  this.perService.getPerms(this.currentUser.userId).subscribe((data: any) => {
		  this.blockUI.stop();
		  if (data.Result) {
			// // console.log(data);
			let permListtable: any = data.perms;  
			data.perms.forEach(Perm => {
				if(Perm.Name==="V_Param"){
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
    this.blockUI.start('Cargando Parametrizaciones, por favor espere...');

    this.viewParamListItem.length = 0;
    this.viewParamListHeader.length = 0;
    this.viewParamListTotals.length = 0;
    this.viewParamListSubMenu.length = 0;
    this.viewParamListMenu.length = 0;
    this.viewParamTitles.length = 0;

    this.pService.getParasmView()
    .subscribe((data: any) => {
      this.blockUI.stop();
      this.globals.viewParamListSubMenu.length = 0;
      this.globals.viewParamListMenu.length = 0;

      if (data.Result) {
        data.Params.forEach(element => {
          if ( element.type === 1 ) {
            this.viewParamListItem.push(element);
          }
          if ( element.type === 2 ) {
            this.viewParamListHeader.push(element);
          }
          if ( element.type === 3 ) {
            this.viewParamListTotals.push(element);
          }
          if ( element.type === 4 ) {
            this.viewParamListSubMenu.push(element);
            this.globals.viewParamListSubMenu.push(element);
          }
          if ( element.type === 5 ) {
            this.viewParamListMenu.push(element);
            this.globals.viewParamListMenu.push(element);
          }
          if ( element.type === 6 ) {
            this.viewParamTitles.push(element);
          }
        });

        // this.viewParamListItem = data.Params.filter( param => {
        //   return param.type === 1;
        // });
        // this.viewParamListHeader = data.Params.filter( param => {
        //   return param.type === 2;
        // });
        // this.viewParamListTotals = data.Params.filter( param => {
        //   return param.type === 3;
        // });
        // this.viewParamListSubMenu = data.Params.filter( param => {
        //   return param.type === 4;
        // });
        // this.viewParamListMenu = data.Params.filter( param => {
        //   return param.type === 5;
        // });
        // this.viewParamTitles = data.Params.filter( param => {
        //   return param.type === 6;
        // });

        this.ChargeParamstoView();
      } else {
        this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });

  }
  // mueve hacia arriba si los componentes a los cuales se les quiere cambiar el orden
  // recive el index de la fila;
  UpOrder(i: number) {
    if (i !== 0) {
      this.viewParamListItem[i].Order = this.viewParamListItem[i - 1].Order;
      this.viewParamListItem[i - 1].Order += 1;
      this.viewParamListItem = this.viewParamListItem.sort(( a, b ) => a.Order - b.Order );
    }
  }
  // mueve hacia abajo si los componentes a los cuales se les quiere cambiar el orden
  // recive el index de la fila;
  DownOrder(i: number) {
    if (i !== this.viewParamListItem.length - 1) {
      this.viewParamListItem[i + 1].Order = this.viewParamListItem[i].Order;
      this.viewParamListItem[i].Order += 1;
      this.viewParamListItem = this.viewParamListItem.sort(( a, b ) => a.Order - b.Order );
    }
  }

  SendInfoItemsParams(Lista: any) {
    this.blockUI.start('Guardando información enviada, por favor espere...');
    this.pService.UpdateParasmView(Lista)
    .subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.GetParamsViewList();
        this.alertService.successInfoAlert('Datos guardados correctamente');
      } else {
        this.alertService.errorAlert('Error procesar la información - error: ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    this.getDataPerms();
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter( param => {
      return  param.Name === 'T_params';
    });
    this.title = obj[0].Text;
  }

   // cambia los permisos en las diferentes tablas, ya sea si estan habilitados o deshabilitados
   getDataPerms() {
    this.perService.getPermsforMenu().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.globals.permList.length = 0;
        this.globals.permList = data.perms;
        this.chargePerms();
      } else {
        this.alertService.errorAlert('Error al cargar la lista de Permisos - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  chargePerms() {
    this.globals.compVisivility.length = 0;
    this.globals.viewParamListSubMenu.forEach( param => {
      this.globals.permList.forEach( perm => {
        if (param.Name === perm.Name && param.Visibility && perm.Active) {
          this.globals.compVisivility.push({
            'Name': param.Name,
            'Visibility': param.Visibility,
            'Text': param.Text,
            'active': perm.Active
          });
        }
      });
    });
  }
  
  SendInfoAll(viewParamListHeader: any, viewParamListItem: any, viewParamListTotals: any, viewParamTitles: any, viewParamListMenu: any, viewParamListSubMenu: any){
      this.SendInfoItemsParams(viewParamListHeader);
      this.SendInfoItemsParams(viewParamListItem);
      this.SendInfoItemsParams(viewParamListTotals);
      this.SendInfoItemsParams(viewParamTitles);
      this.SendInfoItemsParams(viewParamListMenu);
      this.SendInfoItemsParams(viewParamListSubMenu);
  }

}
