import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { BadgesGrid } from '../components/Badges'
import { Card } from '../components/Card'
import { FollowButton } from '../components/FollowButton'
import { WeeklyChart } from '../components/WeeklyChart'
import { WorkoutList } from '../components/WorkoutList'
import { useAuth } from '../lib/auth'
import { evaluateBadges } from '../lib/badges'
import { compliance, formatIronman, ironmanFraction, useProfile } from '../lib/leaderboard'
import { usePlayerProfile, type PlayerProfile } from '../lib/players'
import { useOnline } from '../lib/presence'
import { useFollows } from '../lib/social'
import { formatDuration, formatSessionDuration, formatShortDate } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL } from '../lib/types'
import { ghostButton } from '../lib/ui'

const fmtKm = (km: number) => (Math.round(km * 10) / 10).toLocaleString('nl-BE')

export function Player() {
  const { userId } = useParams()
  const { session } = useAuth()
  const { player, loading, error } = usePlayerProfile(userId!)

  if (loading) return <p className="text-sm text-zinc-500">Laden…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/leaderboard" className="inline-block text-sm text-zinc-400 hover:text-white">
        ← Leaderboard
      </Link>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!player && !error && (
        <Card>
          <p className="text-sm text-zinc-400">Deze speler bestaat niet of staat niet op het leaderboard.</p>
        </Card>
      )}
      {player && <PlayerView player={player} meId={session!.user.id} />}
    </div>
  )
}

function PlayerView({ player, meId }: { player: PlayerProfile; meId: string }) {
  const isMe = player.id === meId
  const follows = useFollows(meId)
  const { profile } = useProfile()
  const online = useOnline().has(player.id)
  const t = player.totals
  const c = compliance(player)
  const chartItems = useMemo(() => player.weeks.map((w) => ({ date: w.week, sport: w.sport, duration_min: w.minutes })), [player.weeks])

  const stats = [
    { label: 'Trainingstijd', value: t.total_min ? formatDuration(t.total_min) : '0' },
    { label: 'Sessies', value: String(t.sessions) },
    { label: 'Actieve dagen', value: String(t.active_days) },
    { label: 'IRONMAN-afstand', value: formatIronman(ironmanFraction(t)) },
    { label: 'Schema-trouw', value: c === null ? '–' : `${Math.round(c * 100)}%` },
  ]

  return (
    <>
      <Card>
        <div className="flex items-center gap-3">
          <Avatar name={player.display_name} size="lg" highlight={isMe} online={online} />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="truncate text-3xl font-black tracking-tight">{player.display_name}</h1>
            {isMe && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-zinc-300 uppercase">jij</span>}
          </div>
          {!isMe && !follows.loading && (
            <FollowButton person={{ user_id: player.id, display_name: player.display_name }} follows={follows} disabled={!profile} />
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {t.first_date ? `Traint sinds ${formatShortDate(t.first_date)} · laatste training ${formatShortDate(t.last_date!)}` : 'Nog geen trainingen gelogd.'}
        </p>
        {isMe && <p className="mt-1 text-xs text-zinc-500">Zo zien anderen je profiel. Delen pas je aan onderaan het leaderboard.</p>}
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-zinc-800/50 p-3">
              <dt className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">{s.label}</dt>
              <dd className="mt-1 text-xl font-black text-white tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Per sport">
        <ul className="divide-y divide-white/5">
          {SPORTS.map((s) => {
            const record = player.records[s]
            const km = s === 'strength' ? null : t[`${s}_km`]
            return (
              <li key={s} className="flex items-center gap-3 py-2.5 text-sm">
                <span className={`h-8 w-1 shrink-0 rounded-full ${SPORT_BG[s]}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{SPORT_LABEL[s]}</p>
                  {record && (
                    <p className="text-xs text-zinc-400">
                      Langste: {record.km ? `${fmtKm(record.km)} km` : formatSessionDuration(record.min)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="font-semibold text-white">{t[`${s}_min`] ? formatDuration(t[`${s}_min`]) : '–'}</p>
                  {km ? <p className="text-xs text-zinc-400">{fmtKm(km)} km</p> : null}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card title="Weekvolume · laatste 12 weken">
        <WeeklyChart workouts={chartItems} />
      </Card>

      {player.workouts ? (
        <SharedActivity player={player} workouts={player.workouts} />
      ) : (
        <Card title="Trainingen">
          <p className="text-sm text-zinc-500">
            {isMe
              ? 'Je deelt je losse trainingen niet. Zet "Trainingen delen op profiel" aan onderaan het leaderboard.'
              : `${player.display_name} deelt geen losse trainingen.`}
          </p>
        </Card>
      )}
    </>
  )
}

function SharedActivity({ player, workouts }: { player: PlayerProfile; workouts: NonNullable<PlayerProfile['workouts']> }) {
  const [showAll, setShowAll] = useState(false)
  // Weekdoelen zijn privé, dus die badge kan hier niet beoordeeld worden.
  const badges = useMemo(() => evaluateBadges(workouts, {}, player.planned_done).filter((r) => r.badge.id !== 'goals'), [workouts, player.planned_done])

  return (
    <>
      <BadgesGrid results={badges} />
      <Card title={`Trainingen · ${workouts.length}`}>
        <WorkoutList workouts={showAll ? workouts : workouts.slice(0, 10)} />
        {workouts.length > 10 && (
          <button onClick={() => setShowAll((v) => !v)} className={`mt-2 ${ghostButton}`}>
            {showAll ? 'Minder tonen' : `Alle ${workouts.length} tonen`}
          </button>
        )}
      </Card>
    </>
  )
}
