import { useState } from 'react'
import type { FeedPerson, Follows } from '../lib/social'
import { errorMessage } from '../lib/ui'

/** Volgen/ontvolgen. Zonder eigen profiel (`disabled`) kan je niemand volgen. */
export function FollowButton({ person, follows, disabled = false }: { person: FeedPerson; follows: Follows; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  const following = follows.isFollowing(person.user_id)

  async function toggle() {
    setBusy(true)
    try {
      await (following ? follows.unfollow(person) : follows.follow(person))
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled || busy}
      aria-pressed={following}
      title={disabled ? 'Doe eerst mee via het leaderboard' : undefined}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
        following ? 'border border-white/10 text-zinc-300 hover:border-red-500/40 hover:text-red-300' : 'bg-brand text-white hover:brightness-110'
      }`}
    >
      {following ? 'Volgend' : 'Volgen'}
    </button>
  )
}
