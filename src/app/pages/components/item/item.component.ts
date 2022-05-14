import { Component, OnInit } from '@angular/core';
import { IItemModel, IBarcode, IKValue } from 'src/app/models';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms'; 
import { TaxService, ItemService, AlertService, AuthenticationService, PermsService, StorageService } from 'src/app/services';
import { Observable, Subscription, from } from 'rxjs';
import { debounceTime, map, isEmpty, filter, distinctUntilChanged, tap } from 'rxjs/operators';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { IPrice } from 'src/app/models/i-price';
import { listenToElementOutputs } from '@angular/core/src/view/element';
import { DOCUMENT_ALIAS } from 'src/app/models/constantes';
import { UdfsService } from 'src/app/services/udfs.service';
import { IudfValue } from 'src/app/models/iudf-value';
import { formatDate } from '@angular/common';


// MODELOS
import {IUdf, IUdfTarget } from 'src/app/models/index';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { ItemsClass } from 'src/app/enum/enum';
@Component({
  selector: 'app-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.css']
})
export class ItemComponent implements OnInit {
  // Native variables
  whCode:string;
  udfs: IUdf[];
  mappedUdfs: IUdfTarget[];
  udfTargets: IKValue[];
  isUpdating: boolean; // Indica si se va a crear o actualizar un item
  isReading: boolean; // Variable para bloquear la interfaz
  isUpdatingBarcode: boolean; // Variable para ver si se actualiza el codigo de barras
  isSearchingBox: boolean; // Variable para bloquear la caja de busqueda en la edicion
  isOnUpdateTab: boolean; // Controla las tabs de navegacion
  permisos = true; // Para saber si el usuario puede acceder a la pagina
  searchInput: string; // Contiene la busqueda del usuario para el typeahead
  barcode_input: string; // Campo para editar un codigo de barras
  createTitle = 'Agregar un producto'; // Titulo de la pestana del navbar en crear
  editTitle = 'Búsqueda y edición de productos'; // Titulo de la pestana del navbar de la edicion
  closeResult = ''; // Almacena el valor de retorno de la modal al cerrarla
  barcodeModal: string;
  barcodeDescriptionModal: string;
  currentIndex: number; // Guarda el codigo de barras actual
  title = 'Items'; // Titulo de la pagina
  unitPriceBox: string;
  // Object variables
  @BlockUI() blockUI: NgBlockUI; // Usado para bloquear la interfaz de usuario
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  barcodeForm = new FormGroup({
    barcodeModal: new FormControl(''),
    barcodeDescriptionModal: new FormControl('')
  });

  ItemInfo: FormControl = new FormControl();


  itemFound = true;
  indexup: number;//Index de codigo de barras a editar
  IsonUpdate: boolean;// diferenciar codigos agregados a los que vienen de sap 
  isAllowedPriceListChange= false; // Controla el cambio de lista por parte del usuario
  isChangeTax = false; //permiso para cambiar impuesto a item 
  itemsTypeaheadList: string[] = []; // lista de la concatenacion del Código con el nombre del item
  
  searchItemCode = (text$: Observable<string>) =>
  text$.pipe(
    //debounceTime(5),
    distinctUntilChanged(),
    map(term => term.length < 1 ? []
      : this.itemsTypeaheadList.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )
  
  
  addItems(item) {
    item.preventDefault();
    const ITEM_CODE = item.item.split(' ')[0];
    this.getItem(ITEM_CODE);
    this.ItemInfo.reset();
   }      

  itemForm: FormGroup; // Es el formulario para el item
  itemsList: IItemModel[] = []; // Contiene la lista de todos los items
  taxesList: { TaxCode: string, TaxRate: number }[]; // Lista usada para guardar el codigo y valor del impuesto
  priceList: IPrice[]; // Contiene la lista de precios del sistema, debe ser obtenida por request, por ahora se va quemada para mostrar funcionalidad
  priceListOld: IPrice[]; // Respaldo de la lista editada
  priceListSystem: IPrice[]; // Lista de precios del sistema por defecto
  barcodeList: IBarcode[] = []; // Contiene la lista de los codigo de barra
  model: IItemModel; // Representa el modelo para el item
  formatter = (x: { ItemName: string }) => x.ItemName; // Usado para formatear la salida del typeahead

  constructor(private modalService: NgbModal, 
    private storageService:StorageService,
    private taxesService: TaxService, 
    private itemsService: ItemService,
     private alertService: AlertService, 
     private authenticationService: AuthenticationService, 
     private sPerm: PermsService,
     private udfService: UdfsService, private fb: FormBuilder,) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.isOnUpdateTab = true;
    this.isUpdating = true;
  }

