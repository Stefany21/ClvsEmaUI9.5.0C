import { TestBed } from '@angular/core/testing';

import { UdfsService } from './udfs.service';

describe('UdfsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: UdfsService = TestBed.get(UdfsService);
    expect(service).toBeTruthy();
  });
});
