import { TestBed } from '@angular/core/testing';

import { DailybalanceService } from './dailybalance.service';

describe('DailybalanceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DailybalanceService = TestBed.get(DailybalanceService);
    expect(service).toBeTruthy();
  });
});
