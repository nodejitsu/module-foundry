# module-foundry

![](https://i.cloudup.com/mYC6chbBKF-3000x3000.png)

A web service for building node.js modules that runs on Linux, SmartOS and Windows.

## Usage

When using `module-foundry` there are two distinct scenarios:

* **Running a `module-foundry` server:** Starting up a `module-foundry` endpoint to build `npm` packages or node.js applications.
* **Requesting a build from `module-foundry`:** Once your `module-foundry` server is started you can request a new build using `foundry-build`.

### Running a module-foundry server

To start `module-foundry` simply install it globally with `npm` and then run `module-foundry` with the appropriate [config](/docs/config.md) [file](/config/config.sample.json):

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
    --file, -f     Path to local tarball to receive
    --command, -c  npm command to run [build, install]           [default: "build"]
    --help, -h     Display this message

  Missing required arguments: package, url
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

#### Copyright (C) 2012 Nodejitsu Inc.
#### License: MIT