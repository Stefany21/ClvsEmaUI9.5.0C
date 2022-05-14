import { Component, OnInit } from '@angular/core';
import { RightPanelComponent } from '../../../pages/common/right-panel/right-panel.component';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {

  annio: number;

  constructor() {
     // obtiene al anno para el footer
     this.annio = new Date().getFullYear();
   }

  ngOnInit() {
  }

}
