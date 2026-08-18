# LabelTruth

LabelTruth decodes packaged food ingredient labels into plain-English signals: additives, hidden sugars, allergens, unknowns, and a traffic-light rating.

## Workspace

- `apps/web` - React + TypeScript frontend.
- `apps/api` - Express + TypeScript API skeleton.
- `packages/shared` - deterministic ingredient parsing and scoring logic shared by web and API.

## First Milestone

The current build focuses on a working ingredient-text analyzer. OCR and database-backed lookup are intentionally separated so the product experience and scoring model can be tested before the harder image pipeline is added.

## Commands

```sh
npm install
npm run dev
npm run dev:api
npm run typecheck
```

## Next Technical Milestones

1. Add OCR ingestion to `apps/api`.
2. Persist scan cache/history with PostgreSQL and Prisma.
3. Connect Open Food Facts/additive references.
4. Add OpenAI explanations for matched facts only.
