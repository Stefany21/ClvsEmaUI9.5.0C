import { Component, OnInit } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Router } from '@angular/router';

// MODELOS
import { FeNumbering, FeNumberingResponce } from './../../../models/index';


// RUTAS

// COMPONENTES
import { NumberingService} from './../../../services/numbering.service';

// SERVICIOS

@Component({
  selector: 'app-numbering-component',
  templateUrl: './numbering-component.component.html',
  styleUrls: ['./numbering-component.component.scss']
})
export class NumberingComponentComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  title: string;
  NumberingList: FeNumbering [];
  constructor(private router: Router,
              private numberingService: NumberingService) { }

  ngOnInit() {
    this.title = 'Numeracion'
    this.GetAllNumberingList();
  }

  GetAllNumberingList(){
	  this.blockUI.start();
	  this.numberingService.GetAllFeNumbering().subscribe((data: FeNumberingResponce) => {
      this.blockUI.stop();
      console.log(data);
		  if (data.Result) {
				this.NumberingList = data.NumberingList
		  } else {
		  }
		}, error => {
      this.blockUI.stop();
      console.log(error);
		});
  }

  CreateNumbering(){
    this.router.navigate(['/numConf/' + '0']);
  }

  EditNumbering(value: number){
    this.router.navigate(['/numConf/' + value]);
  }

}
