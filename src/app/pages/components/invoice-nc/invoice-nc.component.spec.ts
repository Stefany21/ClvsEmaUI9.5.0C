import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceNcComponent } from './invoice-nc.component';

describe('InvoiceNcComponent', () => {
  let component: InvoiceNcComponent;
  let fixture: ComponentFixture<InvoiceNcComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InvoiceNcComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceNcComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
