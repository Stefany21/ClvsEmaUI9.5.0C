
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

// MODELOS

// RUTAS

// COMPONENTES

// SERVICIOS
import { AuthenticationService,  AlertService} from '../../../services/index';

@Component({
  selector: 'app-verification-email',
  templateUrl: './verification-email.component.html',
  styleUrls: ['./verification-email.component.scss']
})
export class VerificationEmailComponent implements OnInit {

@BlockUI() blockUI: NgBlockUI;

  verifyEmail = true; // variable para el mensaje de verificacion
  public verificationForm: FormGroup; // variable del formulario, tanto de login como de signin
  verifyOwner: boolean;
  token: string;

  constructor( private activatedRoute: ActivatedRoute,
               private auth: AuthenticationService,
               private router: Router,
               private fb: FormBuilder,
               private alertService: AlertService ) {
    // console.log('VerificationEmailComponent constructor');
  }

  ngOnInit() {
    // console.log('VerificationEmailComponent ngOnInit');
    this.token = this.activatedRoute.snapshot.paramMap.get('token');
    const verificationType = this.activatedRoute.snapshot.paramMap.get('verificationType');

    if ( verificationType.toString() === '1'.toString()) {
      this.verifyOwner = true;
      this.blockUI.start('Verificando el correo, espere por favor...'); // Start blocking
      this.auth.ConfirmEmail(this.token)
      .subscribe( (data: any) => {
        if (data.Result) {
          this.alertService.successInfoAlert('Verificado con éxito');
          this.verifyEmail = true;
          this.router.navigate(['/login']);
        } else {
          this.alertService.errorInfoAlert('Error al ser verificado error - ' + data.errorInfo.Message);
          this.verifyEmail = false;
        }
        this.blockUI.stop(); // Stop blocking
      }, error => {
        this.blockUI.stop(); // Stop blocking
        this.alertService.errorInfoAlert(`Error al ser verificado!!!, error: ${error.error.Message}`);
      });
    } else {
      this.verifyOwner = false;
      this.verificationForm = this.fb.group({
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required],
      });
    }

  }

  // funcion para el envio del formulario de confirmacion del correo con la contrasenna
  onSubmit() {
    if (this.verificationForm.valid) {
      if (this.checkPasswords(this.verificationForm)) {
        this.blockUI.start('Verificando el correo, espere por favor...'); // Start blocking
        this.auth.ConfirmEmailInOwnerAccount(this.token, this.verificationForm)
        .subscribe( (data: any) => {
          // console.log(data);
          // console.log(data.result);
          if (data.Result) {
            this.alertService.successInfoAlert('Verificado con exito');
            this.verifyEmail = true;
            this.router.navigate(['/login']);
          } else {
            this.verifyEmail = false;
            this.alertService.errorInfoAlert('Error al ser verificado error - ' + data.errorInfo.Message);
          }
          this.blockUI.stop(); // Stop blocking
        }, error => {
          this.blockUI.stop(); // Stop blocking
          this.alertService.errorInfoAlert(`Error al ser verificado!!!, Error: ${error.error.Message}`);
        });
      } else {
        this.alertService.infoInfoAlert('Datos Incorrectos, Las contraseñas no coinciden!!!');
      }
    }
  }

  // funcion para validar el que las contraseñas sean iguales al registrar un usuario nuevo
  checkPasswords(group: FormGroup) {
    const pass = group.controls.password.value;
    const confirmPass = group.controls.confirmPassword.value;
    return pass === confirmPass ? true : false;
  }

}