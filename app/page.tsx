'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  FiGrid, FiSettings, FiActivity, FiDatabase, FiBell,
  FiMenu, FiChevronLeft, FiPlay, FiPause, FiClock,
  FiCheckCircle, FiAlertTriangle, FiRefreshCw, FiZap,
  FiTrendingUp, FiSend, FiChevronRight, FiSearch
} from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'

// ========== Constants ==========
const AGENT_IDS = {
  configurator: '69a372c07d0d16a1b89c6338',
  executor: '69a372c08cf91bdfdf384edf',
  monitor: '69a372c18811f110756792cb',
  explorer: '69a372c12d842ec0d6494e48',
}
const SCHEDULE_ID = '69a372c725d4d77f732f626c'

type Screen = 'dashboard' | 'config' | 'monitoring' | 'explorer'

interface ChatMsg {
  id: string
  role: 'user' | 'agent'
  content: string
  data?: Record<string, unknown>
  status?: string
  ts: string
}

// ========== Safe Scheduler Fetch ==========
async function safeFetch(url: string, opts?: RequestInit): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, opts)
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    return await r.json()
  } catch { return null }
}

// ========== Helpers ==========
function cronHuman(c: string): string {
  try {
    const p = c.split(' ')
    if (p.length < 5) return c
    if (p[0] === '0' && p[1].startsWith('*/')) return `Every ${p[1].slice(2)} hours`
    if (p[0] === '0' && p[1] === '*') return 'Every hour'
    return c
  } catch { return c }
}

function fmtInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{p}</strong> : p)
}

function statusColor(s: string) {
  if (s === 'active' || s === 'success' || s === 'completed') return 'bg-accent text-accent-foreground'
  if (s === 'error' || s === 'failed') return 'bg-destructive text-destructive-foreground'
  if (s === 'paused' || s === 'running') return 'bg-muted text-muted-foreground'
  return 'bg-secondary text-secondary-foreground'
}

// ========== Sample Data ==========
const sampleTasks = [
  { id: '1', name: 'E-commerce Price Monitor', status: 'active', lastRun: '2 min ago', nextRun: 'In 6 hours', records: 14520 },
  { id: '2', name: 'News Headlines Scraper', status: 'active', lastRun: '1 hour ago', nextRun: 'In 5 hours', records: 8340 },
  { id: '3', name: 'Job Listings Tracker', status: 'paused', lastRun: '3 days ago', nextRun: 'Paused', records: 5200 },
  { id: '4', name: 'Social Media Feed', status: 'error', lastRun: '12 min ago', nextRun: 'Retry in 30 min', records: 920 },
]
const sampleActivity = [
  { id: '1', time: '2 min ago', message: 'E-commerce Price Monitor completed - 245 records', status: 'success' },
  { id: '2', time: '12 min ago', message: 'Social Media Feed failed - Rate limit exceeded', status: 'error' },
  { id: '3', time: '1 hour ago', message: 'News Headlines Scraper completed - 82 records', status: 'success' },
  { id: '4', time: '2 hours ago', message: 'Scheduled execution triggered for all active tasks', status: 'info' },
  { id: '5', time: '6 hours ago', message: 'E-commerce Price Monitor completed - 210 records', status: 'success' },
]
const sampleJobs = [
  { id: '1', task: 'E-commerce Price Monitor', startTime: '14:28:01', duration: '2m 15s', status: 'success', records: 245 },
  { id: '2', task: 'Social Media Feed', startTime: '14:16:33', duration: '0m 42s', status: 'failed', records: 0 },
  { id: '3', task: 'News Headlines Scraper', startTime: '13:30:00', duration: '1m 08s', status: 'success', records: 82 },
  { id: '4', task: 'Job Listings Tracker', startTime: '10:00:00', duration: '3m 21s', status: 'success', records: 156 },
]
const sampleDatasets = [
  { id: '1', name: 'Product Prices', records: 14520, updated: '2 min ago' },
  { id: '2', name: 'News Headlines', records: 8340, updated: '1 hour ago' },
  { id: '3', name: 'Job Listings', records: 5200, updated: '3 days ago' },
  { id: '4', name: 'Social Posts', records: 920, updated: '12 min ago' },
]

