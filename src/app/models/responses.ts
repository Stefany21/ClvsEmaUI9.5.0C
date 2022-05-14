import { IPurchaseOrder } from './ipurchase-order';
import { ICompanySap } from './i-company-sap';
import { IPPTransaction } from './i-pp-transaction';
import { IInvoicePaymentDetail } from './i-invoice-payment-detail';
import { ITerminal } from './i-terminal';
import { IPPBalance } from './i-ppbalance';
import { IDocumentToSync, IInvoiceType, IPrice, ISaleOrder } from '.';
import { Users } from './users';
import { KeyValue } from './key-value';
import { ISaleQuotation } from './i-sale-quotation';
import { ICommitedTransaction } from './i-commited-transaction';
import { ITerminalByUser } from './i-terminal-by-user';
import { IUdfCategory } from './i-udf-category';
import { IUdf } from './i-udf';
import { IUdfTarget } from './i-udf-target';
import { IItemDetail } from './i-itemDetail';
import { settings, settingsJson } from './i-settings';
import { DBObjectName } from './i-dbObjects';
import { CashflowReasonModel } from './i-cashflow';
import { DocumentModel } from './i-invoice-document';

export interface IBaseResponse {
    Result: boolean;
    Error: IErrorInfo;
}

export interface IErrorInfo {
    Code: number;
    Message: string;
}

export interface IPurchaseOrderResponse extends IBaseResponse {
    PurchaseOrder: IPurchaseOrder;
}
export interface IPurchaseOrdersResponse extends IBaseResponse {
    PurchaseOrders: IPurchaseOrder[];
}

export interface ICompanySapResponse extends IBaseResponse {
    Company: ICompanySap;
}

export interface IPPTransactionResponse extends IBaseResponse {
    PPTransaction: IPPTransaction;
    StringedResponse: string;
}
export interface IPPTransactionsResponse extends IBaseResponse {
    PPTransactions: IPPTransaction[];
}

export interface IInvoicePaymentDetailResponse extends IBaseResponse {
    InvoicePaymentDetail: IInvoicePaymentDetail;
}

export interface ITerminalResponse extends IBaseResponse {
    PPTerminal: ITerminal;
}

export interface ITerminalsResponse extends IBaseResponse {
    PPTerminals: ITerminal[];
}

export interface ICommitedTransactionsResponse extends IBaseResponse {
    CommittedTransactions: ICommitedTransaction[];
}

export interface IIPriceResponse extends IBaseResponse {
    PriceList: IPrice;
}

export interface IUserResponse extends IBaseResponse {
    User: Users;
}

export interface IUsersResponse extends IBaseResponse {
    Users: Users[];
}

export interface ReportsResponse extends IBaseResponse {
    Reports: KeyValue[];
}

export interface FileResponse extends IBaseResponse {
    File: string;
}
export interface ISaleOrdersResponse extends IBaseResponse {
    SaleOrders: ISaleOrder[];
}

export interface ISaleOrderResponse extends IBaseResponse {
    SaleOrder: ISaleOrder;
}

export interface ISaleQuotationsResponse extends IBaseResponse {
    Quotations: ISaleQuotation[];
}

export interface ISaleQuotationResponse extends IBaseResponse {
    QuotationEdit: ISaleQuotation;
}

export interface ISaleOrderResponse extends IBaseResponse {
    SaleOrderEdit: ISaleOrder;
}

export interface ITerminalsByUserResponse extends IBaseResponse {
    PPTerminalsByUser: ITerminalByUser[];
}

export interface IDocumentsToSyncReponse extends IBaseResponse {
    DocumentsToSync: IDocumentToSync[];
}

export interface IPPReportResponse extends IBaseResponse {
    SignedReport: string;
    UnsignedReport: string;
}

export interface IInvoiceTypeResponse extends IBaseResponse {
    InvoiceTypes: IInvoiceType[];
}

export interface IUdfCategoryResponse extends IBaseResponse {
  UdfCategories: IUdfCategory[];
}

export interface IUdfsByCategoryResponse extends IBaseResponse {
  Udfs: IUdf[];
  FullSize:number;
}

export interface IUdfsTargetResponse extends IBaseResponse {
  UdfsTarget: IUdfTarget[];
}


export interface ItemDetailResponse extends IBaseResponse{
    Item:IItemDetail;
}



