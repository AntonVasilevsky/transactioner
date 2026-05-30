!include nsDialogs.nsh
!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER
Var TransactionerDesktopShortcutCheckbox
Var TransactionerStartMenuShortcutCheckbox
Var TransactionerCreateDesktopShortcut
Var TransactionerCreateStartMenuShortcut

Function TransactionerShortcutPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Выберите, какие ярлыки создать для Transactioner."
  Pop $0

  ${NSD_CreateCheckbox} 0 32u 100% 14u "Создать ярлык на рабочем столе"
  Pop $TransactionerDesktopShortcutCheckbox
  ${NSD_Check} $TransactionerDesktopShortcutCheckbox

  ${NSD_CreateCheckbox} 0 54u 100% 14u "Добавить ярлык в меню Пуск"
  Pop $TransactionerStartMenuShortcutCheckbox
  ${NSD_Check} $TransactionerStartMenuShortcutCheckbox

  nsDialogs::Show
FunctionEnd

Function TransactionerShortcutPageLeave
  ${NSD_GetState} $TransactionerDesktopShortcutCheckbox $TransactionerCreateDesktopShortcut
  ${NSD_GetState} $TransactionerStartMenuShortcutCheckbox $TransactionerCreateStartMenuShortcut
FunctionEnd

!macro customPageAfterChangeDir
  Page custom TransactionerShortcutPageCreate TransactionerShortcutPageLeave
!macroend
!endif

!macro customInstall
  ${If} $TransactionerCreateStartMenuShortcut == ${BST_CHECKED}
    !ifdef MENU_FILENAME
      CreateDirectory "$SMPROGRAMS\${MENU_FILENAME}"
    !endif
    ${If} $oldStartMenuLink != $newStartMenuLink
      Delete "$oldStartMenuLink"
    ${EndIf}
    Delete "$newStartMenuLink"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${Else}
    Delete "$newStartMenuLink"
  ${EndIf}

  ${If} $TransactionerCreateDesktopShortcut == ${BST_CHECKED}
    ${If} $oldDesktopLink != $newDesktopLink
      Delete "$oldDesktopLink"
    ${EndIf}
    Delete "$newDesktopLink"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${Else}
    Delete "$newDesktopLink"
  ${EndIf}
!macroend
