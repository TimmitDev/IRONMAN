import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { BadgesGrid } from '../components/Badges'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { FollowButton } from '../components/FollowButton'
import { Icon } from '../components/Icon'
import { Stat } from '../components/Stat'
import { WeeklyChart } from '../components/WeeklyChart'
import { WorkoutList } from '../components/WorkoutList'
import { evaluateBadges } from '../lib/badges'
import { compliance, formatIronman, ironmanFraction } from '../lib/leaderboard'
import { usePlayerProfile, type PlayerProfile } from '../lib/players'
import { useOnline } from '../lib/presence'
import { useMe } from '../lib/profile'
import { useSharedFollows } from '../lib/follows'
import { RACE_TYPES, formatDuration, formatSessionDuration, formatShortDate, parseISODate } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL } from '../lib/types'
import { ghostButton, linkClass, pillClass } from '../lib/ui'

const fmtKm = (km: number) => (Math.round(km * 10) / 10).toLocaleString('nl-BE')

export function Player() {
  const { userId } = useParams()
  const { me } = useMe()
  const { player, loading, error } = usePlayerProfile(userId!)

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      <Link to="/leaderboard" className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 text-sm font-medium text-fg-3 transition hover:text-fg">
        <Icon name="chevron-left" className="size-4" />
        Leaderboard
      </Link>
      {loading ? (
        <p className="text-sm text-fg-3">Laden…</p>
      ) : (
        <>
          {error && <p className="text-sm text-danger">{error}</p>}
          {!player && !error && (
            <Card>
              <EmptyState icon="user" title="Speler niet gevonden">
                Deze speler bestaat niet of staat niet op het leaderboard.
              </EmptyState>
            </Card>
          )}
          {player && <PlayerView player={player} meId={me.id} />}
        </>
      )}
    </div>
  )
}

function PlayerView({ player, meId }: { player: PlayerProfile; meId: string }) {
  const isMe = player.id === meId
  const follows = useSharedFollows()
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={player.display_name} size="xl" highlight={isMe} online={online} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{player.display_name}</h1>
              {isMe && <span className={pillClass}>jij</span>}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-3">
              <span className={`size-1.5 rounded-full ${online ? 'bg-success' : 'bg-line-strong'}`} aria-hidden />
              {online ? 'Nu online' : 'Offline'}
            </p>
            <p className="mt-1 text-sm text-fg-3">
              {t.first_date ? `Traint sinds ${formatShortDate(t.first_date)} · laatste training ${formatShortDate(t.last_date!)}` : 'Nog geen trainingen gelogd.'}
            </p>
            {player.race && (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-fg-2">
                <Icon name="flag" className="size-4 shrink-0 text-fg-4" />
                <span className="min-w-0">
                  Traint voor <span className="font-medium text-fg">{player.race.name}</span> ·{' '}
                  {parseISODate(player.race.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {RACE_TYPES[player.race.type] ? ` · ${RACE_TYPES[player.race.type].label}` : ''}
                </span>
              </p>
            )}
          </div>
          {!isMe && !follows.loading && (
            <div className="shrink-0">
              <FollowButton person={{ user_id: player.id, display_name: player.display_name }} follows={follows} />
            </div>
          )}
        </div>
        {isMe && (
          <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-sm text-fg-3">
            <Icon name="eye" className="mt-0.5 size-4 shrink-0 text-fg-4" />
            <span>
              Zo zien anderen je profiel. Delen pas je aan in{' '}
              <Link to="/instellingen" className={linkClass}>
                Instellingen
              </Link>
              .
            </span>
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-6 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
          {stats.map((s, i) => (
            <div key={s.label} className={i === stats.length - 1 ? 'col-span-2 sm:col-span-1' : ''}>
              <Stat label={s.label} value={s.value} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <Card title="Per sport">
          <ul className="-my-3 divide-y divide-line">
            {SPORTS.map((s) => {
              const record = player.records[s]
              const km = s === 'strength' ? null : t[`${s}_km`]
              const min = t[`${s}_min`] ?? 0
              return (
                <li key={s} className="flex items-center gap-3 py-3 text-sm">
                  <span className={`size-2 shrink-0 rounded-full ${SPORT_BG[s]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg">{SPORT_LABEL[s]}</p>
                    {record && <p className="text-xs text-fg-3">Langste: {record.km ? `${fmtKm(record.km)} km` : formatSessionDuration(record.min)}</p>}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="font-medium text-fg">{min ? formatDuration(min) : '–'}</p>
                    {km ? <p className="text-xs text-fg-3">{fmtKm(km)} km</p> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="Weekvolume" description="Laatste 12 weken">
          <WeeklyChart workouts={chartItems} />
        </Card>
      </div>

      {player.workouts ? (
        <SharedActivity player={player} workouts={player.workouts} />
      ) : (
        <Card title="Trainingen">
          {isMe ? (
            <EmptyState
              icon="lock"
              title="Je deelt je losse trainingen niet"
              action={
                <Link to="/instellingen" className={linkClass}>
                  Delen aanzetten in Instellingen
                </Link>
              }
            >
              Zet "Trainingen delen" aan om ze hier en in de feed te tonen.
            </EmptyState>
          ) : (
            <EmptyState icon="lock" title="Trainingen zijn privé">
              {player.display_name} deelt geen losse trainingen.
            </EmptyState>
          )}
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
      <Card title="Trainingen" action={<span className="text-sm text-fg-3 tabular-nums">{workouts.length}</span>}>
        <WorkoutList workouts={showAll ? workouts : workouts.slice(0, 10)} />
        {workouts.length > 10 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className={`mt-3 w-full ${ghostButton}`}>
            {showAll ? 'Minder tonen' : `Alle ${workouts.length} tonen`}
          </button>
        )}
      </Card>
    </>
  )
}
