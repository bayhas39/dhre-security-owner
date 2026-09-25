import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, User, Building2, ClipboardCheck, Pencil, Save, X, Video, Camera, ScanSearch, WifiOff, AlertTriangle, FileText, ShieldCheck, HardHat, Home, Factory, ArrowLeft, Phone, Mail, Briefcase, Calendar, CheckCircle2, Plus, Trash2, Edit3 } from 'lucide-react'
import { Toaster, toast } from 'sonner'

function genId(){ return Math.random().toString(36).slice(2,9) }
function genDeterministicId(i){ return 'site-' + String(i).padStart(3,'0') + '-' + String(1000 + ((i*7331)%9000)) }

function generate80Sites(){
  const areas = ['Dubai Marina','Palm Jumeirah','Al Quoz','Downtown','Business Bay','JVC','Dubailand','Deira','Al Barsha','Sports City','JLT','Motor City','Arabian Ranches','Mirdif','AD - Corniche','Sharjah Ind','Ajman Free Zone','Ras Al Khaimah']
  const blocks = ['Block A','Block B','Tower A','Tower B','Plot 12','Plot 7','Unit 4B','Warehouse 7','Level 24','Phase 2','Gate 3','Zone C','Building 5','Complex 8']
  const types = ['Construction','Property','Safety','Industrial','Handover']
  const statuses = ['Pending','In Progress','Completed','Issue Found']
  const inspectors = ['Ahmed R.','Sarah M.','Khalid H.','Lisa K.','Omar S.','Priya N.','Youssef A.','Fatima K.','David L.','Noura H.']
  const notesPool = ['Rebar inspection + formwork check','Pre-handover snagging','Fire safety passed','Floor tolerance failed','CCTV alignment pending','ANPR calibration done','Cable tray inspection','Waterproofing check','HVAC duct leak','Safety harness audit']
  const items=[]
  for(let i=1;i<=80;i++){
    const area = areas[i % areas.length]
    const block = blocks[i % blocks.length]
    const type = types[i % types.length]
    const status = statuses[(i*7) % statuses.length]
    const inspector = inspectors[i % inspectors.length]
    const totalCameras = 12 + (i*7 % 36)
    const offlineCameras = i % 10 === 0 ? 6 + (i % 4) : i % 5 === 0 ? 3 + (i % 3) : (i % 7 === 0 ? 1 : 0)
    const totalANPR = 2 + (i*3 % 8)
    const offlineANPR = i % 12 === 0 ? 2 : i % 8 === 0 ? 1 : 0
    const notWorkingANPR = i % 15 === 0 ? 2 : i % 9 === 0 ? 1 : 0
    const notWorkingGate = i % 18 === 0 ? 2 : i % 11 === 0 ? 1 : 0
    const notWorkingIntercom = i % 20 === 0 ? 2 : i % 13 === 0 ? 1 : 0
    const pincode = String(1000 + ((i * 7331) % 9000)).padStart(4,'0')
    const day = String(10 + (i % 18)).padStart(2,'0')
    items.push({
      id: genDeterministicId(i),
      name: `Site ${String(i).padStart(2,'0')} — ${area} ${block}`,
      location: `${area}, ${block}`,
      type, status,
      date: `2026-09-${day}`,
      inspector,
      notes: notesPool[i % notesPool.length],
      totalCameras,
      offlineCameras: Math.min(offlineCameras, totalCameras),
      totalANPR,
      offlineANPR: Math.min(offlineANPR, totalANPR),
      notWorkingANPR: Math.min(notWorkingANPR, totalANPR),
      notWorkingGate, notWorkingIntercom, pincode,
    })
  }
  return items
}
const OWNER_SEED = generate80Sites()

const SEED_ACCIDENTS = [
  { id: genId(), siteId: null, siteName: '', title: 'Forklift collision - Warehouse aisle 3', description: 'Forklift hit racking, no injury. Near-miss logged.', severity: 'High', status: 'Open', date: '2026-09-18', reportedBy: 'Safety Officer' },
  { id: genId(), siteId: null, siteName: '', title: 'Slip - Wet floor lobby', description: 'Visitor slipped near entrance, minor bruise. Floor sign missing.', severity: 'Medium', status: 'In Review', date: '2026-09-20', reportedBy: 'Ahmed R.' },
  { id: genId(), siteId: null, siteName: '', title: 'Electrical spark - DB room', description: 'Spark observed during maintenance, power isolated.', severity: 'Critical', status: 'Open', date: '2026-09-21', reportedBy: 'Khalid H.' },
]

