import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Every build gets a version id: the git commit Vercel is building, or a timestamp for
// local builds. It is baked into the bundle (__APP_VERSION__) and also written to
// /version.json, so a running app can poll that file and notice a newer deployment
// (see src/components/UpdatePrompt.jsx).
const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`
const builtAt = new Date().toISOString()

function versionFile() {
  return {
    name: 'sts-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: appVersion, builtAt }),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILT_AT__: JSON.stringify(builtAt),
  },
})
