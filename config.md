# Config


##

### Spawning

`spawning.user`

User to spawn build process as

`spawning.group`

Group to spawn build process with

`spawning.env`

Environmental variables to spawn build process with (can be overridden by plugins)

`spawning.versions`

List of versions to support

### Defaults

`defaults`

Group of default options

`defaults.version`

The Node version to suggest when determining which version to use for the build process

### Authorization

`unauthorized`

Group of options related to when authorization fails

`unauthorized.ok`

Allow all privilege requests to succede

`authorization`

Groups of properties related to authorization

`authorization.header`

What the authorization header from http requests must match exactly.

### Http

`http`
`http.port`
`whitelist`

An array of objects telling wherere the remote connections are allowed to come from

```
{ip:,port:}
```

### Https

`https`
`https.port`
`whitelist`

```
{ip:,port:}
```
