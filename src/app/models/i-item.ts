import { IPrice } from './i-price';
import { IUdfTarget } from './i-udf-target';

export interface IItemModel {
  ItemNameXml: string;
  ItemCode: string;
  ItemName: string;
  ItemBarCode: string;
  TaxCode: string;
  TaxRate: string;
  Tax_Rate?: number;
  PriceListId: any[];
  BarCode: string;
  Discount: number;
  UnitPrice: number;
  Quantity?: number;
  ForeingName: string;
  Frozen: boolean;
  LastPurchasePrice?: number,
  LastPurchaseDate? : number,
  PriceList: IPrice[];
  Barcodes: IBarcode[];
  UdfTarget: IUdfTarget[];
}

export interface IBarcode {
  BcdEntry: number;
  BcdCode: string;
  BcdName: string;
  UomEntry: number;
}