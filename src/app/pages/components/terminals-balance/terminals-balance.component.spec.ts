import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminalsBalanceComponent } from './terminals-balance.component';

describe('TerminalsBalanceComponent', () => {
  let component: TerminalsBalanceComponent;
  let fixture: ComponentFixture<TerminalsBalanceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TerminalsBalanceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TerminalsBalanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
