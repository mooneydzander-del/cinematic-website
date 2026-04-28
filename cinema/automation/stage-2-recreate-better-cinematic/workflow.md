# Workflow: Stage 2

1. **Verify**: Ensure Stage 1 is complete by checking `stage-1-complete.json`.
2. **Ingest**: Read `site-context.json`, `style-profile.json`, and `content-map.json` from the shared folder.
3. **Plan Redesign**: Create a new structural approach with premium cinematic upgrades (e.g., scroll reveals, GSAP layer motion, strong CTA visibility).
4. **Export**: Write the new structure and design strategy into `/automation/shared/cinematic-plan.json`.
5. **Complete**: When validation passes, create `/automation/stage-2-recreate-better-cinematic/output/stage-2-complete.json` exact format:

```json
{
  "stage": 2,
  "status": "complete",
  "timestamp": "[insert ISO timestamp]",
  "next_stage": "stage-3-finish-final-upgrades"
}
```
