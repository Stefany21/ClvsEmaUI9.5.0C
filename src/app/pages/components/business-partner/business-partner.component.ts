import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

// SERVICIOS
import { BusinessPartnerService, ParamsService, SapService, AlertService, JsonDataService, AuthenticationService, PermsService } from '../../../services/index';

// MODELOS
import { IBusinessPartner, Mail, IdentificationType, IdentificationBusinessPartner, IUdf, IUdfTarget } from 'src/app/models/index';
import { Console } from 'console';
import { IudfValue } from 'src/app/models/iudf-value';
import { UdfsService } from 'src/app/services/udfs.service';
import { DOCUMENT_ALIAS } from 'src/app/models/constantes';
import { formatDate } from '@angular/common';
import { parse } from 'querystring';

@Component({
  selector: 'app-business-partner',
  templateUrl: './business-partner.component.html',
  styleUrls: ['./business-partner.component.css']
})
export class BusinessPartnerComponent implements OnInit {
  //VARBOX
  udfs: IUdf[];
  identificationTypeList: any[] = []; //Constante Tipo Identificacion Socio de Negocio
  identificationBusinessPartnerList: any[] = []; //Constante tipo socio de Negocio, Cliente o Proveedor
  BusinessPartnerCardCode: string;  // Codigo Socio de Negocio, si es cero es creacion, si es diferente de cero es edicion
  businesspartnerForm: FormGroup; // Formulario de Socios de Negocios
  Customer: IBusinessPartner; //Modelo de Socios de Negocios
  @BlockUI() blockUI: NgBlockUI;
  viewParamTitles: any[] = []; // llena la lista con los titulos de las paginas parametrizados
  BusinessPartnerTypeaHead: any[] = []; // lista de los Socios de Negocios
  BusinessPartnerlist: any[] = []; // lista de los Socios de Negocios

  title: string; // titulo del componente
  titleButton: string; //accion a realizar en componente
  create: boolean; // variable para reconcer si se esta creando o modificando Cliente
  sapConnectionList: any[] = []; // lista con las conexiones de SAP de la DBLocal

  provinceList: any[] = [];// provincias
  cantonList: any[] = []; // lista de cantones
  districtList: any[] = []; // lista de distritos
  neighborhoodList: any[] = []; // lista de barrios
  provinceId: string; // identificador de la provincia
  cantonId: string; // identificador del canton
  districtId: string; // identificador del distrito
  neighborhoodId: string; // identificador del barrio

  /*Formulario*/
  nombreProvincia: string; // almacena el nombre de la provincia
  nombreCanton: string; // almacena el nombre de la canton
  nombreDistrito: string; // almacena el nombre de la distrito
  nombreBarrio: string; // almacena el nombre de la barrio
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true; //ermisos para acceder a la pagina
  isUpdating: false; // oculto CardCode Socio de Negocio
  ItemBusinessPartner: FormControl = new FormControl();// input busqueda Socio Negocio


