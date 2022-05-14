import { Component, OnInit, Input, HostListener } from '@angular/core';
import { LayoutService } from '../../shared/services/layout.service';
import { AuthenticationService, CommonService, StorageService } from '../../services/index';
import { Router } from '@angular/router';
import { IMemoryInvoice } from 'src/app/models/i-memory-invoice';
import { MemoryInvoiceService } from 'src/app/services/memory-invoice.service';

@Component({
  selector: 'app-content-section',
  templateUrl: './content-section.component.html',
  styleUrls: ['./content-section.component.scss']
})
export class ContentSectionComponent implements OnInit {
  screenTitle = '';
  contentHeight: number;
  @Input() navLayout: string;
  @Input() defaultNavbar: string;
  @Input() toggleNavbar: string;
  @Input() toggleStatus: boolean;
  @Input() navbarEffect: string;
  @Input() deviceType: string;
  @Input() headerColorTheme: string;
  @Input() navbarColorTheme: string;
  @Input() activeNavColorTheme: string;

  currentUser: string;
  documentInformation: string;
  offlineInfo: string;

  InvoicesInMemory: IMemoryInvoice[] = [];

  ShowMemoryInvoices:boolean = true;
  docName: string = 'Factura';
  constructor(private layoutService: LayoutService, public router: Router,
    private authenticationService: AuthenticationService,
    private storageService: StorageService,
    private commonService: CommonService,
    private memoryInvoiceService: MemoryInvoiceService) {

    this.authenticationService.currentUser.subscribe(x => this.currentUser = x);

    
    this.storageService.UpdateMemoryInvoicesList.subscribe(data => {
      this.InvoicesInMemory = this.storageService.GetMemoryInvoices();

    });

    this.memoryInvoiceService.DocName.subscribe(next => {
      this.docName = next;
    });

    this.memoryInvoiceService.ShowInvoices.subscribe(next=>{
      this.ShowMemoryInvoices = next;
      
    });
    //-------

  }

  ngOnInit() {
    this.layoutService.contentHeightCast.subscribe(setCtHeight => this.contentHeight = setCtHeight);

    this.commonService.hasDocument.subscribe(next => {
      this.documentInformation = next;
      
    });

    this.commonService.offlineInformation.subscribe(next => {
      this.documentInformation = next;
      
    });

    if (this.storageService.GetDocEntry() > 0) {
      this.commonService.hasDocument.next(this.storageService.GetBreadCrum());
    }

    //001
    this.InvoicesInMemory = this.storageService.GetMemoryInvoices();
  }

  //001
  OnClickInvoice(invoice: any): void {
    if (invoice.IsSelected) return;
    this.storageService.UpdateMemoryInvoiceSelection(invoice.Id);
    this.memoryInvoiceService.loadInvoice.next(invoice);
  }

  OnclickAdd() {
    this.memoryInvoiceService.AddInvoice.next(0);
  }

  //-----------------------


  @HostListener('window:resize', ['$event'])
  onResizeHeight(event: any) {
    console.log(0);
    this.contentHeight = window.innerHeight - this.layoutService.headerHeight;
  }
}
