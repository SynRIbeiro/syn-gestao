import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type EmpresaIdError = 'network' | 'profile_not_found' | 'empresa_id_missing' | null

const isDev = import.meta.env.DEV

export function useEmpresaId() {
  const { user, loading: authLoading } = useAuth()
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorType, setErrorType] = useState<EmpresaIdError>(null)

  useEffect(() => {
    // Aguarda autenticação terminar antes de consultar o perfil
    if (authLoading) {
      setLoading(true)
      return
    }
    if (!user) {
      setEmpresaId(null)
      setErrorType(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorType(null)

    supabase
      .from('perfis')
      .select('empresa_id')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          if (isDev) console.error('[useEmpresaId] Erro de rede ao buscar perfil:', error.message, '| code:', error.code)
          setErrorType('network')
          setEmpresaId(null)
        } else if (!data) {
          if (isDev) console.warn('[useEmpresaId] Perfil não encontrado para user_id:', user.id)
          setErrorType('profile_not_found')
          setEmpresaId(null)
        } else {
          const row = data as { empresa_id: string | null }
          if (!row.empresa_id) {
            if (isDev) console.warn('[useEmpresaId] empresa_id ausente no perfil do user_id:', user.id)
            setErrorType('empresa_id_missing')
            setEmpresaId(null)
          } else {
            if (isDev) console.log('[useEmpresaId] empresa_id carregado com sucesso:', row.empresa_id)
            setEmpresaId(row.empresa_id)
            setErrorType(null)
          }
        }
        setLoading(false)
      })
  }, [user, authLoading])

  return { empresaId, loading, errorType }
}
