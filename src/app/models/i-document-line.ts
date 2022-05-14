import { LinesBaseModel } from "./i-invoice-document";

export interface IDocumentLine extends LinesBaseModel {
  TaxMAGCode?: string;
  TaxMAGRate?: number;
  WhsName: string;
  Discount: number;
  ItemName: string;
  SysNumber: number;
  U_SugPrice: number;
  U_NVT_ServicioMedico: number;
  BaseType: number | null;
  BaseLine: number | null;
  BaseEntry: number | null;
  TaxCode_BCK: string;
  TaxRate_BCK: string;
  ItemGroupCode: number;
  LastPurchasePrice: number;
  InvntItem: string;
  Marca: string;
  Id: number;
  Item: string;
  LinTot: number;
  available: number;
  TaxOnly: string;
  LineStatus: string;
  LastPurCur: string;
  HasInconsistency: boolean;
  InconsistencyMessage: string;
  OnHand: number;
  ItemClass: string;
  ShouldValidateStock: boolean;
}
