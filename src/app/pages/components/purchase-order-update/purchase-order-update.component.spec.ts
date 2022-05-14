import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderUpdateComponent } from './purchase-order-update.component';

describe('PurchaseOrderUpdateComponent', () => {
  let component: PurchaseOrderUpdateComponent;
  let fixture: ComponentFixture<PurchaseOrderUpdateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PurchaseOrderUpdateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PurchaseOrderUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
