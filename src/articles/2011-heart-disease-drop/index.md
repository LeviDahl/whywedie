---
title: "The 2011 Heart-Disease Dip — and the Spike That Followed"
date: "2026-09-06"
description: "Heart-disease deaths flattened around 2011 after decades of steady decline, then jumped sharply in 2020–21. A look at what the data does and doesn't tell us."
tags: [heart-disease, methodology, covid-19]
draft: true
---

<script setup>
import ArticleFigure from '@/components/ArticleFigure.vue'
import HeartDiseaseDeaths from './HeartDiseaseDeaths.vue'
</script>

> **Draft.** This is a scaffold for the article format — the prose below is a
> skeleton, not a finished piece. Replace it, keep the structure.

For most of the last half-century, the story of heart disease in America was
one of steady, almost monotonic decline. Then, around 2011, the line went
flat — and a decade later it lurched upward.

## What the numbers show

<ArticleFigure
  caption="US deaths from diseases of the heart, 2006–2025"
  source="CDC WONDER (ICD-10 I00–I09, I11, I13, I20–I51)"
>
  <HeartDiseaseDeaths metric="deaths" />
</ArticleFigure>

The raw count of deaths is shaped partly by a growing, aging population. The
**age-adjusted rate** strips that out — and it's where the 2011 change of
slope is clearest:

<ArticleFigure
  caption="Age-adjusted death rate, diseases of the heart, per 100,000"
  source="CDC WONDER"
>
  <HeartDiseaseDeaths metric="rate" />
</ArticleFigure>

## The dip

TODO: the long decline (statins, smoking cessation, revascularization,
faster STEMI care) and why progress stalled around 2011 — obesity and
diabetes prevalence, plateauing treatment gains, possible coding shifts.

## The spike

TODO: 2020–2021. How much is COVID-19 assigned to heart disease vs.
deferred care, missed diagnoses, and stress during the pandemic. Note the
partial recovery in 2023.

## A note on the data

These figures are national all-ages counts from CDC WONDER, underlying
cause of death only. The 2024–2025 points are still CDC **provisional** and
are drawn muted here. Nothing on this page is a comparability-adjusted
series — read the shape, not any single year-over-year step.
