import { useState } from 'react'
import type { FeedPerson, Follows } from '../lib/social'
import { errorMessage } from '../lib/ui'
import { Icon } from './Icon'

/** Volgen/ontvolgen. "Volgen" is een kleine neutrale primaire knop, "Volgend" een rustige omlijnde. */
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
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none disabled:opacity-40 ${
        following ? 'border border-line text-fg-2 hover:text-danger' : 'bg-fg text-canvas hover:opacity-85'
      }`}
    >
      {following ? <Icon name="check" className="size-3.5" /> : <Icon name="plus" className="size-3.5" />}
      {following ? 'Volgend' : 'Volgen'}
    </button>
  )
}
