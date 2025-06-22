[01:02:57.414] Running build in Washington, D.C., USA (East) – iad1
[01:02:57.531] Cloning github.com/Bunkheang-heng/2025_Plan (Branch: master, Commit: ac0d8ce)
[01:02:58.284] Cloning completed: 753.055ms
[01:02:58.379] Previous build cache not available
[01:02:58.632] Running "vercel build"
[01:03:05.484] Vercel CLI 39.2.5
[01:03:05.860] Installing dependencies...
[01:03:22.321] 
[01:03:22.321] added 461 packages in 16s
[01:03:22.322] 
[01:03:22.322] 145 packages are looking for funding
[01:03:22.322]   run `npm fund` for details
[01:03:22.382] Detected Next.js version: 15.1.3
[01:03:22.389] Running "npm run build"
[01:03:23.124] 
[01:03:23.125] > plan2025@0.1.0 build
[01:03:23.125] > next build
[01:03:23.126] 
[01:03:25.022] Attention: Next.js now collects completely anonymous telemetry regarding usage.
[01:03:25.023] This information is used to shape Next.js' roadmap and prioritize features.
[01:03:25.023] You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
[01:03:25.023] https://nextjs.org/telemetry
[01:03:25.023] 
[01:03:25.130]    ▲ Next.js 15.1.3
[01:03:25.131] 
[01:03:25.156]    Creating an optimized production build ...
[01:03:28.184] (node:235) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
[01:03:28.184] (Use `node --trace-deprecation ...` to show where the warning was created)
[01:03:36.456] (node:287) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
[01:03:36.456] (Use `node --trace-deprecation ...` to show where the warning was created)
[01:03:40.698]  ✓ Compiled successfully
[01:03:40.703]    Linting and checking validity of types ...
[01:03:44.597] 
[01:03:44.597] Failed to compile.
[01:03:44.601] 
[01:03:44.601] ./src/app/create/page.tsx
[01:03:44.601] 23:38  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[01:03:44.601] 69:6  Warning: React Hook useEffect has a missing dependency: 'fetchPlans'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
[01:03:44.601] 
[01:03:44.601] ./src/app/login/page.tsx
[01:03:44.602] 23:14  Error: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
[01:03:44.602] 
[01:03:44.602] ./src/app/plan/page.tsx
[01:03:44.602] 11:38  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[01:03:44.602] 33:6  Warning: React Hook useEffect has a missing dependency: 'fetchPlans'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
[01:03:44.602] 
[01:03:44.602] ./src/app/profile/page.tsx
[01:03:44.602] 10:36  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[01:03:44.602] 
[01:03:44.602] info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
[01:03:44.635] Error: Command "npm run build" exited with 1
[01:03:45.096] 