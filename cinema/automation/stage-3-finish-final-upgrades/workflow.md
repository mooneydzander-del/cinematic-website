# Workflow: Stage 3

1. **Verify**: Ensure Stage 2 is complete (`stage-2-complete.json`).
2. **Ingest**: Read `cinematic-plan.json` and all earlier shared artifacts from `/automation/shared/`.
3. **Polish**: Review execution plan, optimize code/performance considerations, check structural responsiveness, and tighten interaction design guidelines.
4. **Report**: Summarize the final state, upgrades applied, and validation results in `/automation/shared/final-report.md`.
5. **Complete**: When validation passes, create `/automation/stage-3-finish-final-upgrades/output/stage-3-complete.json` exact format:

```json
{
  "stage": 3,
  "status": "complete",
  "timestamp": "[insert ISO timestamp]",
  "next_stage": null
}
```
