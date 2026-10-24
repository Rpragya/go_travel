import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Traveller } from '@/lib/types'
import { useAuth } from '@/store/auth'

export function useSavedTravellers() {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: ['travellers'],
    queryFn: () => api.get<Traveller[]>('/auth/travellers/').then((r) => r.data),
    enabled: !!user,
  })
}
