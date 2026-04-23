# Deploy Targets

## Source of truth
- **Repository**: `dalelalmuslim/dalelalmuslim.github.io`
- **Primary branch**: `main`

## Current deployment targets
### 1) Live manual deploy
- **Cloudflare project**: `dalil-almuslim-web`
- **Status**: live and verified
- **Flow**: Direct Upload
- **Artifact**: `dalil-almuslim-dist.zip`

### 2) Git-integrated build candidate
- **Cloudflare project**: `dalil-almuslim`
- **Status**: not reliable yet
- **Known issue**: dependency install timeout during Cloudflare build
- **Decision**: do not use as canonical live target until build pipeline is stabilized

## Operational rule
حتى إشعار آخر:
- **الكود** يذهب إلى GitHub أولًا
- **النشر الحي** يذهب إلى `dalil-almuslim-web` عبر zip artifact
- لا نعتمد مشروع `dalil-almuslim` كوجهة إنتاجية نهائية حاليًا
