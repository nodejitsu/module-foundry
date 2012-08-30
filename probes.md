# Probes

Module-Foundry uses Understudy to provide JS Probes to alter it's behavior.

## HTTP Probes

### http.incoming (HttpRequest, HttpResponse, next)

When an http request arrives, this could be from any server Module-Foundry was told to listen on

### http.authorization (HttpRequest, HttpResponse, next)

When trying to determine if a request is authorized, set `HttpRequest.authorization` appropriately

### http.authorized (HttpRequest, HttpResponse, next)

When a request has been determined to be routed according to authorized principles

### http.unauthorized (HttpRequest, HttpResponse, next)

When a request has been determined to be routed according to unauthorized principles

## Build Probes

Building is deferred to another actor, the BuildBot, please refer to it's probes as well.

### build.create (BuildBot, next)

When you want to hook up to a new BuildBot

## BuildBot Probes

## build.configure (err, JobDescription)

When you want to edit the overall configuration of a build

## repository.configure (err, RepositoryDescription)

When you want to change destination / source of the repository of the module (generally irrelevant if using streams).

RepositoryDescription matches the `checkout` npm module option set.

## npm.configure (err, spawnOptions)

When you want to edit the options when spawning `npm`

Matches `forever-monitor` spawnOptions closely without options re

## npm.wait(childProcess)

When you want to hook up to a live npm process.