export enum ViewParamsType {
    LineasdeItems = 1,
    LineadeCabecera = 2,
    LineasdeMontos = 3,
    ParametrizacionesdeSubMenú = 4,
    ParametrizacionesdeMenu = 5,
    TitulosdelasVistas = 6
}


export enum PaymentResults {
    Created = 1,
    CancelButton = 2,
    PinpadError = 3,
}


export enum ReportType {
    SaleOrder = 1,
    Quotation = 2,
    Inventory = 3,
    ReprintARInvoice = 4,
    ArInvoice = 5,
    PaidRecived = 6
}

// export enum DocumentType {
//     Factura = 1,
//     Pago = 2,
//     Cotizacion = 3,
//     orden = 4
// }


export enum DocumentType {
    OQUT = 1,
    ORDR,
    OINV,
}

export const BACErrorCodes = [
    {
        'Code': '00',
        'Description': 'APROBADA'
    },
    {
        'Code': '14',
        'Description': 'TARJETA INVALIDA'
    },
    {
        'Code': '08',
        'Description': 'ACEPTE CON IDENTIFICACION'
    },
    {
        'Code': 'RE',
        'Description': 'SE HA AGOTADO EL TIEMPO DE ESPERA'
    }
];

export enum Reports {
    Invoice = 1,
    Quotation,
    Inventory,
    Balance,
    SaleOrder,
    InvoicePP,
    InvoiceCopy

}

export enum SOAndSQActions {
    EditOrder = 1,
    EditQuotation,
    CopyToOrder,
    CopyToInvoice,
    CreateQuotation,
    CreateSaleOrder,
    CreateInvoice
}
export enum KEY_CODE {
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    Enter = 13
}
export enum PRINTERS_PER_REPORT {
    DEFAULT_PRINTER = 0,
    INVOICE,
    SALE_ORDER,
    SALE_QUOTATION,
    BALANCE,
    ACCOUNT_BALANCE
}
export enum REPORT_PARAMETER {
    Alpha = 1,
    Numeric,
    Date,
    Boolean,
    MultipleOption,
}


//Enums SAP


export enum BaseTypeLines{
    SALE_ORDER = 23,
    INVOICE = 17

}

//Enum utulizado en items y docs de ventas identificar tupo items
export enum ItemsClass{
    Service = '1',
    Material = '2'
}

//Enum utilizado para el tipo de factura del objeto linea de pago.
export enum BoRcptInvTypes {
    it_Invoice = 'it_Invoice', //13	Sales invoice transaction
    it_AllTransactions = 'it_AllTransactions', //-1	All transactions
    it_PurchaseInvoice = 'it_PurchaseInvoice', //18	Purchase transaction
    it_PurchaseCreditNote = 'it_PurchaseCreditNote', //19	Purchase credit memo transaction
    it_Receipt = 'it_Receipt', //Incoming payment transaction
    it_DownPayment = 'it_DownPayment' // 203, pago anticipado

}

//Enum utilizado en el doctype del objeto factura.
export enum BoDocumentTypes {
    dDocument_Items = 'dDocument_Items', //The transaction is based on items.
    dDocument_Service = 'dDocument_Service' //The transaction is based on services.
}

//Enum utilizado para el doctype del objeto pago.
export enum BoRcptTypes {
    rCustomer = 'rCustomer', //Payment to or from a customer.
    rAccount = 'rAccount', //Payment is not directly connected with customer or vendor.
    rSupplier = 'rSupplier' //Payment to or from a Vendor.
}


   