  ngOnInit() { 

    this.itemForm = this.fb.group({    
      code: [''],
      name: [''],
      barcode: [''],
      unitPrice: [''],
      discount: [''],
      firmName: [''],
      tax: [''],
      frozen: [''],
      unitPriceSelectBox: [''],
      barcode_input: [''],
      unitPriceWithTax: [''],
      itemClass: [''],
    });

  this.isChangeTax = false;    
  this.isAllowedPriceListChange = false;
  this.IsonUpdate = false;
  this.indexup = -1;
    this.isUpdatingBarcode = false;
    this.setWarehouseInfo();
    this.udfs = [];
    this.udfTargets = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.ITEMS);
    this.checkPermits(); // Verifica si el usuario tiene permisos para acceder a la pagina
    this.itemsTypeaheadList.length = 0;
    this.blockUI.start('Obteniendo los items, espere por favor...');
    // this.itemForm.disable();
    this.isReading = true;    
    this.taxesService.GetTaxes().subscribe(response => {
      this.taxesList = response.Taxes;
    }); // Consume los impuesto y los setea a dicha lista desde el api
    this.isSearchingBox = false;
    this.itemsService.GetPriceList().subscribe(response => {
      this.priceListSystem = response.priceList;
    }); // Contiene la lista de precios que hay en el sistema
    this.currentIndex = 0;
    this.itemsService.GetItems().subscribe(response => { // Obtiene los items desde el api y mapea a objetos ya que el api solo retorna listas
      this.itemsTypeaheadList = response.ItemList.ItemCompleteName;
      for (let c = 0; c < response.ItemList.ItemCompleteName.length; c++) {
        const name = response.ItemList.ItemCompleteName[c];
        this.itemsList.push({
          ItemNameXml: '',
          PriceListId: this.priceList,
          ItemCode: response.ItemList.ItemCode[c],
          ItemName: response.ItemList.ItemCompleteName[c],
          ItemBarCode: name.substring(name.lastIndexOf('COD. ') + 1, name.lastIndexOf(' COD.')),
          Frozen: true,
          TaxCode: '',
          TaxRate: '',
          BarCode: '',
          Discount: 0,
          ForeingName: '',
          UnitPrice: 0,
          PriceList: [],
          Barcodes: [],
          UdfTarget:[]  
        });
      }   
      this.blockUI.stop();
    }, (error: any) => {
      this.blockUI.stop();
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
  }
  // Funcion para el typeahead
  onTypeaheadClick(event: { TaxCode: string, TaxRate: number }): void {
    // if (event.constructor.name.toString() === 'Object') {
    //   this.getItem();
    //   this.isUpdating = true;
    //   this.isReading = false;     
    //   this.itemForm.enable();
    // }

    // if (!event) { // Controla la limpieza del campo de busqueda
    //   this.isUpdating = false;
    //   this.isReading = true;
    //   this.itemForm.disable();
    //   this.initVariables();
    // }
  }
  // Es el filtro del typeahead
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(20),
      map(term => term === '' ? []
        : this.itemsList.filter(v =>
          v.ItemName.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0,
            10))
    )
  // Inicializa los campos del formulario para la creacion de este y obtiene el codigo del proximo item
  createItem(): void {
    this.initVariables();
    // this.itemForm.enable();
    this.isUpdating = false;
    this.isReading = false;
    this.isSearchingBox = true;
    this.itemsService.getNextCode().subscribe(response => {
      this.itemForm.patchValue({
        code: response.Item.ItemCode,
        frozen: 'Activo'
      });
    });
    this.itemsService.GetPriceList().subscribe(response => {
      this.priceListOld = response.priceList;
      this.priceList = response.priceList;
    });
    this.itemForm.patchValue({
      unitPriceSelectBox: 0,
      unitPrice: 0
    });
  }
  // Hace toggle al editar
  onTabChange(event: any): void {
    this.isUpdating = true;
    if (!(this.isOnUpdateTab = event.nextId === 'edition_item_tab')) {   
      this.itemForm.patchValue({
        code: ''
      });
      this.barcodeList = [];
      // this.itemForm.enable();
      this.isUpdating = false;
      this.isReading = false;
      this.itemsService.GetPriceList().subscribe(response => {
        if (response.Result) {
          this.priceListOld = [];
          this.priceList = []; 
          for (let c = 0; c < response.priceList.length; c++) {
            this.priceListOld.push({
              ListName: response.priceList[c].ListName,
              ListNum: response.priceList[c].ListNum,
              Price: 0,
            });
          }
          this.priceList = this.priceListOld;
        }
      });
      this.initVariables();
   
    } else {   
      if (this.model) {
        if (this.model.ItemCode !== '') {
          this.itemForm.patchValue({
            code: this.model.ItemCode
          });
          this.barcodeForm.patchValue({
            barcodeDescriptionModal: '',
            barcodeModal: ''            
          });
          this.barcodeList = this.model.Barcodes;
        }
      }
      this.initVariables();
    
    }
  }
  // Obtiene un item desde el api, el cual va a ser editado
  getItem(_itemCode: string): void {
    this.blockUI.start('Obteniendo la información del item');
    this.priceList = [];
    this.priceListOld = [];
    this.itemsService.GetBarcodesByItem(_itemCode).subscribe(response => {
      this.barcodeList = response.Item === null ? [] : response.Item.Barcodes;
      // this.model.Barcodes = response.Item === null ? [] : response.Item.Barcodes;
    });

    this.itemsService.GetItemByItemCode(_itemCode, 1).subscribe(
      response => {
        this.blockUI.stop();
        const name = response.Item.ItemName;
        const prefix = 'COD. ';
        const sufix = ' COD.';
        this.isUpdating = true;
        this.isReading = false;
        // this.itemForm.enable();          
        this.itemsService.getItemPriceList(response.Item.ItemCode).subscribe(res => {
          if (res.Result) {
            this.priceList = res.Item.PriceList;
            // this.priceListOld = res.Item.PriceList;
            res.Item.PriceList.forEach((x: IPrice) => this.priceListOld.push({
              ListName: x.ListName,
              ListNum: x.ListNum,
              Price: x.Price
            }));
            this.itemForm.patchValue({
              unitPrice: this.priceList[0].Price
            });
            this.updatePrice(null, '0');
          }
        }, error => {
          console.log(error);
          this.blockUI.stop();
          this.alertService.errorAlert(`No se pudo actualizar el item ${error}`);
        });
        this.GetUdfsData(this.udfs, DOCUMENT_ALIAS.ITEMS, `'${_itemCode}'`);
        // Inicializa el formulario con los datos del item
        this.itemForm.setValue({
          code: response.Item.ItemCode,
          name: response.Item.ItemName,
          barcode: '',
          // barcode: name.match(new RegExp(prefix + '(.*)' + sufix))[1],
          unitPrice: response.Item.UnitPrice,
          tax: response.Item.TaxCode,
          frozen: !response.Item.Frozen ? 'Activo' : 'Inactivo',
          discount: response.Item.Discount,
          firmName: response.Item.ForeingName,
          unitPriceSelectBox: 0,
          barcode_input: '',
          unitPriceWithTax: '',
          itemClass:response.Item.ItemClass          
        });
      } 
    );  
  }
  onChangeTax(event: any) {     
    if (this.taxesList.filter(x => x.TaxCode === event).length > 0) { 
      this.updatePrice(null, '0');
    }
  
  }
  // Updating price
  updatePrice(event: any, type: string): void {  
 if(!this.isUpdating){
 if(!this.itemForm.value.unitPriceSelectBox && this.itemForm.controls.unitPriceSelectBox.value != 0){
      this.alertService.infoInfoAlert('Seleccione lista de precios');   
      this.itemForm.patchValue({unitPriceWithTax: 0});
      this.itemForm.patchValue({unitPrice: 0});
      return;
    } 
   
    if(!this.itemForm.value.tax){
      this.alertService.infoInfoAlert('Seleccione impuesto');
      this.itemForm.patchValue({unitPriceWithTax: 0});
      this.itemForm.patchValue({unitPrice: 0})
     return;
    } 
 }  
        
    const UNIT_PRICE = this.itemForm.value.unitPrice;
    const TAX_CODE = this.itemForm.value.tax;
    const TAX_RATE = this.taxesList.find(x => x.TaxCode === TAX_CODE).TaxRate;       
   
    if (type === '0') {       
      // if(this.itemForm.controls.unitPrice.value){        
      const mTotal = UNIT_PRICE + UNIT_PRICE * (TAX_RATE / 100);
      this.itemForm.patchValue({  
        unitPriceWithTax: +mTotal.toFixed(2)
      }); 
      this.priceList[this.currentIndex].Price = +this.itemForm.value.unitPrice;
    
      // } 
    }
    if (type === '1') {  
      if(this.itemForm.value.unitPriceWithTax){     
      const mTotal = this.itemForm.value.unitPriceWithTax / (1 + (TAX_RATE / 100));
      this.itemForm.patchValue({
        unitPrice: +mTotal.toFixed(2)
      });
      this.priceList[this.currentIndex].Price = +this.itemForm.value.unitPrice;
    }
    }  
  }
   
