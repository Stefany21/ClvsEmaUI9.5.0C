import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import {FormGroup, FormControl, FormBuilder} from '@angular/forms';
import { Subscription } from 'rxjs';
// MODELOS
import { Perms, Users } from './../../../models/index';
import { Globals } from './../../../globals';

// RUTAS

// COMPONENTES

// SERVICIOS
import { PermsService, ParamsService, AlertService, AuthenticationService } from '../../../services/index';

// PIPES


@Component({
  selector: 'app-perms-by-user',
  templateUrl: './perms-by-user.component.html',
  styleUrls: ['./perms-by-user.component.scss']
})
export class PermsByUserComponent implements OnInit {

  @BlockUI() blockUI: NgBlockUI;
  userList: any []  = [];
  permList: Perms [] = [];
  permListtable: Perms [] = [];
  rdButons: FormGroup;
  user: number;
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean  = true;

  viewParamTitles: any [] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista

  constructor( private sPerm: PermsService,
               private fbs: FormBuilder,
               private paramsService: ParamsService,
               private alertService: AlertService,
			   private authenticationService: AuthenticationService,
               public globals: Globals ) {
				this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
                  this.currentUser = user;
                });
                // console.log(0);
  }

  ngOnInit() {
	this.checkPermits();
    this.GetParamsViewList();
    this.rdButons = this.fbs.group({
      rControlQuitar: ['']
    });
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
				if(Perm.Name==="V_Perm"){
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

  // carga un dropdown con todos los usurios para seleccionar cual tiene permisos.
  chargeUser() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.sPerm.getUsers().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.users.forEach(User => {
          if (User.Active) {
            this.userList.push(User);
          }
        });
        this.onChangeDataPerms(this.userList[0].Id);
      } else {
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // cambia los permisos en las diferentes tablas, ya sea si estan habilitados o deshabilitados
  onChangeDataPerms(numberId) {
    this.user = numberId;

    this.blockUI.start('Cargando listas de permisos...');
    this.sPerm.getPerms(numberId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.permListtable.length = 0;
        this.permListtable = data.perms;    
        this.rdButons.controls.rControlQuitar.reset();
      } else {
        this.permListtable.length = 0;
        this.alertService.errorInfoAlert('Error al cargar la lista de Permisos - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.permListtable.length = 0;
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });

  }
// agrega todos los permisos en la tabla de habilitadas.
  addAll() {
    this.permListtable.forEach((permiso) => {
      permiso.Active = true;
    });
  }
// quita todos lso permisos de la tabla habilitada.
  deleteAll() {
    this.permListtable.forEach((permiso) => {
      permiso.Active = false;
    });
  }
// cambia los valores boleanos para pasar los permisos entre las dos tablas.
  changeBoolVal(perm) {
    this.permListtable.forEach((permiso) => {
       if (perm.Id === permiso.Id) {
         if (permiso.Active === true) { permiso.Active = false; } else { permiso.Active = true; }
       }
     });
  }
// envia al api los cambios para guardarlos en BD
  saveChange() {
    this.blockUI.start('Guardando cambios, por favor espere...');
    this.sPerm.savePermsChange( this.permListtable, this.user)
    .subscribe( (data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.alertService.successInfoAlert('Se guardaron correctamente los cambios');
        this.GetParamsViewList();
      } else {
        this.alertService.errorAlert('Error al intentar guardar los cambios - error: ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`); 
    });
    this.rdButons.controls.rControlQuitar.reset();
  }

    // llena los campos de la tabla de items con los campos parametriados
    GetParamsViewList() {
      this.paramsService.getParasmView()
      .subscribe((data: any) => {
        this.blockUI.stop();
        if (data.Result) {
          this.globals.viewParamListSubMenu.length = 0;
          this.globals.viewParamListMenu.length = 0;

           this.globals.viewParamListSubMenu = data.Params.filter( param => {
            return param.type === 4;
          });
          this.globals.viewParamListMenu = data.Params.filter( param => {
            return param.type === 5;
          });
          this.viewParamTitles = data.Params.filter( param => {
            return param.type === 6;
          });
          this.ChargeParamstoView();
        } else {
          this.alertService.errorAlert('Error al cargar los parámetros de la página - ' + data. errorInfo.Message);
        }
      }, error => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
    }

    // Carga los datos parametrizados en las variables
    ChargeParamstoView() {
      this.getDataPerms();
      // parametrizacion del titulo
      let obj = this.viewParamTitles.filter( param => {
        return  param.Name === 'T_perms';
      });
      this.title = obj[0].Text;
    }

     // cambia los permisos en las diferentes tablas, ya sea si estan habilitados o deshabilitados
   getDataPerms() {
    this.sPerm.getPermsforMenu().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.globals.permList.length = 0;
        this.globals.permList = data.perms;
        this.chargePerms();
      } else {
        this.alertService.errorInfoAlert('Error al cargar la lista de Permisos - ' + data. errorInfo.Message);
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

}
