export interface IContableAccounts{

    CashAccounts:IAccount[];
    CheckAccounts:IAccount[];
    TransferAccounts:IAccount[];
}


export interface IAccount{
    AccountName:string;
    Account:string;
}