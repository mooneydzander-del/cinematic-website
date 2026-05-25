# Orchestrator: Run Pipeline

## Goal
Coordinate the 3-stage cinematic website transformation pipeline.

## Process
1. Initialize `pipeline-status.json` (set current stage to 1).
2. Run **Stage 1 (Firecrawl Theme)**.
3. Confirm `automation/stage-1-firecrawl-theme/output/stage-1-complete.json` exists and its status is `complete`.
4. Update `pipeline-status.json` to stage 2.
5. Run **Stage 2 (Recreate Better Cinematic)**.
6. Confirm `automation/stage-2-recreate-better-cinematic/output/stage-2-complete.json` exists and its status is `complete`.
7. Update `pipeline-status.json` to stage 3.
8. Run **Stage 3 (Finish Final Upgrades)**.
9. Confirm `automation/stage-3-finish-final-upgrades/output/stage-3-complete.json` exists and its status is `complete`.
10. Write final pipeline summary to `automation/shared/final-report.md` and mark `pipeline-status.json` as finished.

## Execution
To run the full pipeline, initiate the orchestrator agent and point it to this file to begin managing the stages according to `handoff-rules.md`.
