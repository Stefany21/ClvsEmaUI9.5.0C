import { Component, OnInit, Input, HostListener } from '@angular/core';
import { LayoutService } from '../../../shared/services/layout.service';
import { AuthenticationService, CommonService, RptManagerService, StorageService } from '../../../services/index';
import { Globals } from 'src/app/globals';
import { first } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SOAndSQActions } from '../../../enum/enum';

@Component({
  selector: 'app-left-panel',
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.scss']
})
export class LeftPanelComponent implements OnInit {
  asidebarHeight: number;
  @Input() navLayout: string;
  @Input() defaultNavbar: string;
  @Input() toggleNavbar: string;
  @Input() toggleStatus: boolean;
  @Input() navbarEffect: string;
  @Input() deviceType: string;
  @Input() headerColorTheme: string;
  @Input() navbarColorTheme: string;
  @Input() activeNavColorTheme: string;
  @Input() currentUser: string;
  title: any;
  menuList: any;
  selected: any;
  constructor(private layoutService: LayoutService, 
    private authenticationService: AuthenticationService, 
    // public globals: Globals,
    private rptManagerService: RptManagerService,
    private router: Router,
    private storage: StorageService,
    private commonService: CommonService) {
      // this.authenticationService.currentOfflineUser.subscribe(x => { this.currentOfflineUser = x });
  }

  isActive(item) {
    return this.selected === item;
    
  }

  onItemSelect(item) {
    this.selected = (this.selected === item ? item : item);
    if (item.action) this[item.action](item);
    else if (item.url) this.router.navigateByUrl(item.url);
  }

  onSubItemSelect(item) {
    event.stopPropagation();
    this.selected = (this.selected === item ? item : item); 
  }

  @HostListener('window:resize', ['$event'])
  onResizeHeight(event: any) {
    this.asidebarHeight = window.innerHeight; 
  }



