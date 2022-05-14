import { HttpParameterCodec } from '@angular/common/http';

export { AppConstants, ExchangeRate, HandleItem, BillItem, ReportTypeList, IdentificationType, IdentificationBusinessPartner, PayTermsEnum, TypeInvoice,CONFIG_VIEW } from './constantes';
export { Company, IViewGroup } from './company';
export { Mail } from './mail';
export { Params } from './params';
export { Perms, PermsUserEdit } from './perms';
export { Users, User } from './users';
export { Stores } from './stores';
export { UserAssigns } from './user-assigns';
export { Series, seriesType, SeriesbyUser } from './series';
export { IBaseResponse as BaseResponse } from './responses';
export { PasswordValidation } from './PasswordValidation';
export { StringModel } from './Variables';
export { FeNumbering, FeNumberingResponce } from './numbering';
export { KeyValue } from './key-value';
export { IItemModel } from './i-item';
export { IBarcode } from './i-item';
export { IPrice } from './i-price';
export { IGoodReceipt } from './i-good-receipt';
export { IBusinessPartner } from './i-business-partner';
export { IPurchaseOrder } from './ipurchase-order';
export { ICompanySap } from './i-company-sap';
export { IPPTransaction } from './i-pp-transaction';
export { IToken } from './i-token';
export { IPayment } from './i-payment';
export { ICard } from './i-card';
export { IPrinter } from './i-printer';
export { ITerminal } from './i-terminal';
export { IPPBalance } from './i-ppbalance';
export { ISaleOrder } from './i-sale-order';
export { ISaleQuotation } from './i-sale-quotation';
export { ISaleOrderSearch } from './i-sale-order-search';
export { IPrinterPerReport } from './i-printer-per-report';
export { IOverdueBalance } from './i-overdue-balance';
export { IPaymentMethod } from './i-payment-method';
export { IDocumentLine } from './i-document-line';
export { ICommitedTransaction } from './i-commited-transaction';
export { IPPCancel } from './i-ppcancel';
export { ITerminalByUser } from './i-terminal-by-user';
export { IDocumentToSync } from './i-document-to-sync';
export { IInvoiceType } from './i-invoice-type';
export { IUdfCategory } from './i-udf-category';
export { IUdf } from './i-udf';
export { IUdfTarget} from './i-udf-target';
export { IKValue } from './i-kvalue';
export { PaydeskBalance } from './i-paydesk-balance';
export { CashflowReasonModel, CashflowModel } from './i-cashflow';
export { IQuotDocument,ISaleDocument,IInvoiceDocument } from './i-document';
export { IDocumentSaleLine } from './i-document-sale-line';
//#region Report Manager
export { ParameterOption } from './rpt-manager/i-parameter-option';
export { Report, Report2 } from './rpt-manager/i-report';
export { ReportParameter, ReportParameter2 } from './rpt-manager/i-report-parameter';
export { Parameter } from './rpt-manager/i-parameter';
//#endregion
//#region Settings
export { settings, settingsJson}  from  './i-settings';
//#endregion  
export class CustomURLEncoder implements HttpParameterCodec {
    encodeKey(key: string): string {
        return encodeURIComponent(key); 
    }
    encodeValue(key: string): string { 
        return encodeURIComponent(key); 
    }
    decodeKey(key: string): string { 
        return decodeURIComponent(key); 
     }
    decodeValue(key: string) {
        return decodeURIComponent(key); 
     }
}