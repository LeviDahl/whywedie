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

The age-adjusted rate fell from 205.5 per 100,000 in 2006 to 179.1 in 2010,
a drop of about 13% in four years. From 2010 to 2019 it kept falling, but
slower: down to 161.5 by 2019, roughly 10% over nine years. The direction
never reversed before COVID. What changed around 2011 was the *pace*.

Researchers point to a few likely reasons. The steepest gains of the
previous decades, statins going generic, smoking rates falling, faster
treatment for heart attacks, had mostly already happened by the late
2000s; there was less low-hanging fruit left to pick. At the same time,
rising obesity and diabetes were working against the trend, adding new
cardiovascular risk even as treatment kept improving. Some researchers
have also raised the possibility of shifts in how deaths get coded and
certified, though that's harder to quantify. None of this is fully
settled science, and CDC's own numbers can't tell you which factor did
how much.

One thing the age-adjusted rate hides: the raw death count in the second
chart above started climbing almost immediately after 2011, from 596,577
that year to 659,041 by 2019. A slower decline in the rate, against a
larger and older population, is enough to push the total up even while
the risk per person keeps falling.

## The spike

Then 2020. The age-adjusted rate jumped from 161.5 to 168.2, and kept
climbing to 173.8 in 2021, before receding to 167.2 in 2022. Some of that
is direct: COVID-19 can trigger fatal cardiac events in people with
existing heart disease, and NCHS's own analyses describe exactly that
overlap. Some of it is indirect, deferred care, missed diagnoses, and
the general strain of the pandemic years on a system already stretched
thin. Untangling how much of the spike is "COVID killed someone whose
heart was already failing" versus "a heart condition went unmanaged
because of COVID" isn't something the underlying-cause data can settle
on its own; both were almost certainly happening at once.

The rate has since pulled back: 162.1 in 2023, then 157.6 in 2024, below
its pre-COVID 2019 level. 2025 ticks back up to 160.3, but that figure is
still provisional and could move. One year isn't a trend, especially a
year CDC hasn't finished counting yet.

## A note on the data

These figures are national all-ages counts from CDC WONDER, underlying
cause of death only. The 2024–2025 points are still CDC **provisional** and
are drawn muted here. Nothing on this page is a comparability-adjusted
series — read the shape, not any single year-over-year step.
