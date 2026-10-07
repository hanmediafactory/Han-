@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr"
set "PATH=C:\Program Files\Android\Android Studio1\jbr\bin;%PATH%"
cd /d "C:\Users\Rakesh\Desktop\HAN TO DO LIST\android"
call gradlew.bat assembleDebug
