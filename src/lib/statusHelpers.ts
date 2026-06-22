export const isEntradaRealizada = (status: string): boolean => status === 'recebido'
export const isEntradaPrevista = (status: string): boolean => status === 'pendente' || status === 'atrasado'
export const isSaidaRealizada = (status: string): boolean => status === 'pago'
export const isSaidaPrevista = (status: string): boolean => status === 'pendente' || status === 'atrasado'
