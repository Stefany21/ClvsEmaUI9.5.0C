import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { IPrinter } from './models/i-printer';

@Injectable({
  providedIn: 'root'
})
export class ElectronRendererService {
  private ipc: IpcRenderer
  constructor(private _electronService: ElectronService) {
    //verifica que este en electron
    console.log('Revisando electron');
    if ((<any>window).require) {
      try {  
 
        this.ipc = (<any>window).require('electron').ipcRenderer;

      } catch (error) {
        throw error
      }
    } else {
      console.info('Could not load electron ipc')
    }
  }

  //funcion para validar desde angular si se esta en electron
  CheckElectron() {
    console.log('revisando variable ipc:' + this.ipc);
    return this.ipc ? true : false;
  }



  public CloseApp(){  
     //window.close();     
  this.ipc.send('quitter');      

  }

  GetPrinters(): IPrinter[] {

    let printers: IPrinter[] = [];

    if (this._electronService.isElectronApp) {
      // let pong: string = this._electronService.ipcRenderer.sendSync('ping');
      const remote = this._electronService.remote;
      const { BrowserWindow, dialog, shell } = remote;
      let printWindow = new BrowserWindow({ show: false });
      printWindow.loadURL("https://www.google.com/");
      let list = printWindow.webContents.getPrinters();
      if (list.length > 0) {
        for (let c = 0; c < list.length; c++) {
          const x = list[c];
          let PRINTER = {
            Description: x.description,
            DisplayName: x.displayName,
            IsDefault: x.isDefault,
            Name: x.name,
            Status: x.status,
            Options: x.options
          } as IPrinter;
          printers.push(PRINTER);
        }
      }
    }

    return printers;
  }

  //metodo para registrar un listener dinamico que se comunicara con angular
  //public on(channel: string, listener: Function,...args): void {
  public on(channel: string, listener, ...args): void {
    console.log("registering listener in renderer service, channel:" + channel);
    if (!this.ipc) {
      console.warn('Could not load electron ipc')
      return;
    }
    this.ipc.on(channel, listener);
  }

  //metodo para reenviar las respuestas dinamicas del ipc de electron al renderer a angular
  public send(channel: string, ...args): void {
    console.log("sending response from renderer service, channel:" + channel);
    console.log(args);
    if (!this.ipc) {
      console.warn('Could not load electron ipc')
      return;
    }
    this.ipc.send(channel, args);
  }
}
