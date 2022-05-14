import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SaleOrderComponent } from './components/sale-order/sale-order.component';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { StoreComponent } from './components/stores/store/store.component';
import { StoreConfComponent } from './components/stores/store-conf/store-conf.component';
import { CompaniesComponent } from './components/company/companies/companies.component';
import { CreateUpdateComponent } from './components/company/create-update/create-update.component';
import { UserComponent } from './components/users/user/user.component';
import { UserConfComponent } from './components/users/user-conf/user-conf.component';
import { UserViewComponent } from './components/users/user-view/user-view.component';
import { SeriesComponent } from './components/series/serie/series.component';
import { SerieConfComponent } from './components/series/serie-conf/serie-conf.component';
import { PermsByUserComponent } from './components/perms-by-user/perms-by-user.component';
import { ParamsComponent } from './components/params/params.component';
import { IncomingPaymentComponent } from './components/IncomingPayment/incoming-payment/incoming-payment.component';
import { CancelPaymentsComponent } from './components/cancel-payments/cancel-payments.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { QuotationComponent } from './components/quotation/quotation.component';
import { InvoiceComponent } from './components/invoice/invoice.component';
import { ApInvoiceComponent } from './components/ap-invoice/ap-invoice.component';
import { InfoItemComponent } from './components/info-item/info-item.component'
import { AuthGuard } from '../services/auth.guard';
import { InvcopyComponent } from './components/invcopy/invcopy.component';
import { VerificationEmailComponent } from './components/verification-email/verification-email.component';
import { RecoverEmailComponent } from './components/recover-email/recover-email.component';
import { BalanceComponent } from './components/balance/balance.component';
import { NumberingComponentComponent } from './components/numbering-component/numbering-component.component'
import { NumberingConfComponent } from './components/numbering-conf/numbering-conf.component'
import { BusinessPartnerComponent } from './components/business-partner/business-partner.component';
import { ItemComponent } from './components/item/item.component';
import { InventoryEntryComponent } from './components/inventory-entry/inventory-entry.component';
import { InvoiceNcComponent } from './components/invoice-nc/invoice-nc.component';
import { InventoryReturnComponent } from './components/inventory-return/inventory-return.component';
import { ApPaymentComponent } from './components/ap-payment/ap-payment.component';
import { StockGoodreceiptComponent } from './components/stock-goodreceipt/stock-goodreceipt.component';
import { StockGoodissueComponent } from './components/stock-goodissue/stock-goodissue.component';
import { PurchaseOrderComponent } from './components/purchase-order/purchase-order.component';
import { PurchaseOrderUpdateComponent } from './components/purchase-order-update/purchase-order-update.component';
import { TerminalsBalanceComponent } from './components/terminals-balance/terminals-balance.component';
import { TerminalsComponent } from './components/terminals/terminals.component';
import { UsersComponent } from './components/users/users/users.component';
import { SOandSQComponent } from './components/soand-sq/soand-sq.component';
import { OfflineComponent } from './components/offline/offline.component';
import { UdfComponent } from './components/udf/udf.component';
import { ReportsComponent } from './components/reports/reports.component';
import { PrintReportComponent } from './components/print-report/print-report.component'
import { PrintcopyCanceltransactionsComponent } from './components/printcopy-canceltransactions/printcopy-canceltransactions.component'
import { CashflowComponent } from './components/cashflow/cashflow.component';
import { DocumentsComponent } from './components/documents/documents.component';

const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'home', component: HomeComponent },
  { path: 'store', component: StoreComponent },
  { path: 'storeConf/:storeId', component: StoreConfComponent },
  { path: 'login', component: LoginComponent },
  { path: 'companies', component: CompaniesComponent },
  { path: 'companyCRUD/:companyId', component: CreateUpdateComponent },
  { path: 'AssignsUsers', component: UserComponent },
  { path: 'users', component: UsersComponent },
  { path: 'userConf/:userId', component: UserConfComponent },
  { path: 'userView/:userId', component: UserViewComponent },
  { path: 'series', component: SeriesComponent },
  { path: 'serieConf/:SerieId', component: SerieConfComponent },
  { path: 'perms', component: PermsByUserComponent },
  { path: 'params', component: ParamsComponent },
  { path: 'incomingPayment', component: IncomingPaymentComponent },
  { path: 'cancelPay', component: CancelPaymentsComponent },
  { path: 'inventory', component: InventoryComponent },
  { path: 'so/:id', component: DocumentsComponent },
  // { path: 'so', component: SaleOrderComponent },    
  { path: 'quotation/:id', component: DocumentsComponent },    
  // { path: 'quotation', component: QuotationComponent },
  { path: 'invo/:id', component: DocumentsComponent },  
  { path: 'invo', component: InvoiceComponent },
  { path: 'offline', component:  OfflineComponent },
  { path: 'creditnote', component: InvoiceNcComponent },
  { path: 'apinvo', component: ApInvoiceComponent },
  { path: 'info', component: InfoItemComponent },
  { path: 'balance', component: BalanceComponent },
  { path: 'print', component: InvcopyComponent },
  { path: 'verificationEmail/:token/:verificationType', component: VerificationEmailComponent },
  { path: 'recoverEmail/:email', component: RecoverEmailComponent },
  { path: 'numbering', component: NumberingComponentComponent },
  { path: 'numConf/:Id', component: NumberingConfComponent },
  { path: 'businessPartner', component: BusinessPartnerComponent },
  { path: 'items', component: ItemComponent },
  { path: 'returnGood', component: InventoryReturnComponent },
  { path: 'goodReceipt', component: InventoryEntryComponent },
  { path: 'outgoingPayment', component: ApPaymentComponent },
  { path: 'goodsReceiptInv', component: StockGoodreceiptComponent },
  { path: 'goodsIssueInv', component: StockGoodissueComponent },
  { path: 'purchaseOrder', component: InventoryEntryComponent },
  { path: 'purchaseorderList', component: PurchaseOrderComponent },
  { path: 'terminalBalance', component: TerminalsBalanceComponent },
  { path: 'terminals', component: TerminalsComponent },
  { path: 'SOandSQ', component: SOandSQComponent, canActivate: [AuthGuard] },
  { path: 'udfs', component: UdfComponent },
  { path: 'report/:reportId', component: PrintReportComponent },
  { path: 'manage-reports', component: ReportsComponent, canActivate: [AuthGuard] },
  { path: 'voucherCanceledPrintList', component: PrintcopyCanceltransactionsComponent },
  { path: 'cashflow', component: CashflowComponent },
  { path: 'documents', component: DocumentsComponent },
  { path: '**', pathMatch: 'full', redirectTo: '' }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
