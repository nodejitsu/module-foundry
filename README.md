# module-foundry

![](https://i.cloudup.com/mYC6chbBKF-3000x3000.png)

A web service for building node.js modules that runs on Linux, SmartOS and Windows.

* [Usage](#usage)
  * [Running a module-foundry server](#running-a-module-foundry-server)
  * [Requesting a build from module-foundry](#requesting-a-build-from-module-foundry)
  * [Streaming tarball builds](#streaming-tarball-builds)
* [Supporting native modules](#supporting-native-modules)
  * [Native module dependencies](#native-module-dependencies)
* [REST API](#rest-api)
* [Configuration](#configuration-available)
* [Probes](#probes)

## Usage

When using `module-foundry` there are two distinct scenarios:

* **Running a `module-foundry` server:** Starting up a `module-foundry` endpoint to build `npm` packages or node.js applications.
* **Requesting a build from `module-foundry`:** Once your `module-foundry` server is started you can request a new build using `foundry-build`.

### Running a module-foundry server

To start `module-foundry` simply install it globally with `npm` and then run `module-foundry` with the appropriate [config](#configuration-available) [file](/config/config.sample.json):

```
  npm install -g module-foundry
  [sudo] module-foundry -c /path/to/config/file.json
```

_Note: `sudo` is required on *nix platforms to change `uid` and `gid` of `npm` processes._

### Requesting a build from module-foundry

Once you have a [module-foundry server](#running-a-module-foundry-server) running you can request a build by using `foundry-build`:

```
  npm install -g module-foundry
  foundry-build -p /path/to/package.json --url http://your-module-foundry-server:port
```

By default `foundry-build` will not respond with the tarball that was built. You must specify this explicitly by using `--file|-f`. For example, if we wanted to build the binary module `bcrypt` we would use this package.json:

**example/packages/bcrypt.json**
``` js
  {
    "engines": { "node": "0.8.x" },
    "repository": {
      "type": "npm",
      "package": "bcrypt",
      "version": "0.7.7"
    }
  }
```

Then all we need to do pass this to `foundry-build`:

```
  $ foundry-build -p bcrypt.json --url http://localhost:1337 --file bcrypt-0.7.7.tgz
  Requesting: http://localhost:1337/build
  Streaming output to bcrypt-0.7.7.tgz
```

For `npm` specific builds you can also pass this information directly into `foundry-build`. _The below is equivalent to the above:_

```
  $ foundry-build --url http://localhost:1337 --npm "bcrypt@0.7.7"
  Requesting: http://localhost:1337/build
  Streaming output to bcrypt-0.7.7.tgz
```

Full help for `foundry-build` can be found by using `--help`:

```
  $ foundry-build --help
  usage: foundry-build -p /path/to/package.json -u http://module-foundry:port

  Options:
    --package, -p  Path to the package.json to build.
    --npm, -n      npm package to build (e.g. "pg@2.7.0").
    --engine, -e   Version of node.js to request build against.  [default: "0.8.x"]
    --input, -i    Expects streaming input from stdin
    --url, -u      URL to the remote module-foundry server       [required]
    --remote, -r   Remote file location to upload to
    --file, -f     Path to local tarball to receive
    --command, -c  npm command to run [build, install]           [default: "build"]
    --help, -h     Display this message
```

### Streaming tarball builds

It is possible to stream tarball builds to `module-foundry` using `npm pack`. Using `npm pack` ensures that all bundledDependencies are included in the tarball you send to `module-foundry`.

**Packaging your application or module**
``` sh
  $ npm pack my-app/
  # ...
  my-app-1.0.0.tgz
  npm info ok
```

**Sending your tarball to module-foundry**
``` sh
  cat my-app-1.0.0.tgz | foundry-build -u 'http://localhost:1337' -p my-app/package.json -f my-app-built.tgz -i
```

<hr>

## Supporting native modules

Installing `module-foundry` is easy with [npm][npm]:

```
  npm install -g module-foundry
```

but: ensuring that `module-foundry` works for **all native modules** on the other hand is quite difficult. We have done our best efforts to document the differences between Linux, SmartOS, and Windows:

* [SmartOS installation](/docs/install/smartos.md)
* [Linux installation](/docs/install/linux.md)
* [Windows installation](/docs/install/windows.md)

At [nodejitsu][nodejitsu], we run `module-foundry` on [SmartOS][smartos]. We have, however, tested `module-foundry` against other platforms for the most popular native Node.js modules:

```
#  npm git  dep pkg
1  8   773  185 ws
2  5   -    172 hiredis
3  8   1052 119 pg
4  7   1336 112 canvas
5  11  717  83  bcrypt
6  1   595  72  websocket
7  5   450  70  sqlite3
8  1   71   67  phantomjs
9  1   802  63  serialport
10 4   325  59  libxmljs
11 2   1017 58  fibers
12 2   234  56  iconv
13 2   -    48  node-expat
14 3   669  42  zmq
15 5   70   38  leveldown
16 1   127  38  microtime
17 1   407  37  node-sass
18 4   759  36  node-xmpp
19 2   98   36  buffertools
20 0   57   30  ref
```

### Native module dependencies

For each platform of the main Node.js platforms we have created a set of scripts to install the best fit OS packages (e.g. `apt`, `pkgsrc`) that will satisfy the native dependencies of the most popular native modules.

### Windows

Given the manual nature of many of the installers and MSIs for Windows we recommend that you read through the [Windows installation instructions](/docs/install/windows.md) which will walk you through the process step-by-step.

### SmartOS and Ubuntu

Given the more automated nature of using `apt` or `pkgsrc` these installations are relatively straight-forward:

``` sh
  $ MY_PLATFORM='smartos' # MY_PLATFORM='ubuntu'
  $ ./module-foundry/scripts/$MY_PLATFORM/dependencies.sh
  $ ./module-foundry/scripts/setup-node-gyp.sh
```
<hr>

## REST API

When using `module-foundry` over HTTP(S), there is only one route:

```
POST /build
```

But this route can be used in several different ways depending on the query string and HTTP headers. This mainly stems from `module-foundry` being capable of streaming a fully-built tarball **or** real-time `npm` logs.

### HTTP Headers

* `x-package-json`: Partial JSON stringified `package.json`. Only repository is required, but a full `package.json` is recommended.

### Query string options

* `npm-command`: Valid npm command to run when building the module. Valid values are `install` and `build`. If non-valid values are supplied then the default `install` is used.
* `stream`: If set to `true`, then the fully built tarball is streamed back to the HTTP(S) request **instead** of `npm` build logs. _(Defaults to false)_
* `webhook`: Remote HTTP(S) location to `POST` the fully built tarball to. _(Defaults to null)_
* `cpu`: Target CPU to build against. Valid values are `x86` or `x64`. If non-valid values are supplied, then the default is used.

### Request body data

Should send a application/tar+gzip (.tgz) file directly as data, not as a multipart upload. This archive should include a package/ prefix for all the source like `npm pack` does. The build will be placed in a build/ prefix, inside of the build/ prefix a couple of log related files will be present, the actual module will be placed in build/module/

<hr>

## Configuration available

Fine tuning your build process is important. With `module-foundry` there are a number of options available to help you change things like:

* What node versions are acceptable build targets.
* HTTP(S) interfaces and ports.
* Default environment variables to pass to `npm`.
* And more!

There are a number of sample configuration files:

* [config.sample.json](config/config.sample.json)
* [config.pkgcloud.json](config/config.pkgcloud.json)
* [config.localfiles.json](config/config.localfiles.json)
* [config.windows.json](config/config.windows.json)

Here's a full list of all available configuration options.

#### Spawning

* `spawning.user`: User to spawn build process as
* `spawning.group`: Group to spawn build process with
* `spawning.env`: Environmental variables to spawn build process with (can be overridden by plugins)
* `spawning.versions`: List of versions to support
* `spawning.platform`: Override platform build target
* `spawning.cpu`: Override target platform architecture (e.g. `x86` or `x64`).

#### Defaults

* `defaults`: Group of default options
* `defaults.env`: Default environment variables to set on the running npm process.
* `defaults.expand`: Default environment variables to _append_ to the running `module-foundry` process' environment variable value(s).
* `defaults.build.engines.node`: The `node` version to suggest when determining which version to use for the build process

#### HTTP(S) & Authorization

**Authorization**
* `unauthorized`: Group of options related to when authorization fails
* `unauthorized.ok`: Allow all privilege requests to succede
* `authorization`: Groups of properties related to authorization
* `authorization.header`: What the authorization header from http requests must match exactly.

**HTTP**
* `http.address`: IP address to bind the HTTP server to. _(Defaults to `::1`)_
* `http.port`: Port to listen on. _(Defaults to 80)_

**HTTPS**
* `https.address`: IP address to bind the HTTPS server to. _(Defaults to `::1`)_
* `https.port`: Port for the HTTPS server to listen on. _(Defaults to 443)_

#### Platform & Architecture

**platform**
A platform is any valid value from this set: `windows`, `linux`, `sunos`, `darwin`.

* `platform.{{platform}}.env`: Sets these environment variables on the `npm` process on the specified platform.
* `platform.{{platform}}.expand`: Appends these environment variables to the running `module-foundry` process' environment variable value(s) on the specified platform.

**arch**

An architecture is any valid value from this set: `x86`, or `x64`.

* `arch.{{arch}}.env`: Sets these environment variables on the `npm` process on the specified architecture.
* `arch.{{arch}}.expand`: Appends these environment variables to the running `module-foundry` process' environment variable value(s) on the specified architecture.

<hr>

## Probes

`module-foundry` uses [understudy] to provide Javascript probes to alter it's behavior.

#### HTTP Probes

* `http.incoming (HttpRequest, HttpResponse, next)`: When an http request arrives, this could be from any server `module-foundry` was told to listen on
* `http.authorization (HttpRequest, HttpResponse, next)`: When trying to determine if a request is authorized, set `HttpRequest.authorization` appropriately
* `http.authorized (HttpRequest, HttpResponse, next)`: When a request has been determined to be routed according to authorized principles
* `http.unauthorized (HttpRequest, HttpResponse, next)`: When a request has been determined to be routed according to unauthorized principles

#### Build (module-smith) Probes

Building is deferred to another actor, the BuildBot, which is an instance of [module-smith][module-smith] please refer to it's probes as well.

* `build.create (BuildBot, next)`: When you want to hook up to a new BuildBot

#### BuildBot Probes

These probes are emitted _in this order._

1. `build.configure (err, JobDescription)`: When you want to edit the overall configuration of a build. The `repository` property matches the options used by [`checkout`][checkout].
2. `npm.configure (err, JobDescription)`: When you want to edit the options when spawning `npm`.
3. `npm.package (err, JobDescription, package)`: When you want to modify something in the `package.json` that will be rewritten to disk. This is very useful for modifying absolute paths in `.scripts`
4. `npm.spawned (JobDescription, builderProcess)`: For hooking up directly to `npm` output.
4. `build.output (err, JobDescription, stream)`: Full build output. Use the `stream` to pipe to additional targets.

<hr>
#### Copyright (C) 2012 Nodejitsu Inc.
#### Contributors: [Bradley Meck](https://github.com/bmeck), [Charlie Robbins](https://github.com/indexzero)
#### License: MIT

_Factory Icon by Lil Squid from The Noun Project_

[npm]: https://npmjs.org
[nodejitsu]: https://nodejitsu.com
[smartos]: http://smartos.org