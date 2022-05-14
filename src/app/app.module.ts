
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { AngularFontAwesomeModule } from 'angular-font-awesome';
import { BlockUIModule } from 'ng-block-ui';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
/* import { AppRoutingModule } from './app-routing.module'; */
import { SharedModule } from './shared/shared.module';
import { NgxElectronModule } from 'ngx-electron';
import { DragDropModule } from '@angular/cdk/drag-drop';
// MODELOS
import { Globals } from './globals';

// RUTAS
/* import { APP_ROUTING } from './app.routes'; */

// COMPONENTES
/*
 import { HomeComponent } from './pages/components/home/home.component';
import { SidemenuComponent } from './components/shared/sidemenu/sidemenu.component';


import { AlertComponent } from './components/shared/alert/alert.component';

import { QuotationComponent } from './components/quotation/quotation.component';


import { CancelPaymentsComponent } from './components/cancel-payments/cancel-payments.component';


import { InvCopyComponent } from './components/inv-copy/inv-copy.component';


import { StoreComponent } from './components/stores/store/store.component';
import { StoreConfComponent } from './components/stores/store-conf/store-conf.component';

import { VerificationEmailComponent } from './components/verification-email/verification-email.component'; */

import { HomeComponent } from './pages/components/home/home.component';

import { StoreComponent } from './pages/components/stores/store/store.component';
import { StoreConfComponent } from './pages/components/stores/store-conf/store-conf.component';
import { LoginComponent } from './pages/components/login/login.component';
import { CompaniesComponent } from './pages/components/company/companies/companies.component';
import { CreateUpdateComponent } from './pages/components/company/create-update/create-update.component';
import { UserComponent } from './pages/components/users/user/user.component';
import { UserConfComponent } from './pages/components/users/user-conf/user-conf.component';
import { UserViewComponent } from './pages/components/users/user-view/user-view.component';
import { SeriesComponent } from './pages/components/series/serie/series.component';
import { SerieConfComponent } from './pages/components/series/serie-conf/serie-conf.component';
import { PermsByUserComponent } from './pages/components/perms-by-user/perms-by-user.component';
import { ParamsComponent } from './pages/components/params/params.component';
import { IncomingPaymentComponent } from './pages/components/IncomingPayment/incoming-payment/incoming-payment.component';
import { CancelPaymentsComponent } from './pages/components/cancel-payments/cancel-payments.component';
import { InventoryComponent } from './pages/components/inventory/inventory.component';
import { SaleOrderComponent } from './pages/components/sale-order/sale-order.component';
import { QuotationComponent } from './pages/components/quotation/quotation.component';
import { InvoiceComponent } from './pages/components/invoice/invoice.component';
import { InvoiceNcComponent } from './pages/components/invoice-nc/invoice-nc.component';
import { ApInvoiceComponent} from './pages/components/ap-invoice/ap-invoice.component';
import { InfoItemComponent } from './pages/components/info-item/info-item.component';

import { AlertComponent } from './components/shared/alert/alert.component';
import { FooterComponent } from './components/shared/footer/footer.component';
import { PagesRoutingModule } from './pages/pages-routing.module';

import { PagesCoreComponent } from './pages/pages-core/pages-core.component';
import { LeftPanelComponent } from './pages/common/left-panel/left-panel.component';
import { RightPanelComponent } from './pages/common/right-panel/right-panel.component';
import { HeaderComponent } from './pages/common/header/header.component';
import { ContentSectionComponent } from './pages/content-section/content-section.component';
import { VerificationEmailComponent } from './pages/components/verification-email/verification-email.component';
import { RecoverEmailComponent } from './pages/components/recover-email/recover-email.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

import { InvcopyComponent } from './pages/components/invcopy/invcopy.component';
import { BalanceComponent } from './pages/components/balance/balance.component';

