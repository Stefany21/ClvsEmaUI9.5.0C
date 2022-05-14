import { IUdfTarget } from ".";

export interface IBusinessPartner {
    CardCode: number;
    CardName:string;
    CardType: string;
    Phone1:string;
    Cedula?: string;
    LicTradNum:string;
    E_Mail:string;
    U_TipoIdentificacion:string;
    U_provincia:string;
    U_canton:string;
    U_distrito:string;
    U_barrio:string;
    U_direccion: string;
    UdfTarget: IUdfTarget[];
}
