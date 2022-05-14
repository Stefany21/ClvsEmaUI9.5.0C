import { TestBed } from '@angular/core/testing';

import { MemoryInvoiceService } from './memory-invoice.service';

describe('MemoryInvoiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MemoryInvoiceService = TestBed.get(MemoryInvoiceService);
    expect(service).toBeTruthy();
  }); 
}); 