  //TypeaHead Filtra Socios de Negocios en input
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      distinctUntilChanged(),
      map(term => (term === '' ? this.BusinessPartnerTypeaHead
        : this.BusinessPartnerTypeaHead.filter(v => v.toLowerCase().indexOf
          (term.toLowerCase()) > -1)).slice(0, 10)))

  constructor(private businessPartnerService: BusinessPartnerService,
    private paramsService: ParamsService,
    private sPerm: PermsService,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private fb: FormBuilder,
    private sapService: SapService,
    private jsonDataService: JsonDataService,
    private udfService: UdfsService
  ) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;

    });
  }

  ngOnInit() {
    this.udfs = [];
    this.identificationTypeList = IdentificationType;
    this.identificationBusinessPartnerList = IdentificationBusinessPartner;
    this.checkPermits();
    this.getCustomers();
    this.GetParamsViewList();
    this.setNewFormData();
    this.getSapConnection();
    this.getProvinces();
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.BUSINESS_PARTNER);
    this.titleButton = 'Crear Socio Negocio';
  }

  //Consultar si cedula ya existe en BD
  queryCustomerLic() {

    if (Number(this.businesspartnerForm.controls.LicTradNum.value !== "")) {
      this.businessPartnerService.GetAllBusinessPartner()
        .subscribe((data: any) => {
          if (data.Result) {
            data.Customer.forEach(bp => {
              if (bp.LicTradNum == Number(this.businesspartnerForm.controls.LicTradNum.value)) {
                this.businessPartnerService.GetCustomerById(bp.CardCode)
                  .subscribe((data: any) => {
                    if (data.Result) {
                      this.Customer = data.Customer;
                      this.setUpdateFormData(this.Customer);
                      this.titleButton = 'Actualizar Socio Negocio';
                    }
                  })
              }
            });
          }
        });
    }

    this.identificationTypeChange(this.businesspartnerForm.controls.U_TipoIdentificacion.value);
  }

  // chequea que se tengan los permisos para acceder a la pagina
  checkPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {

        let permListtable: any = data.perms;
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_BusinessP") {
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

  // funcion para obtener clientes de la DBLocal
  // no recibe parametros
  getCustomers() {
    this.businessPartnerService.GetAllBusinessPartner()
      .subscribe((data: any) => {

        if (data.Result) {
          this.Customer = data.Customer;
          this.BusinessPartnerTypeaHead.length = 0;
          this.BusinessPartnerlist = data.Customer;

          data.Customer.forEach(bp => {
            this.BusinessPartnerTypeaHead.push(`${bp.CardCode} ${bp.CardName} `);
          });
        }
        else {
          this.alertService.errorAlert('Error al cargar Socios - Error: ' + data.errorInfo.Message);
        }
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
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

  GetInfoBPPadron() {
    console.log('GetInfoBPPadron');
    this.blockUI.start('Obteniendo datos del padrón...');
    if (this.businesspartnerForm.controls.U_TipoIdentificacion.value != '' && this.businesspartnerForm.controls.LicTradNum.value !== "") {
      this.businessPartnerService.GetCustomersContPadron(this.businesspartnerForm.controls.LicTradNum.value).subscribe((data: any) => {

        this.businesspartnerForm.patchValue({ CardName: data.nombre });

        this.blockUI.stop();
       
        this.clearFormByIdValidation();
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error no se ha encontrado la informacion en el padron del número de identificación ingresado.`);
      });
    }
    this.blockUI.stop(); // Stop blocking
  }

  // funcion para colocar inicializar el form de Clientes
  setNewFormData() {
    this.ItemBusinessPartner.setValue('');
    this.businesspartnerForm = this.fb.group({
      CardCode: [''],
      CardName: ['', Validators.required],
      Phone1: [''],
      CardType: ['', Validators.required],
      LicTradNum: ['', Validators.required],
      E_Mail: ['', [Validators.required, Validators.email]],
      U_TipoIdentificacion: ['', Validators.required],
      U_provincia: [''],
      U_canton: [''],
      U_distrito: [''],
      U_barrio: [''],
      U_direccion: [''],
    });
  }
  // limpiar el formulario
  BorrarCampos() {
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.BUSINESS_PARTNER);
    this.setNewFormData();
    this.getProvinces();
    this.titleButton = 'Crear Socio Negocio';
  }

  // borra los datos en el caso que la cedula no exista
  deleteIfIdNotExist() {
    this.businesspartnerForm.patchValue({ CardCode: '' });
    this.businesspartnerForm.patchValue({ CardName: '' });
    this.businesspartnerForm.patchValue({ Phone1: '' });
    this.businesspartnerForm.patchValue({ E_Mail: '' });
    this.businesspartnerForm.patchValue({ U_direccion: '' });
  }

  // limpia datos si los hubiera, al digitar una cedula que no existe
  clearFormByIdValidation() {
    this.deleteIfIdNotExist();
    this.getProvinces();
    this.titleButton = 'Crear Socio Negocio';
  }

  // funcion para obtener las conexiones de SAP de la DBLocal, no recibe parametros
  getSapConnection() {
    this.blockUI.start('Obteniendo conexiones de SAP, espere por favor...'); // Start blocking
    this.sapService.GetSapConnection()
      .subscribe((data: any) => {
        if (data.Result) {
          this.sapConnectionList = data.SAPConnections;
        } else {
          this.alertService.errorAlert('Error al Establecer conexión con SAP - Error: ' + data.errorInfo.Message);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
      });
  }

  // funcion para colocar cierta informacion de acuerdo al tipo de accion, ya sea creacion o edicion
  setData() {
    if (this.BusinessPartnerCardCode === '') {
      this.create = true;
      this.title = 'Crear';

    } else {
      this.create = false;
      this.title = 'Actualizar';
    }
  }
  showCustomer(item) {
    this.BusinessPartnerCardCode = item.item.split(' ')[0];
    this.getCustomerById(this.BusinessPartnerCardCode);
  }

  // funcion para obtener la info del Socio para su modificacion
  getCustomerById(CodeCustomer: string) {
    this.blockUI.start('Obteniendo información del socio, espere por favor...');
    this.businessPartnerService.GetCustomerById(CodeCustomer)
      .subscribe((data: any) => {
        if (data.Result) {
          this.titleButton = 'Actualizar socio negocio';
          this.Customer = data.Customer;
          this.setUpdateFormData(this.Customer);
          this.GetUdfsData(this.udfs, DOCUMENT_ALIAS.BUSINESS_PARTNER, `'${CodeCustomer}'`);
        } else {
          this.alertService.errorAlert('Error al cargar la información del socio - error: ' + data.errorInfo.Message);
        }
        this.blockUI.stop(); // Stop blocking
      }, (error: any) => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
  }

  //Funcion para actualizar o Crear un Socio de Negocio
  Actualizar() {

    if (this.businesspartnerForm.get('U_provincia').value == '0') {
      this.alertService.infoInfoAlert(`Por favor seleccione la provincia`);
      return;
    }

    const U_PROVINCIA = this.businesspartnerForm.get('U_provincia').value + '-' + this.provinceList.find(x => x.ProvinceId == this.businesspartnerForm.get('U_provincia').value).ProvinceName;
    const U_CANTON = this.businesspartnerForm.get('U_canton').value + '-' + this.cantonList.find(x => x.CantonId == this.businesspartnerForm.get('U_canton').value).CantonName;
    const U_DISTRITO = this.businesspartnerForm.get('U_distrito').value + '-' + this.districtList.find(x => x.DistrictId == this.businesspartnerForm.get('U_distrito').value).DistrictName;
    const U_BARRIO = this.businesspartnerForm.get('U_barrio').value + '-' + this.neighborhoodList.find(x => x.NeighborhoodId == this.businesspartnerForm.get('U_barrio').value).NeighborhoodName;

    let udfName = '';
    let isValid = true;
    this.udfs.forEach(x => {
      if (x.IsRequired && (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value == '') {
        udfName = x.Description;
        isValid = false;
        return;
      }
    });

    if (!isValid) {
      this.alertService.infoInfoAlert(`El campo ${udfName} es requerido`);
      return;
    }

    let mappedUdfs: IUdfTarget[] = [];
    this.udfs.forEach(x => {
      let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;

      if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();

      mappedUdfs.push({
        Name: x.Name,
        Value: parsedValue,
        FieldType: x.FieldType
      } as IUdfTarget);
    });

    if (this.businesspartnerForm.value.CardCode === '') {
      if (!this.businesspartnerForm.value.CardType) {
        this.alertService.infoInfoAlert(`El campo Tipo de Socio de Negocio es requerido`);
        return;
      }
      if (!this.businesspartnerForm.value.LicTradNum) {
        this.alertService.infoInfoAlert(`El campo Número Cédula es requerido`);
        return;
      }

      this.businesspartnerForm.value.CardCode = 0;
      this.titleButton = 'Crear socio negocio';
      this.blockUI.start('Creando socio de negocio, espere por favor...'); // Start blocking
      this.businessPartnerService.CreateCustomer(this.businesspartnerForm, U_PROVINCIA, U_CANTON, U_DISTRITO, U_BARRIO, mappedUdfs).subscribe(resul => {
        if (resul.Result) {
          this.alertService.successAlert("Socio de negocio creado con éxito");
          this.BorrarCampos();
          this.getCustomers();
        } else {
          this.alertService.errorAlert(`Error al crear socio de negocio ${resul.Error.Message}`);
          this.businesspartnerForm.value.CardCode = '';
        }
        this.blockUI.stop(); // Stop blocking
      });

    } else {
      if (!this.businesspartnerForm.value.CardType) {
        this.alertService.infoInfoAlert(`El campo Tipo de Socio de Negocio es requerido`);
        return;
      }
      this.blockUI.start('Actualizando socio de negocio, espere por favor...');
      this.businessPartnerService.UpdateCustomer(this.businesspartnerForm, U_PROVINCIA, U_CANTON, U_DISTRITO, U_BARRIO, mappedUdfs).subscribe(resul => {
        if (resul.Result) {
          this.alertService.successAlert("Socio de negocio actualizado con  éxito");
          this.BorrarCampos();
          this.getCustomers();
        } else {
          this.alertService.errorAlert(`Error al actualizar socio de negocio ${resul.Error.Message}`);

        }
        this.blockUI.stop(); // Stop blocking
      });

    }
  }

  // carga el Form con los Datos a Editar
  setUpdateFormData(bp: any) {
    this.businesspartnerForm.patchValue({ CardType: bp[0].CardType })
    this.businesspartnerForm.patchValue({ CardCode: bp[0].CardCode });
    this.businesspartnerForm.patchValue({ CardName: bp[0].CardName });
    this.businesspartnerForm.patchValue({ Phone1: bp[0].Phone1 });
    this.businesspartnerForm.patchValue({ LicTradNum: bp[0].LicTradNum });
    this.businesspartnerForm.patchValue({ E_Mail: bp[0].E_Mail });
    this.businesspartnerForm.patchValue({ U_TipoIdentificacion: bp[0].U_TipoIdentificacion });

    let provid = bp[0].U_provincia.split('-').length > 0 ? bp[0].U_provincia.split('-')[0] : bp[0].U_provincia;
    let cantonid = bp[0].U_canton.split('-').length > 0 ? bp[0].U_canton.split('-')[0] : bp[0].U_canton;
    let distritoid = bp[0].U_distrito.split('-').length > 0 ? bp[0].U_distrito.split('-')[0] : bp[0].U_distrito;
    let barrionid = bp[0].U_barrio.split('-').length > 0 ? bp[0].U_barrio.split('-')[0] : bp[0].U_barrio;
    let provname = this.provinceList[0].ProvinceName;
    this.provinceList.forEach(prov => {
      if (prov.ProvinceId === provid) { //data.FEInfo.Provincia
        provid = prov.ProvinceId;
        provname = prov.ProvinceName;
      }
    });
    this.nombreProvincia = provname;

    this.businesspartnerForm.patchValue({ U_provincia: Number(provid).toString() });
    this.getCantonsPatch(provid, cantonid, distritoid, barrionid);
    this.businesspartnerForm.patchValue({ U_direccion: bp[0].U_direccion });
  }

  // Carga los datos parametrizados en las variables
  ChargeParamstoView() {
    // parametrizacion del titulo
    let obj = this.viewParamTitles.filter(param => {
      return param.Name === 'T_companies';
    });
    this.title = 'Clientes';
  }
  // convenience getter for easy access to company and maildata form fields
  get ced() {
    return this.businesspartnerForm.controls;
  }


  //validar campos formulario
  identificationTypeChange(IdentificationValue: string) {
    switch (IdentificationValue) {
      case '00': {
        this.businesspartnerForm.controls['LicTradNum'].setValidators([]);
        this.businesspartnerForm.controls['LicTradNum'].updateValueAndValidity();
        this.businesspartnerForm.controls['U_direccion'].setValidators([]);
        this.businesspartnerForm.controls['U_direccion'].updateValueAndValidity();
        this.businesspartnerForm.controls['E_Mail'].setValidators([]);
        this.businesspartnerForm.controls['E_Mail'].updateValueAndValidity();
        break;
      }
      case '01': {
        this.validatorCustomerForm(9, 9);
        //this.getProvinces();
        break;
      }
      case '02':
      case '04': {
        this.validatorCustomerForm(10, 10);
        //this.getProvinces();
        break;
      }
      case '03': {
        this.validatorCustomerForm(11, 12);
        //this.getProvinces();
        break;
      }
    }
    
    // if(IdentificationValue != ''){
    //   this.GetInfoBPPadron();
    // }
  }
  // validar campos formulario
  validatorCustomerForm(min: number, max: number) {
    this.businesspartnerForm.controls['LicTradNum'].setValidators([Validators.required, Validators.minLength(min), Validators.maxLength(max)]);
    this.businesspartnerForm.controls['LicTradNum'].updateValueAndValidity();
    this.businesspartnerForm.controls['U_direccion'].setValidators([Validators.required, Validators.maxLength(250)]);
    this.businesspartnerForm.controls['U_direccion'].updateValueAndValidity();
    this.businesspartnerForm.controls['E_Mail'].setValidators([Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]);
    this.businesspartnerForm.controls['E_Mail'].updateValueAndValidity();
  }

  // obtiene información de Canton segun la provincia
  getCantonsPatch(provinceId, cantonId, districtId, neighbourhoodId) {
    this.provinceId = provinceId;
    this.setProvinceName(provinceId);
    this.blockUI.start('Obteniendo datos...');
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.blockUI.stop();
        try {
          this.cantonList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId)), 'CantonId');
          let cantid = '01';
          let cantname = this.cantonList[0].CantonName;
          this.cantonList.forEach(cant => {
            if (cant.CantonId === cantonId) {
              cantid = cant.CantonId;
              cantname = cant.CantonName;
            }
          });
          if (true) {
            this.cantonId = cantid;
            this.nombreCanton = cantname;
            this.businesspartnerForm.patchValue({ U_canton: cantid });
            this.getDistricsPatch(cantid, districtId, neighbourhoodId);
          }
        }
        catch (e) {
          this.alertService.infoInfoAlert(`No se ha definido provincia, cantón, distrito, barrio`);
        }
      });
  }
  // obtiene informacionde distrito segun el cantón
  getDistricsPatch(cantonId, districtId, neighbourhoodId) {
    this.cantonId = cantonId;
    this.setCantonName(cantonId);
    this.blockUI.start('Obteniendo datos...');
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.blockUI.stop();
        this.districtList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId) && x.CantonId === this.cantonId), 'DistrictId');
        let distid = '01';
        let distname = this.districtList[0].DistrictName;
        this.districtList.forEach(dist => {
          if (dist.DistrictId === districtId) {
            distid = dist.DistrictId;
            distname = dist.DistrictName;
          }
        });
        if (true) {
          this.districtId = distid;
          this.nombreDistrito = distname;
          this.businesspartnerForm.patchValue({ U_distrito: distid });
          this.getNeighborhoodPatch(distid, neighbourhoodId);
        }
      });
  }
  // obtiene informacion de barrio segun el distrito
  getNeighborhoodPatch(districtId, neighbourhoodId) {
    this.districtId = districtId;
    this.setDistrictName(districtId);
    this.blockUI.start('Obteniendo datos...');
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.blockUI.stop();
        this.neighborhoodList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId) && x.CantonId === this.cantonId && x.DistrictId === this.districtId), 'NeighborhoodId');
        let neighid = '01';
        let neighname = this.neighborhoodList[0].NeighborhoodName;
        this.neighborhoodList.forEach(neigh => {
          if (neigh.NeighborhoodId === neighbourhoodId) {
            neighid = neigh.NeighborhoodId;
            neighname = neigh.NeighborhoodName;
          }
        });
        if (true) {
          this.neighborhoodId = neighid;
          this.nombreBarrio = neighname;
          this.businesspartnerForm.patchValue({ U_barrio: neighid });
        }
      });
  }

  // Obtiene nombre provincia a partir del ID
  setProvinceName(provId) {
    let provList: any;
    this.jsonDataService.getJSONProvinces()
      .subscribe((data: any) => {
        provList = data.Provinces;
        provList.forEach(prov => {
          if (Number(prov.ProvinceId) === Number(provId)) {
            this.nombreProvincia = prov.ProvinceName;
          }
        });

      });
  }
  // Obtiene nombre canton a partir del ID
  setCantonName(cantonId) {
    let cantList: any;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        cantList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId), 'CantonId');
        if (true) {
          cantList.forEach(cant => {
            if (Number(cant.CantonId) === Number(cantonId)) {
              this.nombreCanton = cant.CantonName;
            }
          });
        }
      });
  }
  // Obtiene nombre de distrito a partir de ID
  setDistrictName(distId) {
    let distList: any;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        distList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId), 'DistrictId');
        if (true) {
          distList.forEach(dist => {
            if (Number(dist.DistrictId) === Number(distId)) {
              this.nombreDistrito = dist.DistrictName;
            }
          });
        }
      });
  }
  // Obtiene nombre barrio a partit de ID
  setNeighborhoodName(neighId) {
    let neighList: any;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        neighList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId && x.DistrictId === this.districtId), 'NeighborhoodId');
        if (true) {
          neighList.forEach(neigh => {
            if (Number(neigh.NeighborhoodId) === Number(neighId)) {
              this.nombreBarrio = neigh.NeighborhoodName;
            }
          });
        }
      });
  }
  //Obtener provicia
  getProvinces() {
    this.jsonDataService.getJSONProvinces()
      .subscribe((data: any) => {
        this.provinceList = data.Provinces;
        this.businesspartnerForm.patchValue({ U_provincia: this.provinceList[0].ProvinceId });
        this.nombreProvincia = this.provinceList[0].ProvinceName;
        this.getCantons(this.provinceList[0].ProvinceId)
      });
  }
  // Obtener Canton
  getCantons(provinceId) {
    this.setProvinceName(provinceId);
    this.provinceId = provinceId;
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.cantonList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId), 'CantonId');
        if (true) {
          this.cantonId = this.cantonList[0].CantonId;
          this.businesspartnerForm.patchValue({ U_canton: this.cantonId });
          this.nombreCanton = this.cantonList[0].CantonName;
          this.getDistrics(this.cantonId);
        }
      });
  }
  // Obtener Distrito
  getDistrics(cantonId) {
    this.cantonId = cantonId;
    this.setCantonName(cantonId);
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.districtList = this.unique(data.Country.filter(x => x.ProvinceId === this.provinceId && x.CantonId === this.cantonId), 'DistrictId');
        if (typeof this.businesspartnerForm.value.U_distrito !== 'undefined') {
          this.districtId = this.districtList[0].DistrictId;
          this.nombreDistrito = this.districtList[0].DistrictName;
          this.businesspartnerForm.patchValue({ U_distrito: this.districtId });
          this.getNeighborhood(this.districtId);
        }
      });
  }
  //Obtener Barrio
  getNeighborhood(districtId) {
    this.districtId = districtId;
    this.setDistrictName(districtId);
    this.jsonDataService.getJSONCountryPlaces()
      .subscribe((data: any) => {
        this.neighborhoodList = this.unique(data.Country.filter(x => Number(x.ProvinceId) === Number(this.provinceId) && x.CantonId === this.cantonId && x.DistrictId === this.districtId), 'NeighborhoodId');
        if (typeof this.businesspartnerForm.value.U_barrio !== 'undefined') {
          this.neighborhoodId = this.neighborhoodList[0].NeighborhoodId;
          this.nombreBarrio = this.neighborhoodList[0].NeighborhoodName;
          this.businesspartnerForm.patchValue({ U_barrio: this.neighborhoodId });
        }
      });
  }
  //filtra busqueda de provicia, canton,distrito
  unique(array, propertyName) {
    return array.filter(
      (e, i) =>
        array.findIndex((a) => a[propertyName] === e[propertyName]) === i
    );
  }

  MapDataType(_dataType): string {
    let mappedDataType = 'No definido';

    switch (_dataType) {
      case 'String':
        mappedDataType = "text";
        break;
      case 'Int32':
        mappedDataType = "number";
        break;
      case 'Double':
        mappedDataType = "number";
        break;
      case 'DateTime':
        mappedDataType = "date";
        break;
    }
    return mappedDataType;
  }

  GetConfiguredUdfs(_documentAlias: string): void {
    this.blockUI.start(`Obteniendo datos, espere por favor`);
    this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.udfs = next.Udfs;
        this.udfs.filter(x => x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));
      }
      else {
        console.log(next);
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }

  GetUdfsData(_udfs: IUdf[], _category: string, _value: string): void {
    this.blockUI.start(`Obteniendo datos de udfs, espere por favor`);
    this.udfService.GetUdfsData(_udfs, _value, _category).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        next.UdfsTarget.forEach(x => {
          if (x.FieldType === 'DateTime') {
            if (x.Value !== '') (<HTMLInputElement>document.getElementById(`dynamicRender_${x.Name}`)).value = formatDate(x.Value, 'yyyy-MM-dd', 'en');
          }
          else {
            (<HTMLInputElement>document.getElementById(`dynamicRender_${x.Name}`)).value = x.Value;
          }
        });
      }
      else {
        console.log(next);
        this.alertService.errorAlert(`Error ${next.Error ? next.Error.Message : JSON.stringify(next)}`);
      }
    }, error => {
      console.log(error);
    });
  }
}
