import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IMemoryInvoice } from "src/app/models/i-memory-invoice";
@Injectable({
  providedIn: 'root'
})
export class MemoryInvoiceService {
  
 
  public loadInvoice: Subject<IMemoryInvoice>;
  public AddInvoice: Subject<any>;
  public DocName: Subject<string>;
  ShowInvoices: Subject<boolean>;
  constructor() {
    this.loadInvoice = new Subject();
    this.AddInvoice = new Subject();
    this.DocName = new Subject();
    this.ShowInvoices = new Subject();
  }

  reset() {
    this.loadInvoice = new Subject();
    this.AddInvoice = new Subject();
    
  }
}
