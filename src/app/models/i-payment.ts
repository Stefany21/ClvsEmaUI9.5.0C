export interface IPayment {
  CardCode: string;
  CardName: string;
  DocCurr: string;
  DocDate: Date;
  DocEntry: number;
  DocNum: number;
  DocNumPago: number;
  DocTotal: number;
  DocTotalFC: number;
  Selected: boolean;
  Status: string;
}
