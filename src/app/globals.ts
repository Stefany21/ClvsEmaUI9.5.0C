import { Injectable} from '@angular/core';

@Injectable()
export class Globals {
  viewParamListSubMenu: any[] = []; // llena la lista con los componentes parametrizados del menu principal
  viewParamListMenu: any[] = [];
  permList: any[] = [];
  compVisivility: any[] = [];
  imagePath: string = '../../../../assets/img/placeholder_600x400.svg';
}
