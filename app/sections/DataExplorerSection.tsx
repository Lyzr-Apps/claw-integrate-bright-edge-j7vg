'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  FiSend, FiDatabase, FiChevronRight, FiCpu, FiUser,
  FiChevronDown, FiBarChart2
} from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'

const DATA_EXPLORER_AGENT_ID = '69a372c12d842ec0d6494e48'

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  data?: Record<string, unknown>
  status?: string
  timestamp: string
}

interface Dataset {
  name: string
  records: number
  lastUpdated: string
}

interface DataExplorerSectionProps {
  showSample: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}

const sampleDatasets: Dataset[] = [
  { name: 'E-commerce Prices', records: 14520, lastUpdated: '2 min ago' },
  { name: 'News Headlines', records: 8340, lastUpdated: '1 hour ago' },
  { name: 'Job Listings', records: 5200, lastUpdated: '3 days ago' },
  { name: 'Social Media Posts', records: 920, lastUpdated: '12 min ago' },
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

function renderDataTable(data: Record<string, unknown>) {
  if (!data || typeof data !== 'object') return null

  // Try to find array data for a table
  const arrayKeys = Object.keys(data).filter(k => Array.isArray((data as Record<string, unknown>)[k]))
  if (arrayKeys.length > 0) {
    const tableKey = arrayKeys[0]
    const rows = (data as Record<string, unknown[]>)[tableKey]
    if (!Array.isArray(rows) || rows.length === 0) return null
    const firstRow = rows[0]
    if (typeof firstRow !== 'object' || firstRow === null) return null
    const columns = Object.keys(firstRow as Record<string, unknown>)

    return (
      <div className="border rounded-sm overflow-hidden mt-2">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col} className="h-7 px-2 text-[10px] uppercase">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 10).map((row, idx) => (
              <TableRow key={idx} className="text-xs">
                {columns.map(col => (
                  <TableCell key={col} className="px-2 py-1.5">{String((row as Record<string, unknown>)?.[col] ?? '')}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 10 && <p className="text-[10px] text-muted-foreground text-center py-1">Showing 10 of {rows.length} rows</p>}
      </div>
    )
  }

  // Render as key-value pairs if no arrays found
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined)
  if (entries.length === 0) return null

  return (
    <div className="border rounded-sm mt-2 divide-y">
      {entries.map(([key, val]) => (
        <div key={key} className="flex justify-between px-2 py-1.5 text-xs">
          <span className="text-muted-foreground font-medium">{key}</span>
          <span className="text-right max-w-[60%] truncate">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DataExplorerSection({ showSample, activeAgentId: _activeAgentId, setActiveAgentId }: DataExplorerSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const datasets = showSample ? sampleDatasets : []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    const currentInput = input.trim()
    setInput('')
    setLoading(true)
    setActiveAgentId(DATA_EXPLORER_AGENT_ID)

    const result = await callAIAgent(currentInput, DATA_EXPLORER_AGENT_ID)
    if (result.success) {
      const agentMessage = result?.response?.result?.message || result?.response?.message || 'Query processed.'
      const agentData = result?.response?.result?.data || result?.response?.result || {}
      const agentStatus = result?.response?.result?.status || result?.response?.status || 'success'
      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: typeof agentMessage === 'string' ? agentMessage : JSON.stringify(agentMessage),
        data: typeof agentData === 'object' && agentData !== null ? agentData as Record<string, unknown> : {},
        status: typeof agentStatus === 'string' ? agentStatus : 'success',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, agentMsg])
    } else {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: result?.error || 'Query failed. Please try again.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    }
    setLoading(false)
    setActiveAgentId(null)
  }

  return (
    <div className="flex gap-3 h-[calc(100vh-120px)]">
      {/* Datasets Panel */}
      <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
        <Card className="border shadow-none flex-shrink-0 flex flex-col" style={{ width: panelOpen ? '220px' : '40px' }}>
          <CardHeader className="p-2 flex flex-row items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {panelOpen ? <FiChevronDown className="w-3 h-3" /> : <FiChevronRight className="w-3 h-3" />}
              </Button>
            </CollapsibleTrigger>
            {panelOpen && <CardTitle className="text-xs font-semibold">Datasets</CardTitle>}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              {datasets.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-[10px]">No datasets available. Enable Sample Data to preview.</div>
              ) : (
                <div className="divide-y">
                  {datasets.map((ds) => (
                    <button key={ds.name} className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors" onClick={() => setInput(`Show me summary of ${ds.name} dataset`)}>
                      <div className="flex items-center gap-1.5">
                        <FiDatabase className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-xs font-medium truncate">{ds.name}</span>
                      </div>
                      <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground">
                        <span>{ds.records.toLocaleString()} records</span>
                        <span>{ds.lastUpdated}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Chat Interface */}
      <Card className="flex-1 border shadow-none flex flex-col min-w-0">
        <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2">
          <FiBarChart2 className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Data Explorer</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="text-center">
                  <FiDatabase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Query your scraped data with natural language.</p>
                  <p className="text-[10px] mt-1 opacity-60">Example: &quot;Show me the top 10 most expensive electronics&quot;</p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                    {['Show price trends', 'Compare datasets', 'Find anomalies', 'Export summary'].map((q) => (
                      <Button key={q} variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => { setInput(q) }}>
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'agent' && (
                  <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiCpu className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-sm p-2.5 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.role === 'agent' ? (
                    <>
                      {renderMarkdown(msg.content)}
                      {msg.data && typeof msg.data === 'object' && Object.keys(msg.data).length > 0 && renderDataTable(msg.data)}
                    </>
                  ) : (
                    <p className="text-xs">{msg.content}</p>
                  )}
                  <p className="text-[9px] mt-1 opacity-50">{msg.timestamp}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiUser className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FiCpu className="w-3 h-3 text-primary animate-pulse" />
                </div>
                <div className="bg-muted rounded-sm p-2.5 space-y-1.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div className="p-3 flex gap-2">
            <Input placeholder="Query your scraped data..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="text-xs h-8" disabled={loading} />
            <Button size="sm" className="h-8 px-3" onClick={handleSend} disabled={loading || !input.trim()}>
              <FiSend className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
