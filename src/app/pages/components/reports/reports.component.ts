import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ReportUser } from 'src/app/models/rpt-manager/i-report-user';
import { ReportParameter2, Report, ParameterOption, Report2 } from 'src/app/models';
import { RptManagerService, AlertService, CommonService, PermsService, AuthenticationService } from 'src/app/services';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { first } from 'rxjs/operators';
import { Router } from '@angular/router';
import { moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NgbModal, NgbTabset } from '@ng-bootstrap/ng-bootstrap';
import { REPORT_PARAMETER } from 'src/app/enum/enum';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  @ViewChild('tabset') tabset: NgbTabset;
  @BlockUI() blockUI: NgBlockUI;
  reportForm: FormGroup;
  parameterForm: FormGroup;
  parameterValueForm: FormGroup;

  reportUsers: ReportUser[];
  parameters: ReportParameter2[];
  reports: Report[];
  report: File;
  parameterOptions: ParameterOption[];
  parameterOptionsModal: ParameterOption[];

  parameterSubgroup1: ReportParameter2[];
  parameterSubgroup2: ReportParameter2[];
  parameterSubgroup3: ReportParameter2[];
  parameterSubgroup4: ReportParameter2[];
  paramaterListGroup: ReportParameter2[][];

  permisos: boolean = true;  
  currentUser: any; // variable para almacenar el usuario actual  
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  constructor(private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private router: Router,
    private rptManagerService: RptManagerService,
    private alertService: AlertService,
    private commonService: CommonService,
    private permService: PermsService,
    private authenticationService: AuthenticationService) { 
      this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
        this.currentUser = user;
      });
    }

  ngOnInit() {
    this.CheckPermits();
    this.reportForm = this.formBuilder.group({
      Id: 0,
      Name: ['', Validators.required],
      DisplayName: ['', Validators.required],
      ReportUserId: [0, Validators.required],
    });

    this.parameterForm = this.formBuilder.group({
      Id: [0],
      ReportId: [0],
      Name: ['', Validators.required],
      DisplayName: ['', Validators.required],
      Type: [1, Validators.required],
      Required: ['S', Validators.required],
    });

    this.parameterValueForm = this.formBuilder.group({
      Key: ['', Validators.required],
      Value: ['', Validators.required],
    });

    this.initializeApp();
    this.getReportUsers();
    this.getReports();
  }

  initializeApp() {
    this.parameterSubgroup1 = [];
    this.parameterSubgroup2 = [];
    this.parameterSubgroup3 = [];
    this.parameterSubgroup4 = [];
    this.paramaterListGroup = [];
    this.parameters = [];
    this.paramaterListGroup.push(
      this.parameterSubgroup1,
      this.parameterSubgroup2,
      this.parameterSubgroup3,
      this.parameterSubgroup4
    );
    this.parameterOptions = [];
    this.parameterOptionsModal = [];
    this.report = null;
    this.resetParameterForm();
    this.resetReportForm();
    this.resetParameterValueForm();
  }

  resetParameterForm() {
    this.parameterForm.reset({
      Id: 0,
      ReportId: 0,
      Name: '',
      DisplayName: '',
      Type: 1,
      Required: 'S'
    });
  }

  resetReportForm() {
    this.reportForm.reset({
      Id: 0,
      Name: '',
      DisplayName: '',
      ConnectionType: 1,
    });
  }

  resetParameterValueForm() {
    this.parameterValueForm.reset({
      Key: '',
      Value: '',
    });
  }

  getReportUsers() {
    this.blockUI.start('Procesando...');
    this.reportUsers = [];
    this.rptManagerService
      .GetReportUsers()
      .pipe(first())
      .subscribe(
        (response) => {
          this.blockUI.stop();
          if (response.Result) this.reportUsers = response.ReportUsers;
          else
            this.alertService.errorAlert(
              response.ErrorInfo.Message
            );
        },
        (err) => {
          this.blockUI.stop();
          this.alertService.errorAlert(err);
        }
      );
  }

  getReports() {
    this.blockUI.start('Procesando...');
    this.reports = [];
    this.rptManagerService
      .GetReports()
      .subscribe(response=> {
          this.blockUI.stop();
          if (response.Result) {
            this.reports = response.Reports;
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

  HandlePostOrPutReport(report: Report2) {
    this.blockUI.start('Procesando...');

    this.rptManagerService
      .HandlePostOrPutReport(report)
      .pipe(first())
      .subscribe(
        (response: any) => {
          this.blockUI.stop();

          if (response.Result) {
            this.alertService.successInfoAlert(
              'Proceso finalizado exitosamente'
            );

            this.initializeApp();
            this.getReports();
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

  onClickEditReport(report: Report) {
    this.initializeApp();

    this.reportForm.reset({
      Id: report.Id,
      Name: report.Name,
      DisplayName: report.DisplayName,
      ReportUserId: report.ReportUserId,
    });

    this.rptManagerService
      .GetParameters(report.Id)
      .pipe(first())
      .subscribe(
        (response) => {
          if (response.Result) {
            this.tabset.select('tabCrud');
            if (response.Parameters && response.Parameters.length > 0) {
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
            }
          } else {
            this.alertService.errorAlert(
              response.ErrorInfo.Message
            );
          }
        },
        (err) => {
          console.log(err);
          this.alertService.errorAlert(err);
        }
      );
  }

  async onClickSaveChanges() {
    const report = this.getReportModel();

    if (!report.Parameters || report.Parameters.length === 0) {
      const confirmResult = await this.alertService.ConfirmationAlert(
        'Confirmación',
        'No has agregado parámetros al reporte. ¿Desea continuar?',
        'Continuar'
      );

      if (!confirmResult) return;
    }

    if (this.report !== null) {
      this.blockUI.start('Procesando...');

      this.rptManagerService
        .SaveReportFile(this.report)
        .pipe(first())
        .subscribe(
          (response: any) => {
            this.blockUI.stop();

            if (response.Result) {
              this.HandlePostOrPutReport(report);
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
    } else {
      this.HandlePostOrPutReport(report);
    }
  }

  async onClickDeleteParam(paramList: ReportParameter2[], index: number) {
    const confirmResult = await this.alertService.ConfirmationAlert(
      'Confirmación',
      '¿Desea eliminar el parámetro?',
      'Eliminar'
    );
    if (confirmResult) paramList.splice(index, 1);
  }

  onClickAddParameter() {
    let parameter = this.getParameterFromForm();
    this.parameterSubgroup1.push(parameter);
    this.resetParameterForm();
    this.resetParameterValueForm();
    this.parameterOptions = null;
  }

  onClickPrintReport(reportId: number) {
    this.router.navigateByUrl(`report/${reportId}`);
  }


  onClickDownloadFile() {
    if (!this.reportForm.get('Id').value) return;

    const reportName: string = String(this.reportForm.get('Name').value).slice(0, this.reportForm.get('Name').value.length - 4);

    this.blockUI.start('Procesando...');
    this.rptManagerService
      .DownloadFile(Number(this.reportForm.get('Id').value))
      .subscribe((response) => {
        this.blockUI.stop();

        if (response.Result) {
          this.commonService.downloadFile(
            response.Print,
            reportName,
            'application/octet-stream',
            'rpt'
          );
        } else {
          this.alertService.errorAlert(
            response.ErrorInfo.Message
          );
        }
      }, err => {
        this.blockUI.stop();
        this.alertService.errorAlert(
          err
        );
      });
  }

  get reportFormControls() {
    return this.reportForm.controls;
  }

  get parameterFormControls() {
    return this.parameterForm.controls;
  }

  getReportModel() {
    this.parameters = [];
    this.paramaterListGroup.forEach((list, col) => {
      list.forEach((param, row) => {
        param.GridCol = col;
        param.GridRow = row;
        this.parameters.push(param);
      });
    });

    const report: Report2 = {
      Actve: true,
      ApplicationId: 0,
      ReportUserId: Number(this.reportForm.get('ReportUserId').value),
      DisplayName: this.reportForm.get('DisplayName').value,
      Name: this.reportForm.get('Name').value,
      Id: this.reportForm.get('Id').value,
      Parameters: this.parameters,
    };

    return report;
  }

  onReportSelected($event) {
    this.report = <File>$event.target.files[0];

    if (!this.report) return;
    if (!this.commonService.isValidFile(this.report, ['rpt'])) {
      this.report = null;
      this.alertService.warningAlert(
        'Archivo no soportado'
      );
      return;
    }

    this.reportForm.get('Name').setValue(this.report.name);
  }

  getParameterFromForm() {
    let parameter: ReportParameter2 = {
      Id: Number(this.parameterForm.get('Id').value),
      Name: this.parameterForm.get('Name').value,
      DisplayName: this.parameterForm.get('DisplayName').value,
      ReportId: Number(this.parameterForm.get('ReportId').value),
      Type: Number(this.parameterForm.get('Type').value),
      GridCol: 0,
      GridRow: 0,
      Options: this.parameterOptions,
      Required: this.parameterForm.get('Required').value === 'S',
    };

    return parameter;
  }

  getParameterType(type) {
    switch (type) {
      case REPORT_PARAMETER.Alpha:
        return 'Alfanumérico';
      case REPORT_PARAMETER.Boolean:
        return 'Check';
      case REPORT_PARAMETER.Date:
        return 'Fecha';
      case REPORT_PARAMETER.Numeric:
        return 'Numérico';
      case REPORT_PARAMETER.MultipleOption:
        return 'Opción múltiple';
      default:
        return '';
    }
  }

  onItemDropped(event) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }


  dismissModal(result: boolean) {
    this.modalService.dismissAll(result);
  }

  onTabChange($event) {
    if ($event.nextId === 'tabList') {
      this.initializeApp();
    }
  }

  showParameterOptionsModal(
    modalParameterOptions: any,
    options: ParameterOption[]
  ) {
    this.parameterOptionsModal = options;
    let modal = this.modalService.open(modalParameterOptions, {
      size: 'lg',
      backdrop: true,
    });

    modal.result.then(
      () => { },
      () => {
        options = this.parameterOptionsModal;
        this.parameterOptionsModal = null;
        console.log(options);
        console.log(this.parameterOptions);
      }
    );
  }

  onParameterTypeChange(event: any, modalParameterOptions: any) {
    if (Number(event.target.value) === REPORT_PARAMETER.MultipleOption) {
      if (!this.parameterOptions) this.parameterOptions = [];

      this.showParameterOptionsModal(
        modalParameterOptions,
        this.parameterOptions
      );
    }
  }

  onClickParameterOptions(
    parameter: ReportParameter2,
    modalParameterOptions: any
  ) {
    this.showParameterOptionsModal(modalParameterOptions, parameter.Options);
  }

  onClickAddParameterValidValue() {
    this.parameterOptionsModal.push({
      ...this.parameterValueForm.value,
      Id: 0,
      ParameterId: 0,
    });
    this.resetParameterValueForm();
  }

  onClickDeleteValidValue(index: number) {
    if (this.parameterOptionsModal.length === 1) {
      this.alertService.infoInfoAlert(
        'Debes agregar al menos una opción válida'
      );
      return;
    }

    this.parameterOptionsModal.splice(index, 1);
  }

   // Verifica si el usuario tiene permiso para acceder a la pagina
   CheckPermits() {
    this.permService.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === 'V_MngRpt') {
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
