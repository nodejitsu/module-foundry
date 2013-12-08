@echo off
if not "argv"=="argv%1" goto %1
echo usage:
echo      install-node [release]
echo e.g. install-node v0.10.15
goto eof

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:setup
set deploy_dir=c:\node.deploy
set dist_dir=%deploy_dir%\dist
set node_dir=c:\node
if not defined project_root set project_root=c:\build-npm
setx project_root %project_root%

if exist %dist_dir% goto clean
:: there's no dist_dir so pull down reqd node versions
:: make a new dist and node dir and install them

pushd %systemroot%
if exist %deploy_dir% rd /s/q %deploy_dir%
if exist %node_dir% rd /s/q %node_dir%
setx deploy_dir %deploy_dir%
setx node_dir %node_dir%

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:path
set  PATH=%PATH%;c:\mozilla-build\python;c:\mozilla-build\7zip;c:\mozilla-build\vim\vim72;c:\Chocolatey\bin;c:\Program Files (x86)\Git\cmd;.\node_modules\.bin;c:\mozilla-build\msys\bin;%~dp0;
setx PATH "c:\mozilla-build\python;c:\mozilla-build\7zip;c:\mozilla-build\vim\vim72;c:\Chocolatey\bin;c:\Program Files (x86)\Git\cmd;.\node_modules\.bin;c:\mozilla-build\msys\bin;%~dp0;"
if "path"=="%1" goto eof

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:download
set node_release=%2
:: compact this into a downloads.md file later
mkdir %dist_dir% && pushd %dist_dir%
call aria2c http://nodejs.org/dist/%node_release%/node-%node_release%-x86.msi
call aria2c http://nodejs.org/dist/%node_release%/x64/node-%node_release%-x64.msi

:: install MSIs
:: TARGETDIR is the generally expected parameter name
:: APPLICATIONROOTDIRECTORY > 7.10
:: INSTALLDIR works only from > 0.10
:: each release uninstalls the older one, or a lower architecture
:: sadly, there is a good but annoying reason for this
:: some versions need to be removed before the subsequent one will
:: install to a different location.

start /wait msiexec /passive APPLICATIONROOTDIRECTORY="c:\node\%node_release%\x86" /i node-%node_release%-x86.msi /l*v node-%node_release%-x86.log
robocopy c:\node c:\node.deploy -e -move
start /wait msiexec /x node-%node_release%-x86.msi /qb- /l*v node-%node_release%-x86.rm.log

start /wait msiexec /passive APPLICATIONROOTDIRECTORY="c:\node\%node_release%\x64" /i node-%node_release%-x64.msi /l*v node-%node_release%-x64.log
robocopy c:\node c:\node.deploy -e -move
start /wait msiexec /x node-%node_release%-x64.msi /qb- /l*v node-%node_release%-x64.rm.log

:: the node versions will be copied back in :clean_all below
:: these are now callable via `cmd.exe /k "C:\node\v0.10.15\x86\nodevars.bat` etc

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:clean
:: copy them all back again and remove non-dist files
robocopy %deploy_dir% %node_dir% -mir -xd dist -log:NUL:
goto eof
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:eof
