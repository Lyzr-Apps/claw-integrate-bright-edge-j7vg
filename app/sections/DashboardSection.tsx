'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FiPlay, FiPause, FiClock, FiCheckCircle,
  FiAlertTriangle, FiRefreshCw, FiZap, FiTrendingUp
} from 'react-icons/fi'
import {
  listSchedules, getScheduleLogs, pauseSchedule, resumeSchedule,
  triggerScheduleNow, cronToHuman
} from '@/lib/scheduler'
import type { Schedule, ExecutionLog } from '@/lib/scheduler'

const EXECUTOR_AGENT_ID = '69a372c08cf91bdfdf384edf'
const SCHEDULE_ID = '69a372c725d4d77f732f626c'

interface SampleTask {
  id: string
  name: string
  status: 'active' | 'paused' | 'error'
  lastRun: string
  nextRun: string
  records: number
}

interface ActivityEntry {
  id: string
  time: string
  message: string
  status: 'success' | 'error' | 'info'
}

interface DashboardSectionProps {
  showSample: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
  onNavigate: (screen: string) => void
}

const sampleTasks: SampleTask[] = [
  { id: '1', name: 'E-commerce Price Monitor', status: 'active', lastRun: '2 min ago', nextRun: 'In 6 hours', records: 14520 },
  { id: '2', name: 'News Headlines Scraper', status: 'active', lastRun: '1 hour ago', nextRun: 'In 5 hours', records: 8340 },
  { id: '3', name: 'Job Listings Tracker', status: 'paused', lastRun: '3 days ago', nextRun: 'Paused', records: 5200 },
  { id: '4', name: 'Social Media Feed', status: 'error', lastRun: '12 min ago', nextRun: 'Retry in 30 min', records: 920 },
]

const sampleActivity: ActivityEntry[] = [
  { id: '1', time: '2 min ago', message: 'E-commerce Price Monitor completed - 245 records', status: 'success' },
  { id: '2', time: '12 min ago', message: 'Social Media Feed failed - Rate limit exceeded', status: 'error' },
  { id: '3', time: '1 hour ago', message: 'News Headlines Scraper completed - 82 records', status: 'success' },
  { id: '4', time: '2 hours ago', message: 'Scheduled execution triggered for all active tasks', status: 'info' },
  { id: '5', time: '6 hours ago', message: 'E-commerce Price Monitor completed - 210 records', status: 'success' },
]

export default function DashboardSection({ showSample, activeAgentId: _activeAgentId, setActiveAgentId, onNavigate }: DashboardSectionProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [triggerLoading, setTriggerLoading] = useState(false)

  const loadScheduleData = async () => {
    setScheduleLoading(true)
    const listResult = await listSchedules()
    if (listResult.success) {
      const found = listResult.schedules.find(s => s.id === SCHEDULE_ID)
      if (found) setSchedule(found)
      else if (listResult.schedules.length > 0) setSchedule(listResult.schedules[0])
    }
    const logsResult = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
    if (logsResult.success) {
      setLogs(logsResult.executions)
    }
    setScheduleLoading(false)
  }

  useEffect(() => {
    loadScheduleData()
  }, [])

  const handleToggleSchedule = async () => {
    if (!schedule) return
    setToggleLoading(true)
    if (schedule.is_active) {
      await pauseSchedule(schedule.id)
    } else {
      await resumeSchedule(schedule.id)
    }
    await loadScheduleData()
    setToggleLoading(false)
  }

  const handleTriggerNow = async () => {
    if (!schedule) return
    setTriggerLoading(true)
    setActiveAgentId(EXECUTOR_AGENT_ID)
    await triggerScheduleNow(schedule.id)
    await loadScheduleData()
    setTriggerLoading(false)
    setActiveAgentId(null)
  }

  const tasks = showSample ? sampleTasks : []
  const activity = showSample ? sampleActivity : []

  const activeTasks = tasks.filter(t => t.status === 'active').length
  const todayRuns = showSample ? 24 : 0
  const successRate = showSample ? 96.5 : 0

  const statusColor = (s: string) => {
    if (s === 'active' || s === 'success') return 'bg-accent text-accent-foreground'
    if (s === 'error') return 'bg-destructive text-destructive-foreground'
    if (s === 'paused') return 'bg-muted text-muted-foreground'
    return 'bg-secondary text-secondary-foreground'
  }

  const statusIcon = (s: string) => {
    if (s === 'success') return <FiCheckCircle className="w-3.5 h-3.5" />
    if (s === 'error') return <FiAlertTriangle className="w-3.5 h-3.5" />
    return <FiClock className="w-3.5 h-3.5" />
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active Tasks</p>
                <p className="text-2xl font-semibold mt-0.5">{showSample ? activeTasks : '--'}</p>
              </div>
              <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center">
                <FiZap className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Today&apos;s Runs</p>
                <p className="text-2xl font-semibold mt-0.5">{showSample ? todayRuns : '--'}</p>
              </div>
              <div className="w-8 h-8 rounded-sm bg-accent/10 flex items-center justify-center">
                <FiPlay className="w-4 h-4 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Success Rate</p>
                <p className="text-2xl font-semibold mt-0.5">{showSample ? `${successRate}%` : '--%'}</p>
              </div>
              <div className="w-8 h-8 rounded-sm bg-accent/10 flex items-center justify-center">
                <FiTrendingUp className="w-4 h-4 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Next Scheduled</p>
                <p className="text-sm font-semibold mt-0.5 truncate">{schedule?.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : (showSample ? 'In 6 hours' : '--')}</p>
              </div>
              <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center">
                <FiClock className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Task List */}
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
                  {tasks.map((task) => (
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

        {/* Activity Feed */}
        <Card className="lg:col-span-2 border shadow-none">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No activity yet. Run a task to see results here.</div>
            ) : (
              <ScrollArea className="max-h-[280px]">
                <div className="divide-y">
                  {activity.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 px-3 py-2">
                      <div className={`mt-0.5 flex-shrink-0 ${entry.status === 'success' ? 'text-accent' : entry.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {statusIcon(entry.status)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug">{entry.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Management */}
      <Card className="border shadow-none">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold">Schedule Management - Scraping Executor</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {scheduleLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : schedule ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Status:</span>
                  <Badge variant="secondary" className={schedule.is_active ? 'bg-accent text-accent-foreground text-[10px]' : 'bg-muted text-muted-foreground text-[10px]'}>
                    {schedule.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Schedule: {schedule.cron_expression ? cronToHuman(schedule.cron_expression) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Next Run: {schedule.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : 'N/A'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={schedule.is_active} onCheckedChange={handleToggleSchedule} disabled={toggleLoading} />
                  <span className="text-xs font-medium">{toggleLoading ? 'Updating...' : (schedule.is_active ? 'Active' : 'Paused')}</span>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleTriggerNow} disabled={triggerLoading}>
                  {triggerLoading ? <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <FiPlay className="w-3 h-3 mr-1" />}
                  Run Now
                </Button>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Recent Executions</p>
                {Array.isArray(logs) && logs.length > 0 ? (
                  <div className="space-y-1">
                    {logs.slice(0, 3).map((log) => (
                      <div key={log.id} className="flex items-center gap-2 text-[10px]">
                        {log.success ? <FiCheckCircle className="w-3 h-3 text-accent" /> : <FiAlertTriangle className="w-3 h-3 text-destructive" />}
                        <span className="text-muted-foreground">{new Date(log.executed_at).toLocaleString()}</span>
                        <span className={log.success ? 'text-accent' : 'text-destructive'}>{log.success ? 'OK' : 'Failed'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No recent executions</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No schedule found. Schedule may not be configured yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
