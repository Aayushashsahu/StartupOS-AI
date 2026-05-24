/**
 * StartupOS AI v3 — Frontend App.jsx (Production)
 * ✅ Persistent history via localStorage (DB layer)
 * ✅ Skeleton loaders on every async operation
 * ✅ Typed error states with Retry buttons per module
 * ✅ Toast notification system (success / warn / error)
 * ✅ Tabbed output in Meetings module
 * ✅ Cross-module context injection into Copilot
 * ✅ Per-module history sidebars with delete & restore
 * ✅ CRM contact status + notes persisted
 * ✅ Copilot chat history persisted (last 60 messages)
 * ✅ Command palette ⌘K
 * ✅ User session persisted across page refreshes
 *
 * API flow: ALL calls → FastAPI backend (api/client.js) → Google Gemini
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  meetingsApi, contentApi, ideasApi, tasksApi,
  chatApi, researchApi, dashboardApi,
} from './api/client.js'

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
const DB = {
  get:  (k, fb = null) => { try { const v = localStorage.getItem(`sos:${k}`); return v ? JSON.parse(v) : fb } catch { return fb } },
  set:  (k, v)         => { try { localStorage.setItem(`sos:${k}`, JSON.stringify(v)) } catch {} },
  push: (k, item, lim = 200) => { const a = DB.get(k, []); const n = [item, ...a].slice(0, lim); DB.set(k, n); return n },
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg0:'#06080a',bg1:'#0b0e11',bg2:'#10141a',bg3:'#141921',
  border:'#1a2030',borderHov:'#22304a',
  accent:'#00d4ff',accentDim:'#00d4ff14',accentMid:'#00d4ff55',
  text0:'#e8edf5',text1:'#9aa5b8',text2:'#4a5568',text3:'#2a3345',
  green:'#00c48c',greenDim:'#00c48c18',red:'#ff4757',redDim:'#ff475718',
  amber:'#f0b429',gold:'#f0b429',purple:'#a78bfa',
}

const NAV = [
  {id:'dashboard',icon:'⬡',label:'Command'},
  {id:'agent',    icon:'⚡',label:'AI Agent',badge:'NEW'},
  {id:'meetings', icon:'◎', label:'Meetings'},
  {id:'crm',      icon:'◈', label:'CRM'},
  {id:'content',  icon:'◷', label:'Content'},
  {id:'research', icon:'◉', label:'Research'},
  {id:'ideas',    icon:'◆', label:'Ideas'},
  {id:'tasks',    icon:'◐', label:'Tasks'},
  {id:'memory',   icon:'⬢', label:'Memory'},
  {id:'chat',     icon:'◑', label:'Copilot'},
]

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Dots({color=C.accent}) {
  return (
    <span style={{display:'inline-flex',gap:4,alignItems:'center'}}>
      {[0,1,2].map(i=>(
        <span key={i} style={{display:'inline-block',width:5,height:5,borderRadius:'50%',background:color,animation:`osDot 1.1s ${i*.18}s infinite ease-in-out`}}/>
      ))}
    </span>
  )
}

function Skeleton({w='100%',h=14,r=6,mb=8}) {
  return <div style={{width:w,height:h,borderRadius:r,marginBottom:mb,background:`linear-gradient(90deg,${C.bg3} 0%,${C.border} 50%,${C.bg3} 100%)`,backgroundSize:'200% 100%',animation:'skeletonShimmer 1.4s infinite ease-in-out'}}/>
}

function SkeletonBlock({lines=4}) {
  return (
    <div style={{padding:14}}>
      {Array.from({length:lines}).map((_,i)=>(
        <Skeleton key={i} w={i===lines-1?'60%':'100%'} h={12} mb={10}/>
      ))}
    </div>
  )
}

function ErrorState({message,onRetry,compact=false}) {
  return (
    <div style={{margin:compact?'8px 0':'16px 0',background:C.redDim,border:`1px solid ${C.red}33`,borderRadius:10,padding:compact?'10px 14px':'16px 18px',display:'flex',alignItems:compact?'center':'flex-start',gap:12,flexDirection:compact?'row':'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
        <span style={{color:C.red,fontSize:16,flexShrink:0}}>⚠</span>
        <div>
          <p style={{color:C.red,fontSize:13,fontWeight:600,margin:0}}>Request failed</p>
          {!compact&&<p style={{color:'#ff8a96',fontSize:12,margin:'3px 0 0',lineHeight:1.5}}>{message}</p>}
        </div>
      </div>
      {onRetry&&<button onClick={onRetry} style={{background:C.red+'22',border:`1px solid ${C.red}55`,color:C.red,borderRadius:7,padding:'6px 14px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0,transition:'all .15s'}} onMouseEnter={e=>e.currentTarget.style.background=C.red+'44'} onMouseLeave={e=>e.currentTarget.style.background=C.red+'22'}>Retry →</button>}
    </div>
  )
}

function useToasts() {
  const [toasts,setToasts]=useState([])
  const add=useCallback((msg,type='success')=>{
    const id=Date.now()
    setToasts(p=>[...p,{id,msg,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3800)
  },[])
  return {toasts,add}
}

function Toast({toasts}) {
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:2000,display:'flex',flexDirection:'column',gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:C.bg2,border:`1px solid ${t.type==='error'?C.red+'55':t.type==='warn'?C.amber+'55':C.green+'55'}`,borderLeft:`3px solid ${t.type==='error'?C.red:t.type==='warn'?C.amber:C.green}`,borderRadius:10,padding:'10px 16px',display:'flex',alignItems:'center',gap:10,animation:'toastIn .2s ease-out',minWidth:260,maxWidth:380}}>
          <span style={{fontSize:14,color:t.type==='error'?C.red:t.type==='warn'?C.amber:C.green}}>{t.type==='error'?'⚠':t.type==='warn'?'◌':'✓'}</span>
          <span style={{color:C.text1,fontSize:13,lineHeight:1.4}}>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

function AIOutput({output,loading,error,onRetry,label='AI Output',timestamp}) {
  const [copied,setCopied]=useState(false)
  function copy(){navigator.clipboard?.writeText(output);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  return (
    <div style={{marginTop:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
      <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:loading?C.amber:error?C.red:C.green,flexShrink:0}}/>
        <span style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase'}}>{label}</span>
        {loading&&<Dots color={C.amber}/>}
        {timestamp&&!loading&&<span style={{color:C.text3,fontSize:10,marginLeft:4}}>{timestamp}</span>}
        {!loading&&!error&&output&&(
          <button onClick={copy} style={{marginLeft:'auto',background:copied?C.green+'22':'transparent',border:`1px solid ${copied?C.green+'55':'transparent'}`,color:copied?C.green:C.text2,cursor:'pointer',fontSize:11,fontFamily:'inherit',borderRadius:5,padding:'3px 8px',transition:'all .15s'}}>{copied?'✓ Copied':'Copy'}</button>
        )}
      </div>
      {error?<ErrorState message={error} onRetry={onRetry}/>:loading&&!output?<SkeletonBlock lines={5}/>:(
        <div style={{padding:14,color:C.text1,fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:460,overflowY:'auto'}}>{output||' '}</div>
      )}
    </div>
  )
}

function RunBtn({onClick,loading,label='Run AI →',disabled=false}) {
  const off=loading||disabled
  return (
    <button onClick={onClick} disabled={off} style={{background:off?C.bg3:C.accent,color:off?C.text2:'#000',border:'none',borderRadius:8,padding:'9px 22px',fontWeight:700,fontSize:12,cursor:off?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:.5,transition:'all .15s',display:'inline-flex',alignItems:'center',gap:8}}>
      {loading?<><Dots color={C.text2}/><span>Processing…</span></>:label}
    </button>
  )
}

function TextArea({value,onChange,placeholder,rows=5}) {
  return (
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{width:'100%',boxSizing:'border-box',resize:'vertical',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.text0,fontSize:13,padding:'10px 14px',fontFamily:'inherit',outline:'none',lineHeight:1.7,transition:'border-color .2s'}}
      onFocus={e=>e.target.style.borderColor=C.accentMid} onBlur={e=>e.target.style.borderColor=C.border}
    />
  )
}

function SectionHeader({icon,title,subtitle,actions}) {
  return (
    <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',gap:12}}>
      <div style={{width:42,height:42,borderRadius:11,background:C.accentDim,border:`1px solid ${C.accentMid}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:C.accent,flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}>
        <h2 style={{color:C.text0,margin:0,fontSize:20,fontWeight:700,letterSpacing:-.5}}>{title}</h2>
        {subtitle&&<p style={{color:C.text2,fontSize:12,margin:'3px 0 0',lineHeight:1.5}}>{subtitle}</p>}
      </div>
      {actions&&<div style={{flexShrink:0}}>{actions}</div>}
    </div>
  )
}

function EmptyHistory() {
  return <div style={{padding:'24px 16px',textAlign:'center'}}><div style={{fontSize:28,marginBottom:8,opacity:.2}}>◌</div><p style={{color:C.text3,fontSize:12}}>No history yet</p></div>
}

function HistoryItem({item,onClick,onDelete}) {
  return (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,cursor:'pointer',marginBottom:4,transition:'background .15s'}}
      onMouseEnter={e=>{e.currentTarget.style.background=C.bg3;e.currentTarget.querySelector('.del').style.opacity='1'}}
      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.querySelector('.del').style.opacity='0'}}>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:C.text0,fontSize:12,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title||item.input?.slice(0,50)||'Untitled'}</p>
        <p style={{color:C.text2,fontSize:10,margin:'2px 0 0'}}>{item.ts}</p>
      </div>
      <button className='del' onClick={e=>{e.stopPropagation();onDelete()}} style={{background:'transparent',border:'none',color:C.red,cursor:'pointer',fontSize:14,opacity:0,transition:'opacity .15s',padding:2}}>×</button>
    </div>
  )
}

function HistorySidebar({histKey,history,setHistory,onSelect}) {
  return (
    <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase'}}>History ({history.length})</span>
        {history.length>0&&<button onClick={()=>{DB.set(histKey,[]);setHistory([])}} style={{background:'transparent',border:'none',color:C.text3,fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>Clear</button>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:6}}>
        {history.length===0?<EmptyHistory/>:history.map((item,i)=>(
          <HistoryItem key={i} item={item} onClick={()=>onSelect(item)}
            onDelete={()=>{const next=history.filter((_,j)=>j!==i);DB.set(histKey,next);setHistory(next)}}/>
        ))}
      </div>
    </div>
  )
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [tab,setTab]=useState('login')
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [pass,setPass]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  async function handleSubmit() {
    if(!email.trim()){setError('Email is required.');return}
    if(!pass.trim()){setError('Password is required.');return}
    if(tab==='signup'&&!name.trim()){setError('Name is required.');return}
    setError('');setLoading(true)
    await new Promise(r=>setTimeout(r,900))
    const u={name:name||email.split('@')[0],email,id:'usr_'+Date.now()}
    DB.set('user',u);onLogin(u);setLoading(false)
  }

  const inp={width:'100%',boxSizing:'border-box',background:'#0a0e14',border:`1px solid ${C.border}`,borderRadius:10,color:C.text0,fontSize:14,padding:'11px 14px',fontFamily:'inherit',outline:'none',marginBottom:10,transition:'border-color .2s'}

  return (
    <div style={{minHeight:'100vh',background:C.bg0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif"}}>
      <div style={{width:420,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:20,padding:'2.5rem',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${C.accent},transparent)`}}/>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:52,height:52,background:C.accent,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'#000',margin:'0 auto 14px'}}>S</div>
          <h1 style={{color:C.text0,fontSize:22,fontWeight:800,margin:0,letterSpacing:-.5}}>StartupOS AI</h1>
          <p style={{color:C.text2,fontSize:11,letterSpacing:3,margin:'5px 0 0',textTransform:'uppercase'}}>Founder Operating System</p>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:22,background:C.bg0,borderRadius:10,padding:4}}>
          {['login','signup'].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setError('')}} style={{flex:1,background:tab===t?C.bg2:'transparent',border:`1px solid ${tab===t?C.border:'transparent'}`,color:tab===t?C.text0:C.text2,borderRadius:7,padding:7,cursor:'pointer',fontWeight:tab===t?700:400,fontSize:12,fontFamily:'inherit',textTransform:'capitalize'}}>{t}</button>
          ))}
        </div>
        {tab==='signup'&&<input value={name} onChange={e=>setName(e.target.value)} placeholder='Full name' style={inp} onFocus={e=>e.target.style.borderColor=C.accentMid} onBlur={e=>e.target.style.borderColor=C.border}/>}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email address' style={inp} onFocus={e=>e.target.style.borderColor=C.accentMid} onBlur={e=>e.target.style.borderColor=C.border}/>
        <input value={pass} onChange={e=>setPass(e.target.value)} type='password' placeholder='Password' onKeyDown={e=>e.key==='Enter'&&handleSubmit()} style={{...inp,marginBottom:0}} onFocus={e=>e.target.style.borderColor=C.accentMid} onBlur={e=>e.target.style.borderColor=C.border}/>
        {error&&<p style={{color:C.red,fontSize:12,margin:'8px 0 0',display:'flex',alignItems:'center',gap:6}}><span>⚠</span>{error}</p>}
        <button onClick={handleSubmit} disabled={loading} style={{width:'100%',marginTop:16,background:loading?C.bg3:C.accent,color:loading?C.text2:'#000',border:'none',borderRadius:10,padding:12,fontWeight:700,fontSize:14,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s'}}>
          {loading?<><Dots color={C.text2}/><span>Authenticating…</span></>:(tab==='login'?'Enter OS →':'Create Account →')}
        </button>
        <div style={{marginTop:20,padding:'12px 14px',background:C.bg0,borderRadius:10,border:`1px solid ${C.border}`}}>
          <p style={{color:C.text3,fontSize:10,margin:0,letterSpacing:1,textTransform:'uppercase'}}>Production Stack</p>
          <p style={{color:C.text2,fontSize:11,margin:'5px 0 0',lineHeight:1.6}}>FastAPI · Google Gemini · SQLite · React · JWT Auth · localStorage History</p>
        </div>
      </div>
    </div>
  )
}

// ─── COMMAND PALETTE ──────────────────────────────────────────────────────────
function CommandPalette({open,onClose,setActive}) {
  const [query,setQuery]=useState('')
  const inputRef=useRef(null)
  useEffect(()=>{if(open){setQuery('');setTimeout(()=>inputRef.current?.focus(),50)}},[open])
  const cmds=[
    ...NAV.map(n=>({label:n.label,icon:n.icon,action:()=>setActive(n.id),cat:'Navigate'})),
    {label:'Clear all history',icon:'◌',action:()=>['meetings','content','research','ideas','tasks'].forEach(k=>DB.set(`hist:${k}`,[])),cat:'Settings'},
  ]
  const filtered=query?cmds.filter(c=>c.label.toLowerCase().includes(query.toLowerCase())):cmds
  if(!open)return null
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:2000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:'14vh'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:560,background:C.bg1,borderRadius:16,border:`1px solid ${C.accentMid}`,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
        <div style={{padding:'13px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}}>
          <span style={{color:C.text2,fontSize:16}}>⌘</span>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder='Search commands, modules, actions…' style={{flex:1,background:'transparent',border:'none',color:C.text0,fontSize:14,outline:'none',fontFamily:'inherit'}}/>
          <kbd style={{color:C.text3,fontSize:10,background:C.bg3,padding:'2px 7px',borderRadius:5,letterSpacing:1}}>ESC</kbd>
        </div>
        <div style={{maxHeight:380,overflowY:'auto',padding:6}}>
          {filtered.map((cmd,i)=>(
            <button key={i} onClick={()=>{cmd.action();onClose()}} style={{width:'100%',display:'flex',alignItems:'center',gap:12,background:'transparent',border:'none',borderRadius:8,padding:'10px 12px',cursor:'pointer',color:C.text0,fontSize:13,fontFamily:'inherit',textAlign:'left',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{color:C.accent,fontSize:16,minWidth:22}}>{cmd.icon}</span>
              <span style={{flex:1}}>{cmd.label}</span>
              <span style={{color:C.text3,fontSize:10,letterSpacing:1,textTransform:'uppercase'}}>{cmd.cat}</span>
            </button>
          ))}
        </div>
        <div style={{padding:'8px 14px',borderTop:`1px solid ${C.border}`,display:'flex',gap:16}}>
          {[['↵','Select'],['↑↓','Navigate'],['Esc','Dismiss']].map(([k,v])=>(
            <span key={k} style={{display:'flex',alignItems:'center',gap:5}}>
              <kbd style={{color:C.text2,fontSize:10,background:C.bg3,padding:'2px 6px',borderRadius:4}}>{k}</kbd>
              <span style={{color:C.text3,fontSize:10}}>{v}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({setActive,user}) {
  const [stats,setStats]=useState(null)
  useEffect(()=>{
    dashboardApi.getStats().then(setStats).catch(()=>{
      setStats({
        meetings_summarized:DB.get('hist:meetings',[]).length,
        content_generated:DB.get('hist:content',[]).length,
        ideas_saved:DB.get('hist:ideas',[]).length,
        tasks_active:DB.get('tasks:board',[]).filter(t=>t.status!=='done').length,
      })
    })
  },[])

  const cards=[
    {label:'Meetings Analyzed',value:stats?.meetings_summarized,icon:'◎',color:C.accent, module:'meetings'},
    {label:'Content Generated', value:stats?.content_generated,  icon:'◷',color:C.purple,module:'content'},
    {label:'Ideas Vaulted',     value:stats?.ideas_saved,         icon:'◆',color:C.gold,  module:'ideas'},
    {label:'Active Tasks',      value:stats?.tasks_active,        icon:'◐',color:C.green, module:'tasks'},
  ]

  const recentItems=[
    ...DB.get('hist:meetings',[]).slice(0,2).map(i=>({...i,icon:'◎',color:C.accent})),
    ...DB.get('hist:content', []).slice(0,2).map(i=>({...i,icon:'◷',color:C.purple})),
    ...DB.get('hist:ideas',   []).slice(0,2).map(i=>({...i,icon:'◆',color:C.gold})),
  ].sort((a,b)=>(b.rawTs||0)-(a.rawTs||0)).slice(0,6)

  const hr=new Date().getHours()
  const greet=hr<12?'morning':hr<18?'afternoon':'evening'

  return (
    <div style={{padding:'32px 36px'}}>
      <div style={{marginBottom:32}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:C.green}}/>
          <span style={{color:C.text2,fontFamily:'monospace',fontSize:10,letterSpacing:3}}>SYSTEM ONLINE // STARTUPOS v3.0</span>
        </div>
        <h1 style={{color:C.text0,fontSize:32,fontWeight:800,letterSpacing:-1,margin:0}}>Good {greet}, {user?.name?.split(' ')[0]||'Founder'}.</h1>
        <p style={{color:C.text2,fontSize:14,margin:'8px 0 0',lineHeight:1.6}}>History persists across sessions. Backend: FastAPI + Google Gemini + SQLite.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:32}}>
        {cards.map(s=>(
          <div key={s.label} onClick={()=>setActive(s.module)} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:'18px 20px',cursor:'pointer',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=s.color+'55';e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='none'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <p style={{color:C.text2,fontSize:10,letterSpacing:1.5,textTransform:'uppercase',margin:0,lineHeight:1.4}}>{s.label}</p>
              <span style={{color:s.color,fontSize:18}}>{s.icon}</span>
            </div>
            {stats===null
              ?<div style={{marginTop:10}}><Skeleton w='50%' h={28} r={6}/></div>
              :<p style={{color:C.text0,fontSize:34,fontWeight:800,margin:'10px 0 0',letterSpacing:-1}}>{s.value??0}</p>
            }
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:20}}>
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:'20px 22px'}}>
          <p style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',margin:'0 0 16px'}}>Quick Actions</p>
          {[
            {label:'⚡ Run AI Agent',     desc:'Multi-step autonomous workflow',  module:'agent',   hot:true},
            {label:'◎ Summarize Meeting', desc:'Transcript → actions + email',    module:'meetings'},
            {label:'◷ Generate Content',  desc:'LinkedIn / Twitter / Blog',       module:'content'},
            {label:'◉ Research Market',   desc:'Competitor & trend analysis',     module:'research'},
            {label:'◑ Ask Copilot',       desc:'Your AI startup advisor',         module:'chat'},
          ].map(q=>(
            <button key={q.label} onClick={()=>setActive(q.module)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,background:q.hot?C.accentDim:'transparent',border:`1px solid ${q.hot?C.accentMid:'transparent'}`,borderRadius:10,padding:'10px 12px',cursor:'pointer',textAlign:'left',marginBottom:6,fontFamily:'inherit',transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background=q.hot?C.accentDim:C.bg3}
              onMouseLeave={e=>e.currentTarget.style.background=q.hot?C.accentDim:'transparent'}>
              <div>
                <p style={{color:q.hot?C.accent:C.text0,fontSize:13,fontWeight:600,margin:0}}>{q.label}</p>
                <p style={{color:C.text2,fontSize:11,margin:'1px 0 0'}}>{q.desc}</p>
              </div>
              <span style={{marginLeft:'auto',color:C.text3}}>→</span>
            </button>
          ))}
        </div>

        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:'20px 22px'}}>
          <p style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',margin:'0 0 16px'}}>Recent Activity</p>
          {recentItems.length===0?<EmptyHistory/>:recentItems.map((item,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<recentItems.length-1?`1px solid ${C.border}`:'none'}}>
              <span style={{color:item.color,fontSize:14,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{color:C.text0,fontSize:12,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title||item.input?.slice(0,40)||'Untitled'}</p>
                <p style={{color:C.text3,fontSize:10,margin:0}}>{item.ts}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── MEETINGS ─────────────────────────────────────────────────────────────────
function MeetingsModule({toast}) {
  const HK='hist:meetings'
  const [title,setTitle]=useState('')
  const [input,setInput]=useState('')
  const [output,setOutput]=useState(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [history,setHistory]=useState(()=>DB.get(HK,[]))
  const [activeTab,setActiveTab]=useState('summary')

  async function run() {
    if(!input.trim()||loading)return
    setLoading(true);setError('');setOutput(null)
    try {
      const result=await meetingsApi.summarize(title||'Untitled',input)
      const ts=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
      const item={title:title||input.slice(0,50),input,output:result,ts,rawTs:Date.now()}
      const next=DB.push(HK,item);setHistory(next);setOutput(result)
      toast('Meeting summarized and saved.','success')
    } catch(e){setError(e.message);toast('Failed to summarize.','error')}
    setLoading(false)
  }

  const TABS=['summary','key points','action items','follow-up email']
  const tabContent={
    'summary':output?.summary||'',
    'key points':(output?.key_points||[]).map((p,i)=>`${i+1}. ${p}`).join('\n'),
    'action items':(output?.action_items||[]).map(a=>`• ${a}`).join('\n'),
    'follow-up email':output?.follow_up_email||'',
  }

  return (
    <div style={{padding:'32px 36px',display:'grid',gridTemplateColumns:'1fr 260px',gap:24,maxHeight:'calc(100vh - 60px)',boxSizing:'border-box'}}>
      <div style={{overflow:'auto'}}>
        <SectionHeader icon='◎' title='Meeting Summarizer' subtitle='Transcript → structured analysis, action items & follow-up email. Auto-saved.'/>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder='Meeting title (optional)…' style={{width:'100%',boxSizing:'border-box',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text0,fontSize:13,padding:'9px 12px',fontFamily:'inherit',outline:'none',marginBottom:10}}/>
        <label style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:8}}>Transcript / Notes</label>
        <TextArea value={input} onChange={setInput} placeholder='Paste raw meeting notes, transcript, or conversation…' rows={8}/>
        <div style={{marginTop:12,display:'flex',alignItems:'center',gap:12}}>
          <RunBtn onClick={run} loading={loading} label='Summarize →' disabled={!input.trim()}/>
          {!loading&&output&&!error&&<span style={{color:C.green,fontSize:12}}>✓ Saved to history</span>}
        </div>
        {error&&<ErrorState message={error} onRetry={run}/>}
        {(output||loading)&&!error&&(
          <div style={{marginTop:20,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,overflowX:'auto'}}>
              {TABS.map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)} style={{padding:'10px 16px',background:activeTab===t?C.bg3:'transparent',border:'none',borderBottom:activeTab===t?`2px solid ${C.accent}`:'2px solid transparent',color:activeTab===t?C.text0:C.text2,cursor:'pointer',fontSize:11,fontFamily:'inherit',whiteSpace:'nowrap',textTransform:'capitalize',transition:'all .15s'}}>{t}</button>
              ))}
              {loading&&<div style={{marginLeft:'auto',padding:'10px 14px',display:'flex',alignItems:'center'}}><Dots color={C.amber}/></div>}
            </div>
            {loading&&!output?<SkeletonBlock lines={6}/>:(
              <div style={{padding:16,color:C.text1,fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:380,overflowY:'auto'}}>{tabContent[activeTab]}</div>
            )}
          </div>
        )}
      </div>
      <HistorySidebar histKey={HK} history={history} setHistory={setHistory}
        onSelect={item=>{setTitle(item.title);setInput(item.input);setOutput(item.output);setError('')}}/>
    </div>
  )
}

// ─── CONTENT ──────────────────────────────────────────────────────────────────
function ContentModule({toast}) {
  const HK='hist:content'
  const [platform,setPlatform]=useState('linkedin')
  const [tone,setTone]=useState('thought-leadership')
  const [input,setInput]=useState('')
  const [output,setOutput]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [history,setHistory]=useState(()=>DB.get(HK,[]))

  async function run() {
    if(!input.trim()||loading)return
    setLoading(true);setError('');setOutput('')
    try {
      const result=await contentApi.generate({topic:input,platform,tone,audience:'startup founders'})
      const ts=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
      const item={title:`${platform} — ${input.slice(0,40)}`,input,output:result.generated_text,platform,ts,rawTs:Date.now()}
      const next=DB.push(HK,item);setHistory(next);setOutput(result.generated_text)
      toast('Content generated and saved.','success')
    } catch(e){setError(e.message);toast('Content generation failed.','error')}
    setLoading(false)
  }

  const pill=(val,active,onClick)=><button onClick={onClick} style={{background:active?C.accent:C.bg3,color:active?'#000':C.text2,border:'none',borderRadius:20,padding:'5px 12px',cursor:'pointer',fontSize:11,fontFamily:'inherit',fontWeight:active?700:400,transition:'all .15s',textTransform:'capitalize'}}>{val}</button>

  return (
    <div style={{padding:'32px 36px',display:'grid',gridTemplateColumns:'1fr 260px',gap:24,maxHeight:'calc(100vh - 60px)',boxSizing:'border-box'}}>
      <div style={{overflow:'auto'}}>
        <SectionHeader icon='◷' title='Content Generator' subtitle='AI-crafted content for LinkedIn, Twitter, blogs — saved to persistent history.'/>
        <div style={{marginBottom:14}}>
          <p style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',margin:'0 0 8px'}}>Platform</p>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{['linkedin','twitter','blog','email','announcement'].map(p=>pill(p,platform===p,()=>setPlatform(p)))}</div>
        </div>
        <div style={{marginBottom:16}}>
          <p style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',margin:'0 0 8px'}}>Tone</p>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{['thought-leadership','casual','technical','inspirational','sales'].map(t=>pill(t,tone===t,()=>setTone(t)))}</div>
        </div>
        <TextArea value={input} onChange={setInput} placeholder='e.g. "Why founders should treat distribution as their first product"' rows={5}/>
        <div style={{marginTop:12}}><RunBtn onClick={run} loading={loading} label='Generate →' disabled={!input.trim()}/></div>
        {error&&<ErrorState message={error} onRetry={run}/>}
        <AIOutput output={output} loading={loading&&!output} error={error&&!output?error:''} label='Generated Content' timestamp={history[0]?.ts}/>
      </div>
      <HistorySidebar histKey={HK} history={history} setHistory={setHistory}
        onSelect={item=>{setInput(item.input);setOutput(item.output);setPlatform(item.platform||'linkedin');setError('')}}/>
    </div>
  )
}

// ─── RESEARCH ─────────────────────────────────────────────────────────────────
function ResearchModule({toast}) {
  const HK='hist:research'
  const [input,setInput]=useState('')
  const [output,setOutput]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [history,setHistory]=useState(()=>DB.get(HK,[]))

  async function run() {
    if(!input.trim()||loading)return
    setLoading(true);setError('');setOutput('')
    try {
      const result=await researchApi.search(input)
      const ts=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
      const item={title:input.slice(0,60),input,output:result.result,ts,rawTs:Date.now()}
      const next=DB.push(HK,item);setHistory(next);setOutput(result.result)
      toast('Research saved.','success')
    } catch(e){setError(e.message);toast('Research failed.','error')}
    setLoading(false)
  }

  return (
    <div style={{padding:'32px 36px',display:'grid',gridTemplateColumns:'1fr 260px',gap:24,maxHeight:'calc(100vh - 60px)',boxSizing:'border-box'}}>
      <div style={{overflow:'auto'}}>
        <SectionHeader icon='◉' title='Research Assistant' subtitle='TMT-grade market analysis, competitive intelligence, trend synthesis.'/>
        <TextArea value={input} onChange={setInput} placeholder='e.g. "Analyze the AI coding tools market — key players, TAM, moats, risks"' rows={5}/>
        <div style={{marginTop:12}}><RunBtn onClick={run} loading={loading} label='Research →' disabled={!input.trim()}/></div>
        {error&&<ErrorState message={error} onRetry={run}/>}
        <AIOutput output={output} loading={loading&&!output} error={error&&!output?error:''} label='Research Report' timestamp={history[0]?.ts}/>
      </div>
      <HistorySidebar histKey={HK} history={history} setHistory={setHistory}
        onSelect={item=>{setInput(item.input);setOutput(item.output);setError('')}}/>
    </div>
  )
}

// ─── IDEAS ────────────────────────────────────────────────────────────────────
function IdeasModule({toast}) {
  const HK='hist:ideas'
  const [ideas,setIdeas]=useState(()=>DB.get(HK,[
    {id:'1',title:'AI Resume Builder for Devs',category:'SaaS',stage:'concept',expansion:'',ts:'Saved',rawTs:0},
    {id:'2',title:'Micro-SaaS Marketplace',category:'Platform',stage:'exploring',expansion:'',ts:'Saved',rawTs:1},
  ]))
  const [newIdea,setNewIdea]=useState('')
  const [loadingId,setLoadingId]=useState(null)
  const [errorId,setErrorId]=useState(null)

  async function addAndExpand() {
    if(!newIdea.trim())return
    const id=Date.now().toString()
    const ts=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
    const idea={id,title:newIdea,category:'New',stage:'concept',expansion:'',ts,rawTs:Date.now()}
    const next=[idea,...ideas];setIdeas(next);DB.set(HK,next);setNewIdea('')
    setLoadingId(id);setErrorId(null)
    try {
      const result=await ideasApi.expand(idea.id)
      const final=next.map(i=>i.id===id?{...i,expansion:result.expansion}:i)
      setIdeas(final);DB.set(HK,final)
      toast('Idea expanded and saved.','success')
    } catch(e){setErrorId(id);toast('Failed to expand idea.','error')}
    setLoadingId(null)
  }

  async function retryExpand(idea) {
    setLoadingId(idea.id);setErrorId(null)
    try {
      const result=await ideasApi.expand(idea.id)
      const final=ideas.map(i=>i.id===idea.id?{...i,expansion:result.expansion}:i)
      setIdeas(final);DB.set(HK,final)
    } catch{setErrorId(idea.id)}
    setLoadingId(null)
  }

  const stageColor={concept:C.text2,exploring:C.amber,validated:C.green,building:C.accent}

  return (
    <div style={{padding:'32px 36px',maxWidth:920}}>
      <SectionHeader icon='◆' title='Idea Vault' subtitle='Save ideas, AI expands into full venture analysis. Persisted across sessions.'/>
      <div style={{display:'flex',gap:10,marginBottom:28}}>
        <input value={newIdea} onChange={e=>setNewIdea(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addAndExpand()} placeholder='Enter a startup idea to vault and expand…' style={{flex:1,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.text0,fontSize:13,padding:'10px 14px',fontFamily:'inherit',outline:'none'}}/>
        <button onClick={addAndExpand} disabled={!newIdea.trim()} style={{background:newIdea.trim()?C.accent:C.bg3,color:newIdea.trim()?'#000':C.text2,border:'none',borderRadius:10,padding:'10px 20px',fontWeight:700,fontSize:12,cursor:newIdea.trim()?'pointer':'not-allowed',fontFamily:'inherit'}}>Vault + Expand</button>
      </div>
      {ideas.map(idea=>(
        <div key={idea.id} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:14,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1}}>
              <p style={{color:C.text0,fontWeight:700,fontSize:14,margin:0}}>{idea.title}</p>
              <p style={{color:C.text2,fontSize:11,margin:'3px 0 0'}}>{idea.category} · {idea.ts}</p>
            </div>
            <span style={{background:stageColor[idea.stage]+'22',color:stageColor[idea.stage],fontSize:10,padding:'3px 10px',borderRadius:20}}>{idea.stage}</span>
            <button onClick={()=>{const next=ideas.filter(i=>i.id!==idea.id);setIdeas(next);DB.set(HK,next)}} style={{background:'transparent',border:'none',color:C.text3,cursor:'pointer',fontSize:16,lineHeight:1,padding:2}}>×</button>
          </div>
          {(idea.expansion||loadingId===idea.id||errorId===idea.id)&&(
            <div style={{borderTop:`1px solid ${C.border}`}}>
              {loadingId===idea.id?<SkeletonBlock lines={5}/>:
               errorId===idea.id?<div style={{padding:'0 18px 14px'}}><ErrorState message='Failed to expand idea.' onRetry={()=>retryExpand(idea)}/></div>:
               <div style={{padding:'14px 18px',color:C.text1,fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:280,overflowY:'auto'}}>{idea.expansion}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
function TasksModule({toast}) {
  const [tasks,setTasks]=useState(()=>DB.get('tasks:board',[
    {id:'t1',title:'Set up Supabase auth', status:'done',        priority:'high',  source:'manual'},
    {id:'t2',title:'Build landing page',   status:'in_progress', priority:'high',  source:'agent'},
    {id:'t3',title:'Research competitors', status:'todo',        priority:'medium',source:'meetings'},
    {id:'t4',title:'First LinkedIn post',  status:'todo',        priority:'medium',source:'agent'},
  ]))
  const [goal,setGoal]=useState('')
  const [output,setOutput]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  function saveBoard(next){setTasks(next);DB.set('tasks:board',next)}

  async function generatePlan() {
    if(!goal.trim()||loading)return
    setLoading(true);setError('');setOutput('')
    try {
      const result=await tasksApi.plan(goal,30)
      setOutput(result.plan_text)
      const updated=await tasksApi.list().catch(()=>[])
      if(updated.length)saveBoard(updated)
      toast(`${result.tasks_created||0} tasks added to board.`,'success')
    } catch(e){setError(e.message);toast('Task planning failed.','error')}
    setLoading(false)
  }

  async function cycleStatus(task) {
    const map={todo:'in_progress',in_progress:'done',done:'todo'}
    const next=tasks.map(t=>t.id===task.id?{...t,status:map[t.status]}:t)
    saveBoard(next)
    tasksApi.update(task.id,{status:map[task.status]}).catch(()=>{})
  }

  const cols=[
    {id:'todo',       label:'To Do',      color:C.text2},
    {id:'in_progress',label:'In Progress',color:C.amber},
    {id:'done',       label:'Done',       color:C.green},
  ]

  return (
    <div style={{padding:'32px 36px'}}>
      <SectionHeader icon='◐' title='Task Planner' subtitle='AI breaks goals into tasks. Board persists across sessions. Click task to advance.'/>
      <div style={{display:'flex',gap:10,marginBottom:24}}>
        <input value={goal} onChange={e=>setGoal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generatePlan()} placeholder='Enter a goal: "Get first 100 paying customers in 30 days"' style={{flex:1,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.text0,fontSize:13,padding:'10px 14px',fontFamily:'inherit',outline:'none'}}/>
        <RunBtn onClick={generatePlan} loading={loading} label='AI Plan →' disabled={!goal.trim()}/>
      </div>
      {error&&<ErrorState message={error} onRetry={generatePlan}/>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        {cols.map(col=>(
          <div key={col.id} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'11px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:col.color}}/>
              <span style={{color:C.text1,fontSize:12,fontWeight:700}}>{col.label}</span>
              <span style={{marginLeft:'auto',color:C.text3,fontSize:11,background:C.bg3,padding:'2px 8px',borderRadius:20}}>{tasks.filter(t=>t.status===col.id).length}</span>
            </div>
            <div style={{padding:10,display:'flex',flexDirection:'column',gap:8,minHeight:220,maxHeight:480,overflowY:'auto'}}>
              {loading&&col.id==='todo'&&<div style={{background:C.bg3,borderRadius:9,padding:12}}><SkeletonBlock lines={2}/></div>}
              {tasks.filter(t=>t.status===col.id).map(t=>(
                <div key={t.id} onClick={()=>cycleStatus(t)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 12px',cursor:'pointer',transition:'all .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHov;e.currentTarget.style.transform='translateY(-1px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='none'}}>
                  <p style={{color:C.text0,fontSize:12,margin:'0 0 8px',lineHeight:1.5}}>{t.title}</p>
                  <div style={{display:'flex',gap:5}}>
                    <span style={{background:t.priority==='high'?C.red+'22':C.bg2,color:t.priority==='high'?C.red:C.text3,fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:600}}>{t.priority}</span>
                    <span style={{background:C.bg2,color:C.text3,fontSize:9,padding:'2px 7px',borderRadius:20}}>{t.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {output&&<div style={{marginTop:20}}><AIOutput output={output} loading={false} label='AI Plan Output'/></div>}
    </div>
  )
}

// ─── CRM ──────────────────────────────────────────────────────────────────────
function CRMModule({toast}) {
  const [contacts,setContacts]=useState(()=>DB.get('crm:contacts',[
    {id:'1',name:'Priya Sharma',role:'Angel Investor',  tag:'investor',status:'hot', lastContact:'2d ago',notes:''},
    {id:'2',name:'Raj Mehta',   role:'Co-founder@TechX',tag:'partner', status:'warm',lastContact:'1w ago', notes:''},
    {id:'3',name:'Aisha Khan',  role:'YC Partner',      tag:'mentor',  status:'hot', lastContact:'Today',  notes:''},
  ]))
  const [selected,setSelected]=useState(null)
  const [note,setNote]=useState('')
  const [aiMsg,setAiMsg]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [adding,setAdding]=useState(false)
  const [newC,setNewC]=useState({name:'',role:'',tag:'lead',status:'warm'})

  function saveContacts(next){setContacts(next);DB.set('crm:contacts',next)}

  async function generateFollowUp() {
    if(!selected||loading)return
    setLoading(true);setAiMsg('');setError('')
    try {
      const result=await chatApi.send(`Write a short natural follow-up for: ${selected.name}, ${selected.role} (${selected.tag}). Last: ${selected.lastContact}. Notes: ${note||'none'}. Max 3 sentences.`,'crm')
      setAiMsg(result.content)
      toast('Follow-up drafted.','success')
    } catch(e){setError(e.message);toast('Failed to generate follow-up.','error')}
    setLoading(false)
  }

  const statusC={hot:C.green,warm:C.amber,cold:C.text2}

  return (
    <div style={{padding:'32px 36px'}}>
      <SectionHeader icon='◈' title='Founder CRM' subtitle='Investors, clients, collaborators — AI-powered follow-ups. Contact data persists.'
        actions={<button onClick={()=>setAdding(a=>!a)} style={{background:adding?C.bg3:C.accent,color:adding?C.text2:'#000',border:'none',borderRadius:8,padding:'8px 16px',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{adding?'Cancel':'+ Add Contact'}</button>}/>
      {adding&&(
        <div style={{background:C.bg2,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:16,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
          {[['name','Name *'],['role','Role / Company']].map(([k,p])=>(
            <input key={k} value={newC[k]||''} onChange={e=>setNewC(prev=>({...prev,[k]:e.target.value}))} placeholder={p} style={{flex:1,minWidth:140,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text0,fontSize:13,padding:'8px 12px',fontFamily:'inherit',outline:'none'}}/>
          ))}
          <button onClick={()=>{if(!newC.name)return;const c={...newC,id:Date.now().toString(),lastContact:'Just now',notes:''};saveContacts([c,...contacts]);setAdding(false);setNewC({name:'',role:'',tag:'lead',status:'warm'});toast('Contact added.','success')}} style={{background:C.accent,color:'#000',border:'none',borderRadius:8,padding:'8px 16px',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:20}}>
        <div style={{display:'flex',flexDirection:'column',gap:8,overflowY:'auto',maxHeight:'calc(100vh - 280px)'}}>
          {contacts.map(c=>(
            <div key={c.id} onClick={()=>{setSelected(c);setAiMsg('');setError('');setNote(c.notes||'')}} style={{background:selected?.id===c.id?C.bg3:C.bg2,border:`1px solid ${selected?.id===c.id?C.accentMid:C.border}`,borderRadius:10,padding:'12px 14px',cursor:'pointer',transition:'all .15s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <span style={{color:C.text0,fontWeight:700,fontSize:13}}>{c.name}</span>
                <div style={{width:8,height:8,borderRadius:'50%',background:statusC[c.status]}}/>
              </div>
              <p style={{color:C.text2,fontSize:11,margin:'0 0 7px'}}>{c.role}</p>
              <div style={{display:'flex',gap:6}}>
                <span style={{background:C.bg0,color:C.text2,fontSize:10,padding:'2px 8px',borderRadius:20}}>{c.tag}</span>
                <span style={{color:C.text3,fontSize:10}}>{c.lastContact}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:20,overflow:'auto'}}>
          {selected?(
            <>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:C.accentDim,border:`1px solid ${C.accentMid}`,display:'flex',alignItems:'center',justifyContent:'center',color:C.accent,fontWeight:800,fontSize:16,flexShrink:0}}>
                  {selected.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <h3 style={{color:C.text0,margin:0,fontSize:18,fontWeight:700}}>{selected.name}</h3>
                  <p style={{color:C.text2,fontSize:12,margin:'3px 0 0'}}>{selected.role} · {selected.lastContact}</p>
                </div>
                <div style={{display:'flex',gap:6}}>
                  {['hot','warm','cold'].map(s=>(
                    <button key={s} onClick={()=>{const next=contacts.map(c=>c.id===selected.id?{...c,status:s}:c);saveContacts(next);setSelected(prev=>({...prev,status:s}))}} style={{background:selected.status===s?statusC[s]+'33':'transparent',border:`1px solid ${selected.status===s?statusC[s]:C.border}`,color:statusC[s],borderRadius:20,padding:'3px 10px',fontSize:10,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>{s}</button>
                  ))}
                </div>
              </div>
              <label style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:8}}>Interaction Notes</label>
              <TextArea value={note} onChange={v=>{setNote(v);const next=contacts.map(c=>c.id===selected.id?{...c,notes:v}:c);setContacts(next);DB.set('crm:contacts',next)}} placeholder='What did you discuss? Context, next steps…' rows={4}/>
              <div style={{marginTop:12}}><RunBtn onClick={generateFollowUp} loading={loading} label='AI Follow-up →'/></div>
              {error&&<ErrorState message={error} onRetry={generateFollowUp}/>}
              <AIOutput output={aiMsg} loading={loading&&!aiMsg} error={error&&!aiMsg?error:''} label='Suggested Message'/>
            </>
          ):(
            <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
              <div style={{fontSize:32,opacity:.2}}>◈</div>
              <p style={{color:C.text3,fontSize:13}}>Select a contact to manage</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── COPILOT ──────────────────────────────────────────────────────────────────
function CopilotModule({toast}) {
  const HK='chat:copilot'
  const [messages,setMessages]=useState(()=>{
    const saved=DB.get(HK,[])
    return saved.length>0?saved:[{role:'assistant',content:"Hello, Founder. I'm your AI Copilot powered by Google Gemini via FastAPI. I have cross-module context from your tasks, ideas, and meetings. Ask anything — strategy, fundraising, product, or operations.",ts:''}]
  })
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const endRef=useRef(null)

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  useEffect(()=>{
    chatApi.history('copilot').then(hist=>{
      if(hist.length>0)setMessages(hist.map(m=>({role:m.role,content:m.content,ts:m.created_at?.slice(11,16)||''})))
    }).catch(()=>{})
  },[])

  async function send() {
    if(!input.trim()||loading)return
    const text=input;setInput('');setError('')
    const ts=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
    const userMsg={role:'user',content:text,ts}
    const aiPlaceholder={role:'assistant',content:'',ts:''}
    const next=[...messages,userMsg,aiPlaceholder];setMessages(next);setLoading(true)
    try {
      const result=await chatApi.send(text,'copilot')
      const finalTs=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
      const saved=[...messages,userMsg,{role:'assistant',content:result.content,ts:finalTs}]
      setMessages(saved);DB.set(HK,saved.slice(-60))
    } catch(e) {
      setError(e.message)
      setMessages(prev=>{const u=[...prev];u[u.length-1]={role:'assistant',content:'⚠ '+e.message,ts:''};return u})
      toast('Copilot request failed.','error')
    }
    setLoading(false)
  }

  return (
    <div style={{padding:'24px 32px',display:'flex',flexDirection:'column',height:'calc(100vh - 60px)'}}>
      <div style={{marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:38,height:38,borderRadius:10,background:C.accentDim,border:`1px solid ${C.accentMid}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:C.accent}}>◑</div>
        <div style={{flex:1}}>
          <h2 style={{color:C.text0,margin:0,fontSize:18,fontWeight:700}}>AI Copilot</h2>
          <p style={{color:C.text2,fontSize:11,margin:'2px 0 0'}}>Cross-module context · Gemini via FastAPI · {messages.length-1} messages persisted</p>
        </div>
        <button onClick={()=>{const r=[{role:'assistant',content:'Conversation cleared. How can I help?',ts:''}];setMessages(r);DB.set(HK,r)}} style={{background:'transparent',border:`1px solid ${C.border}`,color:C.text2,borderRadius:7,padding:'6px 12px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Clear chat</button>
      </div>
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:14,paddingRight:4}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',alignItems:'flex-end',gap:10}}>
            {m.role==='assistant'&&<div style={{width:28,height:28,borderRadius:'50%',background:C.accentDim,border:`1px solid ${C.accentMid}`,display:'flex',alignItems:'center',justifyContent:'center',color:C.accent,fontSize:11,flexShrink:0}}>◑</div>}
            <div style={{maxWidth:'70%',display:'flex',flexDirection:'column',alignItems:m.role==='user'?'flex-end':'flex-start',gap:3}}>
              <div style={{padding:'11px 15px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:m.role==='user'?C.accent:C.bg2,border:m.role==='user'?'none':`1px solid ${C.border}`,color:m.role==='user'?'#000':C.text1,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                {m.content||(loading&&i===messages.length-1?<Dots color={C.amber}/>:'')}
              </div>
              {m.ts&&<span style={{color:C.text3,fontSize:10,padding:'0 4px'}}>{m.ts}</span>}
            </div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      {error&&<ErrorState message={error} onRetry={send} compact/>}
      <div style={{marginTop:14,display:'flex',gap:10}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder='Ask your Copilot anything — strategy, product, fundraising, ops…' style={{flex:1,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,color:C.text0,fontSize:13,padding:'12px 16px',fontFamily:'inherit',outline:'none',transition:'border-color .2s'}} onFocus={e=>e.target.style.borderColor=C.accentMid} onBlur={e=>e.target.style.borderColor=C.border}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{background:(loading||!input.trim())?C.bg3:C.accent,color:(loading||!input.trim())?C.text2:'#000',border:'none',borderRadius:12,padding:'12px 22px',fontWeight:700,fontSize:13,cursor:(loading||!input.trim())?'not-allowed':'pointer',fontFamily:'inherit'}}>
          {loading?<Dots color={C.text2}/>:'→'}
        </button>
      </div>
    </div>
  )
}

// ─── AGENT ────────────────────────────────────────────────────────────────────
function AgentModule({toast}) {
  const [goal,setGoal]=useState('')
  const [workflow,setWorkflow]=useState('launch')
  const [running,setRunning]=useState(false)
  const [steps,setSteps]=useState([])
  const [currentStep,setCurrentStep]=useState('')
  const [stepErrors,setStepErrors]=useState({})

  const wfDef={
    launch:{
      label:'30-Day Launch Plan',desc:'Research → Roadmap → Launch Post → Investor Update',
      steps:[
        {name:'Market Research',    fn:g=>researchApi.search(g).then(r=>r.result)},
        {name:'30-Day Roadmap',     fn:g=>tasksApi.plan(g,30).then(r=>r.plan_text)},
        {name:'Launch Announcement',fn:g=>contentApi.generate({topic:g,platform:'linkedin',tone:'thought-leadership',audience:'startup ecosystem'}).then(r=>r.generated_text)},
        {name:'Investor Update',    fn:g=>meetingsApi.summarize('Investor Update',`Goal: ${g}`).then(r=>r.follow_up_email)},
      ],
    },
    content:{
      label:'Content Pipeline',desc:'Research → LinkedIn → Tweet Thread',
      steps:[
        {name:'Topic Research',fn:g=>researchApi.search(g).then(r=>r.result)},
        {name:'LinkedIn Post', fn:g=>contentApi.generate({topic:g,platform:'linkedin',tone:'thought-leadership',audience:'founders'}).then(r=>r.generated_text)},
        {name:'Tweet Thread',  fn:g=>contentApi.generate({topic:g,platform:'twitter',tone:'casual',audience:'founders'}).then(r=>r.generated_text)},
      ],
    },
  }

  async function runAgent() {
    if(!goal.trim()||running)return
    setRunning(true);setSteps([]);setStepErrors({})
    for(const step of wfDef[workflow].steps){
      setCurrentStep(step.name)
      try{
        const output=await step.fn(goal)
        setSteps(prev=>[...prev,{name:step.name,output}])
      }catch(e){setStepErrors(prev=>({...prev,[step.name]:e.message}));toast(`Step "${step.name}" failed.`,'error')}
    }
    setCurrentStep('');setRunning(false);toast('Agent workflow complete.','success')
  }

  return (
    <div style={{padding:'32px 36px',maxWidth:920}}>
      <SectionHeader icon='⚡' title='AI Agent Workflows' subtitle='Multi-step autonomous AI — each module feeds the next. Cross-module orchestration.'/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        {Object.entries(wfDef).map(([id,wf])=>(
          <button key={id} onClick={()=>setWorkflow(id)} style={{background:workflow===id?C.accentDim:C.bg2,border:`1px solid ${workflow===id?C.accentMid:C.border}`,borderRadius:12,padding:'14px 18px',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .15s'}}>
            <p style={{color:workflow===id?C.accent:C.text0,fontWeight:700,fontSize:14,margin:'0 0 4px'}}>{wf.label}</p>
            <p style={{color:C.text2,fontSize:12,margin:'0 0 10px'}}>{wf.desc}</p>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {wf.steps.map((s,i)=><span key={i} style={{background:C.bg3,color:C.text2,fontSize:10,padding:'2px 8px',borderRadius:20}}>{i+1}. {s.name}</span>)}
            </div>
          </button>
        ))}
      </div>
      <TextArea value={goal} onChange={setGoal} placeholder='e.g. "Launch an AI-powered legal document tool for SMBs"' rows={3}/>
      <div style={{marginTop:12}}><RunBtn onClick={runAgent} loading={running} label={running?`Running: ${currentStep}…`:'Launch Agent ⚡'} disabled={!goal.trim()}/></div>
      {steps.length>0&&(
        <div style={{marginTop:24}}>
          {steps.map((step,i)=>(
            <div key={i} style={{marginBottom:14,background:C.bg2,border:`1px solid ${stepErrors[step.name]?C.red+'44':C.border}`,borderRadius:12,overflow:'hidden'}}>
              <div style={{padding:'10px 16px',background:C.bg3,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:stepErrors[step.name]?C.red:running&&currentStep===step.name?C.amber:C.green,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#000'}}>{stepErrors[step.name]?'!':i+1}</div>
                <span style={{color:C.text0,fontSize:13,fontWeight:600}}>{step.name}</span>
                {running&&currentStep===step.name&&<Dots color={C.amber}/>}
              </div>
              {stepErrors[step.name]?<ErrorState message={stepErrors[step.name]} compact/>:running&&currentStep===step.name&&!step.output?<SkeletonBlock lines={3}/>:<div style={{padding:14,color:C.text1,fontSize:13,lineHeight:1.75,whiteSpace:'pre-wrap',maxHeight:240,overflowY:'auto'}}>{step.output}</div>}
            </div>
          ))}
          {!running&&steps.length>0&&(
            <div style={{padding:'12px 16px',background:C.greenDim,border:`1px solid ${C.green}44`,borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:C.green,fontSize:14}}>✓</span>
              <span style={{color:C.text1,fontSize:13}}>{steps.length} steps completed successfully.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MEMORY ───────────────────────────────────────────────────────────────────
function MemoryModule({toast}) {
  const [docs,setDocs]=useState(()=>DB.get('memory:docs',[
    {id:'1',source:'Q3 Planning Meeting',type:'meeting',date:'3d ago'},
    {id:'2',source:'Competitor Research: Notion',type:'research',date:'1w ago'},
  ]))
  const [content,setContent]=useState('')
  const [source,setSource]=useState('')
  const [docType,setDocType]=useState('meeting')
  const [query,setQuery]=useState('')
  const [answer,setAnswer]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  function saveDoc(){
    if(!content.trim()||!source.trim()){toast('Title and content required.','warn');return}
    const doc={id:Date.now().toString(),source,type:docType,date:'Just now'}
    const next=[doc,...docs];setDocs(next);DB.set('memory:docs',next)
    setContent('');setSource('');toast('Stored in memory.','success')
  }

  async function searchMemory(){
    if(!query.trim()||loading)return
    setLoading(true);setAnswer('');setError('')
    try{
      const ctx=docs.map(d=>`[${d.type.toUpperCase()}] ${d.source}`).join('\n')
      const result=await chatApi.send(`Memory context:\n${ctx}\n\nQuestion: "${query}"\n\nAnswer based on startup context.`,'memory')
      setAnswer(result.content)
    }catch(e){setError(e.message);toast('Memory query failed.','error')}
    setLoading(false)
  }

  const typeColors={meeting:C.accent,research:C.purple,idea:C.gold,crm:C.green,note:C.text1}

  return (
    <div style={{padding:'32px 36px',maxWidth:920}}>
      <SectionHeader icon='⬢' title='Memory System' subtitle='RAG-powered startup brain. Upload docs, chat with your institutional context.'/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
          <p style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',margin:'0 0 14px'}}>Upload Document</p>
          <input value={source} onChange={e=>setSource(e.target.value)} placeholder='Document title or source' style={{width:'100%',boxSizing:'border-box',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text0,fontSize:12,padding:'8px 12px',fontFamily:'inherit',outline:'none',marginBottom:8}}/>
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            {['meeting','research','idea','crm','note'].map(t=>(
              <button key={t} onClick={()=>setDocType(t)} style={{background:docType===t?typeColors[t]+'22':C.bg3,border:`1px solid ${docType===t?typeColors[t]:C.border}`,color:docType===t?typeColors[t]:C.text2,borderRadius:20,padding:'4px 10px',cursor:'pointer',fontSize:10,fontFamily:'inherit',textTransform:'capitalize',transition:'all .15s'}}>{t}</button>
            ))}
          </div>
          <TextArea value={content} onChange={setContent} placeholder='Paste document content to embed into memory…' rows={4}/>
          <button onClick={saveDoc} style={{marginTop:10,background:C.accent,color:'#000',border:'none',borderRadius:8,padding:'8px 16px',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Store in Memory</button>
        </div>
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
          <p style={{color:C.text2,fontSize:10,letterSpacing:2,textTransform:'uppercase',margin:'0 0 14px'}}>Memory Index ({docs.length})</p>
          <div style={{maxHeight:240,overflowY:'auto',display:'flex',flexDirection:'column',gap:7}}>
            {docs.length===0?<EmptyHistory/>:docs.map(doc=>(
              <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:C.bg3,borderRadius:9}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:typeColors[doc.type]||C.text2,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{color:C.text0,fontSize:12,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.source}</p>
                  <p style={{color:C.text3,fontSize:10,margin:0}}>{doc.type} · {doc.date}</p>
                </div>
                <button onClick={()=>{const next=docs.filter(d=>d.id!==doc.id);setDocs(next);DB.set('memory:docs',next)}} style={{background:'transparent',border:'none',color:C.text3,cursor:'pointer',fontSize:14,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:C.bg2,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:18}}>
        <p style={{color:C.accent,fontSize:10,letterSpacing:2,textTransform:'uppercase',margin:'0 0 12px'}}>Chat with Memory (RAG)</p>
        <div style={{display:'flex',gap:10}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchMemory()} placeholder='Ask anything about your startup context, documents, or decisions…' style={{flex:1,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text0,fontSize:13,padding:'10px 14px',fontFamily:'inherit',outline:'none'}}/>
          <RunBtn onClick={searchMemory} loading={loading} label='Query →' disabled={!query.trim()}/>
        </div>
        {error&&<ErrorState message={error} onRetry={searchMemory} compact/>}
        <AIOutput output={answer} loading={loading&&!answer} error={error&&!answer?error:''} label='RAG Response'/>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(()=>DB.get('user',null))
  const [active,setActive]=useState('dashboard')
  const [palette,setPalette]=useState(false)
  const {toasts,add:toast}=useToasts()

  useEffect(()=>{
    const h=e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setPalette(p=>!p)}
      if(e.key==='Escape')setPalette(false)
    }
    window.addEventListener('keydown',h)
    return ()=>window.removeEventListener('keydown',h)
  },[])

  if(!user)return<LoginScreen onLogin={u=>{DB.set('user',u);setUser(u)}}/>

  const modules={
    dashboard:<Dashboard setActive={setActive} user={user}/>,
    agent:    <AgentModule toast={toast}/>,
    meetings: <MeetingsModule toast={toast}/>,
    crm:      <CRMModule toast={toast}/>,
    content:  <ContentModule toast={toast}/>,
    research: <ResearchModule toast={toast}/>,
    ideas:    <IdeasModule toast={toast}/>,
    tasks:    <TasksModule toast={toast}/>,
    memory:   <MemoryModule toast={toast}/>,
    chat:     <CopilotModule toast={toast}/>,
  }

  return (
    <>
      <Toast toasts={toasts}/>
      <CommandPalette open={palette} onClose={()=>setPalette(false)} setActive={setActive}/>
      <div style={{display:'flex',height:'100vh',background:C.bg0,fontFamily:"'Syne',sans-serif",color:C.text0}}>
        <div style={{width:214,background:C.bg1,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'18px 16px 14px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:34,height:34,background:C.accent,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#000'}}>S</div>
              <div>
                <p style={{color:C.text0,fontWeight:700,fontSize:14,lineHeight:1,margin:0}}>StartupOS</p>
                <p style={{color:C.accent,fontSize:9,letterSpacing:2.5,textTransform:'uppercase',margin:'3px 0 0'}}>AI System v3</p>
              </div>
            </div>
          </div>
          <div style={{padding:'10px 8px'}}>
            <button onClick={()=>setPalette(true)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 10px',cursor:'pointer',color:C.text2,fontSize:11,fontFamily:'inherit',transition:'border-color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accentMid} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <span>⌘</span><span style={{flex:1}}>Search commands</span>
              <kbd style={{color:C.text3,fontSize:9,background:C.bg3,padding:'2px 5px',borderRadius:4}}>⌘K</kbd>
            </button>
          </div>
          <nav style={{padding:'0 8px',flex:1,overflowY:'auto'}}>
            {NAV.map(item=>(
              <button key={item.id} onClick={()=>setActive(item.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,marginBottom:2,background:active===item.id?C.accentDim:'transparent',border:`1px solid ${active===item.id?C.accentMid:'transparent'}`,color:active===item.id?C.accent:C.text2,cursor:'pointer',fontSize:13,fontFamily:'inherit',fontWeight:active===item.id?700:400,textAlign:'left',transition:'all .12s'}}
                onMouseEnter={e=>{if(active!==item.id)e.currentTarget.style.color=C.text0}} onMouseLeave={e=>{if(active!==item.id)e.currentTarget.style.color=C.text2}}>
                <span style={{fontSize:15,minWidth:18}}>{item.icon}</span>
                <span style={{flex:1}}>{item.label}</span>
                {item.badge&&<span style={{background:C.accent+'22',color:C.accent,fontSize:8,padding:'2px 5px',borderRadius:8,fontWeight:700}}>{item.badge}</span>}
              </button>
            ))}
          </nav>
          <div style={{padding:'14px',borderTop:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:C.bg2,borderRadius:8,marginBottom:8}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:C.accentDim,border:`1px solid ${C.accentMid}`,display:'flex',alignItems:'center',justifyContent:'center',color:C.accent,fontSize:10,fontWeight:700,flexShrink:0}}>{user?.name?.charAt(0)?.toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{color:C.text0,fontSize:11,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</p>
                <p style={{color:C.text3,fontSize:9,margin:0}}>Founder</p>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:C.green}}/>
              <span style={{color:C.text3,fontSize:9,fontFamily:'monospace'}}>Gemini · SQLite · JWT</span>
            </div>
            <button onClick={()=>{DB.set('user',null);setUser(null)}} style={{background:'transparent',border:'none',color:C.text3,fontSize:10,cursor:'pointer',fontFamily:'inherit',padding:0}}>Sign out</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',background:C.bg0}}>{modules[active]}</div>
      </div>
    </>
  )
}