  updateIndex(event: any): void {  
    this.currentIndex = +event;
    this.itemForm.patchValue({
      unitPrice: this.priceList[this.currentIndex].Price
    });   
    this.updatePrice(null,'0');
  }
  // Updating updateBarcode
  updateBarcode(event: any): void {
    for (let c = 0; c < this.barcodeList.length; c++) {
      if (this.barcodeList[c].BcdCode === event) {
        this.currentIndex = c;
        this.itemForm.patchValue({
          barcode_input: event
        });
      }
    }
  }
  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title', size: 'lg'}).result.then((result) => {
      // this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      // this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }
  // Actualiza el valor de cada barcode
  updateBarcodeList(): void {
    if (this.currentIndex !== -1) {
      this.barcodeList[this.currentIndex].BcdCode = this.itemForm.value.barcode_input;
      this.itemForm.patchValue({
        barcode: this.itemForm.value.barcode_input
      });
    } else {

    }
  }
  // Agrega el codigo de barras de manera preeliminar
  addBarcode(_index: number): void {
    if(!this.barcodeForm.value.barcodeModal){
      return;  
    } 
    // let lookup = new Set();
    // this.barcodeList = this.barcodeList.filter(obj => !lookup.has(obj['BcdCode']) && lookup.add(obj['BcdCode']));
   

    if (this.isUpdatingBarcode) {
      this.barcodeList[_index].BcdCode = this.barcodeForm.value.barcodeModal;
      this.barcodeList[_index].BcdName = this.barcodeForm.value.barcodeDescriptionModal;
      // for (let c = 0; c < this.barcodeList.length; c++) {
      //   if (this.barcodeList[c].BcdCode === this.barcodeForm.value.barcodeModal) {
      //     this.barcodeList[c].BcdName = this.barcodeForm.value.barcodeDescriptionModal;
      //   }
      // }   
    }else{
      const BarcodeRepetido = this.barcodeList.find(x => x.BcdCode == this.barcodeForm.value.barcodeModal);
      if (BarcodeRepetido) {
        this.alertService.infoInfoAlert(`Código de barras ${this.barcodeForm.value.barcodeModal} ha sido agregado`);
        return;
      }


      this.barcodeList.push({
        BcdCode: this.barcodeForm.value.barcodeModal,
        BcdName: this.barcodeForm.value.barcodeDescriptionModal,
        BcdEntry: -1,
        UomEntry: -1
      });
    }
    this.barcodeForm.patchValue({
      barcodeModal: '',
      barcodeDescriptionModal: ''
    });
 
    this.alertService.successInfoAlert(`Código ${this.isUpdatingBarcode ? 'actualizado' : ' agregado'}. Presione guardar para confirmar los cambios`);
    this.isUpdatingBarcode = false;
    this.IsonUpdate = false;
    // this.barcodeForm.value.barcodeModal.enable();
  }

//   updateBarcodeDesctiption(_index: number): void {
//     this.isUpdatingBarcode = true;
//     // this.barcodeForm.value.barcodeModal.disabled();
//     this.barcodeForm.patchValue({
//       barcodeModal: this.barcodeList[_index].BcdCode,
//       barcodeDescriptionModal: this.barcodeList[_index].BcdName
//     });
//   }
 
// =======

