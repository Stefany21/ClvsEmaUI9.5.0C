import { IudfValue } from "./iudf-value";

export interface IUdf {
  TableId: string;
  Name: string;
  Description: string;
  Values: string;
  MappedValues: IudfValue[]
  IsActive: boolean;
  IsRequired: boolean;
  IsRendered: boolean;
  FieldType: string;
}
