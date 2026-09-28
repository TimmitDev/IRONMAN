import { useCallback, useEffect, useRef, useState } from 'react'
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

/** Feed van gedeelde trainingen; met `following` alleen van gevolgde spelers en jezelf. */
export function useFeed(following = false) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  // Wisselen van filter terwijl een pagina laadt: het oude antwoord mag de nieuwe lijst niet overschrijven.
  const request = useRef(0)

  const load = useCallback(
    async (offset: number) => {
      const id = ++request.current
      setLoading(true)
      const { data, error } = await supabase.rpc('social_feed', { p_limit: PAGE, p_offset: offset, p_following: following })
      if (id !== request.current) return
      setError(error?.message ?? null)
      const page = ((data ?? []) as FeedItem[]).map(normalizeRow)
      setItems((prev) => (offset ? [...prev, ...page] : page))
      setHasMore(page.length === PAGE)
      setLoading(false)
    },
    [following],
  )

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

/** Recente kudos en reacties op je trainingen; ververst elke minuut zolang het tabblad zichtbaar is. */
export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>([])

  useEffect(() => {
    const load = () => {
      if (document.visibilityState !== 'visible') return
      supabase.rpc('social_inbox', { p_limit: 8 }).then(({ data }) => setItems((data ?? []) as InboxItem[]))
    }
    load()
    const timer = setInterval(load, 60_000)
    document.addEventListener('visibilitychange', load)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  return items
}

export interface FollowRow extends FeedPerson {
  i_follow: boolean
  follows_me: boolean
}

/** Wie je volgt ("vrienden") en wie jou volgt. Volgen/ontvolgen past de lijst meteen aan. */
export function useFollows(meId: string) {
  const [rows, setRows] = useState<FollowRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('my_follows').then(({ data }) => {
      setRows((data ?? []) as FollowRow[])
      setLoading(false)
    })
  }, [meId])

  const setFollow = (person: FeedPerson, value: boolean) =>
    setRows((prev) => {
      const existing = prev.find((r) => r.user_id === person.user_id)
      if (existing) return prev.map((r) => (r === existing ? { ...r, i_follow: value } : r)).filter((r) => r.i_follow || r.follows_me)
      return value ? [...prev, { ...person, i_follow: true, follows_me: false }].sort((a, b) => a.display_name.localeCompare(b.display_name)) : prev
    })

  const follow = async (person: FeedPerson) => {
    setFollow(person, true)
    const { error } = await supabase.from('follows').insert({ followee_id: person.user_id })
    if (error) {
      setFollow(person, false)
      throw error
    }
  }

  const unfollow = async (person: FeedPerson) => {
    setFollow(person, false)
    const { error } = await supabase.from('follows').delete().eq('follower_id', meId).eq('followee_id', person.user_id)
    if (error) {
      setFollow(person, true)
      throw error
    }
  }

  const following = rows.filter((r) => r.i_follow)
  const followers = rows.filter((r) => r.follows_me)
  const isFollowing = (id: string) => following.some((r) => r.user_id === id)

  return { following, followers, loading, isFollowing, follow, unfollow }
}

export type Follows = ReturnType<typeof useFollows>

/** Alle zichtbare spelers (naam + id), voor suggesties en namen bij online-status. */
export function usePlayers() {
  const [players, setPlayers] = useState<FeedPerson[]>([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name')
      .eq('show_on_leaderboard', true)
      .order('display_name')
      .limit(200)
      .then(({ data }) => setPlayers(((data ?? []) as { id: string; display_name: string }[]).map((p) => ({ user_id: p.id, display_name: p.display_name }))))
  }, [])

  return players
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
