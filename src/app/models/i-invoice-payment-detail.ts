import { ICard } from "./i-card";

export interface IInvoicePaymentDetail {
  DocNum: number;
  Cards: ICard[];
  CashSum: number;
  CashSumFC: number;
  TrsfrSum: number;
  TrsfrSumFC: number;
}
