import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// MODELOS
import { UserAssigns, Users } from '../../../../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { UserService, ParamsService, AlertService, AuthenticationService, PermsService } from '../../../../services/index';


// PIPES

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  searchUser: string;
  userList: UserAssigns[] = []; // lista para los usuarios
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;
  filteredData: UserAssigns[];
  users: Users [];
  constructor(private sUsers: UserService,
    private router: Router,
    private paramsService: ParamsService,
    private sPerm: PermsService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }    

  ngOnInit() {
    
  this.users= [];
    this.searchUser = '';
    this.checkPermits();
    this.chargeUser();
    this.GetParamsViewList();
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_User") {
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

  public filterDatatable(event: CustomEvent) {
    const searchTerm: string = this.searchUser;
    if (searchTerm.length > 0) {

      this.filteredData = this.userList.filter(item => {
        if (item.UserName !== null) {
          return (item.UserName.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            ||
            item.UserName.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
          );
        }
        if (item.SAPUser !== null) {
          return (item.SAPUser.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            ||
            item.SAPUser.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
          );
        }
      });
    } else {
      this.filteredData = this.userList;
    }
  }


  // carga los usuarios en la tabla de informacion
  // sin parametros
  chargeUser() {
    this.blockUI.start('Cargando listas de usuarios...');
    this.sUsers.getUserList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {            
        this.userList = data.Users;
        this.filteredData = this.userList;        
      } else {
        this.alertService.errorAlert('Error al cargar la lista de usuarios - ' + data.errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // redirecciona a la pagina de configuracion
  // envia parametro del ID del usuario que se quiere enviar
  confPage(user) {
    this.router.navigate(['userConf/' + user.Id]);
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
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }


  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter(param => {
      return param.Name === 'T_users';
    });
    this.title = obj[0].Text;
  }

}
