import { IPrinter } from ".";

export interface IPrinterPerReport {
  Id: number;
  ReportName: string;
  Printer: IPrinter;
}
