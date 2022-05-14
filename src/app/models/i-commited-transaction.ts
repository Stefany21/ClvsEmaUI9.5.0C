export interface ICommitedTransaction {
  Id: number;
  DocEntry: number;
  InvoiceNumber: string;
  ReferenceNumber: string;
  AuthorizationNumber: string;
  SalesAmount: string;
  TotalTransactions: number;
  HostDate: string;
  CreationDate: Date | string;
  // LLave foranea hacia la transaccion, la cual se termina de identificar con el tipo de transanccion
  ACQ: number;
  TransactionType: string;
  TerminalCode: string;
  BlurredBackground: string;
}
