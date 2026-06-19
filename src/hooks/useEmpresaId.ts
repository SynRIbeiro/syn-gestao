import { EMPRESA_ID } from '@/lib/constants'

export type EmpresaIdError = 'network' | 'profile_not_found' | 'empresa_id_missing' | null

export function useEmpresaId() {
  return {
    empresaId: EMPRESA_ID,
    loading: false,
    errorType: null as EmpresaIdError,
  }
}
