import { IBaseResponse } from "./responses";

export interface IResponse<T> extends IBaseResponse {
    Data: T;
  }