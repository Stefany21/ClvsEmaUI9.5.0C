import { TestBed } from '@angular/core/testing';

import { GoodsReciptService } from './goods-recipt.service';

describe('GoodsReciptService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GoodsReciptService = TestBed.get(GoodsReciptService);
    expect(service).toBeTruthy();
  });
});
