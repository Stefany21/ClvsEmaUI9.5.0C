import { Injectable } from '@angular/core';
import { BrowserWindow } from 'electron';
import { IpcRenderer } from 'electron';
@Injectable({
  providedIn: 'root'
})
export class EprintService {
  // private _ipc: IpcRenderer | undefined = void 0;

  // private _clipboard: clipboard | undefined = void 0;
  private _clipboard: typeof BrowserWindow | undefined = void 0;
  constructor() { 
  
    if (window.require) {
      try {
        this._clipboard = window.require('electron').BrowserWindow;
      } catch (e) {
        throw e;
      }
    } else {
      console.warn('Electron\'s IPC was not loaded');
    }
	
  }
  
  public copy(txt: string){
  }
}
