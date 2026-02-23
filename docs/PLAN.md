# 🎼 Orchestration Plan: Vite Optimization & Build Fixes

## Goal
The previous deployment steps succeeded, but the Vite production build reported a chunk size warning (chunk > 500kB). The user also invoked several workflows (`stitch-loop`, `react:components`, `deploy`). This plan addresses the performance warning and clarifies the next steps for workflow execution.

## Proposed Strategy

1. **Vite Build Optimization (`dashboard/vite.config.ts`)**:
   - Add `build.rollupOptions.output.manualChunks` to separate vendor libraries (like `react`, `react-dom`, charting libraries, etc.) from the main application code.
   - This prevents the "larger than 500 kB" warning and improves load performance.

2. **Sub-agent Operations (Phase 2)**:
   - **`performance-optimizer`**: Will implement the Vite config split.
   - **`frontend-specialist`**: Will ensure the chunk splitting doesn't break lazy loading or routing.
   - **`devops-engineer`**: Will re-run `/deploy check` or the `npm run build` step to verify the fix.

3. **Clarification on Workflows**:
   - You also triggered `@[/stitch-loop]` and `@[/react:components]`. 
   - Before I execute them, please confirm if you have a specific UI generation task pending in `next-prompt.md` or a Stitch design to convert, OR if you just want to proceed with the Vite build optimization and deployment.

## User Action Required
Do you approve this plan?
- **Y**: I will proceed with fixing the Vite chunk warning and deploying.
- **N**: Let me know if you meant to focus on the UI generation workflows instead.
