import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// MODELOS

// RUTAS

// COMPONENTES

// SERVICIOS
import { CompanyService, ParamsService, AlertService, AuthenticationService, PermsService } from '../../../../services/index';

// PIPES

@Component({
  selector: 'app-companies',
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss']
})
export class CompaniesComponent implements OnInit {

  @BlockUI() blockUI: NgBlockUI;
  companiesList: any[] = []; // lista de las compannias

  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  title: string; // titulo de la vista
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true;

  searchUser: string;
  columns = [
    { prop: 'Server' },
    { prop: 'DBName' },
    { prop: 'DBCode' },
    { prop: 'Active' },
    { prop: 'StoreCode' },
    { prop: 'Id' }
  ];

  filteredData = [];

  constructor(private companyService: CompanyService,
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
    this.getCompanies();
    this.GetParamsViewList();
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {

    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        // console.log(data);
        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Comp") {
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

      this.filteredData = this.companiesList.filter(item => {
        if (item.Server !== null) {
          return (item.Server.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            ||
            item.Server.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
          );
        }
        if (item.DBCode !== null) {
          return (item.DBCode.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
            ||
            item.DBCode.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) > -1
          );
        }
      });
    } else {
      this.filteredData = this.companiesList;
    }
  }

  // funcion para obtener las compañias de la DBLocal
  // no recibe parametros
  getCompanies() {
    this.blockUI.start('Obteniendo compañías, espere por favor...'); // Start blocking
    this.companyService.GetCompanies()
      .subscribe((data: any) => {
        if (data.Result) {
          this.companiesList.length = 0;
          this.companiesList = data.companiesList;
          this.filteredData = this.companiesList;
        } else {
          this.alertService.errorAlert('Error al cargar compañías - error: ' + data.errorInfo.Message);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }


  editCompany(companyId: number) {
    this.router.navigate(['/companyCRUD/' + companyId]);
  }
  createCompany(companyId: number) {
    this.router.navigate(['/companyCRUD/' + companyId]);

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
          this.alertService.errorAlert('Error al cargar los parámetros de la pagina - ' + data.errorInfo.Message);
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
      return param.Name === 'T_companies';
    });
    this.title = obj[0].Text;
  }

}
