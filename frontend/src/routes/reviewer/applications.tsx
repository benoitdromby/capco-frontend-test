import { useState } from 'react'
import { href, useNavigate } from 'react-router'
import { z } from 'zod'

import { pageTitle } from '../-page-title'

import {
  reviewerApplicationStatuses,
  ReviewerApplicationsView,
  type ReviewerApplicationStatus,
} from './-applications-view'

import type { Route } from './+types/applications'

export const meta: Route.MetaFunction = () => [
  { title: pageTitle('Applications') },
]

const searchSchema = z.object({
  q: z.string().max(120).optional().catch(undefined),
  status: z.enum(reviewerApplicationStatuses).optional().catch(undefined),
  page: z.number().int().min(0).optional().catch(undefined),
})

export function parseReviewerApplicationsSearch(input: unknown) {
  const search = searchSchema.parse(input)
  return {
    q: search.q ?? '',
    status: search.status ?? 'all',
    page: search.page ?? 0,
  }
}

const reviewerFixture = {
  summary: { pendingReview: 8, inProgress: 1, approvedThisMonth: 2 },
  pagination: { page: 0, pageSize: 10, totalItems: 10, totalPages: 1 },
  applications: [
    {
      id: '00000000-0000-4000-8000-000000000011',
      applicantName: 'Ada Lovelace',
      submittedAt: '2026-09-20T10:00:00Z',
      status: 'submitted' as const,
    },
    {
      id: '00000000-0000-4000-8000-000000000012',
      applicantName: 'Grace Hopper',
      submittedAt: '2026-09-19T10:00:00Z',
      status: 'in-review' as const,
    },
    {
      id: '00000000-0000-4000-8000-000000000013',
      applicantName: 'Katherine Johnson',
      submittedAt: '2026-09-18T10:00:00Z',
      status: 'approved' as const,
    },
  ],
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const search = parseReviewerApplicationsSearch({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    page: searchParams.has('page')
      ? Number(searchParams.get('page'))
      : undefined,
  })
  return {
    ...search,
    response: { kind: 'found' as const, result: reviewerFixture },
  }
}

export default function ReviewerApplicationsPage({
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate()
  const { q, status, page, response } = loaderData
  const [searchValue, setSearchValue] = useState(q)
  // Adjusts local state while rendering rather than in an effect (React's
  // recommended pattern for "reset state when a prop changes"), so typing
  // stays instant via local state while a fresh `q` from the loader — e.g.
  // after browser back/forward — still takes over without an extra render.
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setSearchValue(q)
  }
  const updateSearch = (next: {
    q?: string
    status?: ReviewerApplicationStatus
    page?: number
  }) => {
    const search = new URLSearchParams({
      q: next.q !== undefined ? next.q : searchValue,
      status: next.status ?? status,
      page: String(next.page ?? page),
    })
    void navigate(`${href('/reviewer/applications')}?${search}`)
  }
  return (
    <ReviewerApplicationsView
      response={response}
      q={searchValue}
      status={status}
      page={page}
      onSearch={(value) => {
        setSearchValue(value)
        updateSearch({ q: value, page: 0 })
      }}
      onStatus={(value) => updateSearch({ status: value, page: 0 })}
      onPage={(value) => updateSearch({ page: value })}
    />
  )
}
