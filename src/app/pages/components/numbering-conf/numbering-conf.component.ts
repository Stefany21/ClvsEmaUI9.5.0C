import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';


// MODELOS
import { DocumentType } from '../../../enum/enum';
// RUTAS

// COMPONENTES

// SERVICIOS
import { AlertService, NumberingService } from './../../../services/index';
import { BaseResponse } from 'src/app/models';

// PIPES

@Component({
  selector: 'app-numbering-conf',
  templateUrl: './numbering-conf.component.html',
  styleUrls: ['./numbering-conf.component.scss']
})
export class NumberingConfComponent implements OnInit {

  numberingId: number;
  numberingForm: FormGroup;
  title: string;
  constructor(private activatedRoute: ActivatedRoute,
              private fb: FormBuilder, 
              private alertService: AlertService,
              private router: Router,
              private numService: NumberingService) {
  }

  ngOnInit() {
    console.log(0);
    this.numberingId = parseInt(this.activatedRoute.snapshot.paramMap.get('Id'));
    this.setNewFormData();
    if(this.numberingId > 0){
      this.title = 'Editar';
      this.FillNumberingToEdit(this.numberingId)
    } else {
      this.title = 'Crear';
    }
  }


  FillNumberingToEdit(Id: number){ 
    this.numService.GetNumberingById(Id).subscribe((data: BaseResponse) => {
      //this.blockUI.stop();
      console.log(data);
		  if (data.Result) {
		  } else {
		  }
		}, error => {
		});
  }

  get fCM() { return this.numberingForm.controls; }

  CreateNumbering(Id: number){
    this.numService.UpdateNumbering(this.numberingForm, Id).subscribe((data: BaseResponse) => {
      //this.blockUI.stop();
      console.log(data);
		  if (data.Result) {
		  } else {
		  }
		}, error => {
		});
  }

  EditNumbering(Id: number){
      this.numService.UpdateNumbering(this.numberingForm, Id).subscribe((data: BaseResponse) => {
        //this.blockUI.stop();
        console.log(data);
        if (data.Result) {
        } else {
        }
      }, error => {
      });
  }

  onSubmit(){
    if (this.numberingForm.invalid) {
      this.alertService.warningInfoAlert('El formulario contiene errores');
    }
    if(this.numberingId > 0){
      this.EditNumbering(this.numberingId)
    } else {
      this.CreateNumbering(0);
    }
  }

  setNewFormData() {
    this.numberingForm = this.fb.group({
      Terminal: ['', [Validators.required]],
      NextNumber: ['', Validators.required],
      Sucursal: ['', [Validators.required]],
      DocType: ['', Validators.required],
      Orbservacion: ['', [Validators.required]],
      active: ['']  
    });
  }

  cancel(){
    this.router.navigate(['/numbering']);
  }
}
