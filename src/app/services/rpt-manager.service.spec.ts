import { TestBed } from '@angular/core/testing';

import { RptManagerService } from './rpt-manager.service';

describe('RptManagerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RptManagerService = TestBed.get(RptManagerService);
    expect(service).toBeTruthy();
  });
});
