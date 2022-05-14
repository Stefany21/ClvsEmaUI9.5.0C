import { IDocumentLine, IInvoiceDocument, IPPTransaction, IUdfTarget } from ".";
import { BasePayment } from "./i-payment-document";


export interface DocumentModel {
    DocEntry: number;
    DocNum: number;
    BaseEntry: number;
    CardCode: string;
    CardName: string;
    DocType: string;
    DocDate: string;
    DocDueDate: string;
    DocCurrency: string;
    NumAtCard: string;
    PaymentGroupCode: string;
    Comments: string;
    SalesPersonCode: number;
    U_TipoDocE: string;
    U_TipoIdentificacion: string;
    U_NumIdentFE: string;
    U_CorreoFE: string;
    U_ObservacionFE: string;
    U_Online: string;
    Series: number;
    DocumentLines: IDocumentLine[];
    UdfTarget: IUdfTarget[];
    U_CLVS_POS_UniqueInvId: string;
    U_ListNum: number;
}


export interface LinesBaseModel {
    LineNum: number | null;
    ItemCode: string;
    UnitPrice: number;
    Quantity: number;
    TaxCode: string;
    TaxRate: number;
    WarehouseCode: string;
    DiscountPercent: number;
    Serie: string;
    TaxOnly: string;
    BaseType: number;
    BaseEntry: number;
    BaseLine: number;
}


export interface CreateInvoice {
    Invoice: IInvoiceDocument;
    Payment: BasePayment;
    PPTransaction:IPPTransaction;

}
