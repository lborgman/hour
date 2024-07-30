@rem Run this before every commit
@echo =================================
@findstr "SW_VERSION" .\sw-input.js | findstr const
npx workbox-cli injectManifest