  ngOnInit() {
    this.layoutService.setAsidebarHeightCast.subscribe(setSidebarHeight => this.asidebarHeight = setSidebarHeight);

    this.title = 'Navigation';
    this.menuList = [
      {
        name: 'Home',
        icon: 'fas fa-home',
        url: '/home',
      },
      {
        name: 'Administración',
        icon: 'fas fa-cogs',
        subMenu: [
          {
            name: 'Almacenes',
            icon: 'fas fa-store-alt',
            url: '/store',
          },
          {
            name: 'Compañías',
            icon: 'far fa-building',
            url: '/companies',
          },
          {
            name: 'Usuarios',
            icon: 'fas fa-users',
            url: '/users',
          },
          {
            name: 'Asignaciones de usuario',
            icon: 'fas fa-users-cog',
            url: '/AssignsUsers',
          },
          {
            name: 'Series de numeración',
            icon: 'fas fa-list-ol',
            url: '/series',
          },
          {
            name: 'Permisos',
            icon: 'fas fa-key',
            url: '/perms',
          },
          {
            name: 'Parametrizaciones',
            icon: 'fas fa-database',
            url: '/params',
          },
          {
            name: 'Numeraciones de FE',
            icon: 'fas fa-database',
            url: '/numbering',
          },
          {
            name: 'Terminales',
            icon: 'fas fa-hdd',
            url: '/terminals',
          },
         
          {
            name: 'Campos definidos por usuario (UDFs)',
            icon: 'fas fa-underline',
            url: '/udfs',
          },
          {            
            name: 'Administrar reportes',
            icon: 'fas fa-file-pdf',
            url: '/manage-reports',
          },
        ]
      },
      {
        name: 'Datos maestros',
        icon: 'fas fa-clipboard-list',
        subMenu: [
          {
            name: 'Socios de negocio',
            icon: 'fas fa-users',
            url: '/businessPartner',
          },
          {
            name: 'Artículos',
            icon: 'fas fa-receipt',
            url: '/items',
          },
        ]
      },
      {
        name: 'Ventas',
        icon: 'fas fa-file-export',
        subMenu: [
          {
            name: 'Cotización',
            icon: 'fas fa-cart-arrow-down',
              url: ['/quotation', `${SOAndSQActions.CreateQuotation}`]    
          },  
          {
            name: 'Órdenes de venta',
            icon: 'fas fa-shopping-cart',
            url: ['/so', `${SOAndSQActions.CreateSaleOrder}`]

          },
          {
            name: 'Transformar cotizaciones y órdenes de venta',
            icon: 'fas fa-file-contract',
            url: '/SOandSQ',
          },
          {
            name: 'Factura (Contado/Crédito)',  
            icon: 'fas fa-receipt',
            url: ['/invo',`${SOAndSQActions.CreateInvoice}`]
          },
          {
            name: 'Nota de crédito',
            icon: 'fas fa-table',
            url: '/creditnote',
          },
          {
            name: 'Movimientos de dinero',
            icon: 'fas fa-exchange-alt',
            url: '/cashflow',
          },
          {
            name: 'Cierres de caja',
            icon: 'fas fa-cash-register',
            url: '/balance',
          },
          {
            name: 'Precierre de tarjetas',
            icon: 'fas fa-hand-holding-usd',
            url: '/terminalBalance',
          },
          {
            name: 'Reimpresión',
            icon: 'fas fa-print',
            url: '/print',
          }, 
          {
            name: 'Reimpresión anulación tarjetas',
            icon: 'fas fa-print',
            url: '/voucherCanceledPrintList',
          },
          
        
         
        ]
      },
      {
        name: 'Compras',  
        icon: 'fas fa-cart-arrow-down',
        subMenu: [          
          {
            name: 'Actualizar órdenes de compra',
            icon: 'fas fa-sticky-note',
            url: '/purchaseorderList',
          },
          {
            name: 'Entradas de mercancías',
            icon: 'fas fa-tasks',
            url: '/goodReceipt'
          },
          {
            name: 'Devolución de mercancías',
            icon: 'fas fa-table',
            url: '/returnGood'
          },
          {
            name: 'Factura de proveedores',
            icon: 'fas fa-receipt',
            url: '/apinvo',
          },
         
        ]
      },
      {
        name: 'Gestión de bancos',
        icon: 'fas fa-credit-card',
        subMenu: [
          {
            name: 'Pagos recibidos',
            icon: 'fas fa-check-circle',
            url: '/incomingPayment',
          },
          {
            name: 'Pagos efectuados',
            icon: 'fas fa-check-circle',
            url: '/outgoingPayment',
          },
          {
            name: 'Anular pagos',
            icon: 'fas fa-times-circle',
            url: '/cancelPay',
          },
        ]
      },
      {
        name: 'Inventarios',
        icon: 'fas fa-barcode',
        subMenu: [
          {
            name: 'Entrada de inventario',
            icon: 'fas fa-indent',
            url: '/goodsReceiptInv'
          },
          {
            name: 'Salida de inventario',
            icon: 'fas fa-outdent',
            url: '/goodsIssueInv'
          },         
          // {
          //   name: 'Inventario',
          //   icon: 'fas fa-warehouse',
          //   url: '/inventory',
          // },                 
          {
            name: 'Consulta de artículos',
            icon: 'fas fa-tag',
            url: '/info',
          },  
        ]
      },
      {
        name: 'Sincronización de documentos',
        icon: 'fas fa-sync',
        subMenu: [
          {
            name: 'Offline',
            icon: 'fas fa-plane-departure',
            url: '/offline',
          }
        ]
      },
      {
        name: 'Reportes',
        icon: 'fas fa-file-pdf',
        action: 'GetApplicationReports'     
          
      }
    ];
  }
  GetApplicationReports(option: any) {  
    if (!option.subMenu) {
      option.subMenu = [];  
      this.rptManagerService
        .GetReports()
        .pipe(first())
        .subscribe(
          (response) => {
            if (response.Result) {
              response.Reports.forEach((x) => {
                option.subMenu.push({
                  name: x.DisplayName,
                  icon: 'fas fa-print',
                  url: `report/${x.Id}`
                });
              });
            }
          },
          (err) => {
            console.log(err);
          }
        );
    }
  }   

}
   