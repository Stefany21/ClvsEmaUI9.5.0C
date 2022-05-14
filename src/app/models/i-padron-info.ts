export interface IRegimen {
    codigo: number;
    descripcion: string;
}

export interface ISituacion {
    moroso: string;
    omiso: string;
    estado: string;
    administracionTributaria: string;
}

export interface IActividades {
    estado: string;
    tipo: string;
    codigo: string;
    descripcion: string;
}

export interface IPadronInfo {
    nombre: string;
    tipoIdentificacion: string;
    regimen: IRegimen;
    situacion: ISituacion;
    actividades: IActividades[];
}