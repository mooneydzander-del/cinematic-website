# Handoff Rules

- No stage may start unless the previous stage completion file exists and says `"status": "complete"`.
- Every stage must read from `/automation/shared/` first before doing any work.
- All stages must log what they consumed, what they produced, and whether they passed validation.
- If a required input file is missing, stop and write an error to `pipeline-status.json`.
- Do not guess missing data. Mark anything uncertain as `"unconfirmed"`.
