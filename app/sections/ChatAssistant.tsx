'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { callAIAgent, extractText } from '@/lib/aiAgent'
import { FiX, FiSend } from 'react-icons/fi'
import { FaGamepad, FaStar } from 'react-icons/fa'

const AGENT_ID = '69a28da3e72641e0c6070b59'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  parsedData?: Record<string, any> | null
  timestamp: string
}

interface ChatAssistantProps {
  isOpen: boolean
  onClose: () => void
}

const SUGGESTED_PROMPTS = [
  'Latest PS5 games',
  'Best free mobile RPGs',
  'Upcoming PC releases',
  'Top rated games 2024',
]

function formatChatGameData(data: Record<string, any>) {
  if (!data) return null

  const title = data?.game_title
  const platforms = Array.isArray(data?.platforms) ? data.platforms : []
  const genres = Array.isArray(data?.genre) ? data.genre : []
  const ratings = Array.isArray(data?.ratings) ? data.ratings : []
  const relatedGames = Array.isArray(data?.related_games) ? data.related_games : []

  return (
    <div className="space-y-3">
      {title && <h4 className="font-semibold text-base text-foreground">{title}</h4>}
      {data?.developer && <p className="text-xs text-muted-foreground">by {data.developer}{data?.publisher && data.publisher !== data.developer ? ` | Published by ${data.publisher}` : ''}</p>}

      {platforms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {platforms.map((p: string, i: number) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">{p}</span>
          ))}
        </div>
      )}

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {genres.map((g: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[10px]">{g}</Badge>
          ))}
        </div>
      )}

      {data?.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{data.description}</p>}

      {data?.current_version && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Version:</span> <span className="font-mono">{data.current_version}</span>
          {data?.release_date ? ` (${data.release_date})` : ''}
        </div>
      )}

      {ratings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ratings.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              <FaStar className="w-3 h-3 text-yellow-400" />
              <span className="font-semibold text-foreground">{r?.score ?? '-'}</span>
              <span className="text-muted-foreground">({r?.source ?? ''})</span>
            </div>
          ))}
        </div>
      )}

      {data?.summary && data.summary !== data.description && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{data.summary}</p>
        </div>
      )}

      {relatedGames.length > 0 && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Related:</p>
          <div className="flex flex-wrap gap-1">
            {relatedGames.slice(0, 5).map((g: string, i: number) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">{typeof g === 'string' ? g : ''}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatAssistant({ isOpen, onClose }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      parsedData: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const result = await callAIAgent(text.trim(), AGENT_ID)
      let parsedData: Record<string, any> | null = null
      let textContent = ''

      if (result) {
        // Try to extract structured data from multiple paths
        const dataSources = [
          result.response?.result,
          result.response,
          result.raw_response,
          result,
        ]

        for (const source of dataSources) {
          if (!source) continue
          let candidate = source
          // If string, try to parse as JSON
          if (typeof candidate === 'string') {
            try { candidate = JSON.parse(candidate) } catch { continue }
          }
          if (candidate && typeof candidate === 'object') {
            // Check if this looks like game data (has title or results)
            if (candidate.game_title || candidate.title || candidate.name || (Array.isArray(candidate.results) && candidate.results.length > 0)) {
              parsedData = candidate
              textContent = candidate.summary ?? candidate.description ?? ''
              break
            }
            // Check nested result/text
            if (candidate.result && typeof candidate.result === 'object') {
              const inner = candidate.result
              if (inner.game_title || inner.title || inner.name) {
                parsedData = inner
                textContent = inner.summary ?? inner.description ?? ''
                break
              }
            }
          }
        }

        // If no structured data found, use text extraction
        if (!parsedData) {
          const textSources = [
            result.response?.message,
            result.response?.result?.text,
            result.response?.result?.message,
            result.response?.result?.answer,
            typeof result.response?.result === 'string' ? result.response.result : null,
            result.raw_response,
            extractText(result.response ?? { status: 'error', result: {} }),
          ]
          for (const t of textSources) {
            if (typeof t === 'string' && t.trim().length > 10) {
              textContent = t
              break
            }
          }
        }

        if (!textContent && !parsedData) {
          textContent = result.success === false
            ? (result.error ?? 'Sorry, I could not process your request. Please try again.')
            : 'No response received. Please try again.'
        }
      } else {
        textContent = 'No response from agent. Please try again.'
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: textContent,
        parsedData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'An error occurred. Please try again.',
        parsedData: null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      {/* Panel */}
      <div className={cn(
        'fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-background border-l border-border shadow-2xl shadow-primary/10 transition-transform duration-300 ease-in-out flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FaGamepad className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Game Assistant</h3>
              <p className="text-[10px] text-muted-foreground">Powered by Perplexity</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 hover:bg-secondary">
            <FiX className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <FaGamepad className="w-7 h-7 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Ask me anything about games</p>
                <p className="text-xs text-muted-foreground">Get instant info on any game - details, requirements, ratings, and more.</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-card border border-border rounded-bl-md'
              )}>
                {msg.role === 'assistant' && msg.parsedData ? (
                  formatChatGameData(msg.parsedData)
                ) : msg.role === 'assistant' && msg.content ? (
                  <div className="text-sm leading-relaxed space-y-1">
                    {msg.content.split('\n').map((line, li) => {
                      if (!line.trim()) return <div key={li} className="h-1" />
                      if (line.startsWith('### ')) return <h4 key={li} className="font-semibold text-xs mt-2 text-foreground">{line.slice(4)}</h4>
                      if (line.startsWith('## ')) return <h3 key={li} className="font-semibold text-sm mt-2 text-foreground">{line.slice(3)}</h3>
                      if (line.startsWith('# ')) return <h2 key={li} className="font-semibold text-sm mt-2 text-foreground">{line.slice(2)}</h2>
                      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={li} className="ml-3 list-disc text-xs">{line.slice(2)}</li>
                      return <p key={li} className="text-sm">{line}</p>
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                <p className={cn('text-[10px] mt-1.5', msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>{msg.timestamp}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        {messages.length === 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-3 py-1.5 bg-secondary border border-border rounded-full text-secondary-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/30">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ask about any game..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-card border-border rounded-xl focus:border-primary/50 transition-all"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              size="sm"
              className="h-10 w-10 p-0 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-300"
            >
              <FiSend className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
