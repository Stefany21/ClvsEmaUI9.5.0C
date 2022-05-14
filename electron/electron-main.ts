import { app, BrowserWindow, ipcMain, shell, IpcMessageEvent } from 'electron'
import * as path from 'path'
import * as url from 'url'
import * as fs from 'fs'
import * as Printer from 'pdf-to-printer';

let win: BrowserWindow
function createWindow() {
  //instancia la ventana del chrome
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    }
  })
  //maximiza la ventana
  win.maximize();

  //carga la aplicacion buildeada de angular
  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `../../dist/ClvsPos/index.html`),
      protocol: 'file:',
      slashes: true,
    })
  )
  //abre la consola de debuggin por defecto, comentar para produccion
  //win.webContents.openDevTools()

  //controla evento de cierre
  win.on('closed', () => {
    app.quit();// win = null // app.quit() // Solo trabaja en x86
  })
}

//Crea la ventana de chrome cuando el app esta lista
app.on('ready', createWindow)

app.on('window-all-closed', () => {

  // On macOS specific close process
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// On macOS specific close process
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

function checkIfHasADefaultPrinter(defaultPrinter) {
  if (defaultPrinter) {
    return  {
      unix: ["-o fit-to-page"],
      printer: defaultPrinter,
      win32: ['-print-settings "even,noscale,bin=2"']
    }
  }

  return  {
    unix: ["-o fit-to-page"],
    win32: ['-print-settings "even,noscale,bin=2"']
  }
  
}
//metodo para imprimir un pdf que se recibe como base64, se almacena en temporal y se manda a la impresora con ayuda de la libreria pdf-to-printer
//ipcMain.on('Print', (event: IpcMessageEvent,...arg) => {
ipcMain.on('Print', (event, ...arg) => {

  let file = arg[0][0];
  event.preventDefault()
  let pdfFile = '/' + file.fileName;
  const pdfPath = path.join(app.getPath('temp'), pdfFile);
  console.log(pdfPath);
  fs.writeFile(pdfPath, file.file, 'base64', function (err) {
    if (err) {
      console.log("An error ocurred creating the file " + err.message)
    }
    console.log("The file has been succesfully saved");

    //abre el archivo en una ventana del browser con el shell
    //shell.openExternal(pdfPath)
    /* Printer.getPrinters()
    .then(console.log)
    .catch(console.error) */

    const options = checkIfHasADefaultPrinter(file.defaultPrinter);
    // let defaultPrinter = file.defaultPrinter;


    // win.webContents
    //   .executeJavaScript('({...localStorage});', true)
    //   .then(result => {
    //     console.log(result);
    //   }, error => {
    //     console.log(error);
    //   });

    Printer.print(pdfPath, options)
      .then(console.log)
      .catch(console.error);  
  });
});  
//ejemplo de comunicacion entre el renderer service y el ipc de electron
//ipcMain.on('Test', (event: IpcMessageEvent,...arg) => {
ipcMain.on('Test', (event, ...arg) => {
  console.log('TestResponse');
  //envia respuesta al listener registrado en angular en el constructor que se llama TestResponse
  event.sender.send('TestResponse', 'prueba' + arg);
});

  // renderer allows the app to close
  ipcMain.on('quitter', (e) => { 
    app.quit();   
    win.close();         
  });




