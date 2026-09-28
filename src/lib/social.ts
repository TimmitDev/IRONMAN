import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { normalizeRow, type Sport } from './types'

export interface FeedPerson {
  user_id: string
  display_name: string
}

export interface FeedComment extends FeedPerson {
  id: string
  body: string
  created_at: string
}

/** Eén gedeelde training in de feed (`social_feed`), zonder notities of RPE. */
export interface FeedItem extends FeedPerson {
  id: string
  date: string
  sport: Sport
  duration_min: number
  distance_km: number | null
  created_at: string
  kudos: FeedPerson[]
  comments: FeedComment[]
}

export interface InboxItem extends FeedPerson {
  kind: 'kudos' | 'comment'
  workout_id: string
  sport: Sport
  date: string
  body: string | null
  created_at: string
}

const PAGE = 20

export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async (offset: number) => {
    setLoading(true)
    const { data, error } = await supabase.rpc('social_feed', { p_limit: PAGE, p_offset: offset })
    setError(error?.message ?? null)
    const page = ((data ?? []) as FeedItem[]).map(normalizeRow)
    setItems((prev) => (offset ? [...prev, ...page] : page))
    setHasMore(page.length === PAGE)
    setLoading(false)
  }, [])

  useEffect(() => {
    load(0)
  }, [load])

  /** Past één item lokaal aan, zodat kudos en reacties meteen zichtbaar zijn. */
  const patch = (id: string, fn: (item: FeedItem) => FeedItem) => setItems((prev) => prev.map((i) => (i.id === id ? fn(i) : i)))

  return {
    items,
    loading,
    error,
    hasMore,
    refresh: () => load(0),
    loadMore: () => load(items.length),
    patch,
  }
}

export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>([])

  useEffect(() => {
    supabase.rpc('social_inbox', { p_limit: 8 }).then(({ data }) => setItems((data ?? []) as InboxItem[]))
  }, [])

  return items
}

export async function giveKudos(workoutId: string) {
  const { error } = await supabase.from('kudos').insert({ workout_id: workoutId })
  if (error) throw error
}

export async function removeKudos(workoutId: string, userId: string) {
  const { error } = await supabase.from('kudos').delete().eq('workout_id', workoutId).eq('user_id', userId)
  if (error) throw error
}

export async function addComment(workoutId: string, body: string) {
  const { data, error } = await supabase
    .from('workout_comments')
    .insert({ workout_id: workoutId, body })
    .select('id, user_id, body, created_at')
    .single()
  if (error) throw error
  return data as Omit<FeedComment, 'display_name'>
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('workout_comments').delete().eq('id', id)
  if (error) throw error
}
