'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, CalendarCheck, Tag, FileText, LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Users,
  CalendarCheck,
  Tag,
  FileText,
}

interface Card {
  label: string
  value: string | number
  sub: string
  icon: 'Users' | 'CalendarCheck' | 'Tag' | 'FileText'
  color: string
  href: string
}

interface Props {
  cards: Card[]
  quickActions: { label: string; href: string }[]
}

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  green:  'bg-green-50 text-green-600',
  amber:  'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
}

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const actionVariant = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export default function DashboardCards({ cards, quickActions }: Props) {
  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((card) => {
          const Icon = iconMap[card.icon]
          return (
            <motion.div key={card.label} variants={cardVariant}>
              <Link
                href={card.href}
                className="group block rounded-xl border bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${colorMap[card.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {quickActions.map((action) => (
            <motion.div key={action.label} variants={actionVariant}>
              <Link
                href={action.href}
                className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all text-center"
              >
                {action.label}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  )
}
