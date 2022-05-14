import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SOandSQComponent } from './soand-sq.component';

describe('SOandSQComponent', () => {
  let component: SOandSQComponent;
  let fixture: ComponentFixture<SOandSQComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SOandSQComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SOandSQComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
