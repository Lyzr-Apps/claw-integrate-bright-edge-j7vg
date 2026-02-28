'use client'

import React, { useState, Suspense } from 'react'
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

const AGENTS = [
  { id: '69a372c07d0d16a1b89c6338', name: 'Task Configurator' },
  { id: '69a372c08cf91bdfdf384edf', name: 'Scraping Executor' },
  { id: '69a372c18811f110756792cb', name: 'Monitoring & Alerts' },
  { id: '69a372c12d842ec0d6494e48', name: 'Data Explorer' },
]

type Screen = 'dashboard' | 'config' | 'monitoring' | 'explorer'

interface NavItem {
  key: Screen
  label: string
  iconName: 'grid' | 'settings' | 'activity' | 'database'
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', iconName: 'grid' },
  { key: 'config', label: 'Task Config', iconName: 'settings' },
  { key: 'monitoring', label: 'Monitoring', iconName: 'activity' },
  { key: 'explorer', label: 'Data Explorer', iconName: 'database' },
]

function NavIcon({ name }: { name: string }) {
  switch (name) {
    case 'grid': return <FiGrid className="w-4 h-4" />
    case 'settings': return <FiSettings className="w-4 h-4" />
    case 'activity': return <FiActivity className="w-4 h-4" />
    case 'database': return <FiDatabase className="w-4 h-4" />
    default: return <FiGrid className="w-4 h-4" />
  }
}

function SectionFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Loading section...</p>
      </div>
    </div>
  )
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [showSample, setShowSample] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const notifCount = 3

  const renderSection = () => {
    switch (screen) {
      case 'dashboard':
        return (
          <DashboardSection
            showSample={showSample}
            activeAgentId={activeAgentId}
            setActiveAgentId={setActiveAgentId}
            onNavigate={(s: string) => setScreen(s as Screen)}
          />
        )
      case 'config':
        return (
          <TaskConfigSection
            showSample={showSample}
            activeAgentId={activeAgentId}
            setActiveAgentId={setActiveAgentId}
          />
        )
      case 'monitoring':
        return (
          <MonitoringSection
            showSample={showSample}
            activeAgentId={activeAgentId}
            setActiveAgentId={setActiveAgentId}
          />
        )
      case 'explorer':
        return (
          <DataExplorerSection
            showSample={showSample}
            activeAgentId={activeAgentId}
            setActiveAgentId={setActiveAgentId}
          />
        )
      default:
        return null
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <aside
          className={`flex flex-col border-r bg-card transition-all duration-200 flex-shrink-0 ${
            sidebarCollapsed ? 'w-12' : 'w-48'
          }`}
        >
          {/* Logo */}
          <div
            className={`flex items-center h-11 border-b px-3 ${
              sidebarCollapsed ? 'justify-center' : 'gap-2'
            }`}
          >
            {!sidebarCollapsed && (
              <span className="text-sm font-semibold text-primary truncate">OpenClaw</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 ml-auto flex-shrink-0"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <FiMenu className="w-3.5 h-3.5" />
              ) : (
                <FiChevronLeft className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-2 space-y-0.5 px-1.5">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.key} delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setScreen(item.key)}
                    className={`flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                      screen === item.key
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <NavIcon name={item.iconName} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>

          {/* Agent Status */}
          {!sidebarCollapsed && (
            <div className="border-t p-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5">
                Agents
              </p>
              <div className="space-y-1">
                {AGENTS.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        activeAgentId === agent.id
                          ? 'bg-accent animate-pulse'
                          : 'bg-muted-foreground/30'
                      }`}
                    />
                    <span className="text-[10px] truncate text-muted-foreground">
                      {agent.name}
                    </span>
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
              <span className="text-xs text-muted-foreground">
                {NAV_ITEMS.find((n) => n.key === screen)?.label}
              </span>
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
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-semibold rounded-full flex items-center justify-center">
                    {notifCount}
                  </span>
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
            <Suspense fallback={<SectionFallback />}>
              {renderSection()}
            </Suspense>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
