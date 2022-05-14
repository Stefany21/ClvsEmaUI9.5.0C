import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApInvoiceComponent } from './ap-invoice.component';

describe('ApInvoiceComponent', () => {
  let component: ApInvoiceComponent;
  let fixture: ComponentFixture<ApInvoiceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApInvoiceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApInvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
