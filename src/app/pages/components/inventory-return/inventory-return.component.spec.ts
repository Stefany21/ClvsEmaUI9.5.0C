import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryReturnComponent } from './inventory-return.component';

describe('InventoryReturnComponent', () => {
  let component: InventoryReturnComponent;
  let fixture: ComponentFixture<InventoryReturnComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InventoryReturnComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryReturnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
