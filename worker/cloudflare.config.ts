import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "taskly-policy-web",
    entrypoint: "./index.mjs",
    compatibilityDate: "2026-11-15",
    domains: ["policies.taskly.iy0306.com"],
    workersDev: false,
    observability: {
      enabled: true,
      logs: { enabled: true, headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 1 },
      redactQueryString: true,
    },
    env: {
      POLICY_ASSETS: bindings.r2({ name: "taskly-policy-web" }),
    },
  },
});
