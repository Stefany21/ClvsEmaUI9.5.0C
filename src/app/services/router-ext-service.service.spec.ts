import { TestBed } from '@angular/core/testing';

import { RouterExtServiceService } from './router-ext-service.service';
 
describe('RouterExtServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RouterExtServiceService = TestBed.get(RouterExtServiceService);
    expect(service).toBeTruthy();
  });
}); 
