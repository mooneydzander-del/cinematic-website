# Workflow: Stage 1

1. **Input**: Receive the target website URL.
2. **Scrape**: Execute scraping tool (e.g., Firecrawl) to pull DOM strings, CSS variables, and asset lists.
3. **Analyze**: Break down the content into layout patterns, hierarchy, and color schemes.
4. **Export shared files**:
   - Write business info to `/automation/shared/site-context.json`.
   - Write brand colors and design tokens to `/automation/shared/style-profile.json`.
   - Write copy and page structure to `/automation/shared/content-map.json`.
5. **Complete**: When validation passes, create `/automation/stage-1-firecrawl-theme/output/stage-1-complete.json` exact format:

```json
{
  "stage": 1,
  "status": "complete",
  "timestamp": "[insert ISO timestamp]",
  "next_stage": "stage-2-recreate-better-cinematic"
}
```
