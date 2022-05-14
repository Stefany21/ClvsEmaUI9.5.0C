import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, first, map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

import swal from 'sweetalert2';
// import { sweetalert2 } from 'sweetalert2/dist/sweetalert2'


// MODELOS
import { Company, PasswordValidation, User, IPrinter, CONFIG_VIEW, AppConstants } from '../../../models/index';

// RUTAS

// COMPONENTES

// SERVICIOS
import { AuthenticationService, AlertService, StorageService, CompanyService, ExRateService, CommonService } from '../../../services/index';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import { NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { columnsTotalWidth } from '@swimlane/ngx-datatable/release/utils';

// PIPES

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  usersCredentials: User[];
  model: User;
  Pinpad: boolean;
  @ViewChild('instance') instance: NgbTypeahead;

  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  search = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(100), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? this.usersCredentials
        : this.usersCredentials.filter(v => v.Email.toLowerCase().indexOf(term.toLowerCase()) > -1)).slice(0, 10))
    );
  }

  formatter = (result: User) => result.Email;

  annio: number;
  /**
   * variable del formulario, tanto de login como de signin
   */
  loginForm: FormGroup;
  /**
   * variable que comprueba si esta cargando o no
   */
  loading = false;
  /**
   * variable para saber si esta activo el form de login (true) o de signin (false)
  */
  isLogin: boolean;
  /**
   * variable para saber si esta recuperando la contrasenna, activo el form de forgot (true) o se oculta (false)
  */
  forgotPwsd: boolean;
  /**
   * variable para reconcer si se hizo el envio del formulario o no
   */
  submitted = false;
  /**
   * variable que contiene la url de retorno para ver a donde desplazarse
   */
  returnUrl: string;



  constructor(private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private storage: StorageService,
    private auth: AuthenticationService,
    private alertService: AlertService,
    private companyService: CompanyService
    , private exRateService: ExRateService
    , private commonService: CommonService
  ) {
    if (this.auth.currentUserValue) {
      this.router.navigate(['/']);
    }
    this.annio = new Date().getFullYear();
  }

  ngOnInit() {
    this.Pinpad = false;
    this.isLogin = true;
    this.forgotPwsd = false;
    this.loginForm = this.fb.group({
      // email: ['', [Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]],
      email: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', Validators.required],
      hasOfflineMode: [this.storage.getConnectionType()]
    });
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.usersCredentials = this.storage.getUserCredentials();

  }

  GetSettings(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.Payment).subscribe(response => {
      if (response.Result) {
        let result = JSON.parse(response.Data.Json);
        this.Pinpad = result.Pinpad;
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuracion compañía uso de pinpad ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion compañía uso de pinpad ' + err);
    });
  }
  GetSettingUrlOffline(): void {
    this.companyService.GetSettingsbyId(CONFIG_VIEW.OFFLINE_PP).subscribe(response => {
      if (response.Result) {
        this.storage.SetUrlOffilePP(JSON.parse(response.Data.Json));
      } else {
        this.alertService.errorAlert('Ocurrió un error obteniendo configuracion compañía uso de pinpad ' + response.Error.Message);
      }
    }, err => {
      this.alertService.errorAlert('Ocurrió un error obteniendo configuracion compañía uso de pinpad ' + err);
    });
  }
  /**
   * Funcion para tener mejor acceso a los campos del form
   */
  get f() { return this.loginForm.controls; }

  /**
   * Funcion para el envio del formulario, de login o de registro
   */
  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.loginForm.invalid) {
      if (this.loginForm.controls.email.invalid) {
        this.alertService.warningInfoAlert('El formato del usuario debe ser ejemplo@ejemplo.com')
        return;
      }
      if (this.loginForm.controls.confirmPassword.invalid) {
        this.alertService.warningInfoAlert('Datos Incorrectos, Las contraseñas no coinciden!');
        return;
      }
      this.alertService.warningInfoAlert('Contraseña no es valida!');
      return;
    }
    if (this.loginForm.value.hasOfflineMode === false && navigator.onLine === false) {
      this.alertService.warningInfoAlert('Sin conexión a internet, Inicie Sesión Offline');
      return;
    }

    this.loading = true;
    if (this.isLogin && !this.forgotPwsd) {
      if (this.loginForm.value.hasOfflineMode === false) { // checks the connection state navigator.onLine     
        this.storage.setOnline();
        this.storage.setConnectionType(this.loginForm.value.hasOfflineMode);

        const USERNAME = this.f.email.value.Email || this.f.email.value;
        const PASSWORD = this.f.password.value.Password || this.f.password.value;
        this.auth.login(USERNAME, PASSWORD)
          .subscribe(data => {

            this.storage.addUserCredentials(USERNAME, ""); // Se guardan en blanco las claves hasta que se defina un flujo para guardar estas 
            this.storage.setCurrentSession(data);
            this.companyService.GetDefaultCompany().subscribe(next => {
              if (next.Result) {
                this.GetSettings();
                this.GetSettingUrlOffline();

                this.companyService.GetCompanyById(next.Company.Id)
                  .subscribe((res: any) => {
                    if (res.Result) {
                      const COMPANY = res.companyAndMail.company as Company;
                      this.storage.setCompanyConfiguration(
                        COMPANY.DecimalAmountPrice,
                        COMPANY.DecimalAmountTotalLine,
                        COMPANY.DecimalAmountTotalDocument,
                        null,
                        COMPANY.HasZeroBilling
                        , COMPANY.LineMode,
                        COMPANY.AcceptedMargins,
                        COMPANY.DBCode);
                      this.commonService.bdCode.next(COMPANY.DBCode);
                      this.exRateService.getExchangeRate().subscribe(next => {
                        if (next.Result) {
                          this.commonService.exchangeRate.next(next.exRate);
                        }
                        else {
                          console.log(`GetExrateError ${next}`);
                        }
                      }, error => {
                        console.log(`GetExrateError ${error}`);
                      });
                      this.storage.setHasOfflineMode(res.companyAndMail.company.HasOfflineMode);
                      // if (data.companyAndMail.company.HasOfflineMode) {
                      //   this.auth.loginOffline(USERNAME, PASSWORD, true)
                      //     .pipe(first())
                      //     .subscribe(  
                      //       data => {
                      //       },
                      //       error => {
                      //         this.alertService.errorInfoAlert(`No se pudo conectar con el servidor local, ` + error);
                      //         this.loading = false;
                      //       });
                      // }
                      // if (this.Pinpad) {    
                      //   this.auth.authPinPadCredentials(USERNAME, PASSWORD).subscribe(next => {
                      //     next.Password = this.f.password.value;
                      //     if (next && next.access_token) {

                      //       this.auth.currentUserSubject.next(data);
                      //       this.storage.setCurrentSessionOffline(next);
                      //       this.router.navigate(['/home']);
                      //     } else {
                      //       swal({ 
                      //         type: 'warning',
                      //         title: `Servicios de integración con datáfonos no disponibles`,
                      //         text: '¿ Desea continuar ?',
                      //         showCancelButton: true,
                      //         confirmButtonColor: '#049F0C',
                      //         cancelButtonColor: '#ff0000',
                      //         confirmButtonText: 'Sí',
                      //         cancelButtonText: 'No' 
                      //       }).then(next => {
                      //         if ((Object.keys(next)[0] === 'dismiss')) {
                      //           this.loading = false;            
                      //         }else{
                      //           this.auth.currentUserSubject.next(data);
                      //           this.router.navigate(['/home']); 
                      //         }
                      //       }); 
                      //     }
                      //   }, error => {
                      //     swal({ 
                      //       type: 'warning',
                      //       title: `Servicios de integración con datáfonos no disponibles`,
                      //       text: '¿ Desea continuar ?',
                      //       showCancelButton: true,
                      //       confirmButtonColor: '#049F0C',
                      //       cancelButtonColor: '#ff0000',
                      //       confirmButtonText: 'Sí',
                      //       cancelButtonText: 'No' 
                      //     }).then(next => {
                      //       if ((Object.keys(next)[0] === 'dismiss')) {
                      //         this.loading = false;            
                      //       }else{
                      //         this.auth.currentUserSubject.next(data);
                      //         this.router.navigate(['/home']); 
                      //       }
                      //     });                      
                      //   });
                      // } else {
                      this.auth.currentUserSubject.next(data);
                      this.router.navigate(['/home']);
                      //}
                    } else {
                      this.alertService.errorAlert('Error al cargar la información de las compañías - Error: ' + data.Error.Message);
                    }
                  }, (error: any) => {
                    this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
                  });
              }
              else {
                this.alertService.errorInfoAlert(`Error al obtener la información de la compañia, Error: ${next.Error.Message}`);
              }
            }, error => {
              this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error.error}`);
            });

          },
            error => {
              // error.error.error_description
              this.alertService.errorAlert(error);
              this.loading = false;
            });
        // this.auth.getTokenPadron()
        //   .pipe(first())
        //   .subscribe(
        //     data => {
        //     },
        //     error => {
        //       // error.error.error_description
        //       this.alertService.errorAlert(error);
        //       this.loading = false;
        //     });

      }
      else {
        let urlOffline = {
          RouteOfflineUrl: `${AppConstants.offlineUrl}`,
          RoutePinpadUrl: ""
        }
        this.storage.SetUrlOffilePP(urlOffline);
        this.auth.VerifyOfflineConecction().subscribe(response => {
          if (response.status == 200) {
            setTimeout(() => {
              this.storage.setOffline();
              this.storage.setConnectionType(true);
              const USERNAME = this.f.email.value.Email || this.f.email.value;
              const PASSWORD = this.f.password.value.Password || this.f.password.value;
              this.auth.loginOffline(USERNAME, PASSWORD, true)
                .pipe(first())
                .subscribe(
                  data => {
                    this.router.navigate(['/home']);
                    this.companyService.GetDefaultCompany().subscribe(next => {
                      if (next.Result) {
                        this.companyService.GetCompanyById(next.Company.Id)
                          .subscribe((data: any) => {
                            if (data.Result) {
                              const COMPANY = data.companyAndMail.company as Company;
                              this.storage.setCompanyConfiguration(
                                COMPANY.DecimalAmountPrice,
                                COMPANY.DecimalAmountTotalLine,
                                COMPANY.DecimalAmountTotalDocument,
                                null,
                                COMPANY.HasZeroBilling,
                                COMPANY.LineMode,
                                COMPANY.AcceptedMargins,
                                COMPANY.DBCode);
                              this.commonService.bdCode.next(COMPANY.DBCode);
                              this.exRateService.getExchangeRate().subscribe(next => {
                                if (next.Result) {
                                  this.commonService.exchangeRate.next(next.exRate);
                                }
                                else {
                                  console.log(`GetExrateError ${next}`);
                                }
                              }, error => {
                                console.log(`GetExrateError ${error}`);
                              });
                              this.storage.setHasOfflineMode(data.companyAndMail.company.HasOfflineMode);
                              if (data.companyAndMail.company.HasOfflineMode) {
                                this.auth.loginOffline(USERNAME, PASSWORD, true)
                                  .pipe(first())
                                  .subscribe(
                                    data => {
                                    },
                                    error => {
                                      this.alertService.errorInfoAlert(`No se pudo conectar con el servidor local, ` + error);
                                      this.loading = false;
                                    });
                              }
                              else {
                                this.auth.authPinPadCredentials(USERNAME, PASSWORD).subscribe(next => {
                                  next.Password = this.f.password.value;
                                  if (next && next.access_token) {
                                    this.storage.setCurrentSessionOffline(next);
                                  }
                                }, error => {
                                  //this.alertService.infoInfoAlert(`Servicios de integración con datáfonos no disponibles, no se pudo conectar con el servidor`);
                                  console.warn('Servicios pin pad no disponibles', error);
                                });
                              }

                            } else {
                              this.alertService.errorAlert('Error al cargar la información de las compañías - Error: ' + data.Error.Message);
                            }
                          }, (error: any) => {
                            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
                          });
                      }
                      else {
                        this.alertService.errorInfoAlert(`Error al obtener la información de la compañia, Error: ${next.Error.Message}`);
                      }
                    }, error => {
                      this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error.error}`);
                    });
                  },
                  error => {
                    console.log(error);
                    this.alertService.errorAlert(error);
                    this.loading = false;
                  });
            }, 500);
          } else {
            this.alertService.warningInfoAlert('No es posible conectar con los servicios locales');
            this.loading = false;
            return;
          }
        }, error => {
          this.alertService.warningInfoAlert('No es posible conectar con los servicios locales');
          this.loading = false;
          return;

        });
      }
    } else if (!this.isLogin && !this.forgotPwsd) {
      if (this.checkPasswords(this.loginForm)) {
        this.auth.register(this.loginForm)
          .subscribe((data: any) => {
            this.loading = false;
            if (data.Result) {
              this.alertService.successInfoAlert('Usuario Registrado Correctamente!!!');
            } else {
              this.alertService.errorInfoAlert(`No se Pudo Registrar el Usuario Correctamente!!!, Codigo: ${data.Error.Code}, Mensaje: ${data.Error.Message}`)
            }
          }, error => {
            this.loading = false;
            this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
          });
      } else {
        this.loading = false;
        this.alertService.warningInfoAlert('Datos Incorrectos, Las contraseñas no coinciden!!!');
      }
    } else if (this.forgotPwsd) {
      this.auth.sendRecoverPswdEmail(this.loginForm)
        .subscribe((data: any) => {
          this.loading = false;
          if (data.Result) {
            this.alertService.successInfoAlert('Usuario Registrado Correctamente!!!');
          } else {
            this.alertService.errorInfoAlert(`No se Pudo Registrar el Usuario Correctamente!!!, Codigo: ${data.Error.Code}, Mensaje: ${data.Error.Message}`)
          }
        }, error => {
          this.loading = false;
          this.alertService.errorInfoAlert(`Error al intentar conectar con el servidor, Error: ${error}`);
        });
    }
  }

  /**
   * Funcion para cambiar entre el formulario de login y de sigin
   */
  clickEvent(islogin: boolean, forgotPwsd: boolean) {
    this.isLogin = islogin;
    this.forgotPwsd = forgotPwsd;
    // se activa el form de login
    if (this.isLogin && !this.forgotPwsd) {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]],
        password: ['', Validators.required]
      });
      // se activa el form de registrarse
    } else if (!this.isLogin && !this.forgotPwsd) {
      this.loginForm = this.fb.group({
        fullName: ['', Validators.required],
        email: ['', [Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]],
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required]
      }, {
        validator: PasswordValidation.MatchPassword // your validation method
      });
      // se activa el form de recuperar la contrasenna
    } else if (this.forgotPwsd) {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.minLength(2), Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$')]]
      });
    }
    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

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
