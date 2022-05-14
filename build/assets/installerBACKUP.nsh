!include nsDialogs.nsh
!include LogicLib.nsh
!include MUI2.nsh

Var TextUser
Var TextPgDir
XPStyle on

Var Dialog

Page custom myCustomPage PgPageLeave

Function myCustomPage
!insertmacro MUI_HEADER_TEXT "Database Settings" "Provide config and install directory."
    nsDialogs::Create 1018
    Pop $Dialog
       
    ${If} $Dialog == error
        Abort
    ${EndIf}
        
        ${NSD_CreateGroupBox} 20% 86u 100% 34u "App configuration"
        Pop $0

        ${NSD_CreateLabel} 20% 26u 20% 10u "Workspace:"
        Pop $0

        ${NSD_CreateText} 80% 24u 40% 12u 
        Pop $TextUser

        ${NSD_CreateGroupBox} 5% 86u 90% 34u "XML Config file Install Path"
        Pop $0

        ${NSD_CreateDirRequest} 15% 100u 49% 12u "$PROGRAMFILES64\Clavisco\config.xml"
        Pop $TextPgDir

        ${NSD_CreateBrowseButton} 65% 100u 20% 12u "Browse..."
        Pop $0
        ${NSD_OnClick} $0 OnDirBrowse

    nsDialogs::Show

FunctionEnd

Function OnDirBrowse
    ${NSD_GetText} $TextPgDir $0
    nsDialogs::SelectFolderDialog "Select Clavisco Directory" "$0" 
    Pop $0
    ${If} $0 != error
        ${NSD_SetText} $TextPgDir "$0"
    ${EndIf}
FunctionEnd

Function PgPageLeave
    ${NSD_GetText} $TextUser $0    
    MessageBox MB_OK "User: $0"
FunctionEnd

Section 
SectionEnd