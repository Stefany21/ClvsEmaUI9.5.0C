 
import { IUdf, IUdfTarget } from ".";

export interface IMemoryInvoice {
    Id: number;
    IsSelected: boolean;
    InvoiceNumber: string;
    InvForm: any;
    FEForm: any;
    UdfList: IUdf[];
    ItemsList: any[];
    mappedUdfs: IUdfTarget[];
    IsEmpty:boolean;
} 