# HERO Rover Research & Decision Tracker

React + Vite + TypeScript app for the Campbell University HERO team to track NASA HERC 2026 rover research, engineering decisions, weighted decision matrices, requirements, test evidence, risks, traceability, and DRR/CDR export material.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Current storage

The app uses versioned `localStorage` persistence with backup JSON import/export and manual snapshots. There is no backend, Supabase, authentication, or paid API dependency yet.