// ========== Chat Hook ==========
function useChat(agentId: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: msg, ts: new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const result = await callAIAgent(msg, agentId)
      const agentMessage = result?.response?.result?.message || result?.response?.message || 'No response received.'
      const agentData = result?.response?.result?.data || result?.response?.result || {}
      const agentStatus = result?.response?.result?.status || result?.response?.status || 'success'
      const agentMsg: ChatMsg = {
        id: (Date.now() + 1).toString(), role: 'agent', content: agentMessage,
        data: typeof agentData === 'object' ? agentData as Record<string, unknown> : {},
        status: agentStatus as string, ts: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, agentMsg])
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: 'An error occurred. Please try again.', status: 'error', ts: new Date().toLocaleTimeString() }])
    }
    setLoading(false)
  }, [input, loading, agentId])

  return { messages, setMessages, input, setInput, loading, send, scrollRef }
}

// ========== Dashboard Section ==========
function DashboardSection({ showSample, onNavigate }: { showSample: boolean; onNavigate: (s: Screen) => void }) {
  const [schedule, setSchedule] = useState<Record<string, unknown> | null>(null)
  const [schLoading, setSchLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const loadSch = useCallback(async () => {
    setSchLoading(true)
    const d = await safeFetch('/api/scheduler?action=list')
    if (d && d.success && Array.isArray(d.schedules)) {
      const found = d.schedules.find((s: Record<string, unknown>) => s.id === SCHEDULE_ID)
      setSchedule(found || d.schedules[0] || null)
    }
    setSchLoading(false)
  }, [])

  useEffect(() => { loadSch() }, [loadSch])

  const toggle = async () => {
    if (!schedule) return
    setToggling(true)
    const action = schedule.is_active ? 'pause' : 'resume'
    await safeFetch('/api/scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, scheduleId: schedule.id }) })
    await loadSch()
    setToggling(false)
  }

  const tasks = showSample ? sampleTasks : []
  const activity = showSample ? sampleActivity : []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Tasks', value: showSample ? tasks.filter(t => t.status === 'active').length : '--', icon: <FiZap className="w-4 h-4 text-primary" />, bg: 'bg-primary/10' },
          { label: "Today's Runs", value: showSample ? 24 : '--', icon: <FiPlay className="w-4 h-4 text-accent" />, bg: 'bg-accent/10' },
          { label: 'Success Rate', value: showSample ? '96.5%' : '--%', icon: <FiTrendingUp className="w-4 h-4 text-accent" />, bg: 'bg-accent/10' },
          { label: 'Next Scheduled', value: schedule?.next_run_time ? new Date(schedule.next_run_time as string).toLocaleString() : showSample ? 'In 6 hours' : '--', icon: <FiClock className="w-4 h-4 text-primary" />, bg: 'bg-primary/10', small: true },
        ].map((card, i) => (
          <Card key={i} className="border shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
                  <p className={`${card.small ? 'text-sm' : 'text-2xl'} font-semibold mt-0.5`}>{String(card.value)}</p>
                </div>
                <div className={`w-8 h-8 rounded-sm ${card.bg} flex items-center justify-center`}>{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card className="lg:col-span-3 border shadow-none">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Scraping Tasks</CardTitle>
            <Button size="sm" className="h-7 text-xs" onClick={() => onNavigate('config')}>Configure New Task</Button>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <p className="mb-2">No tasks configured yet</p>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onNavigate('config')}>Create your first task</Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[280px]">
                <div className="divide-y">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium truncate">{task.name}</p>
                        <p className="text-xs text-muted-foreground">Last: {task.lastRun} | Next: {task.nextRun} | {task.records.toLocaleString()} records</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColor(task.status)}`}>{task.status}</Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {task.status === 'active' ? <FiPause className="w-3 h-3" /> : <FiPlay className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border shadow-none">
          <CardHeader className="p-3 pb-2"><CardTitle className="text-sm font-semibold">Recent Activity</CardTitle></CardHeader>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No activity yet.</div>
            ) : (
              <ScrollArea className="max-h-[280px]">
                <div className="divide-y">
                  {activity.map(e => (
                    <div key={e.id} className="flex items-start gap-2 px-3 py-2">
                      <div className={`mt-0.5 flex-shrink-0 ${e.status === 'success' ? 'text-accent' : e.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {e.status === 'success' ? <FiCheckCircle className="w-3.5 h-3.5" /> : e.status === 'error' ? <FiAlertTriangle className="w-3.5 h-3.5" /> : <FiClock className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug">{e.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{e.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-none">
        <CardHeader className="p-3 pb-2"><CardTitle className="text-sm font-semibold">Schedule Management - Scraping Executor</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          {schLoading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></div>
          ) : schedule ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Badge variant="secondary" className={`text-[10px] ${schedule.is_active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {schedule.is_active ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{schedule.cron_expression ? cronHuman(schedule.cron_expression as string) : 'N/A'}</span>
              <Switch checked={!!schedule.is_active} onCheckedChange={toggle} disabled={toggling} />
              <span className="text-xs font-medium">{toggling ? 'Updating...' : schedule.is_active ? 'Active' : 'Paused'}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No schedule found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ========== Task Config Section ==========
function TaskConfigSection({ showSample }: { showSample: boolean }) {
  const chat = useChat(AGENT_IDS.configurator)
  const [configPreview, setConfigPreview] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (showSample && chat.messages.length === 0) {
      chat.setMessages([
        { id: '1', role: 'user', content: 'Scrape product prices from example.com/products', ts: '10:30 AM' },
        { id: '2', role: 'agent', content: 'Here is the scraping configuration for example.com/products:\n\n**Target URL**: example.com/products\n**Fields**: product name, price, rating\n**Pagination**: Next button\n**Rate Limiting**: 2 req/sec', data: { url: 'https://example.com/products', selectors: { name: '.product-name', price: '.price' }, pagination: { type: 'next_button' } }, status: 'success', ts: '10:30 AM' },
      ])
      setConfigPreview({ url: 'https://example.com/products', selectors: { name: '.product-name', price: '.price' }, pagination: { type: 'next_button' } })
    }
  }, [showSample])

  const handleSend = async () => {
    const msg = chat.input.trim()
    if (!msg) return
    chat.setInput('')
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: msg, ts: new Date().toLocaleTimeString() }
    chat.setMessages(prev => [...prev, userMsg])

    try {
      const result = await callAIAgent(msg, AGENT_IDS.configurator)
      const agentMessage = result?.response?.result?.message || result?.response?.message || 'Configuration generated.'
      const agentData = result?.response?.result?.data || result?.response?.result || {}
      const agentStatus = result?.response?.result?.status || 'success'
      const agentMsg: ChatMsg = {
        id: (Date.now() + 1).toString(), role: 'agent', content: agentMessage,
        data: typeof agentData === 'object' ? agentData as Record<string, unknown> : {},
        status: agentStatus as string, ts: new Date().toLocaleTimeString()
      }
      chat.setMessages(prev => [...prev, agentMsg])
      if (typeof agentData === 'object' && Object.keys(agentData as object).length > 0) {
        setConfigPreview(agentData as Record<string, unknown>)
      }
    } catch {
      chat.setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: 'Error generating config.', status: 'error', ts: new Date().toLocaleTimeString() }])
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-7rem)]">
      <Card className="border shadow-none flex flex-col">
        <CardHeader className="p-3 pb-2"><CardTitle className="text-sm font-semibold">Task Configuration Chat</CardTitle></CardHeader>
        <CardContent className="flex-1 flex flex-col p-3 pt-0 min-h-0">
          <ScrollArea className="flex-1 pr-2" ref={chat.scrollRef}>
            <div className="space-y-3 pb-2">
              {chat.messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-sm px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {fmtInline(m.content)}
                  </div>
                </div>
              ))}
              {chat.loading && <div className="flex justify-start"><div className="bg-muted rounded-sm px-3 py-2"><Skeleton className="h-3 w-32" /></div></div>}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-2 pt-2 border-t">
            <Input className="text-xs h-8" placeholder="Describe what you want to scrape..." value={chat.input} onChange={e => chat.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
            <Button size="sm" className="h-8 px-3" onClick={handleSend} disabled={chat.loading || !chat.input.trim()}><FiSend className="w-3 h-3" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none flex flex-col">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Config Preview</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" className="h-7 text-xs">Save Task</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs">Test Run</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setConfigPreview(null); chat.setMessages([]) }}>Reset</Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-3 pt-0 min-h-0">
          <ScrollArea className="h-full">
            {configPreview ? (
              <pre className="text-xs font-mono bg-muted p-3 rounded-sm overflow-auto whitespace-pre-wrap">{JSON.stringify(configPreview, null, 2)}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Configuration will appear here as you describe your task.</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ========== Monitoring Section ==========
function MonitoringSection({ showSample }: { showSample: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const chat = useChat(AGENT_IDS.monitor)
  const jobs = showSample ? sampleJobs : []
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Uptime', value: showSample ? '99.8%' : '--%' },
          { label: 'Error Rate', value: showSample ? '3.5%' : '--%' },
          { label: 'Successful', value: showSample ? '23' : '--' },
          { label: 'Active Jobs', value: showSample ? '1' : '--' },
        ].map((s, i) => (
          <Card key={i} className="border shadow-none">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-semibold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {['all', 'success', 'failed'].map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className="h-7 text-xs capitalize" onClick={() => setFilter(f)}>{f}</Button>
          ))}
        </div>
        <Button size="sm" className="h-7 text-xs" onClick={() => setSidebarOpen(true)}>
          <FiActivity className="w-3 h-3 mr-1" /> Analyze Status
        </Button>
      </div>

      <Card className="border shadow-none">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No job runs recorded yet.</div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-6 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide bg-muted/50">
                <span>Task</span><span>Start</span><span>Duration</span><span>Status</span><span>Records</span><span></span>
              </div>
              {filtered.map(j => (
                <div key={j.id} className="grid grid-cols-6 px-3 py-2 text-xs items-center hover:bg-muted/30">
                  <span className="font-medium truncate">{j.task}</span>
                  <span className="text-muted-foreground">{j.startTime}</span>
                  <span className="text-muted-foreground">{j.duration}</span>
                  <span><Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColor(j.status)}`}>{j.status}</Badge></span>
                  <span className="text-muted-foreground">{j.records}</span>
                  <span></span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="bg-black/20 flex-1" onClick={() => setSidebarOpen(false)} />
          <Card className="w-96 h-full border-l shadow-none rounded-none flex flex-col">
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between border-b">
              <CardTitle className="text-sm font-semibold">Status Analysis</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSidebarOpen(false)}><FiChevronRight className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-3 min-h-0">
              <ScrollArea className="flex-1 pr-2" ref={chat.scrollRef}>
                <div className="space-y-3 pb-2">
                  {chat.messages.length === 0 && <p className="text-xs text-muted-foreground">Ask the Monitoring Agent to analyze your scraping job health.</p>}
                  {chat.messages.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-sm px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {fmtInline(m.content)}
                      </div>
                    </div>
                  ))}
                  {chat.loading && <div className="flex justify-start"><div className="bg-muted rounded-sm px-3 py-2"><Skeleton className="h-3 w-32" /></div></div>}
                </div>
              </ScrollArea>
              <div className="flex gap-2 mt-2 pt-2 border-t">
                <Input className="text-xs h-8" placeholder="Ask about system health..." value={chat.input} onChange={e => chat.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && chat.send()} />
                <Button size="sm" className="h-8 px-3" onClick={() => chat.send()} disabled={chat.loading || !chat.input.trim()}><FiSend className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ========== Data Explorer Section ==========
function DataExplorerSection({ showSample }: { showSample: boolean }) {
  const chat = useChat(AGENT_IDS.explorer)
  const [panelOpen, setPanelOpen] = useState(true)
  const datasets = showSample ? sampleDatasets : []

  const renderData = (data: Record<string, unknown>) => {
    if (!data || Object.keys(data).length === 0) return null
    const entries = Object.entries(data).filter(([k]) => k !== 'message' && k !== 'status')
    if (entries.length === 0) return null
    return (
      <div className="mt-2 bg-background rounded-sm border p-2 space-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">{key}</span>
            <span className="text-right max-w-[60%] truncate">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
          </div>
        ))}
      </div>
    )
  }

  const suggestions = ['Show me total records collected', 'What is the average price trend?', 'Compare this week vs last week', 'Show top 5 products by price']

  return (
    <div className="flex gap-3 h-[calc(100vh-7rem)]">
      {panelOpen && (
        <Card className="w-52 border shadow-none flex-shrink-0 flex flex-col">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold">Datasets</CardTitle>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setPanelOpen(false)}><FiChevronLeft className="w-3 h-3" /></Button>
          </CardHeader>
          <CardContent className="p-2 pt-0 flex-1">
            {datasets.length === 0 ? (
              <p className="text-[10px] text-muted-foreground p-2">No datasets available.</p>
            ) : (
              <div className="space-y-1">
                {datasets.map(ds => (
                  <div key={ds.id} className="p-2 rounded-sm hover:bg-muted/50 cursor-pointer transition-colors">
                    <p className="text-xs font-medium">{ds.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ds.records.toLocaleString()} records - {ds.updated}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="flex-1 border shadow-none flex flex-col min-w-0">
        <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2">
          {!panelOpen && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPanelOpen(true)}><FiDatabase className="w-3 h-3" /></Button>}
          <CardTitle className="text-sm font-semibold">Data Explorer</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-3 pt-0 min-h-0">
          <ScrollArea className="flex-1 pr-2" ref={chat.scrollRef}>
            <div className="space-y-3 pb-2">
              {chat.messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Ask questions about your collected data.</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.map((s, i) => (
                      <Button key={i} variant="outline" size="sm" className="text-[10px] h-6" onClick={() => chat.send(s)}>{s}</Button>
                    ))}
                  </div>
                </div>
              )}
              {chat.messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-sm px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {fmtInline(m.content)}
                    {m.role === 'agent' && m.data && renderData(m.data)}
                  </div>
                </div>
              ))}
              {chat.loading && <div className="flex justify-start"><div className="bg-muted rounded-sm px-3 py-2"><Skeleton className="h-3 w-32" /></div></div>}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-2 pt-2 border-t">
            <Input className="text-xs h-8" placeholder="Ask about your data..." value={chat.input} onChange={e => chat.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && chat.send()} />
            <Button size="sm" className="h-8 px-3" onClick={() => chat.send()} disabled={chat.loading || !chat.input.trim()}><FiSend className="w-3 h-3" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ========== Nav Icon ==========
function NavIcon({ name }: { name: string }) {
  switch (name) {
    case 'grid': return <FiGrid className="w-4 h-4" />
    case 'settings': return <FiSettings className="w-4 h-4" />
    case 'activity': return <FiActivity className="w-4 h-4" />
    case 'database': return <FiDatabase className="w-4 h-4" />
    default: return <FiGrid className="w-4 h-4" />
  }
}

// ========== Main Page ==========
const NAV = [
  { key: 'dashboard' as Screen, label: 'Dashboard', icon: 'grid' },
  { key: 'config' as Screen, label: 'Task Config', icon: 'settings' },
  { key: 'monitoring' as Screen, label: 'Monitoring', icon: 'activity' },
  { key: 'explorer' as Screen, label: 'Data Explorer', icon: 'database' },
]

const AGENTS = [
  { id: AGENT_IDS.configurator, name: 'Task Configurator' },
  { id: AGENT_IDS.executor, name: 'Scraping Executor' },
  { id: AGENT_IDS.monitor, name: 'Monitoring & Alerts' },
  { id: AGENT_IDS.explorer, name: 'Data Explorer' },
]

export default function Page() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [showSample, setShowSample] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        <aside className={`flex flex-col border-r bg-card transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-12' : 'w-48'}`}>
          <div className={`flex items-center h-11 border-b px-3 ${collapsed ? 'justify-center' : 'gap-2'}`}>
            {!collapsed && <span className="text-sm font-semibold text-primary truncate">OpenClaw</span>}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto flex-shrink-0" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <FiMenu className="w-3.5 h-3.5" /> : <FiChevronLeft className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <nav className="flex-1 py-2 space-y-0.5 px-1.5">
            {NAV.map(item => (
              <Tooltip key={item.key} delayDuration={300}>
                <TooltipTrigger asChild>
                  <button onClick={() => setScreen(item.key)} className={`flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${screen === item.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${collapsed ? 'justify-center' : ''}`}>
                    <NavIcon name={item.icon} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>}
              </Tooltip>
            ))}
          </nav>
          {!collapsed && (
            <div className="border-t p-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5">Agents</p>
              <div className="space-y-1">
                {AGENTS.map(a => (
                  <div key={a.id} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgent === a.id ? 'bg-accent animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <span className="text-[10px] truncate text-muted-foreground">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">OpenClaw Hub</h1>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-xs text-muted-foreground">{NAV.find(n => n.key === screen)?.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Sample Data</span>
                <Switch checked={showSample} onCheckedChange={setShowSample} />
              </div>
              <button className="relative p-1">
                <FiBell className="w-4 h-4 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-semibold rounded-full flex items-center justify-center">3</span>
              </button>
              <div className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center">
                <span className="text-[10px] font-semibold text-secondary-foreground">U</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-3 overflow-y-auto">
            {screen === 'dashboard' && <DashboardSection showSample={showSample} onNavigate={setScreen} />}
            {screen === 'config' && <TaskConfigSection showSample={showSample} />}
            {screen === 'monitoring' && <MonitoringSection showSample={showSample} />}
            {screen === 'explorer' && <DataExplorerSection showSample={showSample} />}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
