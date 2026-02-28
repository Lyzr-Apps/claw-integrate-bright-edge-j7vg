'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  FiActivity, FiAlertTriangle, FiCheckCircle, FiClock,
  FiSend, FiX, FiCpu, FiUser, FiSearch
} from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'

const MONITORING_AGENT_ID = '69a372c18811f110756792cb'

interface JobRun {
  id: string
  taskName: string
  startTime: string
  duration: string
  status: 'success' | 'failed' | 'running'
  records: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
}

interface MonitoringSectionProps {
  showSample: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}

const sampleJobs: JobRun[] = [
  { id: '1', taskName: 'E-commerce Price Monitor', startTime: '2024-01-15 10:00', duration: '2m 34s', status: 'success', records: 245 },
  { id: '2', taskName: 'Social Media Feed', startTime: '2024-01-15 09:48', duration: '1m 12s', status: 'failed', records: 0 },
  { id: '3', taskName: 'News Headlines Scraper', startTime: '2024-01-15 09:00', duration: '3m 05s', status: 'success', records: 82 },
  { id: '4', taskName: 'Job Listings Tracker', startTime: '2024-01-14 18:00', duration: '5m 20s', status: 'success', records: 156 },
  { id: '5', taskName: 'E-commerce Price Monitor', startTime: '2024-01-14 16:00', duration: '2m 45s', status: 'success', records: 210 },
  { id: '6', taskName: 'Social Media Feed', startTime: '2024-01-14 12:00', duration: '0m 45s', status: 'failed', records: 0 },
  { id: '7', taskName: 'News Headlines Scraper', startTime: '2024-01-14 09:00', duration: '2m 58s', status: 'success', records: 91 },
]

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-xs mt-2 mb-0.5">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-sm mt-2 mb-0.5">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-3 list-disc text-xs">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-3 list-decimal text-xs">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-0.5" />
        return <p key={i} className="text-xs">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

export default function MonitoringSection({ showSample, activeAgentId: _activeAgentId, setActiveAgentId }: MonitoringSectionProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  const jobs = showSample ? sampleJobs : []
  const filteredJobs = statusFilter === 'all' ? jobs : jobs.filter(j => j.status === statusFilter)

  const totalJobs = jobs.length
  const successJobs = jobs.filter(j => j.status === 'success').length
  const failedJobs = jobs.filter(j => j.status === 'failed').length
  const errorRate = totalJobs > 0 ? ((failedJobs / totalJobs) * 100).toFixed(1) : '0'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleAnalyze = async () => {
    if (!input.trim() && messages.length === 0) {
      setInput('Analyze current scraping job status and provide health summary')
    }
    const msg = input.trim() || 'Analyze current scraping job status and provide health summary'
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setActiveAgentId(MONITORING_AGENT_ID)

    const result = await callAIAgent(msg, MONITORING_AGENT_ID)
    if (result.success) {
      const agentMessage = result?.response?.result?.message || result?.response?.message || 'Analysis complete.'
      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: typeof agentMessage === 'string' ? agentMessage : JSON.stringify(agentMessage),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, agentMsg])
    } else {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: result?.error || 'Analysis failed. Please try again.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    }
    setLoading(false)
    setActiveAgentId(null)
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    await handleAnalyze()
  }

  return (
    <div className="flex gap-3 h-[calc(100vh-120px)]">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col gap-3 min-w-0 transition-all ${sidebarOpen ? '' : ''}`}>
        {/* Health Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Card className="border shadow-none">
            <CardContent className="p-3 flex items-center gap-2">
              <FiActivity className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Uptime</p>
                <p className="text-sm font-semibold">{showSample ? '99.8%' : '--%'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-3 flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Error Rate</p>
                <p className="text-sm font-semibold">{showSample ? `${errorRate}%` : '--%'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-3 flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Successful</p>
                <p className="text-sm font-semibold">{showSample ? successJobs : '--'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-3 flex items-center gap-2">
              <FiClock className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Jobs</p>
                <p className="text-sm font-semibold">{showSample ? '2' : '--'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Runs Table */}
        <Card className="border shadow-none flex-1 flex flex-col min-h-0">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Job Runs</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSidebarOpen(true); if (messages.length === 0) handleAnalyze() }}>
                <FiSearch className="w-3 h-3 mr-1" /> Analyze Status
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            {filteredJobs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="text-center p-6">
                  <FiActivity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No job runs to display. Enable Sample Data to see examples.</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px] uppercase tracking-wide">
                      <TableHead className="h-8 px-3 text-[10px]">Task Name</TableHead>
                      <TableHead className="h-8 px-3 text-[10px]">Start Time</TableHead>
                      <TableHead className="h-8 px-3 text-[10px]">Duration</TableHead>
                      <TableHead className="h-8 px-3 text-[10px]">Status</TableHead>
                      <TableHead className="h-8 px-3 text-[10px] text-right">Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id} className="text-xs hover:bg-muted/50">
                        <TableCell className="px-3 py-2 font-medium">{job.taskName}</TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground">{job.startTime}</TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground">{job.duration}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${job.status === 'success' ? 'bg-accent text-accent-foreground' : job.status === 'failed' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">{job.records.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Sidebar */}
      {sidebarOpen && (
        <Card className="w-80 border shadow-none flex flex-col flex-shrink-0">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Monitoring Agent</CardTitle>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSidebarOpen(false)}>
              <FiX className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="text-center text-muted-foreground text-xs p-4">
                  <FiCpu className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p>Ask about system health and job status.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'agent' && <div className="w-5 h-5 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><FiCpu className="w-2.5 h-2.5 text-primary" /></div>}
                  <div className={`max-w-[85%] rounded-sm p-2 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.role === 'agent' ? renderMarkdown(msg.content) : <p className="text-xs">{msg.content}</p>}
                    <p className="text-[8px] mt-0.5 opacity-50">{msg.timestamp}</p>
                  </div>
                  {msg.role === 'user' && <div className="w-5 h-5 rounded-sm bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5"><FiUser className="w-2.5 h-2.5" /></div>}
                </div>
              ))}
              {loading && (
                <div className="flex gap-1.5">
                  <div className="w-5 h-5 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0"><FiCpu className="w-2.5 h-2.5 text-primary animate-pulse" /></div>
                  <div className="bg-muted rounded-sm p-2 space-y-1"><Skeleton className="h-2.5 w-32" /><Skeleton className="h-2.5 w-24" /></div>
                </div>
              )}
            </div>
            <Separator />
            <div className="p-2 flex gap-1.5">
              <Input placeholder="Ask about status..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="text-xs h-7" disabled={loading} />
              <Button size="sm" className="h-7 px-2" onClick={handleSend} disabled={loading || !input.trim()}>
                <FiSend className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
