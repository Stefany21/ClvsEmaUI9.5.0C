import { async, ComponentFixture, TestBed, discardPeriodicTasks } from '@angular/core/testing';

import { CalcfunctionsComponent } from './calcfunctions.component';

describe('CalcfunctionsComponent', () => {
  let component: CalcfunctionsComponent;
  let fixture: ComponentFixture<CalcfunctionsComponent>;
  let Quantity = 0;
  let Price=0;
  let DiscPercent=20;
  let  TaxPercent = 13;
  let Result=0;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CalcfunctionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CalcfunctionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Check line total', () => {
    Quantity=2;
    Price=1500;
    DiscPercent=20;
    TaxPercent = 13;
    Result=2712.01;
    expect(component.LineTotal(Quantity,Price,DiscPercent,TaxPercent)).toEqual(Result);
    expect(((component.LineTotal(Quantity,Price,DiscPercent,TaxPercent)-Result)<0.1)).toBeTruthy();
  });
});
