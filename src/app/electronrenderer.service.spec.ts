import { TestBed } from '@angular/core/testing';

import { ElectronRendererService } from './electronrenderer.service';

describe('ElectronrendererService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ElectronRendererService = TestBed.get(ElectronRendererService);
    expect(service).toBeTruthy();
  });
});