import { NumberingComponentComponent } from './pages/components/numbering-component/numbering-component.component';
import { NumberingConfComponent } from './pages/components/numbering-conf/numbering-conf.component';
import { BusinessPartnerComponent } from './pages/components/business-partner/business-partner.component';
import { ItemComponent } from './pages/components/item/item.component';
import { InventoryEntryComponent } from './pages/components/inventory-entry/inventory-entry.component';
import { InventoryReturnComponent } from './pages/components/inventory-return/inventory-return.component';
import { ApPaymentComponent } from './pages/components/ap-payment/ap-payment.component';
import { StockGoodreceiptComponent } from './pages/components/stock-goodreceipt/stock-goodreceipt.component';
import { StockGoodissueComponent } from './pages/components/stock-goodissue/stock-goodissue.component';
import { PurchaseOrderComponent} from './pages/components/purchase-order/purchase-order.component';
import { PurchaseOrderUpdateComponent } from './pages/components/purchase-order-update/purchase-order-update.component';
import { TerminalsBalanceComponent } from './pages/components/terminals-balance/terminals-balance.component';
import { TerminalsComponent } from './pages/components/terminals/terminals.component';
import { UsersComponent } from './pages/components/users/users/users.component';
import { SOandSQComponent } from './pages/components/soand-sq/soand-sq.component';
import { OfflineComponent } from './pages/components/offline/offline.component';
import { UdfComponent } from './pages/components/udf/udf.component';
import { ReportsComponent } from './pages/components/reports/reports.component';
import { PrintReportComponent } from './pages/components/print-report/print-report.component';
import { PrintcopyCanceltransactionsComponent } from './pages/components/printcopy-canceltransactions/printcopy-canceltransactions.component';
import { CashflowComponent } from './pages/components/cashflow/cashflow.component';
import { DocumentsComponent } from './pages/components/documents/documents.component';
// SERVICIOS
import { ErrorInterceptor } from './services/error.interceptor';
import { PdfViewerModule } from 'ng2-pdf-viewer';
// PIPES
import { CapitalizadoPipe } from './pipes/capitalizado.pipe';
import { PasswordPipe } from './pipes/password.pipe';

// directives

import { OnlyNumberDirective } from './directives/onlyNumber.directive';
import { CtrlKeysDirective } from './directives/ctrlKeys.directive';
import { CalcfunctionsComponent } from './calcfunctions/calcfunctions.component';
import { RequestInterceptorService } from './services/request-interceptor.service';
import { DecimalLimiterDirective } from './directives/decimal-limiter.directive';
import { PaymentComponent } from './components/payment/payment.component';




@NgModule({
  declarations: [
    AppComponent,
    SaleOrderComponent,

    CapitalizadoPipe,
    PasswordPipe,

    PermsByUserComponent,
    QuotationComponent,
    IncomingPaymentComponent,
    SerieConfComponent,
    InventoryComponent,
    CancelPaymentsComponent,
    SeriesComponent,
    RecoverEmailComponent,
    ParamsComponent,
    InvoiceComponent,
    ApInvoiceComponent,
    InfoItemComponent,
    VerificationEmailComponent,
    OnlyNumberDirective,
    CtrlKeysDirective,
    PagesCoreComponent,
    LeftPanelComponent,
    RightPanelComponent,
    HeaderComponent,
    ContentSectionComponent,
    HomeComponent,
    AlertComponent,
    FooterComponent,
    StoreComponent,
    StoreConfComponent,
    LoginComponent,
    CompaniesComponent,
    CreateUpdateComponent,
    UserComponent,
    UserConfComponent,
    UserViewComponent,
    InvcopyComponent,
    BalanceComponent,
    NumberingComponentComponent,
    NumberingConfComponent,
    CalcfunctionsComponent,
    BusinessPartnerComponent,
    ItemComponent,
    InventoryEntryComponent,
    InvoiceNcComponent,
    InventoryReturnComponent,
    ApPaymentComponent,
    StockGoodreceiptComponent,
    StockGoodissueComponent,
    PurchaseOrderComponent,
    PurchaseOrderUpdateComponent,
    TerminalsBalanceComponent,
    TerminalsComponent,
    UsersComponent,
    SOandSQComponent,
    OfflineComponent,
    UdfComponent,
    DecimalLimiterDirective, 
    ReportsComponent,
    PrintReportComponent,
    PrintcopyCanceltransactionsComponent,
    PaymentComponent,
    CashflowComponent,
    DocumentsComponent

  ],
  imports: [
    BrowserModule,
    DragDropModule,
    HttpClientModule,
    /* APP_ROUTING */
    AngularFontAwesomeModule,
    BlockUIModule.forRoot({
      delayStop: 500
    }), 
    ReactiveFormsModule,
    NgbModule,
    FormsModule,
    NgxElectronModule,
    PagesRoutingModule,
    SharedModule.forRoot(),
    NgxDatatableModule,
    PdfViewerModule
  ],
  providers: [
    Globals, { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: RequestInterceptorService, multi: true },
    { provide: LocationStrategy, useClass: HashLocationStrategy }
  ],
  entryComponents:[PaymentComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
