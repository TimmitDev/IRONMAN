import { useState } from 'react'
import type { FeedPerson, Follows } from '../lib/social'
import { errorMessage } from '../lib/ui'
import { Icon } from './Icon'

/** Volgen/ontvolgen. "Volgen" is een kleine primaire pil, "Volgend" een rustige omlijnde. */
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
      type="button"
      onClick={toggle}
      disabled={disabled || busy}
      aria-pressed={following}
      title={following ? `${person.display_name} ontvolgen` : undefined}
      className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold whitespace-nowrap transition focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none disabled:opacity-50 ${
        following
          ? 'border border-line-strong text-fg-2 hover:border-danger/40 hover:bg-danger/10 hover:text-danger'
          : 'bg-brand text-white shadow-sm hover:brightness-110'
      }`}
    >
      {following ? <Icon name="check" className="size-3.5" /> : <Icon name="plus" className="size-3.5" />}
      {following ? 'Volgend' : 'Volgen'}
    </button>
  )
}
