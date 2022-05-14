import {IBaseResponse} from './responses';
export class Numbering {
}

export interface FeNumbering{
     Id: number;
     NextNumber: number;
     Sucursal: number;
     Terminal: number;
     DocType: number;
     Orbservacion: string;
     active : boolean;
}

export interface FeNumberingResponce extends IBaseResponse{
     NumberingList: FeNumbering [];
}

