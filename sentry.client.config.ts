import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // Adjust tracesSampleRate down once you have real traffic
    tracesSampleRate: 0.1,
    // Capture session replay only on errors to keep costs low
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    environment: process.env.NODE_ENV,
    // Don't send PII by default — payroll data is sensitive
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip request bodies that may contain salary/payment data
      if (event.request) delete event.request.data
      return event
    },
  })
}
