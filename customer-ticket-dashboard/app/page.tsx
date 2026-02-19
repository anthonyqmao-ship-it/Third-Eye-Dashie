"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  CheckCircle2,
  Clock,
  Crown,
  TrendingUp,
  Sparkles,
  SmilePlus,
  HelpCircle,
  Flame,
  ChevronUp,
  Minus,
  Heart,
  Briefcase,
  MapPin,
  Users,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { useTickets } from "@/hooks/use-tickets"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardSkeleton } from "@/components/skeletons"
import { cn } from "@/lib/utils"
import {
  formatTimeAgo,
  getSentimentStyle,
  getEmotionalToneStyle,
} from "@/lib/tag-styles"
import type { Ticket, EmotionalTone } from "@/lib/types"

/* ── helpers ─────────────────────────────────────────────────── */

function hasPriority(t: Ticket, p: string) {
  return (t.tags ?? []).some(
    (tg) => tg.category === "priority" && tg.value === p
  )
}
function isNeedsAttention(t: Ticket) {
  return (
    t.sentiment === "negative" ||
    t.emotional_tone === "angry" ||
    t.emotional_tone === "frustrated" ||
    hasPriority(t, "urgent") ||
    hasPriority(t, "high")
  )
}
function isPositiveFeedback(t: Ticket) {
  return (
    t.emotional_tone === "happy" || t.emotional_tone === "delighted"
  )
}
function isNeutralInquiry(t: Ticket) {
  return t.emotional_tone === "neutral" && t.sentiment !== "negative"
}
function hasDemoValue(t: Ticket, field: keyof NonNullable<Ticket["demographics"]>) {
  const d = t.demographics?.[field]
  return d?.value != null && d.value !== "" && d.confidence > 0
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

/** Urgency score for sorting: angry=4, frustrated=3, neutral=2, happy=1, delighted=0 */
const URGENCY_SCORE: Record<EmotionalTone, number> = {
  angry: 4,
  frustrated: 3,
  neutral: 2,
  happy: 1,
  delighted: 0,
}

function sortByUrgency(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const ua = URGENCY_SCORE[a.emotional_tone ?? "neutral"] ?? 2
    const ub = URGENCY_SCORE[b.emotional_tone ?? "neutral"] ?? 2
    if (ub !== ua) return ub - ua // highest urgency first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest first
  })
}

/* ── accent colors for left border ──────────────────────────── */

const TONE_ACCENT: Record<string, string> = {
  angry: "border-l-rose-500",
  frustrated: "border-l-orange-400",
  neutral: "border-l-border",
  happy: "border-l-amber-300",
  delighted: "border-l-emerald-400",
}

/* ── tiny ticket row ─────────────────────────────────────────── */

function TicketRow({
  ticket,
  showVip,
}: {
  ticket: Ticket
  showVip?: boolean
}) {
  const tone = ticket.emotional_tone ?? "neutral"
  const accentClass = TONE_ACCENT[tone] ?? "border-l-border"
  const today = isToday(ticket.created_at)

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className={cn(
        "flex items-start gap-3 px-3.5 py-2.5 rounded-lg border-l-[3px] hover:bg-accent/50 transition-all duration-150 group",
        accentClass
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {today && (
            <span className="relative flex h-2 w-2 shrink-0" title="New today">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          {showVip && ticket.is_vip && (
            <Crown className="h-3 w-3 text-amber-500 shrink-0" />
          )}
          <p className="text-[13px] font-medium text-foreground truncate leading-snug group-hover:text-foreground/80 transition-colors">
            {ticket.title}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
          {ticket.customer_name} · {formatTimeAgo(ticket.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {ticket.emotional_tone && ticket.emotional_tone !== "neutral" && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-1.5 rounded-full font-medium capitalize",
              getEmotionalToneStyle(ticket.emotional_tone)
            )}
          >
            {ticket.emotional_tone}
          </Badge>
        )}
        {ticket.sentiment && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-1.5 rounded-full font-medium capitalize",
              getSentimentStyle(ticket.sentiment)
            )}
          >
            {ticket.sentiment}
          </Badge>
        )}
      </div>
    </Link>
  )
}

/* ── section header ──────────────────────────────────────────── */

