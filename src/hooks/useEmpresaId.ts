export type EmpresaIdError = 'network' | 'profile_not_found' | 'empresa_id_missing' | null

const EMPRESA_ID = '6ec7e12f-a267-4dd4-b53a-8c8ccbae90d7'

export function useEmpresaId() {
  return {
    empresaId: EMPRESA_ID,
    loading: false,
    errorType: null as EmpresaIdError,
  }
}
