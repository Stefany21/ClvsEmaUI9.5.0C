import { IUdfTarget } from ".";

export interface BasePayment {
    CardCode: string;
    DocDate: string;
    CashAccount: string;
    CheckAccount: string;
    CashSum: number;
    Remarks: string;
    DocCurrency: string;
    DocRate: number;
    CounterReference: string;
    Total: number;
    TransferSum: number;
    TransferAccount: string;
    TransferDate: string;
    TransferReference: string;
    DocType: string;
    Series: number;
    DueDate: string;
    PaymentInvoices: PaymentLines[];
    //PaymentChecks: Checks[];
    PaymentCreditCards: CreditCards[];
    UDFs: IUdfTarget[];
    accountPayment: boolean;
    U_MontoRecibido: number;
}



export interface PaymentLines {
    DocEntry: number;
    InvoiceType: string;
    AppliedFC: number;
    SumApplied: number;

}


export interface Checks {
    AcctNum: string;
    BankCode: string;
    CheckAct: string;
    CheckNum: string;
    CheckSum: number;
    CountryCod: string;
    Curr: string;
    DueDate: string;
}

export interface CreditCards {
    CardValid: string;
    CreditCardNumber: string;
    CreditCard: string;
    CreditSum: number;
    FormatCode: string;
    OwnerIdNum: string;
    VoucherNum: string;
    IsManualEntry: boolean;
    U_ManualEntry: string;
    CreditAcct:string;
    
}