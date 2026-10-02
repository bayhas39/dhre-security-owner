import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export function ProblemsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="n" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} />
        <Tooltip />
        <Bar dataKey="v" fill="#ef4444" radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DailyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={4} />
        <YAxis tick={{ fontSize: 9 }} />
        <Tooltip />
        <Bar isAnimationActive={false} dataKey="sites" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Sites" />
        <Bar isAnimationActive={false} dataKey="incidents" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Incidents" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MonthlyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} />
        <Tooltip />
        <Bar isAnimationActive={false} dataKey="sites" fill="#0ea5e9" radius={[2, 2, 0, 0]} name="Sites" />
        <Bar isAnimationActive={false} dataKey="accidents" fill="#ef4444" radius={[2, 2, 0, 0]} name="Accidents" />
      </BarChart>
    </ResponsiveContainer>
  )
}
