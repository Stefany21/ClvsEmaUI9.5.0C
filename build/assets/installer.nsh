!include nsDialogs.nsh
!include LogicLib.nsh
!include MUI2.nsh

Var WorkSpace
;Var TextPgDir
Var Dialog

XPStyle on

Page custom WorkspacePage PgPageLeave

Function WorkspacePage
!insertmacro MUI_HEADER_TEXT "Configs Settings" "Provide a valid workspace name."
    nsDialogs::Create 1018
    Pop $Dialog
       
    ${If} $Dialog == error
        Abort
    ${EndIf}
        
        ${NSD_CreateGroupBox} 38u 32u 221u 86u "App configuration"
        Pop $0

        ; === TxtWorkSpace (type: Text) ===
        ${NSD_CreateText} 47u 74u 201u 12u ""
        Pop $WorkSpace
  
        ; === LblWorkSpace (type: Label) ===
        ${NSD_CreateLabel} 47u 57u 100u 10u "WorkSpace"
        Pop $0

       /*  ${NSD_CreateGroupBox} 5% 86u 90% 34u "XML Config file Install Path"
        Pop $0

        ${NSD_CreateDirRequest} 15% 100u 49% 12u "$PROGRAMFILES64\Clavisco\config.xml"
        Pop $TextPgDir

        ${NSD_CreateBrowseButton} 65% 100u 20% 12u "Browse..."
        Pop $0
        ${NSD_OnClick} $0 OnDirBrowse */

    nsDialogs::Show

FunctionEnd

/* Function OnDirBrowse
    ${NSD_GetText} $TextPgDir $0
    nsDialogs::SelectFolderDialog "Select Clavisco Directory" "$0" 
    Pop $0
    ${If} $0 != error
        ${NSD_SetText} $TextPgDir "$0"
    ${EndIf}
FunctionEnd */

Function PgPageLeave
    ${NSD_GetText} $WorkSpace $0    
  FileOpen $1 "$DESKTOP\Configs.json" w
  FileWrite $1 "{$\"Workspace$\":$\"$0$\"}";${NSD_GetText} $TextUser $0
  FileClose $1
    MessageBox MB_OK "The file created successfull!"
 FunctionEnd

Section 
SectionEnd