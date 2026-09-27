// DHRE AI Engine — rule-based summarizer.
// Computes health scores, auto-status, and time-bucketed summaries
// (days / weeks / months / years) from site data. No external API needed.

export function computeHealth(site) {
  const total = (site.totalCameras || 0) + (site.totalANPR || 0)
  const offline =
    (site.offlineCameras || 0) +
    (site.offlineANPR || 0) +
    (site.notWorkingANPR || 0) +
    (site.notWorkingGate || 0) +
    (site.notWorkingIntercom || 0)
  const health = total ? Math.max(0, 100 - Math.round((offline / total) * 100)) : 100
  const newStatus = offline === 0 ? 'Completed' : offline > 5 ? 'Issue Found' : 'In Progress'
  return { health, newStatus, offline, total }
}

export function autoUpdateSite(site, incidents, accidents) {
  const { health, newStatus, offline } = computeHealth(site)
  const siteIncidents = incidents.filter((i) => i.siteId === site.id)
  const siteAccidents = accidents.filter((a) => a.siteId === site.id)
  const aiNote = `AI auto-update ${new Date().toLocaleString()}: Health ${health}% — ${offline} offline/not working — ${siteIncidents.length} incidents, ${siteAccidents.length} accidents — synced to Main Dashboard`
  return { ...site, status: newStatus, notes: aiNote, _health: health }
}

export function autoUpdateAll(sites, incidents, accidents) {
  return sites.map((s) => autoUpdateSite(s, incidents, accidents))
}

// ---- Time-bucketed summaries ----

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function startOfWeek(d) { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x }
function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x }
function startOfYear(d) { const x = new Date(d); x.setMonth(0, 1); x.setHours(0, 0, 0, 0); return x }

const DAY = 86400000

