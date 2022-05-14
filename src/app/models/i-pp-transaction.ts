import { ITerminal } from ".";
import { IPPBalanceRequest } from "./i-ppbalance-request";

export interface IPPTransaction {
  Id: number;
  DocEntry: number;
  CardName: string;
  CardNumber: string;
  AuthorizationNumber: string;
  EntryMode: string;
  ExpirationDate: string;
  ReferenceNumber: string;
  ResponseCode: string;
  InvoiceNumber: string;
  InvoiceDocument: string;
  SystemTrace: string;
  TransactionId: string;
  CharchedStatus: string;
  ChargedResponse: string;
  CanceledStatus: string;
  CanceledResponse: string;
  ReversedStatus: string;
  ReversedResponse: string;
  Currency: string;
  Amount: number | string;
  IsOnBalance: boolean;
  CreationDate: Date | string;
  LastUpDate: Date | string | null;
  QuickPayAmount: number;
  StringedResponse: string;
  TerminalId?: number;
  SerializedObject: string;
  Terminal: ITerminal
}

export interface PPBalance {
  id: number;
  xMLDocumentResponse: string;
  responseCode: string;
  responseCodeDescription: string;
  acqNumber: string;
  cardBrand: string;
  hotTime: string;
  hostDate: string;
  refundsAmount: string;
  refundsTransactions: string;
  salesTransactions: string;
  salesAmount: string;
  salesTax: string;
  salesTip: string;
  creationDate: string;
  modificationDate: string;
  transactionType: string;
  terminalCode: string;
}

export interface CommittedTransaction {
  id: number;
  docEntry: number;
  invoiceNumber: string;
  referenceNumber: string;
  authorizationNumber: string;
  salesAmount: string;
  hostDate: string;
  creationDate: string;
  aCQ: number;
  transactionType: string;
  terminalCode: string;
}

export interface IACQTransaction {
  Terminal: ITerminal;
  OverACQ: PPBalance;
  BalanceRequest: IPPBalanceRequest;
}