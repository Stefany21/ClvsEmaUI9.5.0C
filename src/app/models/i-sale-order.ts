import { IDocumentLine } from "./i-document-line";
import { DocumentModel } from "./i-invoice-document"

export interface ISaleOrder extends DocumentModel {
    //    // DocEntry: number;
    //    // DocNum: number;
    //    // CardCode: string;
    //     //CardName: string;
    //    // DocType: number;
    //    // DocDate: Date | string;
    //     Currency: string;
    //     Status: number;
    //     StatusDetails: string;
    //     DBCode: string;
    //    // NumAtCard: number;
    //     PayTerms: string;
    //     Comment: string;
    //     SlpCode: number;
    //     DocumentType: string;
    //     IdType: string;
    //     Identification: string;
    //     Email: string;
    //     Provincia: string;
    //     Canton: string;
    //     Distritos: string;
    //     Direccion: string;
    //     DocTotal: number;
    //     DocTotalFC: number;
    //     SalesMan: string;
    //     DocStatus: string;
    BaseLines: IDocumentLine[];
    SaleOrderLinesList: IDocumentLine[];
    //     U_FacturaVencida: string;
    //     U_Facturacion: string;
    //     U_ObservacionFE: string;
    //     U_NVT_Medio_Pago: string;
    //     QryGroup1?: string;
    //     U_Almacen: string;
}