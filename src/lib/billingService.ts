import { supabase } from './supabase'
import { EMPRESA_ID } from './constants'
import { dayjs } from '@/utils/dateHelpers'

export async function gerarCobrancaMensal(clienteIdFiltro?: string): Promise<void> {
  const now = dayjs()
  const inicioMes = now.startOf('month').format('YYYY-MM-DD')
  const fimMes = now.endOf('month').format('YYYY-MM-DD')
  const dataVencimento = now.date(10).format('YYYY-MM-DD')
  const mesReferencia = now.locale('pt-br').format('MMMM/YYYY').replace(/^\w/, c => c.toUpperCase())

  let query = supabase
    .from('clientes')
    .select('id, nome, valor_mensal')
    .eq('empresa_id', EMPRESA_ID)
    .eq('status', 'ativo')
    .gt('valor_mensal', 0)

  if (clienteIdFiltro) {
    query = query.eq('id', clienteIdFiltro)
  }

  const { data: clientes, error } = await query
  if (error || !clientes?.length) return

  const clienteIds = clientes.map(c => c.id)
  const { data: existentes } = await supabase
    .from('entradas')
    .select('cliente_id')
    .eq('empresa_id', EMPRESA_ID)
    .in('cliente_id', clienteIds)
    .eq('recorrente', true)
    .gte('data_vencimento', inicioMes)
    .lte('data_vencimento', fimMes)

  const comCobranca = new Set((existentes ?? []).map((e: any) => e.cliente_id as string))

  const novos = clientes
    .filter(c => !comCobranca.has(c.id))
    .map(c => ({
      empresa_id: EMPRESA_ID,
      cliente_id: c.id,
      servico_id: null,
      descricao: `Mensalidade ${c.nome} – ${mesReferencia}`,
      valor: Number(c.valor_mensal),
      data_vencimento: dataVencimento,
      data_recebimento: null,
      status: 'pendente',
      recorrente: true,
      periodicidade: 'mensal',
    }))

  if (novos.length > 0) {
    await supabase.from('entradas').insert(novos as any)
  }
}
