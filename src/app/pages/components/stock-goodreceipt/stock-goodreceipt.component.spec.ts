import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StockGoodreceiptComponent } from './stock-goodreceipt.component';

describe('StockGoodreceiptComponent', () => {
  let component: StockGoodreceiptComponent;
  let fixture: ComponentFixture<StockGoodreceiptComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StockGoodreceiptComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StockGoodreceiptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
