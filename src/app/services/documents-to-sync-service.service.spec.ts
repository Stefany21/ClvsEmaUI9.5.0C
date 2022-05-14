import { TestBed } from '@angular/core/testing';

import { DocumentsToSyncServiceService } from './documents-to-sync-service.service';

describe('DocumentsToSyncServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DocumentsToSyncServiceService = TestBed.get(DocumentsToSyncServiceService);
    expect(service).toBeTruthy();
  });
});
