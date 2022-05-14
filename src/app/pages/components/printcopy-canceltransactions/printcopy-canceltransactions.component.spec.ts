import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintcopyCanceltransactionsComponent } from './printcopy-canceltransactions.component';

describe('PrintcopyCanceltransactionsComponent', () => {
  let component: PrintcopyCanceltransactionsComponent;
  let fixture: ComponentFixture<PrintcopyCanceltransactionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrintcopyCanceltransactionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintcopyCanceltransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
