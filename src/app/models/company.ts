export class Company {
  public Id: number;
  public DBName: string;
  public DBCode: string;
  public SAPConnectionId: number;
  public Active: boolean;
  public ExchangeRate: number;
  public ExchangeRateValue: number;
  public HandleItem: number;
  public BillItem: number;
  public SP_ItemInfo: string;
  public SP_InvoiceInfoPrint: string;
  public SP_WHAvailableItem: string;
  public SP_SeriesByItem: string;
  public SP_PayDocuments: string;
  public SP_CancelPayment: string;
  public V_BPS: string;
  public V_Items: string;
  public V_ExRate: string;
  public V_Taxes: string;
  public V_GetAccounts: string;
  public V_GetCards: string;
  public V_GetBanks: string;
  public V_GetSalesMan: string;
  public IsLinePriceEditable: boolean;
  public ScaleMaxWeightToTreatAsZero: number;
  public ScaleWeightToSubstract: number;
  public HasOfflineMode: boolean;
  public DecimalAmountPrice: number;
  public DecimalAmountTotalLine: number;
  public DecimalAmountTotalDocument: number;
  public PrinterConfiguration: string;
  public HasZeroBilling: boolean;
  public LineMode: boolean;

  // 001 - Almacena los margenes aceptados de las vistas
  public AcceptedMargins: string;

  constructor(id: number,
    dbName: string,
    dbCode: string,
    sapConnectionId: number,
    active: boolean,
    exchangeRate: number,
    exchangeRateValue: number,
    handleItem: number,
    billItem: number) {
    this.Id = id;
    this.DBName = dbName;
    this.DBCode = dbCode;
    this.SAPConnectionId = sapConnectionId;
    this.Active = active;
    this.ExchangeRate = exchangeRate;
    this.ExchangeRateValue = exchangeRateValue;
    this.HandleItem = handleItem;
    this.BillItem = billItem;
  }
}
export interface IViewGroup {
  Id: number;
  CodNum: number;
  NameView: string;
  isGroup: boolean;
  LineMode: boolean;
}

export interface CompanyMargins {
  Id:number;
  Code:string;
  Name:string;
  Description:string;
  Value:number;
}