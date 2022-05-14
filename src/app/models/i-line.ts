import { IItemModel } from './i-item';
export interface ILine extends  IItemModel {
  WareHouse: string;
  TotalLine: number;
  LineTotal?: number;
  TotalLineWithTax:number;
  LockedUnitPrice:number;
  IsExeeded:boolean; 
  IsFocus: boolean;
  TaxOnly:boolean; // Cambiar nombre se me olvido como sale en sap
} 

