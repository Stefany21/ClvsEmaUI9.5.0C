export class Series {

        public Id: number;
        public Name: string;
        public DocType: number;
        public Numbering: Number;
        public Serie: number;
        public CompanyId: number;
        public Active: boolean;
        public typeName: string;
        public CompanyName: string;
        public Type: number;
}

// tslint:disable-next-line:class-name
export class seriesType {
        public Value: number;
        public Name: string;
}

export class SeriesbyUser {
        public Id: number;
        public SerieId: number;
        public UsrMappId: number;
        public Name: string;
        public type: number;
}
