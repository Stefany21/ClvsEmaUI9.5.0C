import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription } from 'rxjs';
import { ITerminal, ITerminalByUser, IUdf, IUdfCategory, Users } from 'src/app/models';
import { IudfValue } from 'src/app/models/iudf-value';
import { AlertService, AuthenticationService, BankService, PermsService, UserService } from 'src/app/services';
import { UdfsService } from 'src/app/services/udfs.service';

@Component({
  selector: 'app-udf',
  templateUrl: './udf.component.html',
  styleUrls: ['./udf.component.scss']
})
export class UdfComponent implements OnInit {
  //VARBOX
  selectedCategory: string;
  configuredUdfs: IUdf[];
  udfs: IUdf[];
  categories: IUdfCategory[];
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos= true;
  page = 1;
  pageSize = 10;
  collectionSize: number;
  udfsCollection:IUdf[];
  @BlockUI() blockUI: NgBlockUI; // Para bloquear la interfaz mientras se realiza una acccion
  constructor(
    private sPerm: PermsService
    , private bankService: BankService
    , private alertService: AlertService
    , private userService: UserService,
    private udfsService: UdfsService,
    private authenticationService: AuthenticationService) {
      this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
        this.currentUser = user;
      });
    }
  ngOnInit() {
    this.CheckPermits();
    this.InitVariables();
    this.LoadData();
  }


  InitVariables(): void {
    this.configuredUdfs = [];
    this.udfs = [];
    this.categories = [];
  }

  CheckPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Udfs") {
            this.permisos = Perm.Active;
          }
        });
      } else {
        this.permisos = false;
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.permisos = false;
    });
  }

  expanded = false;

  showCheckboxes() {
    var checkboxes = document.getElementById("checkboxes");
    if (!this.expanded) {
      checkboxes.style.display = "block";
      this.expanded = true;
    } else {
      checkboxes.style.display = "none";
      this.expanded = false;
    }
  }

  LoadData(): void {
    this.GetUdfCategories();
  }


  GetUdfs() {
    this.GetUdfsByCategory(this.selectedCategory);
  }


  GetUdfCategories(): void {
    this.blockUI.start(`Obteniendo categorías, espere por favor`);
    this.udfsService.GetUdfCategories().subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.categories = next.UdfCategories;
        if (this.categories.length > 0) {
          this.categories[0].IsSelected = true;
          this.GetUdfsByCategory(this.categories[0].Name);
          this.selectedCategory = this.categories[0].Name;
        }
      }
      else {
        this.alertService.errorInfoAlert(`Error: ${next.Error ? next.Error.Message : JSON.stringify(next)}`);
        console.log(next);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
    });
  }

  GetUdfCategoriesByName(_name: string): void {
    this.blockUI.start(`Obteniendo categorías, espere por favor`);
    this.udfsService.GetUdfCategories().subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.categories = next.UdfCategories;
        if (this.categories.length > 0) {
          this.categories.find(x => x.Name === _name).IsSelected = true;
          this.GetUdfsByCategory(_name);
        }
      }
      else {
        console.log(next);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
    });
  }

  ToggleCategorySelect(_category: IUdfCategory): void {
    this.page = 1;
    this.pageSize = 10;
    this.categories.forEach(x => x.IsSelected = false);
    this.categories.find(x => x.Name === _category.Name).IsSelected = true;
    this.GetUdfsByCategory(_category.Name);
    this.selectedCategory = _category.Name;
  }
  searchGetUdfs(): void{   
    this.udfs = this.udfsCollection;
    this.collectionSize = this.udfs.length;//next.FullSize;//this.udfs.length;
    this.udfs = this.udfs.slice((this.page - 1) * this.pageSize, (this.page - 1) * this.pageSize + this.pageSize);
    
  }
  GetUdfsByCategory(_name: string): void {
    this.blockUI.start(`Obteniendo udfs, espere por favor`);
    this.udfsService.GetUdfsByCategory(_name).subscribe(next => {
      this.blockUI.stop();  
      if (next.Result) {
        this.udfs = next.Udfs;
        this.udfsCollection = next.Udfs;
        this.collectionSize = next.Udfs.length;//next.FullSize;//this.udfs.length;       
        this.udfs.filter(x=> x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));
        this.udfsCollection = this.udfs;
        this.udfs = this.udfs.slice((this.page - 1) * this.pageSize, (this.page - 1) * this.pageSize + this.pageSize);

        this.GetConfiguredUdfsByCategory(_name);
      }   
      else {
        console.log(next);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
    });
  }

  GetConfiguredUdfsByCategory(_category: string): void {
    this.udfsService.GetConfiguredUdfsByCategory(_category).subscribe(next => {
      if (next.Result) {
        this.configuredUdfs = next.Udfs;
        this.configuredUdfs.filter(x=> x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));   
        this.configuredUdfs.forEach(x => {
          if (this.udfsCollection.find(y => y.Name === x.Name)) {
            this.udfsCollection.find(y => y.Name === x.Name).IsActive = x.IsActive;
            this.udfsCollection.find(y => y.Name === x.Name).IsRequired = x.IsRequired;
            this.udfsCollection.find(y => y.Name === x.Name).IsRendered = x.IsRendered;

            if (x.MappedValues) {
              x.MappedValues.forEach(y => {
                this.udfsCollection.find(z => z.Name === x.Name).MappedValues.find(m => m.Value === y.Value).IsActive = y.IsActive;
              });
          
              if (this.udfsCollection.find(y => y.Name === x.Name).MappedValues) {
                if((<HTMLInputElement>document.getElementById(`firt_input_${x.Name}`))){
              (<HTMLInputElement>document.getElementById(`firt_input_${x.Name}`)).checked = this.udfsCollection.find(y => y.Name === x.Name).MappedValues.every(y => y.IsActive);
              
                }
             }
            }
          }
        });  
      }
      else {

      }
    }, error => {
      console.log(error);
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  ToggleMultiValue(_name: string, _index: number): void {
    this.udfs.find(x => x.Name === _name).MappedValues.forEach(x => {
      x.IsActive = (<HTMLInputElement>document.getElementById(`firt_input_${_name}`)).checked;
    });
  }

  ToggleUdfValue(_name: string, _udfName: string, e): void {
    e.stopPropagation();
    this.udfs.find(x => x.Name === _name).MappedValues.find(x => x.Value === _udfName).IsActive = (<HTMLInputElement>document.getElementById(`sub_${_name}${_udfName}`)).checked;
    (<HTMLInputElement>document.getElementById(`firt_input_${_name}`)).checked = this.udfs.find(x => x.Name === _name).MappedValues.every(x => x.IsActive);
  }

  SaveUdfSettings(): void {
    this.blockUI.start(`Actualizando configuración, espere por favor`);
    let SELECTED_UDFS = this.udfsCollection.filter(x => x.IsActive);

    SELECTED_UDFS.forEach(x => {
      if (x.MappedValues) {
        x.Values = JSON.stringify(x.MappedValues.filter(x => x.IsActive));
      }
    });
    this.udfsService.SaveUdfs(SELECTED_UDFS, this.selectedCategory).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.alertService.successInfoAlert(`Actualizado correctamente`);
        this.GetUdfCategoriesByName(this.selectedCategory);
      }
      else {
        console.log(next);
        this.alertService.errorAlert(`Error: ${next.Error ? next.Error.Message : JSON.stringify(next)}`);
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
    });
  }

  ToggleUdfVisibility(_udf: IUdf): void {
    this.udfs.find(x => x.Name === _udf.Name).IsActive = !this.udfs.find(x => x.Name === _udf.Name).IsActive;
    this.udfs.find(x => x.Name === _udf.Name).IsRequired = this.udfs.find(x => x.Name === _udf.Name).IsActive;
  }

  ToggleUdfRender(_udf: IUdf): void {
    this.udfs.find(x => x.Name === _udf.Name).IsRendered = this.udfs.find(x => x.Name === _udf.Name).IsRendered;
    this.udfs.find(x => x.Name === _udf.Name).IsActive = !this.udfs.find(x => x.Name === _udf.Name).IsActive;
  }

  ToggleUdfState(_udf: IUdf, _subState: number): void {
    switch (_subState) {
      case 1:
        this.udfs.find(x => x.Name === _udf.Name).IsRequired = !this.udfs.find(x => x.Name === _udf.Name).IsRequired

        if (this.udfs.find(x => x.Name === _udf.Name).IsRequired && !this.udfs.find(x => x.Name === _udf.Name).IsActive) {
          this.udfs.find(x => x.Name === _udf.Name).IsActive = true;
          this.udfs.find(x => x.Name === _udf.Name).IsRendered = true;
        }
        break;
      case 2:
        this.udfs.find(x => x.Name === _udf.Name).IsRendered = !this.udfs.find(x => x.Name === _udf.Name).IsRendered;

        if (this.udfs.find(x => x.Name === _udf.Name).IsRendered && !this.udfs.find(x => x.Name === _udf.Name).IsActive) {
          this.udfs.find(x => x.Name === _udf.Name).IsActive = true;
          this.udfs.find(x => x.Name === _udf.Name).IsRequired = true;
        }
        break;
      case 3:
        this.udfs.find(x => x.Name === _udf.Name).IsActive = !this.udfs.find(x => x.Name === _udf.Name).IsActive;
        this.udfs.find(x => x.Name === _udf.Name).IsRendered = this.udfs.find(x => x.Name === _udf.Name).IsActive
        this.udfs.find(x => x.Name === _udf.Name).IsRequired = this.udfs.find(x => x.Name === _udf.Name).IsActive;
        break;
    }
  }

  MapDataType(_dataType): string {
    let mappedDataType = 'No definido';

    switch (_dataType) {
      case 'String':
        mappedDataType = "Texto";
        break;
      case 'Int32':
        mappedDataType = "Numérico";
        break;
      case 'Double':
        mappedDataType = "Decimal";
        break;
      case 'DateTime':
        mappedDataType = "Fecha";
        break;
    }
    return mappedDataType;
  }

  ToggleUdfRequirement(_udf: IUdf): void {
    this.udfs.find(x => x.Name === _udf.Name).IsRequired = !this.udfs.find(x => x.Name === _udf.Name).IsRequired;

    if (this.udfs.find(x => x.Name === _udf.Name).IsRequired && !this.udfs.find(x => x.Name === _udf.Name).IsActive) {
      this.udfs.find(x => x.Name === _udf.Name).IsActive = true;
    }
  }
}


enum SubStates {
  OBLIGATORY = 1
}
