import { IBusinessPartner } from ".";
import { Stores } from "./stores";

export interface IItemDetail{
    LastPurPrc?: number
    ItemCode:string
    ItemName:string,
    OnHand:number // Stock
    Available:number 
    TaxRate: string;
    GoodsRecipts:GoodsRecipt[]
}

export interface GoodsRecipt{
    DocEntry:number
    DocNum:number
    DocDate:any
    DocTotal?:number // Precio de venta de la entrada
    Comment:string
    BissnesPartner:IBusinessPartner 
    Store:Stores
    Quantity:number
    Price:number
    TaxCode: string;
}