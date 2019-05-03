# TypeScript

___________________________________

To simply installing the runtime you can use following snippet:
```ts
import * as OfflinePluginRuntime from 'offline-plugin/runtime';
OfflinePluginRuntime.install();
```

This example shows how to set the install options:
```ts
import * as OfflinePluginRuntime from 'offline-plugin/runtime';

OfflinePluginRuntime.install({
  onUpdateReady: () => OfflinePluginRuntime.applyUpdate(),
  onUpdated: () => location.reload(),
});
```

If you need to resolve the typescript definition file manually then
you can add this line to your TypeScript file:
```ts
/// <reference path="node_modules/offline-plugin/runtime.d.ts" />
```
