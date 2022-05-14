import { SeriesbyUser } from './series';

export class UserAssigns {
    // modelo para la vista de ususarios
    public Id: number;
    public UserId: string;
    public SuperUser: boolean;
    public SAPUser: string;
    public SAPPass: string;
    public SlpCode: number;
    public StoreId: number;
    public minDiscount: number;
    public CenterCost: string;
    public Active: boolean;
    public PriceListDef: number;
    public CompanyId: number;
    public UserName: string;
    public CompanyName: string;
    public StoreName: string;
    public Series: SeriesbyUser [] = [];
}
