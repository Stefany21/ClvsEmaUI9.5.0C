import { TestBed } from '@angular/core/testing';

import { ConnectionStatusService } from './connection-status.service';

describe('ConnectionStatusService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ConnectionStatusService = TestBed.get(ConnectionStatusService);
    expect(service).toBeTruthy();
  });
});
