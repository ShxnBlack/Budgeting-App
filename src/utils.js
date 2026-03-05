import React from "react"

export const safeArr = v => Array.isArray(v) ? v : []
export const safeObj = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {}
export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
export const toNum = v => parseFloat(v) || 0
export const fmt = (n, cur = "£") => `${cur}${Math.abs(toNum(n)).toFixed(2)}`
export const fmtSigned = (n, cur = "£") => `${toNum(n) >= 0 ? "+" : "-"}${fmt(Math.abs(toNum(n)), cur)}`
export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
export const getPctColor = pct => `hsl(${Math.max(0, 120 - clamp(pct,0,120))}, 75%, ${pct > 100 ? 38 : 44}%)`
export const daysInMonth = (m, y) => new Date(y, m + 1, 0).getDate()

export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
export const ACADEMIC_MONTHS = ["September","October","November","December","January","February","March","April","May"]
export const CURRENCIES = ["£","$","€","₹","¥"]
export const TIERS = {
  essential: { label:"Essential", color:"#16a34a", bg:"#f0fdf4", border:"#86efac" },
  need:      { label:"Need",      color:"#d97706", bg:"#fffbeb", border:"#fcd34d" },
  want:      { label:"Want",      color:"#dc2626", bg:"#fef2f2", border:"#fca5a5" },
}

export const DARK  = { bg:"#0b1121", card:"#111d35", border:"#1a2d45", text:"#e8f1ff", textSub:"#7a9bc0", textMuted:"#4a6a8a", thBg:"#0d1829", input:"#0d1829" }
export const LIGHT = { bg:"#f0f4fa", card:"#ffffff", border:"#e2e8f0", text:"#0d1829", textSub:"#3a5068", textMuted:"#7a9ab8", thBg:"#f8faff", input:"#f7faff" }

export const DEFAULT_INCOME = [
  { id:"i0", source:"Primary Income", amount:"", isPrimary:true },
  { id:"i1", source:"Loan Allowance", amount:"" },
  { id:"i2", source:"Family Support",  amount:"" },
]

export const makeDefaultCategories = () => [
  { id:"c1", name:"🏠 Housing",      tier:"essential", colour:"", collapsed:false, items:[
    { id:"c1i1", label:"🔑 Rent",       budgeted:"", actual:"", notes:"" },
    { id:"c1i2", label:"💡 Utilities",  budgeted:"", actual:"", notes:"" },
  ]},
  { id:"c2", name:"🛒 Food",         tier:"essential", colour:"", collapsed:false, items:[
    { id:"c2i1", label:"🥦 Groceries",  budgeted:"", actual:"", notes:"" },
    { id:"c2i2", label:"🍽️ Eating Out", budgeted:"", actual:"", notes:"" },
  ]},
  { id:"c3", name:"🚗 Transport",    tier:"essential", colour:"", collapsed:false, items:[
    { id:"c3i1", label:"⛽ Fuel",       budgeted:"", actual:"", notes:"" },
    { id:"c3i2", label:"🚌 Buses",      budgeted:"", actual:"", notes:"" },
  ]},
  { id:"c4", name:"🏋️ Sports",       tier:"need",      colour:"", collapsed:false, items:[
    { id:"c4i1", label:"🏋️ Gym",        budgeted:"", actual:"", notes:"" },
    { id:"c4i2", label:"💊 Supplements",budgeted:"", actual:"", notes:"" },
  ]},
  { id:"c5", name:"🎉 Leisure",      tier:"want",      colour:"", collapsed:false, items:[
    { id:"c5i1", label:"💑 Dates",      budgeted:"", actual:"", notes:"" },
    { id:"c5i2", label:"🍻 Nights Out", budgeted:"", actual:"", notes:"" },
    { id:"c5i3", label:"👗 Clothing",   budgeted:"", actual:"", notes:"" },
  ]},
  { id:"c6", name:"💰 Savings",      tier:"essential", colour:"", collapsed:false, items:[
    { id:"c6i1", label:"🛡️ Emergency",  budgeted:"", actual:"", notes:"" },
    { id:"c6i2", label:"🏦 Savings",    budgeted:"", actual:"", notes:"" },
  ]},
  { id:"c7", name:"📱 Subscriptions",tier:"need",      colour:"", collapsed:false, items:[
    { id:"c7i1", label:"🤖 AI Tools",   budgeted:"", actual:"", notes:"" },
    { id:"c7i2", label:"🎬 Streaming",  budgeted:"", actual:"", notes:"" },
  ]},
]

// ── Shared UI components ──────────────────────────────────────────────────────

export function PctBar({ pct, height=6 }) {
  return (
    <div style={{ background:"#e2e8f0", borderRadius:99, height, overflow:"hidden", marginTop:2 }}>
      <div style={{ width:`${clamp(pct,0,100)}%`, background:getPctColor(pct), height:"100%", borderRadius:99, transition:"width .3s" }}/>
    </div>
  )
}

export function Btn({ onClick, color="#3b82f6", children, style={} }) {
  return (
    <button onClick={onClick} style={{
      fontSize:12, color, background:"none", border:`1px solid ${color}`,
      borderRadius:6, padding:"4px 12px", cursor:"pointer", fontFamily:"inherit",
      whiteSpace:"nowrap", ...style,
    }}>{children}</button>
  )
}

export function TierTag({ tier, dark }) {
  const t = TIERS[tier] || TIERS.want
  return (
    <span style={{ fontSize:10, fontWeight:700, color:t.color,
      background:dark ? t.color+"22" : t.bg,
      border:`1px solid ${dark ? t.color+"44" : t.border}`,
      borderRadius:4, padding:"1px 6px", whiteSpace:"nowrap" }}>
      {t.label}
    </span>
  )
}

export function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      width:44, height:26, borderRadius:99, background:on?"#4361EE":"#cbd5e1",
      position:"relative", cursor:"pointer", transition:"background .2s", flexShrink:0,
    }}>
      <div style={{ position:"absolute", top:3, left:on?21:3, width:20, height:20,
        borderRadius:99, background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.3)" }}/>
    </div>
  )
}

export function Modal({ onClose, children, maxWidth=440 }) {
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(4px)",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth, background:"var(--card)", border:"1px solid var(--border)",
        borderRadius:14, padding:22, boxShadow:"0 20px 60px rgba(0,0,0,.5)",
      }}>
        {children}
      </div>
    </div>
  )
}

export const TH = { padding:"8px 10px", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:.8, color:"#64748b", textAlign:"left", whiteSpace:"nowrap" }
export const TD = { padding:"7px 9px", fontSize:13, borderTop:"1px solid rgba(128,128,128,.08)" }
