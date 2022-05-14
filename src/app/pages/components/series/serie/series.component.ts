import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// MODELOS
import { Series } from '../../../../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { SeriesService, ParamsService, AlertService, AuthenticationService, PermsService } from '../../../../services/index';

// PIPES

@Component({
  selector: 'app-series',
  templateUrl: './series.component.html',
  styleUrls: ['./series.component.scss']
})
export class SeriesComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  serieList: Series [] = [];

  viewParamTitles: any [] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  filteredData = [];
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean  = true;
  
  searchUser: string;
 
  
  
  constructor( private sService: SeriesService,
               private router: Router,
               private paramsService: ParamsService,
			   private sPerm: PermsService,
			   private authenticationService: AuthenticationService,
               private alertService: AlertService
               ) {
		this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
                  this.currentUser = user;
                });
  }

  ngOnInit() {    
  this.searchUser = '';
	this.checkPermits();
    this.chargeSeriesList();
    this.GetParamsViewList();
  }
  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits(){
	  
	  this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
		  this.blockUI.stop();
		  if (data.Result) {
			// console.log(data);
			let permListtable: any = data.perms;  
			data.perms.forEach(Perm => {
				if(Perm.Name==="V_Ser"){
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

  // carga las la tabla de las series
  chargeSeriesList() {
    this.blockUI.start('Cargando listas de series..');
    this.sService.getSeriesList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.serieList = data.Series;
        this.filteredData = this.serieList;
      } else {
        this.alertService.errorAlert('Error al cargar la lista de series - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
// envia la pagina de configuraiicon de series.
  confPage(id) {
    this.router.navigate(['serieConf/' + id]);
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
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data. errorInfo.Message);
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
        return  param.Name === 'T_series';
      });
      this.title = obj[0].Text;
    }
    public filterDatatable(event: CustomEvent) {
      const searchTerm: string = this.searchUser;
      if (searchTerm.length > 0) {
  
        this.filteredData = this.serieList.filter(item => {
          if (item.Name !== null) {
            return (item.Name.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
              ||
              item.Name.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            );   
          }                      
          if (item.typeName !== null) {
            return (item.typeName.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
              ||
              item.typeName.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            );
          }        
        });
      } else {
        this.filteredData = this.serieList;
      }
    } 
}