export default function App(){
  const [sites, setSites] = useState(()=>{
    try{
      const v80 = localStorage.getItem('site-inspection-sites-v80')
      if(v80){ const p=JSON.parse(v80); if(Array.isArray(p) && p.length===80) return p }
      const saved = localStorage.getItem('site-inspection-sites')
      if(saved){ const p2=JSON.parse(saved); if(Array.isArray(p2) && p2.length>0) return p2 }
    }catch{}
    // Chrome file:// has no shared localStorage with main dashboard — generate same 80 deterministically
    return OWNER_SEED
  })
  const [incidents, setIncidents] = useState(()=>{
    try{ const s=localStorage.getItem('site-inspection-incidents'); return s?JSON.parse(s):[] }catch{return []}
  })
  const [accidents, setAccidents] = useState(()=>{
    try{
      const s=localStorage.getItem('dhre-accidents')
      if(s) return JSON.parse(s)
      // seed with site links after sites loaded
      return []
    }catch{return []}
  })
  const [selectedId, setSelectedId] = useState(()=>{
    const params = new URLSearchParams(window.location.search)
    return params.get('site') || localStorage.getItem('dhre-owner-session') || null
  })
  const [query, setQuery] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(()=> !!localStorage.getItem('dhre-owner-session'))
  const [loginSiteId, setLoginSiteId] = useState('')
  const [loginName, setLoginName] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [ownerForm, setOwnerForm] = useState({})
  const [showAccident, setShowAccident] = useState(false)
  const [accForm, setAccForm] = useState({ title:'', description:'', severity:'Medium', status:'Open', date: new Date().toISOString().slice(0,10), reportedBy:'' })

  // init accidents with sites
  useEffect(()=>{
    if(accidents.length===0 && sites.length>0){
      const seeded = SEED_ACCIDENTS.map((a,i)=> ({ ...a, id: genId(), siteId: sites[i % sites.length].id, siteName: sites[i % sites.length].name }))
      // add random more accidents to spread
      for(let i=0;i<12;i++){
        const s = sites[(i*13)%sites.length]
        if(Math.random()>0.5){
          seeded.push({ id: genId(), siteId: s.id, siteName: s.name, title: ['Gate barrier stuck','Intercom no audio','ANPR misread','CCTV offline - Power','Access card fail'][i%5], description: 'Reported via AMC check, needs rectification.', severity: ['Low','Medium','High','Critical'][i%4], status: i%3===0?'Open':'In Review', date: `2026-09-${10+(i%18)}`, reportedBy: s.inspector })
        }
      }
      setAccidents(seeded)
      localStorage.setItem('dhre-accidents', JSON.stringify(seeded))
    }
  }, [sites.length])

  // pick first site if none selected
  useEffect(()=>{
    if(!selectedId && sites.length>0) setSelectedId(sites[0].id)
  }, [sites, selectedId])

  // keep URL in sync
  useEffect(()=>{
    if(selectedId){
      const url = new URL(window.location.href)
      url.searchParams.set('site', selectedId)
      window.history.replaceState({}, '', url)
      // load owner form for selected
      const s = sites.find(x=>x.id===selectedId)
      if(s){
        setOwnerForm({
          ownerName: s.inspector || '—',
          company: s.location.split(',')[0] || 'Owner',
          phone: `+971 50 ${String(100+Math.floor(Math.random()*800))} ${String(1000+Math.floor(Math.random()*9000))}`,
          email: `${(s.inspector||'owner').toLowerCase().replace(/[^a-z]/g,'')}.${s.name.split(' ')[1]?.toLowerCase()||'site'}@example.com`,
          role: s.type === 'Construction' ? 'Site Owner' : 'Facility Manager',
          since: s.date,
          notes: s.notes || ''
        })
      }
    }
  }, [selectedId, sites])

  // fully automatic sync — BroadcastChannel + postMessage + polling
  useEffect(()=>{
    if(sites.length) localStorage.setItem('site-inspection-sites-v80', JSON.stringify(sites))
    try{ new BroadcastChannel('dhre-sync').postMessage({ type: 'sites-update', sites }) }catch{}
    if(sites.length && window.opener && !window.opener.closed){
      try{
        window.opener.localStorage.setItem('site-inspection-sites-v80', JSON.stringify(sites))
        window.opener.localStorage.setItem('site-inspection-sites', JSON.stringify(sites))
        window.opener.postMessage({ type: 'dhre-sites-update', sites }, '*')
      }catch{}
    }
  }, [sites])
  useEffect(()=>{
    localStorage.setItem('site-inspection-incidents', JSON.stringify(incidents))
    try{ new BroadcastChannel('dhre-sync').postMessage({ type: 'incidents-update', incidents }) }catch{}
    if(window.opener && !window.opener.closed){
      try{ window.opener.localStorage.setItem('site-inspection-incidents', JSON.stringify(incidents)); window.opener.postMessage({ type: 'dhre-incidents-update', incidents }, '*') }catch{}
    }
  }, [incidents])
  useEffect(()=>{
    localStorage.setItem('dhre-accidents', JSON.stringify(accidents))
    try{ new BroadcastChannel('dhre-sync').postMessage({ type: 'accidents-update', accidents }) }catch{}
    if(window.opener && !window.opener.closed){
      try{ window.opener.localStorage.setItem('dhre-accidents', JSON.stringify(accidents)); window.opener.postMessage({ type: 'dhre-accidents-update', accidents }, '*') }catch{}
    }
  }, [accidents])
  useEffect(()=>{
    let bc
    try{ bc = new BroadcastChannel('dhre-sync'); bc.onmessage = (e)=>{
      if(e.data?.type==='sites-update' && Array.isArray(e.data.sites)) setSites(e.data.sites)
      if(e.data?.type==='incidents-update' && Array.isArray(e.data.incidents)) setIncidents(e.data.incidents)
      if(e.data?.type==='accidents-update' && Array.isArray(e.data.accidents)) setAccidents(e.data.accidents)
    }}catch{}
    const id = setInterval(()=>{
      try{
        const raw = localStorage.getItem('site-inspection-sites-v80')
        if(raw){
          const p = JSON.parse(raw)
          if(JSON.stringify(p) !== JSON.stringify(sites)) setSites(p)
        }
      }catch{}
    }, 800)
    return ()=>{ try{ bc?.close() }catch{}; clearInterval(id) }
  }, [sites])
  // on load, request latest from opener via postMessage (works cross-port)
  useEffect(()=>{
    if(window.opener && !window.opener.closed){
      try{
        window.opener.postMessage({ type: 'dhre-request-sites' }, '*')
        window.opener.postMessage({ type: 'dhre-request-incidents' }, '*')
        window.opener.postMessage({ type: 'dhre-request-accidents' }, '*')
      }catch{}
    }
    const handler = (e)=>{
      if(e.data?.type==='dhre-sites-update' && Array.isArray(e.data.sites)) setSites(e.data.sites)
      if(e.data?.type==='dhre-incidents-update' && Array.isArray(e.data.incidents)) setIncidents(e.data.incidents)
      if(e.data?.type==='dhre-accidents-update' && Array.isArray(e.data.accidents)) setAccidents(e.data.accidents)
    }
    window.addEventListener('message', handler)
    return ()=> window.removeEventListener('message', handler)
  }, [])
    }
  }, [])

  const selectedSite = useMemo(()=> sites.find(s=>s.id===selectedId) || sites[0], [sites, selectedId])
  const siteIncidents = useMemo(()=> incidents.filter(i=> i.siteId===selectedId), [incidents, selectedId])
  const siteAccidents = useMemo(()=> accidents.filter(a=> a.siteId===selectedId), [accidents, selectedId])

  const filteredSites = useMemo(()=>{
    const q=query.toLowerCase()
    if(!q) return sites
    return sites.filter(s=> s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.inspector.toLowerCase().includes(q))
  }, [sites, query])

  const updateSiteField = (field, value)=>{
    setSites(prev=> prev.map(s=> s.id===selectedId ? { ...s, [field]: value } : s))
  }
  const makeOnline = (field)=>{
    // set offline to 0
    if(field==='offlineCameras') updateSiteField('offlineCameras', 0)
    if(field==='offlineANPR') updateSiteField('offlineANPR', 0)
    if(field==='notWorkingANPR') updateSiteField('notWorkingANPR', 0)
    if(field==='notWorkingGate') updateSiteField('notWorkingGate', 0)
    if(field==='notWorkingIntercom') updateSiteField('notWorkingIntercom', 0)
    toast.success(`${field} → now 0 (online)`)
  }
  const saveOwner = ()=>{
    if(selectedSite){
      // save owner name back to site inspector + notes
      setSites(prev=> prev.map(s=> s.id===selectedId ? { ...s, inspector: ownerForm.ownerName, notes: ownerForm.notes } : s))
      toast.success('Owner details saved')
      setEditMode(false)
    }
  }
  const handleAccidentAdd = (e)=>{
    e.preventDefault()
    if(!accForm.title.trim()){ toast.error('Title required'); return }
    const newAcc = { id: genId(), siteId: selectedId, siteName: selectedSite.name, title: accForm.title, description: accForm.description, severity: accForm.severity, status: accForm.status, date: accForm.date, reportedBy: accForm.reportedBy || ownerForm.ownerName }
    setAccidents(prev=>[newAcc, ...prev])
    toast.success('Accident reported')
    setShowAccident(false)
    setAccForm({ title:'', description:'', severity:'Medium', status:'Open', date: new Date().toISOString().slice(0,10), reportedBy:'' })
  }
  const updateAccidentStatus = (id, status)=>{
    setAccidents(prev=> prev.map(a=> a.id===id ? { ...a, status } : a))
    toast.success(`Accident → ${status}`)
  }

  const handleLogin = ()=>{
    if(!loginSiteId){ toast.error('Select your site'); return }
    if(!loginPin.trim()){ toast.error('Enter pincode'); return }
    const site = sites.find(s=>s.id===loginSiteId)
    const expected = site?.pincode || ''
    const fallback = site ? String(1000 + ((sites.indexOf(site) * 7331) % 9000)).padStart(4,'0') : ''
    const valid = loginPin === expected || loginPin === fallback || loginPin === '1234'
    const urlPin = new URLSearchParams(window.location.search).get('pin')
    const ok = valid || (urlPin && loginPin === urlPin)
    if(!ok){ toast.error(`Wrong pincode for ${site?.name || 'site'}. Check main dashboard → Pincode Access.`); return }
    const nameToStore = loginName.trim() || site?.inspector || 'Owner'
    localStorage.setItem('dhre-owner-session', loginSiteId)
    localStorage.setItem('dhre-owner-name', nameToStore)
    // save pin for next time (so site object in owner portal gets the pin if it was URL-provided)
    if(site && loginPin !== site.pincode){
      // update owner portal's copy to keep pin
      setSites(prev=> prev.map(s=> s.id===loginSiteId ? { ...s, pincode: loginPin } : s))
    }
    setSelectedId(loginSiteId)
    setIsLoggedIn(true)
    toast.success(`Welcome — ${site?.name}`)
  }
  const handleLogout = ()=>{
    localStorage.removeItem('dhre-owner-session')
    localStorage.removeItem('dhre-owner-name')
    setIsLoggedIn(false)
    setSelectedId(null)
    setLoginSiteId('')
    toast.info('Logged out')
  }
  useEffect(()=>{
    if(!isLoggedIn && selectedId && !loginSiteId){
      let targetId = selectedId
      let s = sites.find(x=>x.id===targetId)
      const urlPin = new URLSearchParams(window.location.search).get('pin')
      // Chrome file:// IDs are random vs deterministic — fallback to pin
      if(!s && urlPin){
        s = sites.find(x=>x.pincode===urlPin)
        if(s) targetId = s.id
      }
      if(!s){
        // also try by site name from URL if pin didn't match
        const urlSiteName = new URLSearchParams(window.location.search).get('siteName')
        if(urlSiteName) s = sites.find(x=>x.name===decodeURIComponent(urlSiteName))
        if(s) targetId = s.id
      }
      setLoginSiteId(targetId)
      if(s) setLoginName(s.inspector)
      if(urlPin) setLoginPin(urlPin)
      else if(s) setLoginPin(s.pincode || '')
    }
  }, [selectedId, isLoggedIn, sites])
  useEffect(()=>{
    // prefill pin from URL if present
    const urlParams = new URLSearchParams(window.location.search)
    const siteParam = urlParams.get('site')
    const pinParam = urlParams.get('pin')
    if(siteParam && pinParam && !loginPin){
      setLoginSiteId(siteParam)
      setLoginPin(pinParam)
      const s = sites.find(x=>x.id===siteParam)
      if(s) setLoginName(s.inspector)
    }
  }, [sites])

  if(!selectedSite) return <div className="p-8 text-center">Loading 80 sites from main dashboard — open <a href="https://dhre-ng62.vercel.app" className="underline">DHRE Security Dashboard</a> first.</div>

  // Login screen — 80 different pages, one per site
  if(!isLoggedIn){
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
        <Toaster richColors position="top-right" />
        <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-900 border-b" style={{ borderColor:'#0f172a' }}>
          <div className="max-w-[480px] mx-auto px-4 h-[56px] flex items-center gap-3">
            <div className="h-10 px-2 rounded-xl bg-white grid place-items-center"><img src="./dhre-logo.svg" alt="DHRE" className="h-8 w-auto object-contain" onError={(e)=> e.currentTarget.src='./dhre-logo.jpg'} /></div>
            <div className="font-extrabold text-white leading-none">DHRE — Owner Login</div>
          </div>
        </header>
        <div className="flex-1 grid place-items-center p-4">
          <div className="w-full max-w-[480px] bg-white rounded-[24px] border shadow-xl p-6" style={{ borderColor:'#e2e8f0' }}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white grid place-items-center mx-auto"><User size={20} /></div>
              <h1 className="mt-3 text-xl font-extrabold">Each site has its own page</h1>
              <p className="text-sm text-slate-500 mt-1">80 different dashboards — login to see <b>only your site</b> in one dashboard</p>
            </div>
            <div className="mt-6 space-y-3">
              <div>
                <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Select your site *</label>
                <select value={loginSiteId} onChange={e=>{ setLoginSiteId(e.target.value); const s=sites.find(x=>x.id===e.target.value); if(s) setLoginName(s.inspector) }} className="mt-1.5 w-full px-4 py-3 rounded-xl border bg-slate-50 font-medium" style={{ borderColor:'#e2e8f0' }}>
                  <option value="">— Choose one of 80 sites —</option>
                  {sites.map(s=> <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
                </select>
                <div className="text-[11px] text-slate-500 mt-1">{sites.length} sites • each page is different (cameras, ANPR, incidents, accidents)</div>
              </div>
              <div>
                <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Owner name</label>
                <input value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="e.g. Ahmed R. (optional)" className="mt-1.5 w-full px-4 py-3 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} />
              </div>
              <div>
                <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Pincode *</label>
                <input value={loginPin} onChange={e=>setLoginPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="4-digit code from main dashboard" className="mt-1.5 w-full px-4 py-3 rounded-xl border bg-amber-50 font-mono text-lg tracking-widest text-center font-bold" style={{ borderColor: loginPin ? '#fde68a' : '#e2e8f0', background: loginPin ? '#fffbeb' : '#f8fafc' }} />
                <div className="text-[11px] text-slate-500 mt-1">Get code from main website → <b>Sites → Pincode Access</b> for your site. Try <b>demo: 1234</b> works for any site.</div>
              </div>
              <button onClick={handleLogin} className="w-full py-3 rounded-full bg-slate-900 text-white font-bold hover:bg-black">Login with Pincode → My Site Dashboard</button>
              <div className="text-xs text-center text-slate-500">Pincode is per-site • <a href="https://dhre-ng62.vercel.app" className="underline font-bold">Back to main dashboard</a></div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 border p-2" style={{ borderColor:'#eef2f7' }}><div className="text-[11px] font-bold uppercase text-slate-500">Sites</div><div className="font-extrabold">80</div></div>
              <div className="rounded-xl bg-slate-50 border p-2" style={{ borderColor:'#eef2f7' }}><div className="text-[11px] font-bold uppercase text-slate-500">Pages</div><div className="font-extrabold">80</div></div>
              <div className="rounded-xl bg-slate-50 border p-2" style={{ borderColor:'#eef2f7' }}><div className="text-[11px] font-bold uppercase text-slate-500">Your view</div><div className="font-extrabold">1 site</div></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toaster richColors position="top-right" />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b overflow-hidden" style={{ borderColor: '#0f172a' }}>
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-900">
          <div className="max-w-[1280px] mx-auto px-4 lg:px-6 h-[64px] flex items-center justify-between gap-4">
            <a href="https://dhre-ng62.vercel.app" className="flex items-center gap-3">
              <div className="h-11 px-3 rounded-xl bg-white grid place-items-center overflow-hidden shrink-0 shadow-lg"><img src="./dhre-logo.svg" alt="DHRE" className="h-9 w-auto object-contain" onError={(e)=>{ e.currentTarget.src='./dhre-logo.jpg' }} /></div>
              <div>
                <div className="font-extrabold tracking-tight leading-none text-[18px] text-white">DHRE — Owner Portal</div>
                <div className="text-xs text-sky-200 -mt-0.5">Linked to Security Dashboard • {selectedSite.name}</div>
              </div>
            </a>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-sky-200 max-w-[160px] truncate">{localStorage.getItem('dhre-owner-name') || ownerForm.ownerName} • {selectedSite.name}</span>
              <button onClick={handleLogout} className="px-3 py-1.5 rounded-full bg-white/15 text-white border border-white/20 text-xs font-bold hover:bg-white/20">Logout</button>
              <a href="https://dhre-ng62.vercel.app" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow"><ArrowLeft size={14} /> Dashboard</a>
            </div>
          </div>
        </div>
        <div className="bg-white border-t" style={{ borderColor:'#eef2f7' }}>
          <div className="max-w-[1280px] mx-auto px-4 lg:px-6 h-[44px] flex items-center justify-center">
            <div className="text-xs font-bold tracking-widest uppercase text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> My Site Dashboard — <span className="text-slate-900 normal-case tracking-normal font-extrabold">{selectedSite.name}</span> <span className="hidden sm:inline font-normal normal-case">• All things for this site in one place • No other sites visible</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 lg:px-6 py-6">
        {/* Owner Details + Site */}
        <div className="grid lg:grid-cols-12 gap-4">
          {/* Owner Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl border overflow-hidden" style={{ borderColor:'#e2e8f0' }}>
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between" style={{ borderColor:'#eef2f7' }}>
              <div className="font-bold text-sm flex items-center gap-2"><User size={14} /> Owner Details</div>
              {!editMode ? <button onClick={()=>setEditMode(true)} className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1"><Pencil size={12} /> Edit</button> : <div className="flex gap-1"><button onClick={saveOwner} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"><Save size={12} /> Save</button><button onClick={()=>setEditMode(false)} className="px-3 py-1 rounded-full bg-white border text-xs font-bold" style={{ borderColor:'#e2e8f0' }}><X size={12} /></button></div>}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white grid place-items-center font-extrabold text-lg">{ownerForm.ownerName?.[0]||'O'}</div>
                <div className="flex-1 min-w-0">
                  {editMode ? <input value={ownerForm.ownerName} onChange={e=>setOwnerForm({...ownerForm, ownerName:e.target.value})} className="w-full px-3 py-2 rounded-xl border bg-slate-50 font-bold" style={{ borderColor:'#e2e8f0' }} /> : <div className="font-extrabold leading-none">{ownerForm.ownerName}</div>}
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Briefcase size={11} />{editMode ? <input value={ownerForm.role} onChange={e=>setOwnerForm({...ownerForm, role:e.target.value})} className="px-2 py-1 rounded-lg border text-xs flex-1" style={{ borderColor:'#e2e8f0' }} /> : ownerForm.role} • {selectedSite.type}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Building2 size={14} className="text-slate-400" />{selectedSite.name}<span className="ml-auto text-xs px-2 py-1 rounded-full bg-slate-100 border" style={{ borderColor:'#e2e8f0' }}>{selectedSite.location}</span></div>
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{editMode ? <input value={ownerForm.phone} onChange={e=>setOwnerForm({...ownerForm, phone:e.target.value})} className="flex-1 px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} /> : ownerForm.phone}</div>
                <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" />{editMode ? <input value={ownerForm.email} onChange={e=>setOwnerForm({...ownerForm, email:e.target.value})} className="flex-1 px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} /> : <span className="truncate">{ownerForm.email}</span>}</div>
                <div className="flex items-center gap-2"><Briefcase size={14} className="text-slate-400" />{editMode ? <input value={ownerForm.company} onChange={e=>setOwnerForm({...ownerForm, company:e.target.value})} className="flex-1 px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} /> : ownerForm.company}</div>
                <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" />Since {ownerForm.since}</div>
                <div>
                  <div className="text-xs font-bold tracking-widest uppercase text-slate-500 mt-2">Notes</div>
                  {editMode ? <textarea value={ownerForm.notes} onChange={e=>setOwnerForm({...ownerForm, notes:e.target.value})} rows={3} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} /> : <p className="mt-1 text-sm bg-slate-50 rounded-xl p-3 border" style={{ borderColor:'#eef2f7' }}>{ownerForm.notes || '—'}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Editable AMC Stats for this site */}
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border p-3" style={{ borderColor:'#e2e8f0' }}>
                <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Total Cameras</div>
                <div className="mt-1 flex items-center gap-2"><span className="text-2xl font-extrabold">{selectedSite.totalCameras||0}</span><button onClick={()=>{
                  const v=prompt('Number of cameras', String(selectedSite.totalCameras||0)); if(v!==null) updateSiteField('totalCameras', Math.max(0, parseInt(v)||0))
                }} className="ml-auto p-1 rounded-full hover:bg-slate-100"><Edit3 size={14} /></button></div>
                <div className="text-xs text-slate-500">Editable</div>
              </div>
              <div className="bg-white rounded-xl border p-3" style={{ borderColor: (selectedSite.offlineCameras||0)>0 ? '#fecaca' : '#e2e8f0' }}>
                <div className="text-[11px] font-bold tracking-widest uppercase text-red-600 flex items-center justify-between">Offline Cameras <WifiOff size={12} /></div>
                <div className="mt-1 flex items-center gap-2"><span className="text-2xl font-extrabold text-red-600">{selectedSite.offlineCameras||0}</span><span className="text-xs px-1.5 py-0.5 rounded bg-red-50 border border-red-200 font-bold">{selectedSite.totalCameras ? Math.round(((selectedSite.offlineCameras||0)/selectedSite.totalCameras)*100) : 0}%</span></div>
                <div className="mt-2 flex gap-1">
                  <button onClick={()=>makeOnline('offlineCameras')} className="flex-1 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Make online</button>
                  <button onClick={()=>{
                    const v=prompt('Offline cameras', String(selectedSite.offlineCameras||0)); if(v!==null) updateSiteField('offlineCameras', Math.max(0, Math.min(selectedSite.totalCameras||0, parseInt(v)||0)))
                  }} className="px-2 py-1 rounded-full border bg-white text-xs font-bold" style={{ borderColor:'#e2e8f0' }}><Edit3 size={12} /></button>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-3" style={{ borderColor:'#e2e8f0' }}>
                <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Total ANPR</div>
                <div className="mt-1 flex items-center gap-2"><span className="text-2xl font-extrabold">{selectedSite.totalANPR||0}</span><button onClick={()=>{
                  const v=prompt('Total ANPR', String(selectedSite.totalANPR||0)); if(v!==null) updateSiteField('totalANPR', Math.max(0, parseInt(v)||0))
                }} className="ml-auto p-1 rounded-full hover:bg-slate-100"><Edit3 size={14} /></button></div>
              </div>
              <div className="bg-white rounded-xl border p-3" style={{ borderColor: (selectedSite.offlineANPR||0)>0 ? '#fde68a' : '#e2e8f0' }}>
                <div className="text-[11px] font-bold tracking-widest uppercase text-amber-700">Offline ANPR</div>
                <div className="mt-1 text-2xl font-extrabold text-amber-600">{selectedSite.offlineANPR||0}</div>
                <div className="mt-2 flex gap-1">
                  <button onClick={()=>makeOnline('offlineANPR')} className="flex-1 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold"><CheckCircle2 size={12} className="inline mr-1" />Make online</button>
                  <button onClick={()=>{
                    const v=prompt('Offline ANPR', String(selectedSite.offlineANPR||0)); if(v!==null) updateSiteField('offlineANPR', Math.max(0, Math.min(selectedSite.totalANPR||0, parseInt(v)||0)))
                  }} className="px-2 py-1 rounded-full border bg-white text-xs font-bold" style={{ borderColor:'#e2e8f0' }}><Edit3 size={12} /></button>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-3" style={{ borderColor: (selectedSite.notWorkingANPR||0)>0 ? '#ddd6fe' : '#e2e8f0' }}>
                <div className="text-[11px] font-bold tracking-widest uppercase text-violet-700">Not Working ACS</div>
                <div className="mt-1 text-2xl font-extrabold text-violet-700">{selectedSite.notWorkingANPR||0}</div>
                <button onClick={()=>makeOnline('notWorkingANPR')} className="mt-2 w-full py-1 rounded-full bg-slate-900 text-white text-xs font-bold">Mark fixed</button>
              </div>
              <div className="bg-white rounded-xl border p-3" style={{ borderColor: (selectedSite.notWorkingGate||0)>0 ? '#bae6fd' : '#e2e8f0' }}>
                <div className="text-[11px] font-bold tracking-widest uppercase text-sky-700">Gate Barrier</div>
                <div className="mt-1 text-2xl font-extrabold">{selectedSite.notWorkingGate||0} <span className="text-xs font-normal text-slate-500">fail</span></div>
                <button onClick={()=>makeOnline('notWorkingGate')} className="mt-2 w-full py-1 rounded-full bg-sky-600 text-white text-xs font-bold">Make online</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border p-3 text-center" style={{ borderColor:'#e2e8f0' }}><div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Intercom</div><div className="text-xl font-extrabold">{selectedSite.notWorkingIntercom||0} <span className="text-xs text-slate-500">fail</span></div><button onClick={()=>makeOnline('notWorkingIntercom')} className="mt-1 text-xs underline font-bold">Make online</button></div>
              <div className="bg-white rounded-xl border p-3 text-center" style={{ borderColor:'#e2e8f0' }}><div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Incidents</div><div className="text-xl font-extrabold">{siteIncidents.length}</div><div className="text-xs text-slate-500">{siteIncidents.filter(i=>i.status==='Open').length} open</div></div>
              <div className="bg-white rounded-xl border p-3 text-center" style={{ borderColor:'#e2e8f0' }}><div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Accidents</div><div className="text-xl font-extrabold">{siteAccidents.length}</div><div className="text-xs text-slate-500">{siteAccidents.filter(a=>a.status==='Open').length} open</div></div>
            </div>
          </div>
        </div>

        {/* Incidents / Accidents editable */}
        <div className="mt-6 grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor:'#e2e8f0' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:'#eef2f7' }}>
              <div className="font-bold text-sm flex items-center gap-2"><FileText size={14} /> Incidents — {selectedSite.name}</div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 border" style={{ borderColor:'#e2e8f0' }}>{siteIncidents.length}</span>
            </div>
            <div className="p-3 space-y-2 max-h-[420px] overflow-auto">
              {siteIncidents.length===0 ? <div className="text-sm text-slate-500 text-center py-8">No incidents for this site.</div> : siteIncidents.map(inc=>(
                <div key={inc.id} className="border rounded-xl p-3 bg-slate-50" style={{ borderColor:'#eef2f7' }}>
                  <div className="font-bold text-sm">{inc.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{inc.description}</div>
                  <div className="mt-2 flex gap-1">
                    {['Open','In Review','Resolved','Closed'].map(s=>(
                      <button key={s} onClick={()=>{
                        const upd = incidents.map(x=> x.id===inc.id ? { ...x, status: s } : x)
                        setIncidents(upd)
                        toast.success(`Incident → ${s}`)
                      }} className={`px-2 py-1 rounded-full border text-xs font-bold ${inc.status===s?'bg-slate-900 text-white':'bg-white'}`} style={{ borderColor:'#e2e8f0' }}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor:'#e2e8f0' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:'#eef2f7' }}>
              <div className="font-bold text-sm flex items-center gap-2"><AlertTriangle size={14} /> Accidents — {selectedSite.name}</div>
              <button onClick={()=>setShowAccident(true)} className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            <div className="p-3 space-y-2 max-h-[420px] overflow-auto">
              {siteAccidents.length===0 ? <div className="text-sm text-slate-500 text-center py-8">No accidents.</div> : siteAccidents.map(acc=>(
                <div key={acc.id} className="border rounded-xl p-3 bg-red-50/50" style={{ borderColor:'#fecaca' }}>
                  <div className="font-bold text-sm flex items-center justify-between">{acc.title}<button onClick={()=>{ setAccidents(prev=> prev.filter(x=>x.id!==acc.id)); toast.success('Deleted') }} className="p-1 hover:text-red-600"><Trash2 size={14} /></button></div>
                  <div className="text-xs text-slate-600 mt-1">{acc.description}</div>
                  <div className="text-xs text-slate-500 mt-1">{acc.date} • {acc.reportedBy} • {acc.severity}</div>
                  <div className="mt-2 flex gap-1">
                    {['Open','In Review','Resolved','Closed'].map(s=>(
                      <button key={s} onClick={()=>{ setAccidents(prev=> prev.map(x=> x.id===acc.id ? { ...x, status: s } : x)); toast.success(`Accident → ${s}`) }} className={`px-2 py-1 rounded-full border text-xs font-bold ${acc.status===s?'bg-red-600 text-white':'bg-white'}`} style={{ borderColor:'#e2e8f0' }}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Owner Portal • Linked to main dashboard • Edits update main dashboard live (shared localStorage) • <a href="https://dhre-ng62.vercel.app" className="underline font-bold">Back to DHRE Security Dashboard</a></p>
      </main>

      {/* Add Accident Modal */}
      <AnimatePresence>
        {showAccident && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-40 grid place-items-center p-4">
            <div onClick={()=>setShowAccident(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.form onSubmit={handleAccidentAdd} initial={{ scale:0.96, y:8 }} animate={{ scale:1, y:0 }} exit={{ scale:0.96, y:8 }} className="relative w-full max-w-[520px] bg-white rounded-[24px] shadow-2xl border p-6 space-y-3" style={{ borderColor:'#e2e8f0' }}>
              <div className="font-bold">Report Accident — {selectedSite.name}</div>
              <input value={accForm.title} onChange={e=>setAccForm({...accForm, title:e.target.value})} placeholder="Title" className="w-full px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} />
              <textarea value={accForm.description} onChange={e=>setAccForm({...accForm, description:e.target.value})} rows={3} placeholder="Description" className="w-full px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} />
              <div className="grid grid-cols-2 gap-2">
                <select value={accForm.severity} onChange={e=>setAccForm({...accForm, severity:e.target.value})} className="px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }}>{['Low','Medium','High','Critical'].map(s=> <option key={s} value={s}>{s}</option>)}</select>
                <select value={accForm.status} onChange={e=>setAccForm({...accForm, status:e.target.value})} className="px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }}>{['Open','In Review','Resolved','Closed'].map(s=> <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={accForm.date} onChange={e=>setAccForm({...accForm, date:e.target.value})} className="px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} />
                <input value={accForm.reportedBy} onChange={e=>setAccForm({...accForm, reportedBy:e.target.value})} placeholder="Reported by" className="px-3 py-2 rounded-xl border bg-slate-50" style={{ borderColor:'#e2e8f0' }} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={()=>setShowAccident(false)} className="px-4 py-2 rounded-full border bg-white font-bold" style={{ borderColor:'#e2e8f0' }}>Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-full bg-red-600 text-white font-bold">Save</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
