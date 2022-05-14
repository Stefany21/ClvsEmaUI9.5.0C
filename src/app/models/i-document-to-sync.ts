export interface IDocumentToSync {
  Id: number;
  BaseEntry: number;
  DocEntry: number | null;
  ParsedDocument: string;
  ParsedApiResponse: string;
  DocumentType: string;
  DocumentStatus: string;
  CreationDate: Date | string;
  SyncDate: Date | string | null;
  U_CLVS_POS_UniqueInvId: string;
  IsOnSyncUp: boolean;
  SyncUpAttempts: number;
}
