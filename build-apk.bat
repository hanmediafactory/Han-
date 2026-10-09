@echo off
set "JAVA_HOME=C:\Users\Rakesh\Documents\Codex\2026-10-06\http-127-0-0-1-5173\work\android-toolchain\jdk\jdk-21.0.12.1+1"
if not exist "%JAVA_HOME%\bin\java.exe" set "JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "C:\Users\Rakesh\Desktop\HAN TO DO LIST\android"
call gradlew.bat assembleDebug
