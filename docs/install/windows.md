# Installing module-foundry on Windows

We have worked with Microsoft on this to make the installation and build experience on Windows to be as painless as possible, but _we're not Windows experts!_ Well we do have a resident [Windows expert](https://github.com/dch) which is why any of this exists in the first place.

But we need your help! If you encounter problems or you want to help with Windows support please [open an issue](https://github.com/nodejitsu/module-foundry) or reach-out to us! All of the configuration in [config.windows.json](https://github.com/nodejitsu/module-foundry/tree/master/config/config.windows.json)

* [Basic installation](#basic-installation)
* [SDKs & Tools](#sdks-and-tools)
* [Installing multiple version of node](#versions-of-node)

<a name="basic-installation"></a>
## Basic installation

Installing `module-foundry` itself it as easy as installing any other npm package:

```
npm install module-foundry -g
module-foundry
```

In addition to that you will need to make sure your machine contains appropriate compilers, SDKs, and common tools, to build most nodejs modules. This installation guide will walk you through this process.

<a name="sdks-and-tools"></a>
## SDKs & Tools

Given the manual nature of many MSI-based installers on Windows:

* [Windows .Net 4.0 _full_ install][dotnet]
* [Windows SDK 7.1][sdk] -- _(install all recommended components)_
* [Chocolatey][chocolatey] via oneliner

_Got 'em? Good._ Lets move on. If you're looking for a good chocolatey one-liner:

```powershell
@powershell -NoProfile -ExecutionPolicy unrestricted `
  -Command "iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))" `
  && SET PATH=%PATH%;%systemdrive%\chocolatey\bin
```

After chocolatey is installed, you can automate the installation of the next set of dependencies:

* [Mozilla Build tools 1.7][moztools]
* [Visual C++ 2008 redistributables][vcredist]
* [aria2c.exe][aria2c]
* [ntrights.exe as part of the windows 2003 resource kit][w2003rk]
* [git (msysgit)][msysgit]
* [Microsoft Security Essentials][mssece]

```
cinst vcredist2008
cinst rktools.2003
cinst git
cinst MozillaBuild
cinst aria2
cinst MicrosoftSecurityEssentials
```

Note that the MozillaBuild tools also come with msys, as usable unix emulation shell with make/makefile support. Be careful of incompatibilities between gcc in msys and cl.exe from Visual Studio. Generally people assume the latter on Windows, but node modules with Makefiles may only compile with the former. **Here be dragons.**

[aria2c]: http://aria2.sourceforge.net/
[msysgit]: http://code.google.com/p/msysgit/
[dotnet]: http://www.microsoft.com/en-us/download/details.aspx?id=17718
[chocolatey]: http://chocolatey.org/
[vcredist]: http://download.microsoft.com/download/1/1/1/1116b75a-9ec3-481a-a3c8-1777b5381140/vcredist_x86.exe
[sdk]: http://www.microsoft.com/en-us/download/details.aspx?id=8279
[moztools]: https://ftp.mozilla.org/pub/mozilla.org/mozilla/libraries/win32/MozillaBuildSetup-Latest.exe
[w2003rk]: http://www.microsoft.com/en-us/download/details.aspx?id=17657
[mssece]: http://www.microsoft.com/en-us/download/details.aspx?id=5201
[tools]: https://www.windowsazure.com/en-us/manage/linux/other-resources/command-line-tools
[CoRD]: http://cord.sourceforge.net/
[RDC]: http://www.microsoft.com/mac/remote-desktop-client
[rbenv]:  https://gist.github.com/dch/4739136
