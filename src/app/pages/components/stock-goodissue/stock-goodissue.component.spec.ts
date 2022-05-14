import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StockGoodissueComponent } from './stock-goodissue.component';

describe('StockGoodissueComponent', () => {
  let component: StockGoodissueComponent;
  let fixture: ComponentFixture<StockGoodissueComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StockGoodissueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StockGoodissueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
