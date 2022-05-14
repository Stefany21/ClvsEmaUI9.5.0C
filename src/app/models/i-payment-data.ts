import { FormGroup } from "@angular/forms";
import { IPPTransaction } from ".";


export interface IInvoiceInfoForPayment {
    CardCode: string;
    Currency: string;
    SlpCode: string;
    uniqueInvCode: string;
    Comment: string;
    accountPayment: boolean;

}   

export interface IOnPaymentFail {


    pPTransaction: IPPTransaction;
    pinPadCards: IPPTransaction[];

    cashForm: FormGroup;
    transferForm: FormGroup;
    checkForm: FormGroup;
    creditCardForm: FormGroup;

    TotalCash: number;
    TotalCards: number;
    TotalCheck: number;
    TotalTransfer: number;
    ReceivedG: number;
    DifferenceG: number;
    ChangeG: number;

}