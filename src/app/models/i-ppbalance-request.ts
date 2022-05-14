import { ITerminal } from ".";

export interface IPPBalanceRequest {
  // Fecha inicial del los balances
  From: Date | string;
  // Fecha final de los balances
  To: Date | string;
  // Id del terminal que se le va a consultar
  TerminalId: number;
  // Tipo de documento que se desea obtener, precierre, cierre
  DocumentType: string;
  Terminal: ITerminal;
}
