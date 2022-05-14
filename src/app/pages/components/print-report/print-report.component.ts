import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportParameter, Parameter } from 'src/app/models';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RptManagerService, AlertService, CommonService, PermsService, AuthenticationService } from 'src/app/services';
import { filter, first } from 'rxjs/operators';
import { Email } from 'src/app/models/rpt-manager/i-email';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

@Component({
  selector: 'app-print-report',
  templateUrl: './print-report.component.html',
  styleUrls: ['./print-report.component.scss']
})
export class PrintReportComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  reportId: number;
  routerEventsSubs: Subscription;

  parameters: ReportParameter[];
  parameterSubgroup1: ReportParameter[];
  parameterSubgroup2: ReportParameter[];
  parameterSubgroup3: ReportParameter[];
  parameterSubgroup4: ReportParameter[];
  paramaterListGroup: ReportParameter[][];

  parametersForm: FormGroup;
  emailForm: FormGroup;
  emailRecipients: string[];
  reportKeys: Parameter[];

  permisos: boolean = true;
  currentUser: any; // variable para almacenar el usuario actual  
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private rptManagerService: RptManagerService,
    private alertService: AlertService,
    private commonService: CommonService,
    private permService: PermsService,
    private authenticationService: AuthenticationService) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit(): void {
    this.CheckPermits();
    this.emailForm = this.formBuilder.group({
      Subject: ['', Validators.required],
      Body: ['', Validators.required],
      Recipient: [''],
    });
    this.initApp();
    this.routerEventsSubs = this.router.events
      .pipe(filter((event$) => event$ instanceof NavigationEnd))
      .subscribe(() => this.initApp());
  }

  ngOnDestroy() {
    this.routerEventsSubs.unsubscribe();
  }

  resetEmailForm() {
    this.emailForm.reset({
      Subject: '',
      Body: '',
      Recipient: '',
    });
  }

  resetParameterForm() {
    for (const control in this.parametersForm.controls) {
      this.parametersForm.get(control).reset();
    }
  }

  initApp() {
    this.reportId = Number(this.route.snapshot.paramMap.get('reportId'));
    this.parametersForm = this.formBuilder.group({});
    this.resetEmailForm();
    this.emailRecipients = [];
    this.parameters = [];
    this.reportKeys = [];
    this.parameterSubgroup1 = [];
    this.parameterSubgroup2 = [];
    this.parameterSubgroup3 = [];
    this.parameterSubgroup4 = [];
    this.paramaterListGroup = [];
    this.paramaterListGroup.push(
      this.parameterSubgroup1,
      this.parameterSubgroup2,
      this.parameterSubgroup3,
      this.parameterSubgroup4
    );

    this.getParameters();
  }

  getParameters() {
    this.blockUI.start('Procesando...');
    this.rptManagerService
      .GetParameters(this.reportId)
      .pipe(first())
      .subscribe(
        (response) => {
          this.blockUI.stop();

          if (response.Result) {
            this.parameters = response.Parameters;

            response.Parameters.forEach((x) => {
              switch (x.GridCol) {
                case 0:
                  this.parameterSubgroup1.push(x);
                  break;
                case 1:
                  this.parameterSubgroup2.push(x);
                  break;
                case 2:
                  this.parameterSubgroup3.push(x);
                  break;
                case 3:
                  this.parameterSubgroup4.push(x);
                  break;
              }
            });

            this.setFormControls();
          } else {
            this.alertService.errorAlert(
              response.ErrorInfo.Message
            );
          }
        },
        (err) => {
          this.blockUI.stop();
          this.alertService.errorAlert(err);
        }
      );
  }

  addRecipient(recipient: string) {
    if (!recipient) return;
    if (!this.emailRecipients.some((x) => x === recipient))
      this.emailRecipients.push(recipient);
    this.emailForm.get('Recipient').reset();
  }

  onClickRemoveRecipient(index: number) {
    this.emailRecipients.splice(index, 1);
  }

  onClickPrintReport() {
    this.blockUI.start('Procesando...');

    const parameters: Parameter[] = this.getParametersForReportPrint();
    this.rptManagerService
      .PrintReport(parameters, this.reportId)
      .pipe(first())
      .subscribe(
        (response) => {
          this.blockUI.stop();
          if (response.Result) {

            this.commonService.downloadFile(
              response.Print,
              'Reporte',
              'application/pdf',
              'pdf'
            );
          } else {
            this.alertService.errorAlert(
              response.ErrorInfo.Message
            );
          }
        },
        (err) => {
          this.blockUI.stop();
          console.log(err);
          this.alertService.errorAlert(err);
        }
      );
  }

  onClickSendEmail() {
    this.blockUI.start();
    let email: Email = {
      Body: this.emailForm.get('Body').value,
      Recipients: this.emailRecipients,
      Subject: this.emailForm.get('Subject').value,
      Parameters: this.getParametersForReportPrint(),
    };

    this.rptManagerService
      .SendEmail(email, this.reportId)
      .pipe(first())
      .subscribe(
        (response) => {
          this.blockUI.stop();

          if (response.Result) {
            this.alertService.successInfoAlert(
              'Correo enviado exitosamente'
            );

            this.resetEmailForm();
            this.emailRecipients = [];
            this.dismissModal(true);
          } else {
            this.alertService.errorAlert(
              response.ErrorInfo.Message
            );
          }
        },
        (err) => {
          this.blockUI.stop();
          this.alertService.errorAlert(err);
        }
      );
  }

  getParametersForReportPrint() {
    let parameters: Parameter[] = [];
    if (this.parameters) {
      this.parameters.forEach((x) => {
        let parameter: Parameter = {
          Key: x.Name,
          Type: x.Type,
          Value: this.parametersForm.get(x.Name).value,
        };

        parameters.push(parameter);
      });
    }

    return parameters;
  }

  setFormControls() {
    this.parameters.forEach((x) => {
      this.parametersForm.addControl(
        x.Name,
        !x.Required
          ? new FormControl('')
          : new FormControl('', {
            validators: Validators.required,
          })
      );
    });
  }

  onClickSendMailModal(modalSendMail: any) {
    this.modalService.open(modalSendMail, {
      backdrop: true,
      size: 'lg',
    });
  }

  dismissModal(result: boolean) {
    this.modalService.dismissAll(result);
  }

  get emailFormControls() {
    return this.emailForm.controls;
  }
  // Verifica si el usuario tiene permiso para acceder a la pagina
  CheckPermits() {
    this.permService.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_Report') {
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
