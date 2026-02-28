'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { FiSend, FiSave, FiPlay, FiRotateCcw, FiUser, FiCpu } from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'

const CONFIGURATOR_AGENT_ID = '69a372c07d0d16a1b89c6338'

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  data?: Record<string, unknown>
  status?: string
  timestamp: string
}

interface TaskConfigSectionProps {
  showSample: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}

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

const sampleMessages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'I want to scrape product prices from amazon.com for electronics category', timestamp: '10:30 AM' },
  { id: '2', role: 'agent', content: 'I\'ve generated a scraping configuration for Amazon Electronics. Here\'s the setup:\n\n### Configuration Summary\n- **Target URL**: amazon.com/s?k=electronics\n- **Pagination**: Next button selector\n- **Fields**: Product name, price, rating, reviews count, seller\n- **Rate Limiting**: 2 req/sec with random delay\n- **Retry Policy**: 3 attempts with exponential backoff', data: { url: 'https://amazon.com/s?k=electronics', selectors: { product_name: '.a-text-normal', price: '.a-price-whole', rating: '.a-icon-alt', reviews: '.a-size-base.s-underline-text' }, pagination: { type: 'next_button', selector: '.s-pagination-next' }, rate_limit: { requests_per_second: 2, random_delay: true }, retries: 3 }, status: 'success', timestamp: '10:30 AM' },
]

export default function TaskConfigSection({ showSample, activeAgentId: _activeAgentId, setActiveAgentId }: TaskConfigSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(showSample ? sampleMessages : [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [configPreview, setConfigPreview] = useState<Record<string, unknown> | null>(showSample ? (sampleMessages[1]?.data ?? null) : null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showSample) {
      setMessages(sampleMessages)
      setConfigPreview(sampleMessages[1]?.data ?? null)
    } else {
      setMessages([])
      setConfigPreview(null)
    }
  }, [showSample])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setActiveAgentId(CONFIGURATOR_AGENT_ID)

    const result = await callAIAgent(input.trim(), CONFIGURATOR_AGENT_ID)

    if (result.success) {
      const agentMessage = result?.response?.result?.message || result?.response?.message || 'Configuration processed.'
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
      if (agentData && typeof agentData === 'object' && Object.keys(agentData).length > 0) {
        setConfigPreview(agentData as Record<string, unknown>)
      }
    } else {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: result?.error || 'Something went wrong. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    }
    setLoading(false)
    setActiveAgentId(null)
  }

  const handleReset = () => {
    setMessages([])
    setConfigPreview(null)
    setInput('')
  }

  const renderConfigValue = (val: unknown, depth: number = 0): React.ReactNode => {
    if (val === null || val === undefined) return <span className="text-muted-foreground">null</span>
    if (typeof val === 'string') return <span className="text-accent">&quot;{val}&quot;</span>
    if (typeof val === 'number' || typeof val === 'boolean') return <span className="text-primary">{String(val)}</span>
    if (Array.isArray(val)) {
      return (
        <div className="ml-3">
          {val.map((item, idx) => (
            <div key={idx} className="text-xs">{renderConfigValue(item, depth + 1)}</div>
          ))}
        </div>
      )
    }
    if (typeof val === 'object') {
      return (
        <div className={depth > 0 ? 'ml-3' : ''}>
          {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
            <div key={k} className="text-xs py-0.5">
              <span className="text-muted-foreground font-medium">{k}:</span>{' '}
              {renderConfigValue(v, depth + 1)}
            </div>
          ))}
        </div>
      )
    }
    return <span>{String(val)}</span>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-[calc(100vh-120px)]">
      {/* Chat Panel */}
      <Card className="lg:col-span-3 border shadow-none flex flex-col">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Task Configurator Chat</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
            <FiRotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="text-center">
                  <FiCpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Describe the scraping task you want to configure.</p>
                  <p className="text-[10px] mt-1 opacity-60">Example: &quot;Scrape product prices from shopify stores&quot;</p>
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
                  {msg.role === 'agent' ? renderMarkdown(msg.content) : <p className="text-xs">{msg.content}</p>}
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
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div className="p-3 flex gap-2">
            <Input placeholder="Describe your scraping task..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="text-xs h-8" disabled={loading} />
            <Button size="sm" className="h-8 px-3" onClick={handleSend} disabled={loading || !input.trim()}>
              <FiSend className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Config Preview Panel */}
      <Card className="lg:col-span-2 border shadow-none flex flex-col">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Configuration Preview</CardTitle>
          {configPreview && (
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs">
                <FiSave className="w-3 h-3 mr-1" /> Save Task
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <FiPlay className="w-3 h-3 mr-1" /> Test Run
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
          <ScrollArea className="h-full px-3 py-2">
            {configPreview ? (
              <div className="font-mono text-xs">
                {renderConfigValue(configPreview)}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                <p>Configuration will appear here as you describe your task.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
