export interface PaydeskBalance {
    Id: number;
    UserId: string;
    UserSignature: number;
    CreationDate: Date;
    Cash: number;
    Cards: number;
    CardsPinpad: number;
    Transfer: number;
    CashflowIncomme: number;
    CashflowEgress: number;
}