function SectionHeader({
  icon,
  title,
  count,
  iconClass,
  link,
}: {
  icon: React.ReactNode
  title: string
  count: number
  iconClass?: string
  link?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg", iconClass)}>{icon}</div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground/60 tabular-nums">
          {count}
        </span>
      </div>
      {link && (
        <Link
          href={link}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

/* ── clickable stat pill ─────────────────────────────────────── */

function StatPill({
  icon,
  label,
  value,
  accent,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: string
  href?: string
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-2.5 min-w-0",
        href &&
          "cursor-pointer group/pill rounded-xl px-2 py-1.5 -mx-2 -my-1.5 transition-colors hover:bg-accent/40"
      )}
    >
      <div
        className={cn(
          "p-1.5 rounded-lg shrink-0 transition-transform",
          accent ?? "bg-secondary",
          href && "group-hover/pill:scale-105"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums leading-none text-foreground">
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-none truncate">
          {label}
        </p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

/* ── ticket section with cap + overflow ──────────────────────── */

const MAX_VISIBLE = 4

function TicketSection({
  tickets,
  emptyText,
  showVip,
  overflowLink,
}: {
  tickets: Ticket[]
  emptyText: string
  showVip?: boolean
  overflowLink?: string
}) {
  const visible = tickets.slice(0, MAX_VISIBLE)
  const overflow = tickets.length - MAX_VISIBLE

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-1.5">
        <CheckCircle2 className="h-5 w-5 text-emerald-400/60" />
        <p className="text-xs text-muted-foreground/60 italic">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((t) => (
        <TicketRow key={t.id} ticket={t} showVip={showVip} />
      ))}
      {overflow > 0 && overflowLink && (
        <Link
          href={overflowLink}
          className="flex items-center justify-center gap-1 py-2 mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/30"
        >
          +{overflow} more <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

/* ── bottom insight cards ─────────────────────────────────────── */

type InsightCard = {
  key: string
  label: string
  icon: React.ReactNode
  style: string
  hover: string
  filter: (t: Ticket) => boolean
  href: string
}

const insightCards: InsightCard[] = [
  {
    key: "urgent",
    label: "Urgent",
    icon: <Flame className="h-4 w-4" />,
    style: "text-rose-700 border-rose-200/50",
    hover: "hover:bg-rose-50 hover:border-rose-200",
    filter: (t) => hasPriority(t, "urgent"),
    href: "/tickets?sentiment=negative",
  },
  {
    key: "high",
    label: "High Priority",
    icon: <ChevronUp className="h-4 w-4" />,
    style: "text-orange-700 border-orange-200/50",
    hover: "hover:bg-orange-50 hover:border-orange-200",
    filter: (t) => hasPriority(t, "high"),
    href: "/tickets?sentiment=negative",
  },
  {
    key: "normal",
    label: "Normal",
    icon: <Minus className="h-4 w-4" />,
    style: "text-slate-600 border-slate-200/50",
    hover: "hover:bg-slate-50 hover:border-slate-200",
    filter: (t) => hasPriority(t, "normal"),
    href: "/tickets",
  },
  {
    key: "health",
    label: "Health-Related",
    icon: <Heart className="h-4 w-4" />,
    style: "text-pink-600 border-pink-200/50",
    hover: "hover:bg-pink-50 hover:border-pink-200",
    filter: (t) => hasDemoValue(t, "health_conditions"),
    href: "/tickets",
  },
  {
    key: "professional",
    label: "Professional",
    icon: <Briefcase className="h-4 w-4" />,
    style: "text-indigo-600 border-indigo-200/50",
    hover: "hover:bg-indigo-50 hover:border-indigo-200",
    filter: (t) => hasDemoValue(t, "occupation"),
    href: "/tickets",
  },
  {
    key: "regional",
    label: "Regional",
    icon: <MapPin className="h-4 w-4" />,
    style: "text-teal-600 border-teal-200/50",
    hover: "hover:bg-teal-50 hover:border-teal-200",
    filter: (t) => hasDemoValue(t, "location"),
    href: "/tickets",
  },
  {
    key: "family",
    label: "Family",
    icon: <Users className="h-4 w-4" />,
    style: "text-amber-700 border-amber-200/50",
    hover: "hover:bg-amber-50 hover:border-amber-200",
    filter: (t) => hasDemoValue(t, "family_status"),
    href: "/tickets",
  },
]

/* ── chart colors ────────────────────────────────────────────── */

const EMOTION_COLORS: Record<string, string> = {
  Angry: "#dc2626",
  Frustrated: "#ea580c",
  Neutral: "#a3a3a3",
  Happy: "#eab308",
  Delighted: "#16a34a",
}

/* ── page ────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { tickets, loading, error, refetch } = useTickets()

  const data = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "closed")
    const closed = tickets.filter((t) => t.status === "closed")

    // Three main columns
    const needsAttention = sortByUrgency(
      tickets.filter((t) => isNeedsAttention(t) && t.status !== "closed")
    )
    const positiveFeedback = [...tickets.filter((t) => isPositiveFeedback(t) && t.status !== "closed")]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const neutralInquiries = [...tickets.filter((t) => isNeutralInquiry(t) && t.status !== "closed")]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const inProgress = tickets.filter((t) => t.status === "in_progress")
    const today = tickets.filter((t) => isToday(t.created_at))

    // emotion data
    const eCounts = {
      Angry: 0,
      Frustrated: 0,
      Neutral: 0,
      Happy: 0,
      Delighted: 0,
    }
    for (const t of tickets) {
      if (t.emotional_tone === "angry") eCounts.Angry++
      else if (t.emotional_tone === "frustrated") eCounts.Frustrated++
      else if (t.emotional_tone === "happy") eCounts.Happy++
      else if (t.emotional_tone === "delighted") eCounts.Delighted++
      else eCounts.Neutral++
    }
    const eData = Object.entries(eCounts)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)

    // avg confidence
    const avgConf =
      tickets.length > 0
        ? tickets.reduce((s, t) => s + (t.confidence ?? 0), 0) / tickets.length
        : 0

    // resolution rate
    const resolutionRate =
      tickets.length > 0 ? closed.length / tickets.length : 0

    // insight cards — count by filter
    const insights: Record<string, { count: number; latest: Ticket | null }> = {}
    for (const card of insightCards) {
      const matched = tickets.filter(
        (t) => card.filter(t) && t.status !== "closed"
      )
      insights[card.key] = {
        count: matched.length,
        latest:
          matched.length > 0
            ? matched.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )[0]
            : null,
      }
    }

    return {
      total: tickets.length,
      openCount: open.length,
      closedCount: closed.length,
      inProgressCount: inProgress.length,
      todayCount: today.length,
      resolutionRate,
      needsAttention,
      positiveFeedback,
      neutralInquiries,
      insights,
      emotionData: eData,
      avgConf,
    }
  }, [tickets])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/tickets"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 pb-0.5"
        >
          View all tickets <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-amber-800">
            Unable to reach the API — showing cached data.
          </p>
          <button
            onClick={refetch}
            className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── At a Glance ─────────────────────────────────────── */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-7 px-7">
          <div className="flex items-center gap-8 flex-wrap">
            {/* Stats row — all clickable */}
            <div className="flex items-center gap-5 flex-wrap flex-1 min-w-0">
              <StatPill
                icon={<Inbox className="h-4 w-4 text-foreground/70" />}
                label="Open"
                value={data.openCount}
                accent="bg-primary/10"
                href="/tickets?status=open"
              />

              <div className="h-8 w-px bg-border/40 shrink-0 hidden sm:block" />

              <StatPill
                icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
                label="Needs Attention"
                value={data.needsAttention.length}
                accent="bg-rose-50"
                href="/tickets?sentiment=negative"
              />

              <StatPill
                icon={<SmilePlus className="h-4 w-4 text-emerald-600" />}
                label="Positive"
                value={data.positiveFeedback.length}
                accent="bg-emerald-50"
                href="/tickets?sentiment=positive"
              />

              <StatPill
                icon={<HelpCircle className="h-4 w-4 text-sky-600" />}
                label="Inquiries"
                value={data.neutralInquiries.length}
                accent="bg-sky-50"
                href="/tickets?sentiment=neutral"
              />

              <div className="h-8 w-px bg-border/40 shrink-0 hidden sm:block" />

              <StatPill
                icon={<Clock className="h-4 w-4 text-blue-600" />}
                label="In Progress"
                value={data.inProgressCount}
                accent="bg-blue-50"
                href="/tickets?status=in_progress"
              />

              <StatPill
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                label="Resolved"
                value={data.closedCount}
                accent="bg-emerald-50"
                href="/tickets?status=closed"
              />
            </div>

            {/* Emotion ring + inline legend (compact) */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-[72px] h-[72px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.emotionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={34}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {data.emotionData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={EMOTION_COLORS[entry.name]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-0.5">
                {data.emotionData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center gap-1.5 text-[10px] leading-tight"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: EMOTION_COLORS[d.name] }}
                    />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom metrics row */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/30 flex-wrap">
            {/* AI Confidence */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="h-3.5 w-3.5 text-primary/50 shrink-0" />
              <span className="text-[11px] text-muted-foreground/70 shrink-0">
                AI Confidence
              </span>
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-primary/50 transition-all duration-500"
                  style={{ width: `${data.avgConf * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-medium text-foreground tabular-nums">
                {(data.avgConf * 100).toFixed(0)}%
              </span>
            </div>

            <div className="h-3 w-px bg-border/40 shrink-0 hidden sm:block" />

            {/* Resolution Rate */}
            <div className="flex items-center gap-2.5 min-w-0">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
              <span className="text-[11px] text-muted-foreground/70 shrink-0">
                Resolution Rate
              </span>
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-emerald-500/50 transition-all duration-500"
                  style={{ width: `${data.resolutionRate * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-medium text-foreground tabular-nums">
                {(data.resolutionRate * 100).toFixed(0)}%
              </span>
            </div>

            {data.todayCount > 0 && (
              <>
                <div className="h-3 w-px bg-border/40 shrink-0 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">
                    <span className="font-medium text-foreground">
                      {data.todayCount}
                    </span>{" "}
                    new today
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Three columns: Needs Attention | Positive Feedback | Neutral Inquiries ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Needs Attention */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="pb-2 pt-4 px-4">
            <SectionHeader
              icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
              title="Needs Attention"
              count={data.needsAttention.length}
              iconClass="bg-rose-50"
              link="/tickets?sentiment=negative"
            />
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0 flex-1">
            <TicketSection
              tickets={data.needsAttention}
              emptyText="All clear — no urgent tickets"
              overflowLink="/tickets?sentiment=negative"
            />
          </CardContent>
        </Card>

        {/* Positive Feedback */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="pb-2 pt-4 px-4">
            <SectionHeader
              icon={<SmilePlus className="h-4 w-4 text-emerald-600" />}
              title="Positive Feedback"
              count={data.positiveFeedback.length}
              iconClass="bg-emerald-50"
              link="/tickets?sentiment=positive"
            />
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0 flex-1">
            <TicketSection
              tickets={data.positiveFeedback}
              emptyText="No positive feedback yet"
              overflowLink="/tickets?sentiment=positive"
            />
          </CardContent>
        </Card>

        {/* Neutral Inquiries */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="pb-2 pt-4 px-4">
            <SectionHeader
              icon={<HelpCircle className="h-4 w-4 text-sky-600" />}
              title="Neutral Inquiries"
              count={data.neutralInquiries.length}
              iconClass="bg-sky-50"
              link="/tickets?sentiment=neutral"
            />
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0 flex-1">
            <TicketSection
              tickets={data.neutralInquiries}
              emptyText="No neutral inquiries"
              overflowLink="/tickets?sentiment=neutral"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom — Other categories ─────────────────────── */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Other Categories
              </h3>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Browse by topic
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {insightCards.map((card) => {
              const insight = data.insights[card.key]
              const count = insight?.count ?? 0
              const latest = insight?.latest ?? null
              const isEmpty = count === 0
              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className={cn(
                    "group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card transition-all duration-200",
                    isEmpty
                      ? "opacity-40 cursor-default pointer-events-none border-border/30"
                      : cn(
                          "hover:shadow-md hover:-translate-y-0.5",
                          card.style,
                          card.hover
                        )
                  )}
                >
                  <div className="flex items-center gap-1.5 transition-transform group-hover:scale-105">
                    {card.icon}
                    <span className="text-xs font-medium">{card.label}</span>
                  </div>
                  <span className="text-xl font-bold tabular-nums">
                    {count}
                  </span>
                  {latest && (
                    <p className="text-[10px] text-muted-foreground/60 truncate max-w-full text-center leading-tight mt-0.5">
                      {latest.title}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
