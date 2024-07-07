@echo =================================
@findstr "SW_VERSION" .\sw-input.js | findstr const
npx workbox-cli injectManifest