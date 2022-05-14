import { ReportParameter } from './i-report-parameter';

export interface Report {
    Id: number;
    Name: string;
    DisplayName: string;
    Actve: boolean;
    ReportUserId: number;
    ApplicationId: number;
}

export interface Report2 extends Report {
    Parameters: ReportParameter[];
}