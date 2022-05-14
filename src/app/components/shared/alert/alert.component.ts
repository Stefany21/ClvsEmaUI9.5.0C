import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

// MODELOS

// RUTAS

// COMPONENTES

// SERVICIOS
import { AlertService } from './../../../services/index';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit, OnDestroy {

  private subscription: Subscription;
  message: any;

  constructor(private alertService: AlertService) { }

  ngOnInit() {
      this.subscription = this.alertService.getMessage().subscribe(message => {
          this.message = message;
      });
  }

  ngOnDestroy(): void {
      this.subscription.unsubscribe();
  }
}
