import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators  } from '@angular/forms';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription } from 'rxjs';
import { ITerminal, ITerminalByUser, Users } from 'src/app/models';
import { AlertService, AuthenticationService, BankService, PermsService, UserService } from 'src/app/services';

@Component({
  selector: 'app-terminals',
  templateUrl: './terminals.component.html',
  styleUrls: ['./terminals.component.scss']
})
export class TerminalsComponent implements OnInit {
  //VARBOX
  inputType: string;
  isOnWriteMode: boolean;
  terminalsByUser: ITerminalByUser[];
  users: Users[];
  userControl: FormControl;
  currentJustify: string;
  terminals: ITerminal[]; // Lista de los terminales obtenidos
  @BlockUI() blockUI: NgBlockUI; // Para bloquear la interfaz mientras se realiza una acccion
  @ViewChild("UserName") UserName: ElementRef; // Para mandar el focus a este elemento
  currentUser: any; // variable para almacenar el usuario actual
  currentUserSubscription: Subscription; // suscripcion para obtener el usuario actual
  permisos: boolean = true; // Para comprobar los permisos del usuario
  terminalModalTitle: string; // Titulo dinamico para la modal
  terminalTarget: ITerminal; // Modelo usando para actualizar una terminal
  isValidForm: boolean; // Representa el estado  del formulario aprobado-rechazado
  terminalForm = new FormGroup({
    Id: new FormControl(''),
    Password: new FormControl(''),
    TerminalId: new FormControl('', [Validators.required]),
    UserName: new FormControl('', [Validators.required]),
    Status: new FormControl(''),
    Currency: new FormControl('', [Validators.required])
  }); // La definicio del formulario del terminal

