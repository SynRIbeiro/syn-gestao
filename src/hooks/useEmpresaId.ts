import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useEmpresaId() {
  const { user } = useAuth()
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setEmpresaId(null)
      setLoading(false)
      return
    }
    supabase
      .from('perfis')
      .select('empresa_id')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const row = data as unknown as { empresa_id: string | null }
          if (row.empresa_id) setEmpresaId(row.empresa_id)
        }
        setLoading(false)
      })
  }, [user])

  return { empresaId, loading }
}
