import type { BalancoPeriodo } from '@/types'

function buildPeriodo(
  id: string,
  label: string,
  ano: number,
  mes: number,
  a: { dinheiroCaixa: number; contasBancarias: number; contasReceber: number; equipamentos: number; outrosAtivos: number },
  p: { contasPagar: number; emprestimos: number; impostosPendentes: number; obrigacoesTrabalistas: number; outrosPassivos: number },
): BalancoPeriodo {
  const totalAtivos = a.dinheiroCaixa + a.contasBancarias + a.contasReceber + a.equipamentos + a.outrosAtivos
  const totalPassivos = p.contasPagar + p.emprestimos + p.impostosPendentes + p.obrigacoesTrabalistas + p.outrosPassivos
  return {
    id,
    label,
    ano,
    mes,
    ativos: { ...a, total: totalAtivos },
    passivos: { ...p, total: totalPassivos },
    patrimonioLiquido: totalAtivos - totalPassivos,
  }
}

export const mockBalancoPeriodos: BalancoPeriodo[] = [
  buildPeriodo(
    'jun2025', 'Junho/2025', 2025, 6,
    { dinheiroCaixa: 8_200, contasBancarias: 62_400, contasReceber: 21_500, equipamentos: 38_000, outrosAtivos: 5_800 },
    { contasPagar: 8_100, emprestimos: 42_000, impostosPendentes: 6_500, obrigacoesTrabalistas: 11_200, outrosPassivos: 2_800 },
  ),
  buildPeriodo(
    'dez2025', 'Dezembro/2025', 2025, 12,
    { dinheiroCaixa: 11_500, contasBancarias: 92_800, contasReceber: 27_400, equipamentos: 40_500, outrosAtivos: 7_200 },
    { contasPagar: 9_200, emprestimos: 38_000, impostosPendentes: 7_800, obrigacoesTrabalistas: 12_000, outrosPassivos: 3_100 },
  ),
  buildPeriodo(
    'mar2026', 'Março/2026', 2026, 3,
    { dinheiroCaixa: 13_200, contasBancarias: 110_500, contasReceber: 29_800, equipamentos: 41_000, outrosAtivos: 7_800 },
    { contasPagar: 9_500, emprestimos: 36_000, impostosPendentes: 8_000, obrigacoesTrabalistas: 12_200, outrosPassivos: 3_200 },
  ),
  buildPeriodo(
    'jun2026', 'Junho/2026', 2026, 6,
    { dinheiroCaixa: 15_000, contasBancarias: 136_460, contasReceber: 31_200, equipamentos: 42_000, outrosAtivos: 8_500 },
    { contasPagar: 9_870, emprestimos: 35_000, impostosPendentes: 8_250, obrigacoesTrabalistas: 12_400, outrosPassivos: 3_200 },
  ),
]
