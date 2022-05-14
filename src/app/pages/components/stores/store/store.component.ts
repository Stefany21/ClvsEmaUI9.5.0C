import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
  

// MODELOS
import { } from '../../../../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { StoreService, ParamsService, AlertService, AuthenticationService, PermsService } from '../../../../services/index';

// PIPES

@Component({
  selector: 'app-store',
  templateUrl: './store.component.html',
  styleUrls: ['./store.component.scss']
})
export class StoreComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  
  storesList: any [] = []; // lista para los usuarios
  viewParamTitles: any [] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  reorderable:boolean=true;
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean  = true;  
  filteredData = [];

  searchUser: string;
  constructor(private sService: StoreService, private paramsService: ParamsService, private router: Router,
			  private sPerm: PermsService,
			  private authenticationService: AuthenticationService,
              private alertService: AlertService) {
	this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
                  this.currentUser = user;
                });
   }

  ngOnInit() {    
  this.searchUser = '';
	this.checkPermits();
    this.GetParamsViewList();
    this.chargeUser();
  }
  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits(){
	  
	  this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
		  this.blockUI.stop();
		  if (data.Result) {
			// console.log(data);
			let permListtable: any = data.perms;  
			data.perms.forEach(Perm => {
				if(Perm.Name==="V_Store"){
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


  public filterDatatable(event: CustomEvent) {
    const searchTerm: string = this.searchUser;
    if (searchTerm.length > 0) {

      this.filteredData = this.storesList.filter(item => {
        if (item.Name !== null) {
          return (item.Name.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            ||
            item.Name.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
          );   
        }                      
        if (item.companyName !== null) {
          return (item.companyName.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            ||
            item.companyName.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
          );
        }           
      });
    } else {
      this.filteredData = this.storesList;
    }
  }

  chargeUser() {
    this.blockUI.start('Cargando listas de almacenes...');

    this.sService.getallStores().subscribe((data: any) => {
      this.blockUI.stop();
    
      if (data.Result) {
        this.storesList = data.Stores;
        this.filteredData = this.storesList;

      } else {
        this.alertService.errorAlert('Error al cargar la lista de Almacenes - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
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

// redirecciona a la pagina de configuracion
  // envia parametro del ID del usuario que se quiere enviar
  confPage(id) {
    this.router.navigate(['storeConf/' + id]);
}

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter( param => {
      return  param.Name === 'T_Store';
    });
    this.title = obj[0].Text;
  }
}
