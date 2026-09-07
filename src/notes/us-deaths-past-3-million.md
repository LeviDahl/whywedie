---
title: "US deaths first passed 3 million in 2021"
date: "2026-09-08"
description: "Annual US deaths crossed three million for the first time in 2021, and have stayed there since — driven by COVID-19 and a large, ageing population."
draft: true
---

<script setup>
import ArticleFigure from '@/components/ArticleFigure.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const DEATHS = [
  2712630, 2744248, 2813503, 2839205, 2854838,
  3383729, 3464231, 3279857, 3090964, 3090000, 3096850
]
const MUTED = YEARS.map((y) => y >= 2024)
</script>

> **Draft.** A scaffold for the Data Note format — replace the copy, keep it short.
> One chart, a paragraph or two. Longer treatment goes in an Article instead.

For all of US history, annual deaths had never reached three million. In 2020 they
jumped to about 3.38 million as COVID-19 arrived, and in 2021 — a full pandemic
year — they stayed above three million. They have not dropped back below it since.

<ArticleFigure caption="Total US deaths per year, 2015–2025" source="CDC WONDER">
  <TimeSeriesChart
    :labels="YEARS"
    :values="DEATHS"
    :muted-points="MUTED"
    muted-label="provisional"
    series-label="Deaths"
    :value-formatter="(v) => v?.toLocaleString() ?? '—'"
    png-name="whywedie-note-deaths-3m"
    png-source="CDC WONDER"
    aria-label="Line chart: total US deaths per year, 2015 to 2025, crossing three million in 2020."
  />
</ArticleFigure>

Some of the rise is simply scale: the US population is larger and older every
year, so even a flat death *rate* means more deaths. The age-adjusted rate, which
controls for that, tells a different story — see
[Death Statistics](/death-statistics).
