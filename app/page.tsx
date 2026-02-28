'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  FiGrid, FiSettings, FiActivity, FiDatabase,
  FiBell, FiMenu, FiChevronLeft
} from 'react-icons/fi'

import DashboardSection from './sections/DashboardSection'
import TaskConfigSection from './sections/TaskConfigSection'
import MonitoringSection from './sections/MonitoringSection'
import DataExplorerSection from './sections/DataExplorerSection'

// --- Agent Registry ---
const AGENTS = [
  { id: '69a372c07d0d16a1b89c6338', name: 'Task Configurator', purpose: 'Generates scraping configurations from natural language' },
  { id: '69a372c08cf91bdfdf384edf', name: 'Scraping Executor', purpose: 'Executes tasks and collects data on schedule' },
  { id: '69a372c18811f110756792cb', name: 'Monitoring & Alerts', purpose: 'Analyzes job logs and system health' },
  { id: '69a372c12d842ec0d6494e48', name: 'Data Explorer', purpose: 'Conversational querying of scraped data' },
]

type Screen = 'dashboard' | 'config' | 'monitoring' | 'explorer'

const NAV_ITEMS: { key: Screen; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <FiGrid className="w-4 h-4" /> },
  { key: 'config', label: 'Task Config', icon: <FiSettings className="w-4 h-4" /> },
  { key: 'monitoring', label: 'Monitoring', icon: <FiActivity className="w-4 h-4" /> },
  { key: 'explorer', label: 'Data Explorer', icon: <FiDatabase className="w-4 h-4" /> },
]

// --- ErrorBoundary ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [showSample, setShowSample] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [notifCount] = useState(3)

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flex">
          {/* Sidebar */}
          <aside className={`flex flex-col border-r bg-card transition-all duration-200 flex-shrink-0 ${sidebarCollapsed ? 'w-12' : 'w-48'}`}>
            {/* Logo */}
            <div className={`flex items-center h-11 border-b px-3 ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
              {!sidebarCollapsed && <span className="text-sm font-semibold text-primary truncate">OpenClaw</span>}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto flex-shrink-0" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                {sidebarCollapsed ? <FiMenu className="w-3.5 h-3.5" /> : <FiChevronLeft className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-2 space-y-0.5 px-1.5">
              {NAV_ITEMS.map((item) => (
                <Tooltip key={item.key} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setScreen(item.key)}
                      className={`flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${screen === item.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                      {item.icon}
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </TooltipTrigger>
                  {sidebarCollapsed && (
                    <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                  )}
                </Tooltip>
              ))}
            </nav>

            {/* Agent Status */}
            {!sidebarCollapsed && (
              <div className="border-t p-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5">Agents</p>
                <div className="space-y-1">
                  {AGENTS.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgentId === agent.id ? 'bg-accent animate-pulse' : 'bg-muted-foreground/30'}`} />
                      <span className="text-[10px] truncate text-muted-foreground">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Header */}
            <header className="h-11 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold">OpenClaw Hub</h1>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">{NAV_ITEMS.find(n => n.key === screen)?.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Sample Data Toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Sample Data</span>
                  <Switch checked={showSample} onCheckedChange={setShowSample} />
                </div>
                {/* Notification Bell */}
                <button className="relative p-1">
                  <FiBell className="w-4 h-4 text-muted-foreground" />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-semibold rounded-full flex items-center justify-center">{notifCount}</span>
                  )}
                </button>
                {/* User Avatar */}
                <div className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-secondary-foreground">U</span>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 p-3 overflow-y-auto">
              {screen === 'dashboard' && (
                <DashboardSection
                  showSample={showSample}
                  activeAgentId={activeAgentId}
                  setActiveAgentId={setActiveAgentId}
                  onNavigate={(s: string) => setScreen(s as Screen)}
                />
              )}
              {screen === 'config' && (
                <TaskConfigSection
                  showSample={showSample}
                  activeAgentId={activeAgentId}
                  setActiveAgentId={setActiveAgentId}
                />
              )}
              {screen === 'monitoring' && (
                <MonitoringSection
                  showSample={showSample}
                  activeAgentId={activeAgentId}
                  setActiveAgentId={setActiveAgentId}
                />
              )}
              {screen === 'explorer' && (
                <DataExplorerSection
                  showSample={showSample}
                  activeAgentId={activeAgentId}
                  setActiveAgentId={setActiveAgentId}
                />
              )}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
