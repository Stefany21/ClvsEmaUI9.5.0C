import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators, FormBuilder } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription } from 'rxjs';
import { ITerminal, Users, User } from 'src/app/models';
import { AlertService, AuthenticationService, BankService, PermsService, UserService } from 'src/app/services';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI; // Para bloquear la interfaz mientras se realiza una acccion
  @ViewChild("UserName") UserName: ElementRef; // Para mandar el focus a este elemento
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos = true; // Para comprobar los permisos del usuario
  userModalTitle: string; // Titulo dinamico para la modal  
  userTarget: Users; // Modelo usando para actualizar una user  
  users: Users[]; // Lista de los useres obtenidos
  isValidForm: boolean; // Representa el estado  del formulario aprobado-rechazado  
  isPasswordInputReandOnly: boolean;
  userForm: FormGroup;

  constructor(
    private sPerm: PermsService,
    private userService: UserService,
    private alertService: AlertService,
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService) {
      this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
        this.currentUser = user;
      });
    }

  ngOnInit() {
    this.blockUI.start(`Obteniendo usuarios`);
    this.initVariables();
    this.getusers();
  }
  // Trigger para levantar la modal de creacion de user
  raiseuserModalCreation(): void {
    this.resetuserForm();
    this.isValidForm = true;
    this.isPasswordInputReandOnly = true;
      this.userForm.patchValue({
        UpdatePassword: true
      });
    this.userModalTitle = 'Crear usuario';
    this.isUpdating = false;
    // this.userForm.patchValue({ Active: true });
    this.userTarget = {} as Users;
    (<HTMLButtonElement>document.getElementById('triggerRaiseUserModal')).click();
  
  }
  // Trigger para levantar la modal de actualizacion de user
  isUpdating: boolean;
  raiseUserModal(_userId: number): void {
    this.userService.getUserApp(_userId.toString()).subscribe(next => {
      // this.userTarget = {} as ITerminal;     
      if (next.Result) {
        this.resetuserForm();
        this.userModalTitle = 'Editar usuario';
        this.userTarget = next.User;
        this.userTarget.PasswordHash = '';
        this.isUpdating = true;
        this.userForm.patchValue({ ...this.userTarget });
        this.isPasswordInputReandOnly = false;
        this.userForm.patchValue({
          UpdatePassword: false
        });
        
        (<HTMLButtonElement> document.getElementById('triggerRaiseUserModal')).click();
      }
      else {
        this.alertService.errorAlert(`Error al obtener el usuario, detalle: ${next.Error.Message}`);
      }
      this.blockUI.stop();
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorAlert(`Error al obtener el usuario, detalle: ${error}`);
    }, () => { });
  }
  CreateUser(_user: Users): void {
    let MOBJECT = { ...this.userForm.value };
    this.isValidForm = this.userForm.valid;
    if (!MOBJECT.UpdatePassword) {
      this.alertService.errorAlert(`El check de editar contraseña debe de estar seleccionado`);
      return;
    }
    if (_user.PasswordHash.length < 8) {
      this.alertService.errorAlert(`La contraseña debe tener al menos 8 caracteres`);
      return;
    }
    if (this.isValidForm) {
    this.blockUI.start('Creando usuario, espere por favor');
    this.userService.createUserApp(_user).subscribe(next => {
      if (next.Result) {  
        this.alertService.successInfoAlert(`Usuario creado exitosamente`);
        (<HTMLButtonElement> document.getElementById('hideButtonTrigger')).click();
        this.getusers();
      }
      else {
        this.alertService.errorAlert(`Error al crear el usuario, detalle: ${next.Error.Message}`);
      }
      this.blockUI.stop();
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorAlert(`Error al crear el usuario, detalle: ${error}`);
    }, () => { });
    }
  }
  UpdateUser(_user: Users): void {
    let MOBJECT = { ...this.userForm.value };    
    this.isValidForm = this.userForm.valid;
    if (!MOBJECT.UpdatePassword) {
      _user.PasswordHash = null;
    }
    else {
      if (_user.PasswordHash.length < 8) {
        this.alertService.errorAlert(`La contraseña debe tener al menos 8 caracteres`);
        return;
      }
    }
    if (this.isValidForm) {
    this.blockUI.start('Actualizando usuario, espere por favor');
    this.userService.updateUserApp(_user).subscribe(next => {
      if (next.Result) {           
        this.alertService.successInfoAlert(`Usuario actualizado exitosamente`);
        (<HTMLButtonElement> document.getElementById('hideButtonTrigger')).click();
        this.getusers();
      }
      else {
        this.alertService.errorAlert(`Error al actualizar el usuario, detalle: ${next.Error.Message}`);
      }
      this.blockUI.stop();
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorAlert(`Error al actualizar el usuario, detalle: ${error}`);
    }, () => { });
  }
}
  // Actualiza o crea un user segun sea el caso
  saveuser(): void {
    const USER = this.userForm.value as Users;
    USER.Id === -1 ? this.CreateUser(USER): this.UpdateUser(USER);
      
  }
  // Verifica los permisos del usuario en la apliacion
  CheckPermits() {
    this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
      this.blockUI.stop();
      if (data.Result) {
        data.perms.forEach(Perm => {
          if (Perm.Name === "V_Users") {
            this.permisos = Perm.Active;
          }
        });
      } else {
        this.permisos = false;
      }
    }, error => {
      console.log(error);
      this.blockUI.stop();
      this.permisos = false;
    });  
  }
  // Inicializa las variables a un estado por defecto
  initVariables(): void {
    this.CheckPermits();
    this.isPasswordInputReandOnly = true;
    this.resetuserForm();
  }
   
  // Restablece a un estado por defect el formulario del user
  
  resetuserForm(): void {
    this.userForm = this.formBuilder.group({
      Id: [-1],
      Email: ['', [Validators.required, Validators.email]], 
      PasswordHash: [''],
      FullName: ['', Validators.required],
      Active: [false, Validators.required],
      UpdatePassword: [false]
    });
  }
  // Obtiene los useres registrados en el sistema
  getusers(): void {
    this.userService.getUsersApp().subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.alertService.successInfoAlert(`Usuarios obtenidos exitosamente`);
        this.users = next.Users;
      }
      else {
        if (next.Users.length === 0) this.alertService.infoAlert(`No hay usuarios registrados en el sistema`);
        else {
          this.alertService.infoAlert(`Error el obtener los usuarios: ${next.Error.Message}`);
        }
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorAlert(`Error al obtener la usuarios, detalle: ${error}`);
    }, () => { });
  }   
  // Alterna el estado del user entre activo inactivo
  toggleStatus(): void {  
    this.userForm.patchValue({
      Active: !this.userForm.value.Active
    });
  }
  ToggleInputPasswordType(): void {
    this.isPasswordInputReandOnly = !this.isPasswordInputReandOnly
  }
}
