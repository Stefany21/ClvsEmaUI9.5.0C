export interface IDocumentSaleLine {
    Item: string;
    ItemCode: string;    
    ItemName: string;
    UnitPrice: number;
    LastPurchasePrice : number;
    TaxCode: string;
    TaxRate: number;
    // Active: boolean;    
    Discount: number;
    Quantity: number;   
    WhsCode: string;
    WhsName: string;
    OnHand : string;
    InvntItem: string;
    LineNum: number;
    // Serie: string;  
    // SysNumber: number;
    BaseType: number;
    BaseLine: number;
    BaseEntry: number;  
    LinTot: number;
    available:number;
    TaxOnly: string;
    

}