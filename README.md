# module-foundry

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
    --package, -p  Path to the package.json to build        [string]  [required]
    --url, -u      URL to the remote module-foundry server  [string]  [required]
    --file, -f     Path to local tarball to receive         [string]
    --command, -c  npm command to run                       [string]  [default: "build"]
    --help, -h     Display this message                     [boolean]

  Missing required arguments: package, url
```

#### Copyright (C) 2012 Nodejitsu Inc.
#### License: MIX