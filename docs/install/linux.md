# Installing module-foundry on Linux

**Linux users: We need your help making this better! Add missing dependencies for binary modules: https://github.com/nodejitsu/module-foundry**

Getting setup using `module-foundry` on SmartOS is relatively straight-forward. We use `module-foundry` in production on SmartOS at [nodejitsu.com](https://nodejitsu.com), so this is by far the most thoroghly tested platform.

```
[sudo] npm install module-foundry -g
./module-foundry/scripts/smartos/dependencies.sh
./module-foundry/scripts/setup-node-gyp.sh
```

And that's it!