import { ParameterOption } from './i-parameter-option';

export interface ReportParameter {
    Id: number;
    Name: string;
    DisplayName: string;
    Required: boolean;
    Type: number;
    GridCol: number;
    GridRow: number;
    ReportId: number;
}

export interface ReportParameter2 extends ReportParameter {
    Options?: ParameterOption[];
}