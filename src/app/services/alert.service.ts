import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import swal, { SweetAlertOptions } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private subject = new Subject<any>();
  private keepAfterNavigationChange = false;

  constructor(router: Router) {
      // clear alert message on route change
      router.events.subscribe(event => {
          if (event instanceof NavigationStart) {
              if (this.keepAfterNavigationChange) {
                  // only keep for a single location change
                  this.keepAfterNavigationChange = false;
              } else {
                  // clear alert
                  this.subject.next();
              }
          }
      });
  }

  // llama la funcion de alert con estado success
  // recibe el mensaje que se quiere mostrar
  successAlert(message: string) {
    this.AlertaErrorMessage(message, 'success');
  }

  InfoAlertHtml(html: string, tittle:string) {
    swal({
      title:tittle,
      type: 'info',
      html: html,
      
    });
  }

  // llama la funcion de alert con estado success
  // recibe el mensaje que se quiere mostrar
  successAlertHtml(message: string) {
    this.AlertaErrorMessageHtml(message, 'success');
  }
  // llama la funcion del toast con estado success
  // recibe el mensaje que se quiere mostrar
  successInfoAlert(message: string) {
    this.AlertMessage(message, 'success');
  }
  // llama la funcion de alert con estado error
  // recibe el mensaje que se quiere mostrar
  errorAlert(message: string) {
    this.AlertaErrorMessage(message, 'error');
  }
  // llama la funcion del toast con estado error
  // recibe el mensaje que se quiere mostrar
  errorInfoAlert(message: string) {
    this.AlertMessage(message, 'error');
  }

  // llama la funcion de alert con estado info
  // recibe el mensaje que se quiere mostrar
  infoAlert(message: string) {
    this.AlertaErrorMessage(message, 'info');
  }
  // llama la funcion del toast con estado info
  // recibe el mensaje que se quiere mostrar
  infoInfoAlert(message: string) {
    this.AlertMessage(message, 'info');
  }

  // llama la funcion de alert con estado warning
  // recibe el mensaje que se quiere mostrar
  warningAlert(message: string) {
    this.AlertaErrorMessage(message, 'warning');
  }
  // llama la funcion del toast con estado warning
  // recibe el mensaje que se quiere mostrar
  warningInfoAlert(message: string) {
    this.AlertMessage(message, 'warning');
  }

  getMessage(): Observable<any> {
      return this.subject.asObservable();
  }

  // muestra un toad en la parte superior de la pantalla informado sobre un determinado mensaje.
  // recibe el mensaje que se quiere mostrar y el tipo de mensaje, ya sea success, error, warning, info
  private AlertMessage(msn: any, tipo: any) {
    const toast = swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 10000
    });
    toast({
      type: tipo,
      title: msn
    });
  }

  // muestra el mensaje de alerta  en el centro de la pagina
  // recibe el mensaje que se quiere mostrar y el tipo de mensaje, ya sea success, error, warning, info
  private AlertaErrorMessage(msn: any, tipo: any) {
    swal({
      type: tipo,
      text: msn,
      confirmButtonText: `Continuar`
    });
  }

  // muestra el mensaje de alerta  en el centro de la pagina
  // recibe el mensaje que se quiere mostrar y el tipo de mensaje, ya sea success, error, warning, info
  private AlertaErrorMessageHtml(msn: any, tipo: any) {
    swal({
      type: tipo,
      html: msn,
    });
  }

  ConfirmationAlert(titulo: string, msg: string, confirmButtonText: string) {
    let settings: SweetAlertOptions = {
      title: titulo,
      text: msg,
      showCancelButton: true,
      confirmButtonColor: '#007bff',
      cancelButtonColor: '#dc3545',
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Cancelar',
      type: 'question'
    };

    return swal(settings).then((result) => {
      return result.value;
    });
  }
}
