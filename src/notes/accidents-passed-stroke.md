---
title: "America's #3 cause of death quietly changed"
date: "2026-09-10"
description: "Stroke was the third-leading cause of death in the US for most of a century. Around 2015, accidents passed it — and haven't given the spot back."
---

<script setup>
import ArticleFigure from '@/components/ArticleFigure.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'

const YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const ACCIDENTS = [120859, 126438, 127792, 130557, 135928, 146571, 161374, 169936, 167127, 173040, 200955, 224935, 227039, 222698, 197449, 186335]
const STROKE = [129476, 128932, 128546, 128978, 133103, 140323, 142142, 146383, 147810, 150005, 160264, 162890, 165393, 162639, 166852, 171517]
const MUTED = YEARS.map((y) => y >= 2024)

const SERIES = [
  { label: 'Accidents (unintentional injuries)', values: ACCIDENTS, muted: MUTED },
  { label: 'Stroke (cerebrovascular disease)', values: STROKE, muted: MUTED }
]
</script>

Ask most people to name the leading causes of death in America and you'll hear
heart disease, cancer, and stroke, in that order. That was true for decades. It
isn't anymore.

Around **2015**, deaths from *accidents* (the CDC's catch-all for unintentional
injuries like car crashes, falls, and, increasingly, drug overdoses) pulled ahead
of stroke, and they've held the #3 spot every year since. The gap blew open during
the pandemic, when accident deaths jumped from about 173,000 in 2019 to **227,000
in 2022**, most of that the overdose crisis. Both have eased a little since, but
accidents are still ahead.

<ArticleFigure
  caption="US deaths per year: accidents vs. stroke, 2010–2025"
  source="CDC WONDER (NCHS 113-cause list; 2024–25 provisional)"
>
  <TimeSeriesChart
    :labels="YEARS"
    :series="SERIES"
    series-label="Deaths"
    :value-formatter="(v) => v?.toLocaleString() ?? '—'"
    muted-label="provisional"
    png-name="whywedie-note-accidents-stroke"
    png-source="CDC WONDER"
    aria-label="Line chart: US deaths from accidents overtaking deaths from stroke around 2015."
  />
</ArticleFigure>

Heart disease and cancer, for the record, haven't budged from #1 and #2 — together
they still account for a little under half of all US deaths. It's the rung below
them that's been rearranged.
See the full ranking on [Causes of Death](/causes-of-death).
