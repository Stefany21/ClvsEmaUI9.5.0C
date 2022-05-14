import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApPaymentComponent } from './ap-payment.component';

describe('ApPaymentComponent', () => {
  let component: ApPaymentComponent;
  let fixture: ComponentFixture<ApPaymentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApPaymentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