export function summarizeByPeriod(sites, incidents, accidents, now = new Date()) {
  const periods = {
    days: { label: 'Today', start: startOfDay(now), buckets: [] },
    weeks: { label: 'This Week', start: startOfWeek(now), buckets: [] },
    months: { label: 'This Month', start: startOfMonth(now), buckets: [] },
    years: { label: 'This Year', start: startOfYear(now), buckets: [] },
  }

  const allDates = []
  sites.forEach((s) => { if (s.date) allDates.push(s.date) })
  incidents.forEach((i) => { if (i.date) allDates.push(i.date) })
  accidents.forEach((a) => { if (a.date) allDates.push(a.date) })

  // Build 30 daily buckets (last 30 days), 12 weekly, 12 monthly, 5 yearly
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOfDay(now) - i * DAY)
    periods.days.buckets.push({ date: d, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), sites: [], incidents: [], accidents: [] })
  }
  for (let i = 0; i < 12; i++) {
    const d = new Date(startOfWeek(now) - i * 7 * DAY)
    periods.weeks.buckets.push({ date: d, label: `W/C ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, sites: [], incidents: [], accidents: [] })
  }
  for (let i = 0; i < 12; i++) {
    const d = new Date(startOfMonth(now)); d.setMonth(d.getMonth() - i)
    periods.months.buckets.push({ date: d, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), sites: [], incidents: [], accidents: [] })
  }
  for (let i = 0; i < 5; i++) {
    const d = new Date(now); d.setFullYear(d.getFullYear() - i)
    periods.years.buckets.push({ date: d, label: d.getFullYear().toString(), sites: [], incidents: [], accidents: [] })
  }

  const getBucket = (buckets, dateStr) => {
    const d = new Date(dateStr)
    return buckets.find((b) => {
      if (buckets === periods.days.buckets) return startOfDay(b.date).getTime() === startOfDay(d).getTime()
      if (buckets === periods.weeks.buckets) return startOfWeek(b.date).getTime() === startOfWeek(d).getTime()
      if (buckets === periods.months.buckets) return startOfMonth(b.date).getTime() === startOfMonth(d).getTime()
      return b.date.getFullYear() === d.getFullYear()
    })
  }

  sites.forEach((s) => {
    if (!s.date) return
    const b1 = getBucket(periods.days.buckets, s.date)
    if (b1) b1.sites.push(s)
    const b2 = getBucket(periods.weeks.buckets, s.date)
    if (b2) b2.sites.push(s)
    const b3 = getBucket(periods.months.buckets, s.date)
    if (b3) b3.sites.push(s)
    const b4 = getBucket(periods.years.buckets, s.date)
    if (b4) b4.sites.push(s)
  })

  incidents.forEach((i) => {
    if (!i.date) return
    const b1 = getBucket(periods.days.buckets, i.date)
    if (b1) b1.incidents.push(i)
    const b2 = getBucket(periods.weeks.buckets, i.date)
    if (b2) b2.incidents.push(i)
    const b3 = getBucket(periods.months.buckets, i.date)
    if (b3) b3.incidents.push(i)
    const b4 = getBucket(periods.years.buckets, i.date)
    if (b4) b4.incidents.push(i)
  })

  accidents.forEach((a) => {
    if (!a.date) return
    const b1 = getBucket(periods.days.buckets, a.date)
    if (b1) b1.accidents.push(a)
    const b2 = getBucket(periods.weeks.buckets, a.date)
    if (b2) b2.accidents.push(a)
    const b3 = getBucket(periods.months.buckets, a.date)
    if (b3) b3.accidents.push(a)
    const b4 = getBucket(periods.years.buckets, a.date)
    if (b4) b4.accidents.push(a)
  })

  const summarize = (bucket) => {
    const siteHealth = bucket.sites.map((s) => computeHealth(s).health)
    const avgHealth = siteHealth.length ? Math.round(siteHealth.reduce((a, b) => a + b, 0) / siteHealth.length) : 0
    const offlineCam = bucket.sites.reduce((a, s) => a + (s.offlineCameras || 0), 0)
    const offlineANPR = bucket.sites.reduce((a, s) => a + (s.offlineANPR || 0) + (s.notWorkingANPR || 0), 0)
    const openIncidents = bucket.incidents.filter((i) => i.status === 'Open').length
    const openAccidents = bucket.accidents.filter((a) => a.status === 'Open').length
    return {
      label: bucket.label,
      date: bucket.date,
      sites: bucket.sites.length,
      avgHealth,
      offlineCam,
      offlineANPR,
      incidents: bucket.incidents.length,
      accidents: bucket.accidents.length,
      openIncidents,
      openAccidents,
    }
  }

  return {
    days: { label: 'Daily (last 30 days)', buckets: periods.days.buckets.map(summarize) },
    weeks: { label: 'Weekly (last 12 weeks)', buckets: periods.weeks.buckets.map(summarize) },
    months: { label: 'Monthly (last 12 months)', buckets: periods.months.buckets.map(summarize) },
    years: { label: 'Yearly (last 5 years)', buckets: periods.years.buckets.map(summarize) },
  }
}

export function generateNarrative(sites, incidents, accidents, now = new Date()) {
  const { health, offline } = computeHealth(sites[0] || {})
  const allHealth = sites.map((s) => computeHealth(s).health)
  const avgHealth = allHealth.length ? Math.round(allHealth.reduce((a, b) => a + b, 0) / allHealth.length) : 0
  const totalOffline = sites.reduce((a, s) => {
    const h = computeHealth(s)
    return a + h.offline
  }, 0)
  const openIncidents = incidents.filter((i) => i.status === 'Open').length
  const openAccidents = accidents.filter((a) => a.status === 'Open').length
  const criticalSites = sites.filter((s) => computeHealth(s).health < 50).length

  const today = startOfDay(now)
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const lines = [
    `AI Summary for ${todayStr}:`,
    `• ${sites.length} sites tracked • average health ${avgHealth}%`,
    `• ${totalOffline} devices offline/not working across all sites`,
    `• ${openIncidents} open incidents • ${openAccidents} open accidents`,
    criticalSites > 0 ? `• ${criticalSites} sites below 50% health — immediate attention needed` : `• All sites above 50% health — good standing`,
  ]

  const summary = summarizeByPeriod(sites, incidents, accidents, now)
  const thisMonth = summary.months.buckets[0]
  const thisWeek = summary.weeks.buckets[0]
  const todayBucket = summary.days.buckets[0]

  lines.push(
    `• Today: ${todayBucket.sites} sites inspected, ${todayBucket.incidents} incidents, ${todayBucket.accidents} accidents`,
    `• This week: ${thisWeek.sites} sites inspected, ${thisWeek.incidents} incidents, ${thisWeek.accidents} accidents`,
    `• This month: ${thisMonth.sites} sites inspected, ${thisMonth.incidents} incidents, ${thisMonth.accidents} accidents`,
  )

  return lines.join('\n')
}
