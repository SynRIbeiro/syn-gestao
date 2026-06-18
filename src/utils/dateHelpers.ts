import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

export function formatDateBR(date: string | Date | dayjs.Dayjs): string {
  return dayjs(date).format('DD/MM/YYYY')
}

export function formatDateTimeBR(date: string | Date | dayjs.Dayjs): string {
  return dayjs(date).format('DD/MM/YYYY [às] HH:mm')
}

export function formatMonthYearBR(date: string | Date | dayjs.Dayjs): string {
  return dayjs(date).locale('pt-br').format('MMM/YYYY')
}

export function fromNowBR(date: string | Date | dayjs.Dayjs): string {
  return dayjs(date).locale('pt-br').fromNow()
}

export function daysUntil(date: string | Date | dayjs.Dayjs): number {
  return dayjs(date).diff(dayjs(), 'day')
}

export { dayjs }
