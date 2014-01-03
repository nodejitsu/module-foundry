# Installing module-foundry on SmartOS

**SmartOS users: We need your help making this better! Add missing dependencies for binary modules: https://github.com/nodejitsu/module-foundry**

Getting setup using `module-foundry` on Linux is relatively straight-forward. Currently Ubuntu is the only tested platform, but we welcome submissions that would add support for additional Linux distributions.

```
[sudo] npm install module-foundry -g
./module-foundry/scripts/ubuntu/dependencies.sh
./module-foundry/scripts/setup-node-gyp.sh
```

And that's it!