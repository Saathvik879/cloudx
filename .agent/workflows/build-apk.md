---
description: Build Android APK using EAS
---

1. Install dependencies
   cd mobile-client && npm install

2. Configure EAS (idempotent)
   cd mobile-client && npx eas-cli build:configure --platform android

3. Build APK
   cd mobile-client && npx eas-cli build -p android --profile preview --non-interactive