    updateBarcodeDesctiption(_index: number): void {
      this.isUpdatingBarcode = true;
      this.indexup = _index;     
     
      // this.barcodeForm.value.barcodeModal.disabled();
      this.barcodeForm.patchValue({
        barcodeModal: this.barcodeList[_index].BcdCode,
        barcodeDescriptionModal: this.barcodeList[_index].BcdName
      });
                        
      if(+this.barcodeList[_index].BcdEntry >= 0){
        this.IsonUpdate = true;
      }

    }


  clearBarcode(): void {
    this.IsonUpdate = false;
    this.isUpdatingBarcode = false;
    this.barcodeForm.patchValue({
      barcodeModal: '',
      barcodeDescriptionModal: ''    
    });
  }

  deleteBarcode(index: number): void {
    this.barcodeList = this.barcodeList.filter(x => x.BcdCode !== this.barcodeList[index].BcdCode);
  }
  // Controla la limpieza del campo de busqueda
  resetSelection(event: any): void {
    if (!event) { this.currentIndex = -1; }
  }
  // Permite alternar entre la creacion o edicion de un item
  saveItem(): void {
    if (this.isUpdating) { // Verifica si se va a actualizar el item
      if(!this.itemForm.controls.code.value){
        this.alertService.infoInfoAlert('Busque producto a actualizar');
        return;   
      }
    }    
  
    if (!this.itemForm.value.name) {
      this.alertService.infoInfoAlert('El campo Nombre Item es requerido');
      return;
    } 
    if (!this.itemForm.controls.unitPriceSelectBox.value && this.itemForm.controls.unitPriceSelectBox.value != 0) {
      this.alertService.infoInfoAlert('Seleccione lista de precios');  
      return;
    }  
    if (!this.itemForm.value.tax) {
      this.alertService.infoInfoAlert(`El campo Impuesto es requerido`);
      return;
    }
   
    if (this.barcodeList.length === 0 && (this.itemForm.value.itemClass == ItemsClass.Material)) {
      this.alertService.infoInfoAlert('El producto debe tener un código de barras al menos');
      return;
    }

    if (!this.UdfValidation()) {
      this.blockUI.stop();  
      return;
    }
   

    const mItem: IItemModel = {
      ItemNameXml: '',
      ItemCode: this.itemForm.value.code,
      ItemBarCode: this.itemForm.value.barcode,
      ItemName: this.itemForm.value.name,
      PriceListId: this.priceList,
      TaxCode: this.itemForm.value.tax,
      TaxRate: '',
      BarCode: this.itemForm.value.barcode,
      Frozen: !(this.itemForm.value.frozen === 'Activo'),
      Discount: this.itemForm.value.discount,
      ForeingName: this.itemForm.value.firmName,
      UnitPrice: this.itemForm.value.unitPrice,
      PriceList: this.priceList,
      Barcodes: this.barcodeList,
      UdfTarget: this.mappedUdfs
    };   
    
  
    if (this.isUpdating) { // Verifica si se va a actualizar el item    
      this.blockUI.start('Actualizando el ítem, espere por favor...');     
      this.itemsService.UpdateItem(mItem).subscribe(response => {
        this.blockUI.stop();
        if (response.Result) {
          this.alertService.successAlert('Se actualizado correctamente el ítem');
          this.itemsService.GetItems().subscribe(response => {
            for (let c = 0; c < response.ItemList.ItemCompleteName.length; c++) {
              const name = response.ItemList.ItemCompleteName[c];
              this.itemsTypeaheadList = response.ItemList.ItemCompleteName;
              this.itemsList.push({
                ItemNameXml: '',
                PriceListId: this.priceList,
                ItemCode: response.ItemList.ItemCode[c],
                ItemName: response.ItemList.ItemCompleteName[c],
                ItemBarCode: name.substring(name.lastIndexOf('COD. ') + 1, name.lastIndexOf(' COD.')),
                Frozen: true,
                TaxCode: '',
                TaxRate: '',
                BarCode: '',
                Discount: 0,
                ForeingName: '',
                UnitPrice: 0,
                PriceList: [],
                Barcodes: [],
                UdfTarget:[]
              });
            }
          }, (error: any) => {
            this.blockUI.stop();
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
          });
        } else { 
          this.alertService.errorAlert(`Error al actualizar el producto ${response.Error.Message}`);
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
    } else {     
      this.blockUI.start('Creando el ítem, espere por favor...');
      this.itemsService.CrateItem(mItem).subscribe(response => {
        this.blockUI.stop();
        if (response.Result) {
          this.alertService.successAlert('Se creado correctamente el producto');
          this.initVariables();
        } else {
          this.alertService.errorAlert(`Error al crear el producto ${response.Error.Message}`);
        }
      }, (error: any) => {
        this.blockUI.stop();
        this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
      });
    }
  }


  setWarehouseInfo():void {
    let session = this.storageService.getSession(true);
    if (session) {
      session = JSON.parse(session);
      this.whCode = session.WhCode;
    }
  }



  // Inicializa las variables a un estado inicial
  initVariables(): void {
    this.IsonUpdate = false;
    this.indexup = -1;
    this.udfs = [];
    this.GetConfiguredUdfs(DOCUMENT_ALIAS.ITEMS);
    this.itemsList = [];
    this.priceList = [];
    this.priceListOld = [];
    this.barcodeList = [];
    this.itemForm.setValue({
      code: '',
      name: '',
      barcode: '',
      unitPrice: '',
      tax: '',
      frozen: '',
      discount: '',
      firmName: '',
      unitPriceSelectBox: 0,
      barcode_input: '',
      unitPriceWithTax: '',
      itemClass:!this.isUpdating ? ItemsClass.Material : ''   
    });
    this.barcodeForm.patchValue({
      barcodeDescriptionModal: '',
      barcodeModal: ''
    });
    this.itemsService.GetItems().subscribe(response => {
      for (let c = 0; c < response.ItemList.ItemCompleteName.length; c++) {
        const name = response.ItemList.ItemCompleteName[c];
        this.itemsTypeaheadList = response.ItemList.ItemCompleteName;
        this.itemsList.push({
          ItemNameXml: '',
          PriceListId: this.priceList,
          ItemCode: response.ItemList.ItemCode[c],
          ItemName: response.ItemList.ItemCompleteName[c],
          ItemBarCode: name.substring(name.lastIndexOf('COD. ') + 1, name.lastIndexOf(' COD.')),
          Frozen: true,
          TaxCode: '',
          TaxRate: '',
          BarCode: '',
          Discount: 0,
          ForeingName: '',
          UnitPrice: 0,
          PriceList: [],
          Barcodes: [],
          UdfTarget:[]
        });
      }
    }, (error: any) => {
      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, error: ${error}`);
    });
    this.model = null;
    this.isSearchingBox = false;   
    if (this.isOnUpdateTab) {
      // this.itemForm.disable();
      this.isUpdating = true;
      this.isReading = true;
    } else {
      this.isReading = false;
      this.priceListSystem = [];
      this.itemsService.GetPriceList().subscribe(response => {
        this.priceListOld = [];
        this.priceList = [];
        for (let c = 0; c < response.priceList.length; c++) {
          this.priceListOld.push({
            ListName: response.priceList[c].ListName,
            ListNum: response.priceList[c].ListNum,
            Price: 0,
          });
 
          this.priceList.push({
            ListName: response.priceList[c].ListName,
            ListNum: response.priceList[c].ListNum,
            Price: 0,
          });
        }
      }); // Contiene la lista de precios que hay en el sistema
      this.isOnUpdateTab = false;
      // this.itemForm.enable();
    }
  }
  // Verifica si el usuario tiene permisos para acceder a la pagina
  checkPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_Inven') {
            this.permisos = Perm.Active;
          }         
          if (Perm.Name === 'Perm_ChangeTax') this.isChangeTax = Perm.Active;          
          if (Perm.Name === 'Perm_ChangePrice') this.isAllowedPriceListChange = Perm.Active;
        });   
      } else {
        this.permisos = false;
      }
    }, error => {
      this.permisos = false;
      this.blockUI.stop();
    });
  }
//#region  UDFS

  GetConfiguredUdfs(_documentAlias: string): void {

    this.blockUI.start(`Obteniendo datos, espere por favor`);
    this.udfService.GetConfiguredUdfsByCategory(_documentAlias).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.udfs = next.Udfs;

        this.udfs.filter(x=> x.Values !== '').forEach(x => x.MappedValues = (JSON.parse(x.Values) as IudfValue[]));       

        this.GetUdfDevelopment();

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
 
  GetUdfDevelopment(): void {
    this.udfService.GetUdfDevelopment().subscribe(next => {
      if (next.Result) {
        next.UdfCategories.filter(x => x.Name === DOCUMENT_ALIAS.ITEMS).forEach(x => {
          this.udfTargets.push({
            Key: x.Description,
            Value: ''
          });
        });
        this.IsUdfIntegrityValid();
      }
    });
  }

    // Verifica si los udfs a usar por desarrollo no han sido eliminados de la configuracion general
    IsUdfIntegrityValid(): boolean {
      let isValid = true;
      this.udfTargets.forEach(x => {
        if (!this.udfs.find(y => y.Name === x.Key)) {
          this.alertService.errorAlert(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
          agreguelo en la configuración`);
          isValid = false;
          return;
        }
      });
  
      return isValid;
    }

    UdfValidation(): boolean {
      try {
        if (!this.IsUdfIntegrityValid()) return false;
  
        this.UdfSetter(this.udfTargets);
  
        this.mappedUdfs = [];
        this.udfs.forEach(x => {
          let parsedValue = (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value;
  
          if (x.FieldType === 'Int32') parsedValue = parseInt(parsedValue).toString();
  
          this.mappedUdfs.push({
            Name: x.Name,
            Value: parsedValue,
            FieldType: x.FieldType
          } as IUdfTarget);
        });
  
  
        let udfName = '';
        let isValid = true;
        this.udfs.forEach(x => {
          if (x.IsRequired && (<HTMLSelectElement>document.getElementById(`dynamicRender_${x.Name}`)).value == '') {
            udfName = x.IsRendered ? x.Description : `${x.Description}, no está renderizado pero `;
            isValid = false;
            return;
          }
        });
  
        if (!isValid) {
          this.alertService.infoInfoAlert(`El campo ${udfName} es requerido`);
          return;
        }
  
        return true;
      }
      catch (error) {
        this.alertService.errorAlert(error);
        return false;
      }
    }
    UdfSetter(_udfTargets: IKValue[]): void {
      _udfTargets.forEach(x => {
        const NOT_REDERED_UDF = <HTMLSelectElement>document.getElementById(`dynamicRender_${x.Key}`);
        if (!NOT_REDERED_UDF) throw new Error(`El udf ${x.Key} es requerido para completar el documento pero está eliminado de la configuración de udfs, por favor
        agreguelo en la configuración`);
      });
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
        case 'DateTime':
          mappedDataType = "date";
          break;
      }
      return mappedDataType;
    }
    GetUdfsData(_udfs: IUdf[], _category: string, _docEntry): void {
      this.blockUI.start(`Obteniendo datos de udfs, espere por favor`);
      this.udfService.GetUdfsData(_udfs, _docEntry, _category).subscribe(next => {
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
//#endregion
}

