export interface CashflowReasonModel {
    Id: number;
    Name: string;
    Type: number;
}

export interface CashflowModel {
    UserSignature: number;
    CreationDate: Date;
    Amount: number;  
    Type: string;
    Reason: string;
    Details: string;
}   