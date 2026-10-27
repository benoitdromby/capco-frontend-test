import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  SelectField,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextField,
  Typography,
} from '@kyc/ui'

import styles from './applications.module.css'

export const reviewerApplicationStatuses = [
  'all',
  'draft',
  'submitted',
  'in-review',
  'approved',
  'rejected',
] as const
export type ReviewerApplicationStatus =
  (typeof reviewerApplicationStatuses)[number]
export interface ReviewerApplicationRow {
  id: string
  applicantName: string
  submittedAt: string | null
  status: Exclude<ReviewerApplicationStatus, 'all'>
}
export interface ReviewerApplicationsResult {
  summary: {
    pendingReview: number
    inProgress: number
    approvedThisMonth: number
  }
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  applications: ReviewerApplicationRow[]
}
export type ReviewerApplicationsResponse =
  | { kind: 'found'; result: ReviewerApplicationsResult }
  | { kind: 'denied' }
  | { kind: 'error' }

export function ReviewerApplicationsView({
  response,
  q,
  status,
  page,
  onSearch,
  onStatus,
  onPage,
}: {
  response: ReviewerApplicationsResponse
  q: string
  status: ReviewerApplicationStatus
  page: number
  onSearch: (value: string) => void
  onStatus: (value: ReviewerApplicationStatus) => void
  onPage: (value: number) => void
}) {
  if (response.kind === 'denied') {
    return (
      <main className={styles.root}>
        <Alert role="alert" severity="error">
          You do not have access to reviewer applications. Sign in with an
          authorized staff account.
        </Alert>
      </main>
    )
  }
  if (response.kind === 'error') {
    return (
      <main className={styles.root}>
        <Alert role="alert" severity="error">
          Applications could not be loaded. Please try again.
        </Alert>
      </main>
    )
  }
  const { result } = response
  const { pagination } = result
  const pageCount = Math.max(1, pagination.totalPages)
  const filteredApplications = result.applications.filter(
    (application) =>
      (status === 'all' || application.status === status) &&
      (!q ||
        `${application.applicantName} ${application.id}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  )

  return (
    <main className={styles.root}>
      <Box className={styles.header}>
        <Typography variant="subheading" className={styles.headerTitle}>
          KYC Workspace
        </Typography>
        <Typography component="span" className={styles.headerCurrent}>
          Applications
        </Typography>
      </Box>
      <Stack spacing={3} className={styles.content}>
        <Box>
          <h1 className={styles.title}>Applications</h1>
          <Typography className={styles.intro}>
            Review and track submitted applications.
          </Typography>
        </Box>
        <Box className={styles.metrics}>
          <Metric label="Pending review" value={result.summary.pendingReview} />
          <Metric label="In progress" value={result.summary.inProgress} />
          <Metric
            label="Approved this month"
            value={result.summary.approvedThisMonth}
          />
        </Box>
        {result.summary.pendingReview > 0 ? (
          <Alert severity="info">
            {result.summary.pendingReview} applications are pending review.
          </Alert>
        ) : null}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          className={styles.searchBar}
        >
          <TextField
            label="Search"
            placeholder="Applicant or ID"
            value={q}
            onChange={(event) => onSearch(event.target.value)}
            fullWidth
          />
          <Box className={styles.statusFilter}>
            <SelectField
              id="application-status"
              label="Status"
              value={status}
              onChange={(value) => onStatus(value as ReviewerApplicationStatus)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'in-review', label: 'In review' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </Box>
        </Stack>
        <section
          aria-labelledby="recent-applications-heading"
          aria-live="polite"
        >
          <h2 id="recent-applications-heading" className={styles.sectionTitle}>
            Recent applications
          </h2>
          {filteredApplications.length === 0 ? (
            <EmptyResults
              q={q}
              status={status}
              onClear={() => {
                onSearch('')
                onStatus('all')
              }}
            />
          ) : (
            <>
              <Box className={styles.tableViewport}>
                <Table
                  aria-label="Recent applications"
                  className={styles.table}
                >
                  <TableHead>
                    <TableHeaderCell id="applicant" isRowHeader>
                      Applicant
                    </TableHeaderCell>
                    <TableHeaderCell id="application-id">
                      Application ID
                    </TableHeaderCell>
                    <TableHeaderCell id="submitted">Submitted</TableHeaderCell>
                    <TableHeaderCell id="status">Status</TableHeaderCell>
                    <TableHeaderCell id="action">Action</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <DesktopApplicationRow
                        key={application.id}
                        application={application}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Stack
                spacing={1}
                className={styles.mobileRows}
                aria-label="Recent applications"
              >
                {filteredApplications.map((application) => (
                  <MobileApplicationRow
                    key={application.id}
                    application={application}
                  />
                ))}
              </Stack>
              <Stack direction="row" className={styles.pagination}>
                <Typography aria-live="polite">
                  Page {page + 1} of {pageCount}
                </Typography>
                <Stack direction="row" className={styles.paginationButtons}>
                  <Button
                    variant="secondary"
                    disabled={page <= 0}
                    aria-label="Previous page"
                    onClick={() => onPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={page + 1 >= pageCount}
                    aria-label="Next page"
                    onClick={() => onPage(page + 1)}
                  >
                    Next
                  </Button>
                </Stack>
              </Stack>
            </>
          )}
        </section>
        <Box
          component="nav"
          className={styles.bottomNav}
          aria-label="Reviewer navigation"
        >
          <Typography aria-current="page">Applications</Typography>
          <Typography>Profile</Typography>
        </Box>
      </Stack>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <Typography className={styles.metricLabel}>{label}</Typography>
        <Typography variant="heading" className={styles.metricValue}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function DesktopApplicationRow({
  application,
}: {
  application: ReviewerApplicationRow
}) {
  return (
    <TableRow id={application.id}>
      <TableCell>{application.applicantName}</TableCell>
      <TableCell>{application.id}</TableCell>
      <TableCell>{formatDate(application.submittedAt)}</TableCell>
      <TableCell>{statusLabel(application.status)}</TableCell>
      <TableCell>
        <a
          className={styles.view}
          href={`/reviewer/applications/${application.id}`}
        >
          View
        </a>
      </TableCell>
    </TableRow>
  )
}

function MobileApplicationRow({
  application,
}: {
  application: ReviewerApplicationRow
}) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={0.75}>
          <Typography className={styles.metricValue}>
            {application.applicantName}
          </Typography>
          <Typography variant="caption">
            Application ID: {application.id}
          </Typography>
          <Typography variant="caption">
            Submitted: {formatDate(application.submittedAt)}
          </Typography>
          <Typography variant="caption">
            Status: {statusLabel(application.status)}
          </Typography>
          <a
            className={styles.view}
            href={`/reviewer/applications/${application.id}`}
          >
            View application
          </a>
        </Stack>
      </CardContent>
    </Card>
  )
}

function EmptyResults({
  q,
  status,
  onClear,
}: {
  q: string
  status: ReviewerApplicationStatus
  onClear: () => void
}) {
  return (
    <Card>
      <CardContent>
        <Typography className={styles.emptyTitle}>
          No applications match these filters.
        </Typography>
        <Typography className={styles.emptyMessage}>
          {q ? `Search: “${q}”. ` : ''}
          {status !== 'all'
            ? `Status: ${statusLabel(status)}.`
            : 'Try a broader search or status.'}
        </Typography>
        <Button variant="secondary" onClick={onClear}>
          Clear search and status
        </Button>
      </CardContent>
    </Card>
  )
}

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(new Date(value))
    : 'Not submitted'
}

function statusLabel(status: ReviewerApplicationStatus): string {
  if (status === 'all') {
    return 'All statuses'
  }
  if (status === 'in-review') {
    return 'In review'
  }
  return status[0]!.toUpperCase() + status.slice(1)
}
