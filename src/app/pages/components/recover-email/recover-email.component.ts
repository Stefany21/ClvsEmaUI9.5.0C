import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

// MODELOS
import { PasswordValidation  } from './../../../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { AuthenticationService, AlertService, StorageService } from '../../../services/index';

// PIPES

@Component({
  selector: 'app-recover-email',
  templateUrl: './recover-email.component.html',
  styleUrls: ['./recover-email.component.scss']
})
export class RecoverEmailComponent implements OnInit {

   /**
   * variable del formulario de recuperacion de contrasenna
   */
  recoverForm: FormGroup;
  /**
   * variable que comprueba si esta cargando o no
   */
  loading = false;
  /**
   * variable para reconcer si se hizo el envio del formulario o no
   */
  submitted = false;
/**
 * variable para almacenar el email con el que se envio la solicitus
 */
emailRecover: string;

  constructor( private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private auth: AuthenticationService,
    private alertService: AlertService
  ) {
    // console.log('as');
  }

  ngOnInit() {
    this.emailRecover = this.activatedRoute.snapshot.paramMap.get('email');
    this.recoverForm = this.fb.group({
      email: ['', [Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    });
  }

    /**
   * Funcion para tener mejor acceso a los campos del form
	 */
  get f() { return this.recoverForm.controls; }

  /**
   * Funcion para el envio del formulario, de login o de registro
	 */
  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.recoverForm.invalid) {
      this.alertService.errorInfoAlert('El formato del usuario debe ser ejemplo@ejemplo.com');
      return;
    }
    this.loading = true;
    if (this.checkPasswords(this.recoverForm) && (this.emailRecover === this.recoverForm.controls.email.value)) {
      this.auth.recoverPswd(this.recoverForm)
      .subscribe( (data: any) => {
        this.loading = false;
        if (data.Result) {
          this.alertService.successAlert('Contraseña Cambiada Correctamente!!!');
          this.router.navigate(['/login']);
        } else {
          this.alertService.errorInfoAlert(`No se Pudo Actualizar la Contraseña Correctamente!!!, Codigo: ${data.errorInfo.Code}, Mensaje: ${data.errorInfo.Message}`);
        }
      }, error => {
        this.loading = false;
        this.alertService.errorInfoAlert(`Error al Actualizar la Contraseña!!!, Error: ${error}`);
      });
    } else {
      this.loading = false;
      this.alertService.warningInfoAlert('Datos Incorrectos, Las contraseñas o el correo no coinciden!!!');
    }
  }

    /**
   * Funcion para validar el que las contraseñas sean iguales al registrar un usuario nuevo
   *
   * @param {FormGroup} group Formulario de registro
   */
  checkPasswords(group: FormGroup) {
    const pass = group.controls.password.value;
    const confirmPass = group.controls.confirmPassword.value;
    return pass === confirmPass ? true : false;
  }
}


