import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryEntryComponent } from './inventory-entry.component';

describe('InventoryEntryComponent', () => {
  let component: InventoryEntryComponent;
  let fixture: ComponentFixture<InventoryEntryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InventoryEntryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
