import { ILine } from './i-line';
import { IBusinessPartner } from './i-business-partner';
export interface IPurchaseOrder {
    DocNum: number;
    Lines: ILine[];
    BusinessPartner: IBusinessPartner;
    Comments: string;
    NumAtCard: string;
    DocDueDate: Date;
    DocDate: Date;
    DocTotal: number;
    PriceList: number;
}
