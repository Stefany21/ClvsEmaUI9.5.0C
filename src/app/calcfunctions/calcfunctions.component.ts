import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-calcfunctions',
  templateUrl: './calcfunctions.component.html',
  styleUrls: ['./calcfunctions.component.scss']
})
export class CalcfunctionsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  LineTotal(Quantity,Price,Discount,TaxPercent){
    let Result=((Quantity * Price) * ((100 - Discount)/100))*((TaxPercent/100)+1);
    console.log(Result)
    Result=parseFloat(Result.toFixed(2));
    return Result;
  }

}
