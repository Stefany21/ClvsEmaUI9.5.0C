import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import {FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';
import { Series, seriesType, Company} from '../../../../models/index';
import {  SeriesService, UserService, AlertService } from '../../../../services/index';
import { Router } from '@angular/router';
import { setEnvironment } from '@angular/core/src/render3/instructions';

@Component({
  selector: 'app-serie-conf',
  templateUrl: './serie-conf.component.html',
  styleUrls: ['./serie-conf.component.scss']
})
export class SerieConfComponent implements OnInit {
  SerieId: number;
  disable: boolean;
  salida: boolean;
  @BlockUI() blockUI: NgBlockUI;
  serieList: Series [] = [];
  seriesEnuList: seriesType [] = [];
  typeSeriesEnuList: seriesType [] = [];
  companyList: Company [] = [];
  SeriesGroup: FormGroup;
  btnSendInfo: string; // cambia el titulo de el boton de envio
  status: string[] = ['Si', 'No'];
  busy: boolean;

  constructor(private activatedRoute: ActivatedRoute,
              private sService: SeriesService,
              private router: Router,
              private uService: UserService,
              private fbs: FormBuilder, private alertService: AlertService) {
                this.getGetCompanies();
  }

  ngOnInit() {
    // tslint:disable-next-line:radix
    this.SerieId = parseInt(this.activatedRoute.snapshot.paramMap.get('SerieId'));
    if (this.SerieId > 0) {
      this.btnSendInfo = 'Actualizar';
    //  this.SeriesGroup.patchValue({Active:'Si'});
      //this.SeriesGroup.patchValue({Type:'Factura Offline'});


    } else { this.btnSendInfo = 'Crear'; 
  
   
    // this.SeriesGroup.patchValue({Type:'Factura Offline'});
    // this.SeriesGroup.patchValue({Active:'No'});

    }
    this.salida = true;
    this.SeriesGroup = this.fbs.group({
       Name: ['', [Validators.required] ],
       Numbering: ['', [Validators.required]],
       Serie: ['', [Validators.required]],
       Active: ['', []],
       typeName: ['', []],
       CompanyName: ['', []],
       Type: ['']
    });
    // this.SeriesGroup.controls['Type'].setValue(2);     
    // this.SeriesGroup.controls['Active'].setValue(0);  
  }

  get f() { return this.SeriesGroup.controls; }
// carga la lista de series
  chargeSeriesList() {
    this.blockUI.start('Cargando listas de series..');
    this.sService.getSeriesList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.serieList = data.Series;
        this.chargeSerieData();
      } else {
        this.alertService.errorAlert('Error al cargar la lista de series - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }

  // obtiene las compañias de las cuales dispone la empresa.
  getGetCompanies() {
    this.blockUI.start('Cargando listas de almacenes...');
    this.uService.getGetCompanies().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.companyList = data.companiesList;
        this.GetSeriesEnumList();
        this.SeriesGroup.patchValue({CompanyName: this.companyList[0].Id});

      } else {
        this.alertService.errorAlert('Error al cargar la lista de almacenes - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
  // obtien la lista d elos tipos de coumentos de las series
  GetSeriesEnumList() {
    this.blockUI.start('Cargando listas de tipos de Series..');
    this.sService.getSeriesEnumList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.seriesEnuList = data.Enums;
        this.SeriesGroup.patchValue({typeName: this.seriesEnuList[0].Value});
        this.GetTypeSeriesEnumList();
      } else {
        this.alertService.errorAlert('Error al cargar la lista de tipos de Series - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }
  // obtiene la info de si la serie es manual o automatica
  GetTypeSeriesEnumList() {
    this.blockUI.start('Cargando listas de tipos de Numeracion..');
    this.sService.getTypeSeriesEnumList().subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        this.typeSeriesEnuList = data.Enums;
        this.SeriesGroup.patchValue({Numbering: this.typeSeriesEnuList[0].Value});
        this.chargeSeriesList();
      } else {
        this.alertService.errorAlert('Error al cargar la lista de tipos de Numeración - ' + data. errorInfo.Message);
      }
    }, error => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
    });
  }
// carga la data de la serie por si la opcion es editar
chargeSerieData() {
 
    this.serieList.forEach(serie => {
      if (serie.Id === this.SerieId ) {
      this.salida = false;
      this.SeriesGroup.patchValue({CompanyName: serie.CompanyId});
      this.SeriesGroup.patchValue({typeName: serie.DocType});
      this.SeriesGroup.patchValue({Numbering: serie.Numbering});
      this.SeriesGroup.controls.Name.setValue(serie.Name);
      this.SeriesGroup.controls.Serie.setValue(serie.Serie);     
      this.SeriesGroup.controls.Type.setValue(serie.Type);
      //this.SeriesGroup.controls.Active.setValue(serie.Active);
      this.SeriesGroup.controls.Active.setValue(serie.Active ? 1 : 0);
      //his.SeriesGroup.patchValue({Type: serie.Type});
      }
    });
    if (this.salida && this.SerieId !== 0) { this.router.navigate(['series']); }
  }

  // envia la info al api para guardarla en internet.
  onSubmitCreate() {
    this.blockUI.start('Enviando Información..');
    this.sService.sendUserInfo(this.SeriesGroup, this.SerieId);
  }
  
  cancel(){
    this.router.navigate(['/series']);
  }

}