  constructor(
    private sPerm: PermsService
    ,private bankService: BankService
    ,private alertService: AlertService
    ,private userService: UserService,  
    private authenticationService: AuthenticationService){
     this.currentUserSubscription = this.authenticationService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit() {
    this.blockUI.start(`Obteniendo terminales`);
    this.initVariables();
    this.getTerminals();
    this.GetUsers();
  }
// Trigger para levantar la modal de creacion de terminal
  raiseTerminalModalCreation(): void {
    this.resetTerminalForm();
    this.isValidForm = true;
    this.terminalModalTitle = 'Crear terminal';
    (<HTMLButtonElement>document.getElementById('triggerRaiseTerminalModal')).click();
    this.terminalForm.patchValue({ Status: true });
    this.terminalTarget = {} as ITerminal;
  }
  // Trigger para levantar la modal de actualizacion de terminal
  raiseTerminalModal(_terminalId: number): void {
    this.bankService.getTerminal(_terminalId).subscribe(next => {
      this.terminalTarget = {} as ITerminal;
      if (next.Result) {
        this.resetTerminalForm();
        this.terminalModalTitle = 'Editar terminal';
        this.terminalTarget = next.PPTerminal;
        this.terminalForm.patchValue({ ...next.PPTerminal });
        (<HTMLButtonElement> document.getElementById('triggerRaiseTerminalModal')).click();
      }
      else {
        this.alertService.errorAlert(`Error al obtener la terminal, detalle: ${next.Error.Message}`);
      }
      this.blockUI.stop();
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorAlert(`Error al obtener la terminal, detalle: ${error}`);
    }, () => { });
  }
  // Actualiza o crea un terminal segun sea el caso
  saveTerminal(): void {
    this.terminalTarget = { ...this.terminalForm.value } as ITerminal;
    this.isValidForm = this.terminalForm.valid;
    if (this.isValidForm) {
      (<HTMLButtonElement>document.getElementById('hideButtonTrigger')).click();
      this.blockUI.start('Procesando transacción, espere por favor');
      if (this.terminalTarget.Id) {
        this.bankService.UpdateTerminal(this.terminalTarget).subscribe(next => {
          if (next.Result) {
            this.alertService.successInfoAlert(`Terminal actualizado con éxito`);
            this.getTerminals();
          }
          else {
            this.alertService.errorAlert(`Error al actualizar la terminal, detalle: ${next.Error.Message}`);
          }
          this.blockUI.stop();
        }, error => {
          this.blockUI.stop();
          console.log(error);
          this.alertService.errorAlert(`Error al actualizar la terminal, detalle: ${error}`);
        }, () => { });
      }
      else {
        this.bankService.CreateTerminal(this.terminalTarget).subscribe(next => {
          if (next.Result) {
            this.alertService.successInfoAlert(`Terminal creado con éxito`);
            this.getTerminals();
          }
          else {
            this.alertService.errorAlert(`Error al crear la terminal, detalle: ${next.Error.Message}`);
          }
          this.blockUI.stop();
        }, error => {
          this.blockUI.stop();
          console.log(error);
          this.alertService.errorAlert(`Error al crear la terminal, detalle: ${error}`);
        }, () => {});
      }
    }
  }
  // Verifica los permisos del usuario en la apliacion
  CheckPermits(){
	  this.sPerm.getPerms(this.currentUser.userId).subscribe((data: any) => {
		  this.blockUI.stop();
		  if (data.Result) {
        data.perms.forEach(Perm => {
          if(Perm.Name==="V_Terminal"){
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
    this.inputType = `text`;
    this.isOnWriteMode = false;
    this.terminals = [];
    this.terminalsByUser = [];
    this.CheckPermits();  
    this.resetTerminalForm();
    this.ResetUserControl();
  }

  ResetUserControl(): void {
    this.userControl = new FormControl(-1);
  }
  // Restablece a un estado por defect el formulario del terminal
  resetTerminalForm(): void {
    this.terminalForm = new FormGroup({
      Id: new FormControl(''),
      Password: new FormControl('', [Validators.required]),
      TerminalId: new FormControl('', [Validators.required]),
      UserName: new FormControl('', [Validators.required]),
      Status: new FormControl(''),
      Currency: new FormControl('COL'),
      QuickPayAmount: new FormControl(0,  [Validators.required])
    });

    this.currentJustify = 'start';
  }
  // Obtiene los terminales registrados en el sistema
  getTerminals(): void {
    this.bankService.getTerminals().subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.alertService.successInfoAlert(`Terminales obtenidos`);
        this.terminals = next.PPTerminals;
      }
      else {
        console.log(next);
        if (next.PPTerminals.length === 0) this.alertService.infoInfoAlert(`No hay terminales registrados en el sistema`);
        else {
          this.alertService.infoAlert(`Error el obtener los terminales: ${next.Error.Message}`);
        }
      }
    }, error => {
      this.blockUI.stop();
      console.log(error);
      this.alertService.errorAlert(`Error al obtener la terminal, detalle: ${error}`);
    }, () => {});
  }
  // Alterna el estado del terminal entre activo inactivo
  toggleStatus(): void {
    this.terminalForm.patchValue({
      Status: !this.terminalForm.value.Status
    });
  }

  GetUsers(): void {
    this.userService.getUsersApp().subscribe(next => {
      if (next.Result) {
        this.users = next.Users;
      }
    });
  }

  OnUserControlChange(event): void {
    this.blockUI.start(`Obteniendo asignaciones de usuario`);
    this.terminalsByUser = [];
    this.bankService.GetTerminalsByUser(this.userControl.value).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.terminalsByUser = next.PPTerminalsByUser;
      }
      else {
        console.log(next);
        this.alertService.errorInfoAlert(`Error: ${next.Error.Message || ''}`);
      }
    }, error => {
        this.alertService.errorAlert(`Error: ${error}`);
      console.log(error);
      this.blockUI.stop();
    });
  }

  AssignTerminal(_terminal: ITerminal, _isAssinged: boolean): void {
    console.log(_terminal);
    // return;
    if (this.userControl.value == -1) {
      this.alertService.infoInfoAlert(`Seleccione un usuario`);
      return;
    } 
    if (_isAssinged) {
      this.terminalsByUser = this.terminalsByUser.filter(x => x.TerminalId !== _terminal.TerminalId);
    }
    else {
      this.terminalsByUser.push({
        TerminalId: _terminal.TerminalId,
        UserId: this.userControl.value,
        Id: -1
      });
    }
    console.log(this.terminalsByUser);
  }

  // terminal.Status
  IsAssigned(_terminalId: string): boolean {
    return this.terminalsByUser.some(x => {
      return x.TerminalId == _terminalId;
    });
  }

  UpdateTerminals(): void {
    if (this.userControl.value == -1) {
      this.alertService.infoInfoAlert(`Seleccione un usuario`);
      return;
    }

    this.blockUI.start(`Actualizando asignaciones, espere por favor`);
    this.bankService.UpdateTerminalsByUser(this.terminalsByUser, this.userControl.value).subscribe(next => {
      this.blockUI.stop();
      if (next.Result) {
        this.alertService.successInfoAlert(`Asignaciones actualizadas`);
      }
      else {
        console.log(next);
        this.alertService.errorInfoAlert(`Error: ${next.Error.Message || ''}`);
      } 
    }, error => {
        this.blockUI.stop();
        console.log(error);
        this.alertService.errorAlert(`Error: ${error}`);
    });
  }

  FilteredTerminals(): ITerminal[] {
    return this.terminals.filter(x => x.Status);
  }

  ToggleAmountEdition(_isOnWriteMode, _event = undefined): void {
    if (_isOnWriteMode) {
      this.inputType = `number`;
    }
    else {
      this.inputType = `text`;
    }

    this.isOnWriteMode = _isOnWriteMode;
  }
}
