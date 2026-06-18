import type { DREPeriodo, DRELinha } from '@/types'

function linha(
  receitaBruta: number,
  deducoesImpostos: number,
  custosServicos: number,
  despesasAdministrativas: number,
  despesasMarketing: number,
  outrasDespesas: number,
): DRELinha {
  const receitaLiquida = receitaBruta - deducoesImpostos
  const lucroBruto = receitaLiquida - custosServicos
  const despesasOperacionais = despesasAdministrativas + despesasMarketing + outrasDespesas
  const resultadoOperacional = lucroBruto - despesasOperacionais
  return {
    receitaBruta,
    deducoesImpostos,
    receitaLiquida,
    custosServicos,
    lucroBruto,
    despesasAdministrativas,
    despesasMarketing,
    outrasDespesas,
    despesasOperacionais,
    resultadoOperacional,
    lucroLiquido: resultadoOperacional,
  }
}

export const mockDREPeriodos: DREPeriodo[] = [
  // ── Mensal 2025 (para comparação) ─────────────────────────────────────────
  {
    id: 'jul2025', label: 'Julho/2025', tipo: 'mensal', sortKey: 202507,
    dados: linha(32_400, 3_240, 4_200, 6_900, 1_560, 1_000),
  },
  {
    id: 'ago2025', label: 'Agosto/2025', tipo: 'mensal', sortKey: 202508,
    dados: linha(30_800, 3_080, 3_900, 6_700, 1_450, 970),
  },
  {
    id: 'set2025', label: 'Setembro/2025', tipo: 'mensal', sortKey: 202509,
    dados: linha(34_500, 3_450, 4_100, 7_100, 1_600, 1_050),
  },
  {
    id: 'out2025', label: 'Outubro/2025', tipo: 'mensal', sortKey: 202510,
    dados: linha(33_900, 3_390, 4_050, 7_050, 1_580, 1_030),
  },
  {
    id: 'nov2025', label: 'Novembro/2025', tipo: 'mensal', sortKey: 202511,
    dados: linha(37_200, 3_720, 4_400, 7_600, 1_800, 1_180),
  },
  {
    id: 'dez2025', label: 'Dezembro/2025', tipo: 'mensal', sortKey: 202512,
    dados: linha(40_800, 4_080, 4_500, 8_200, 2_500, 1_920),
  },
  // ── Mensal 2026 ────────────────────────────────────────────────────────────
  {
    id: 'jan2026', label: 'Janeiro/2026', tipo: 'mensal', sortKey: 202601,
    dados: linha(31_200, 3_120, 4_350, 7_250, 1_740, 1_240),
  },
  {
    id: 'fev2026', label: 'Fevereiro/2026', tipo: 'mensal', sortKey: 202602,
    dados: linha(34_500, 3_450, 4_860, 8_100, 1_950, 1_340),
  },
  {
    id: 'mar2026', label: 'Março/2026', tipo: 'mensal', sortKey: 202603,
    dados: linha(39_450, 3_950, 4_740, 7_900, 1_900, 1_260),
  },
  {
    id: 'abr2026', label: 'Abril/2026', tipo: 'mensal', sortKey: 202604,
    dados: linha(33_100, 3_300, 5_130, 8_550, 2_050, 1_370),
  },
  {
    id: 'mai2026', label: 'Maio/2026', tipo: 'mensal', sortKey: 202605,
    dados: linha(42_500, 4_250, 5_070, 8_450, 2_030, 1_400),
  },
  {
    id: 'jun2026', label: 'Junho/2026', tipo: 'mensal', sortKey: 202606,
    dados: linha(47_600, 4_760, 5_500, 9_200, 2_200, 1_480),
  },
  // ── Trimestral 2025 ────────────────────────────────────────────────────────
  {
    id: 'q1-2025', label: '1º Trimestre/2025', tipo: 'trimestral', sortKey: 20251,
    dados: linha(82_000, 8_200, 11_000, 19_500, 4_200, 2_900),
  },
  {
    id: 'q2-2025', label: '2º Trimestre/2025', tipo: 'trimestral', sortKey: 20252,
    dados: linha(88_500, 8_850, 11_800, 21_000, 4_600, 3_150),
  },
  {
    id: 'q3-2025', label: '3º Trimestre/2025', tipo: 'trimestral', sortKey: 20253,
    dados: linha(97_100, 9_710, 12_250, 20_700, 4_610, 3_020),
  },
  {
    id: 'q4-2025', label: '4º Trimestre/2025', tipo: 'trimestral', sortKey: 20254,
    dados: linha(111_900, 11_190, 12_950, 22_850, 5_880, 4_130),
  },
  // ── Trimestral 2026 ────────────────────────────────────────────────────────
  {
    id: 'q1-2026', label: '1º Trimestre/2026', tipo: 'trimestral', sortKey: 20261,
    dados: linha(105_150, 10_520, 13_950, 23_250, 5_590, 3_840),
  },
  {
    id: 'q2-2026', label: '2º Trimestre/2026', tipo: 'trimestral', sortKey: 20262,
    dados: linha(123_200, 12_310, 15_700, 26_200, 6_280, 4_250),
  },
  // ── Anual ──────────────────────────────────────────────────────────────────
  {
    id: 'ano2025', label: '2025', tipo: 'anual', sortKey: 2025,
    dados: linha(379_500, 37_950, 48_000, 84_050, 19_390, 13_200),
  },
  {
    id: 'ano2026', label: '2026 (Jan–Jun)', tipo: 'anual', sortKey: 2026,
    dados: linha(228_350, 22_830, 29_650, 49_450, 11_870, 8_090),
  },
]
