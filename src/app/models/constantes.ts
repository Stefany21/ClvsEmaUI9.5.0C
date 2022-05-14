

export class AppConstants {
    static GetError(_error: any) {
        let joined_error;

        if (_error.error && _error.error.errorInfo) {
            joined_error = _error.error.errorInfo.Message;

        } else if (_error.error && _error.error.error_description) {
            joined_error = _error.error.error_description;

        } else if (_error.error && _error.error.Message) {
            joined_error = _error.error.Message;

        } else if (_error.message) {
            joined_error = _error.message;

        } else if (_error.errorInfo && _error.errorInfo.Message) {
            joined_error = _error.errorInfo.Message;

        } else if (_error.error) {
            joined_error = _error.error;

        } else {
            joined_error = _error;
        }

        if (typeof joined_error === 'string') return joined_error;

        return JSON.stringify(_error);
    }

    public static get padronInfoURl(): string { return 'https://api.hacienda.go.cr/fe/' }



    // PRUEBAS DEBUG    
    public static get modalAnswer(): string { return 'https://npstest.clavisco.com/#/'; }
    // PRUEBAS TEST
    public static get apiAnswer(): string { return 'https://npsapitest.clavisco.com/'; }

    // public static get RPTMANAGER_URL(): string { return 'http://localhost:54264/'; }
    public static get RPTMANAGER_URL(): string { return 'https://rptmanagertest.clavisco.com/'; }
    //    public static get RPTMANAGER_URL(): string { return 'https://rptmanager.clavisco.com/'; }             

    public static comoesta: boolean = true;

    public static get sOnline(): string {
        this.comoesta = true;
        return 'a';
    }

    public static get sOffline(): string {
        this.comoesta = false;
        return "a";
    }

    public static get apiUrl(): string { return navigator.onLine ? this.getOnLine() : this.getOffLine(); }

    public static get onlineUrl(): string { return this.getOnLine(); }

    public static get offlineUrl(): string { return this.getOffLine(); }

    public static get TokenPadron(): string { return this.getTokenPadron(); }

    static getOffLine(): string {
        return 'http://localhost:42222/';

    }

    static getOnLine(): string { return this.GetTarget('ct'); }     
 

    static getTokenPadron(): string { return 'https://padronapi.clavisco.com/'; }

    public static get AppKey(): string { return 'AppSuper'; }

    static GetTarget(_target: string): string {
        let url = 'https://UnreachableSwitch.clavisco.com';
        switch (_target) {
            case 'lh':
                url = 'http://localhost:56666/';
                break;
            case 'su':
                url = 'https://superltposapitest.clavisco.com/';
                break;
            case 'so':
                url = 'https://superltposapi.clavisco.com/';
                break;
            case 'au':
                url = 'https://emaaromasapitest.clavisco.com/';
                break;
            case 'ao':
                url = 'https://emaaromasapi.clavisco.com/';
                break;
            case 'ru':
                url = 'https://emarudeprintapitest.clavisco.com/';
                break;
            case 'ro':
                url = 'https://emarpapi.clavisco.com';
                break;
            case 'cd':
                url = 'https://emacrmapidev.clavisco.com/';
                break;
            case 'du':
                url = 'https://disumedapi10test.clavisco.com/';
                break;
            case 'do':
                url = 'https://disumedposapi.clavisco.com/';
                break;
            case 'ed':
                url = 'https://emademoapi.clavisco.com/';
                break;
            case 'cd':
                url = 'https://emacrmapidev.clavisco.com/';
                break;
            case 'ct':
                url = 'https://emacrmapitest.clavisco.com/';  
                break;
            case 'co':
                url = 'https://emacrmapi.clavisco.com/';
                break;
        }
        return url;
    }
    /*   
    http://localhost:42222/

   'https://disumedapi10test.clavisco.com/'

    https://superltposapitest.clavisco.com/

    https://disumedposapitest.clavisco.com/

    https://emaaromasapitest.clavisco.com/
    https://emaaromasapi.clavisco.com/

    https://emarudeprintapitest.clavisco.com/
    https://emarpapi.clavisco.com

    https://emademoapi.clavisco.com/
    */
}

export const ExchangeRate = [
    {
        'Id': '1',
        'Name': 'SAP',
    },
    {
        'Id': '2',
        'Name': 'DB',
    }
];

export const HandleItem = [
    {
        'Id': '1',
        'Name': 'Código',
    },
    {
        'Id': '2',
        'Name': 'Barras',
    }
];

export const BillItem = [
    {
        'Id': '1',
        'Name': 'Código',
    },
    {
        'Id': '2',
        'Name': 'Series',
    }
];

export const ReportTypeList = [
    {
        'Id': '5',
        'Name': 'Factura',
    },
    {
        'Id': '1',
        'Name': 'Órden de Venta',
    },
    {
        'Id': '2',
        'Name': 'Cotizacion',
    }

]

export const IdentificationType = [
    {
        'Id': '00',
        'Name': '',
    },
    {
        'Id': '01',
        'Name': 'Cedula Física',
    },
    {
        'Id': '02',
        'Name': 'Cedula Jurídica',
    },
    {
        'Id': '03',
        'Name': 'DIMEX',
    },
    {
        'Id': '04',
        'Name': 'NITE',
    }

];

export const IdentificationBusinessPartner = [
    {
        'Id': '1',
        'Name': 'Cliente',
        'SapType': 'C',

    },
    {
        'Id': '2',
        'Name': 'Proveedor',
        'SapType': 'S',
    },
];

export enum PayTermsEnum {
    A30Dias = 1,
    Contado = 2
}

export enum UDF_CATEGORIES {
    OINV = 1,
    ORCT,
    ORDR,
    OQUT,
    OCRD
}


export enum DOCUMENT_TYPES {
    OINV = 1,
    ORCT,
    ORDR,
    OQUT,
    OCRD
}

export enum RequestDocumentType { // Usado para definir el tipo de peticion que se hara al banco. Por ejemplo cierre de tarjetas o precierre de tarjetas
    BALANCE,
    PRE_BALANCE
}

export enum CurrencyPP {
    LOCAL_CURRENCY = 1,
    USD = 2
}

export enum DocumentStatus {
    ERROR_ON_SYNCUP = 'ERROR',
    PENDING_TO_SYNUP = 'PEDIENTE_SINCRONIZAR',
    SYNCHRONIZED = 'SINCRONIZADO'
}

export const TypeInvoice = [
    {

        'Name': '',
        'Description': ''
    },
    {

        'Name': 'FE',
        'Description': 'Factura Electrónica'
    },
    {

        'Name': 'TE',
        'Description': 'Tiquete Electrónico'
    }
];

export enum DOCUMENT_ALIAS {
    INVOICE = 'OINV',
    SALE_ORDER = 'ORDR',
    SALE_QUOTATION = 'OQUT',
    INC_PAYMENT_CARDS = 'RCT3',
    BUSINESS_PARTNER = 'OCRD',
    ITEMS = 'OITM',
    GOODSRECEIPT = 'OIGN',
    GOODSISSUE = 'OIGE',
    GOODSRECEIPTPO = 'OPDN',
    GOODSRETURN = 'ORPD',
    PURCHASEORDER = 'OPOR',
    APINVOICE = 'OPCH',
    CREDITMEMO = 'ORIN',
    OUTGOINGPAYMENTS = 'OVPM',
    INCOMINGPAYMENTS = 'ORCT'
}

export enum CONFIG_VIEW {
    OIGN = 1,
    Invoice = 2,
    Payment = 4,
    BussinesPartner = 5,
    OFFLINE_PP = 6,
}

