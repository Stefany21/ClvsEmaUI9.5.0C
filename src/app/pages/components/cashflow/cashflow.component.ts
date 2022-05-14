import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BlockUI , NgBlockUI} from 'ng-block-ui';
import { first } from 'rxjs/operators';


// SERVICIOS
import { AlertService, StorageService, DailybalanceService, PermsService, AuthenticationService } from '../../../services/index';

// MODELOS
import { CashflowReasonModel, CashflowModel } from 'src/app/models/index';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cashflow',
  templateUrl: './cashflow.component.html',
  styleUrls: ['./cashflow.component.scss']
})
export class CashflowComponent implements OnInit {

  @BlockUI() blockUI: NgBlockUI;
  permisos = true;
  currentUser: any; // variable para almacenar el usuario actual  
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  cashflowForm: FormGroup;
  Reasons: CashflowReasonModel[];

  constructor(
    private formBuilder: FormBuilder,
    private cashflowService: DailybalanceService,
    private alertService: AlertService,
    private storageService: StorageService,
    private permService: PermsService,
    private authenticationService: AuthenticationService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }
 
  ngOnInit() {
    this.CheckPermits();
    this.cashflowForm = this.formBuilder.group({
      UserName: [{ value: '', disabled: true }, Validators.required],
      Type: ['1', Validators.required],
      Amount: ['', Validators.required],
      Reason: ['', Validators.required],
      Details: ['']
    });

    this.SetLoggedUserName();
    this.GetCashflowReasons();
  }

  initPage() {
    this.cashflowForm.reset({
      UserName: this.cashflowForm.get('UserName').value,
      Type: '1',
      Amount: '',
      Reason: '',
      Details: ''
    });
  }

  onClickCashflow() {
    if (!this.cashflowForm.get('UserName').value) return;

    let cashflow: CashflowModel = {
      Amount: Number(this.cashflowForm.get('Amount').value),
      CreationDate: new Date(),
      Details: this.cashflowForm.get('Details').value,
      Reason: this.cashflowForm.get('Reason').value,
      UserSignature: 0,
      Type: this.cashflowForm.get('Type').value
    };

    this.blockUI.start('Procesando...');
    this.cashflowService.PostCashflow(cashflow).subscribe(x => {
      this.blockUI.stop();
      if (x.Result) {
        this.initPage();
        this.alertService.successInfoAlert('Proceso finalizado exitosamente');
      } else {
        this.alertService.errorAlert(x.Error.Message);
      }
    }, err => {
      this.blockUI.stop();
      this.alertService.errorAlert(err);
    });
  }

  onClickInitPage() {
    this.initPage();
  }

  GetCashflowReasons() {  
    this.Reasons = [];
    this.cashflowService.GetCashflowReasons().subscribe(x => {   
      if (x.Result){        
      this.Reasons = x.Data;
    }else{ this.alertService.errorAlert(x.Error.Message);
      console.log(this.Reasons);      
    }}, err => {
      this.alertService.errorAlert(err);
    });
  }

  get formControls() {
    return this.cashflowForm.controls;
  }

  SetLoggedUserName() {
    let user: any = this.storageService.getCurrentSession();
    if (!user) return;
    user = JSON.parse(user);

    this.cashflowForm.get('UserName').setValue(user.UserName);
  }
  // Verifica si el usuario tiene permiso para acceder a la pagina
  CheckPermits() {
    this.permService.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_CashFlow') {
            this.permisos = Perm.Active;
          }
        });
      } else {
        this.permisos = false;
      }
    }, error => {
      this.permisos = false;
      this.blockUI.stop();
    });
  }
}
