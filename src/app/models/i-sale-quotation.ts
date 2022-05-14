import { IDocumentLine } from "./i-document-line";
import { DocumentModel } from "./i-invoice-document";



export interface ISaleQuotation extends DocumentModel  {
    DocTotal: number;
    DocTotalFC: number;
   // SalesMan: string;
    //this system internal invoice number
   // DocEntry: number;
    //this is the invoice number for the final user
   // DocNum: number;
    //this is the code of the customer
   // CardCode: string;
    //this is the name of the customer
    //CardName: string;
    //They type of document, 13 is the DocType for ARInvoice, 14 for A/R Credit Memo,
    //DocType: number;
    //The date for the invoice with format 'YYYYMMDD'
   // DocDate: Date | string;
    //This is the currency of the document
   // Currency: string;
    TaxMAGCode: string;
    TaxMAGRate: string;
    //Estado del documento ( ... )
    //Status: number;
    //Registra la accion ocurrida con el documento al crerlo en SAP
    //StatusDetails: string;
    //Registra la compannia en la que se registro el documento
    //DBCode: string;
    //NumAtCard: number;
    // terminos de pagos
    //PayTerms: string;
    // Comentarios
    //Comment: string;
    //codigo de vendedor
    //SlpCode: number;
    // tipo de documento
    //DocumentType: string;
    //campos para facturacion electronica
    //IdType: string;
    
    //Identification: string;
    //Email: string;
    //Provincia: string;
    //Canton: string;
    //Distritos: string;
   // Direccion: string;
   // DocStatus: string; // Variable auxiliar
    QuotationsLinesList: IDocumentLine[];
}