'use client'

import React, { useState, useCallback } from 'react'
import { callAIAgent, AIAgentResponse, extractText } from '@/lib/aiAgent'
import Dashboard from './sections/Dashboard'
import GameDetail from './sections/GameDetail'
import ChatAssistant from './sections/ChatAssistant'

const AGENT_ID = '69a28da3e72641e0c6070b59'

// ---------- ErrorBoundary ----------
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
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------- Types ----------
interface GameData {
  game_title?: string
  developer?: string
  publisher?: string
  description?: string
  platforms?: string[]
  genre?: string[]
  current_version?: string
  release_date?: string
  upcoming_version?: string | null
  upcoming_release_date?: string | null
  download_links?: Array<{ platform?: string; store_name?: string; url?: string }>
  system_requirements?: {
    minimum?: { os?: string; processor?: string; memory?: string; graphics?: string; storage?: string }
    recommended?: { os?: string; processor?: string; memory?: string; graphics?: string; storage?: string }
  }
  ratings?: Array<{ source?: string; score?: string }>
  related_games?: string[]
  summary?: string
}

// ---------- Helper: parse agent response ----------
function parseAgentResponse(result: AIAgentResponse): GameData | null {
  if (!result?.success) return null

  let data = result?.response?.result
  if (!data) return null

  // Handle string-wrapped JSON
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      // Try raw_response fallback
      if (result?.raw_response) {
        try {
          data = JSON.parse(result.raw_response)
        } catch {
          return null
        }
      } else {
        return null
      }
    }
  }

  // Ensure we have an object
  if (!data || typeof data !== 'object') {
    // Try raw_response fallback
    if (result?.raw_response) {
      try {
        const parsed = JSON.parse(result.raw_response)
        if (parsed && typeof parsed === 'object') {
          data = parsed
        }
      } catch {
        return null
      }
    }
    if (!data || typeof data !== 'object') return null
  }

  return data as GameData
}

// ---------- Main Page ----------
export default function Page() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'detail'>('dashboard')
  const [gameDetail, setGameDetail] = useState<GameData | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    setSearchLoading(true)
    setActiveAgentId(AGENT_ID)
    setSearchError(null)

    try {
      const result = await callAIAgent(query, AGENT_ID)

      if (!result || !result.success) {
        const errMsg = result?.error || result?.response?.message || 'Could not fetch game info. Please try again.'
        setSearchError(errMsg)
        setSearchLoading(false)
        setActiveAgentId(null)
        return
      }

      const parsed = parseAgentResponse(result)

      if (parsed) {
        setGameDetail(parsed)
        setCurrentView('detail')
      } else {
        // Fallback: create minimal data from whatever text we got
        const text = extractText(result?.response ?? { status: 'error', result: {} })
        if (text) {
          setGameDetail({ game_title: query, summary: text })
          setCurrentView('detail')
        } else {
          setSearchError('Unable to parse game data. Please try a different search.')
        }
      }
    } catch {
      setSearchError('Network error. Please check your connection and try again.')
    } finally {
      setSearchLoading(false)
      setActiveAgentId(null)
    }
  }, [])

  const handleViewDetail = useCallback((gameTitle: string) => {
    handleSearch(gameTitle)
  }, [handleSearch])

  const handleBack = useCallback(() => {
    setCurrentView('dashboard')
    setGameDetail(null)
  }, [])

  const handleToggleChat = useCallback(() => {
    setChatOpen(prev => !prev)
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {currentView === 'dashboard' && (
          <Dashboard
            onSearch={handleSearch}
            onViewDetail={handleViewDetail}
            onToggleChat={handleToggleChat}
            searchLoading={searchLoading}
            activeAgentId={activeAgentId}
            searchError={searchError}
          />
        )}

        {currentView === 'detail' && (
          <GameDetail
            data={gameDetail}
            onBack={handleBack}
            onSearchGame={handleSearch}
          />
        )}

        <ChatAssistant
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </ErrorBoundary>
  )
}
