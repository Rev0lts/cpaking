export const brand = {
  name: 'CPAKing',
  tagline: 'Controle total das suas campanhas CPA',
  user: {
    name: 'João Dias',
    role: 'Administrador',
    initials: 'JD',
  },
}

export const stats = [
  {
    label: 'Receita Total',
    value: 'R$ 128.450',
    change: '+12.5%',
    positive: true,
    color: '#10b981',
  },
  {
    label: 'Conversões',
    value: '3.842',
    change: '+8.2%',
    positive: true,
    color: '#22c55e',
  },
  {
    label: 'Cliques',
    value: '89.2K',
    change: '+15.3%',
    positive: true,
    color: '#38bdf8',
  },
  {
    label: 'ROI Médio',
    value: '245%',
    change: '-2.1%',
    positive: false,
    color: '#f59e0b',
  },
]

export const revenueData = [
  { month: 'Jan', receita: 42000 },
  { month: 'Fev', receita: 38000 },
  { month: 'Mar', receita: 55000 },
  { month: 'Abr', receita: 48000 },
  { month: 'Mai', receita: 72000 },
  { month: 'Jun', receita: 68000 },
  { month: 'Jul', receita: 85000 },
  { month: 'Ago', receita: 92000 },
  { month: 'Set', receita: 78000 },
  { month: 'Out', receita: 105000 },
  { month: 'Nov', receita: 118000 },
  { month: 'Dez', receita: 128450 },
]

export const performance = {
  goalPercent: 78,
  metrics: [
    { label: 'Taxa de Conversão', value: '4.3%' },
    { label: 'CPC Médio', value: 'R$ 0,82' },
    { label: 'CPA Médio', value: 'R$ 12,40' },
  ],
}

export const campaigns = [
  { name: 'Black Friday 2025', status: 'active', clicks: '12.4K', conv: '842', revenue: 'R$ 28.450', roi: '312%' },
  { name: 'App Install - iOS', status: 'active', clicks: '8.9K', conv: '521', revenue: 'R$ 15.200', roi: '198%' },
  { name: 'Lead Gen - Finanças', status: 'paused', clicks: '5.2K', conv: '310', revenue: 'R$ 9.800', roi: '156%' },
  { name: 'E-commerce BR', status: 'active', clicks: '22.1K', conv: '1.240', revenue: 'R$ 42.100', roi: '278%' },
  { name: 'Survey Rewards', status: 'ended', clicks: '3.8K', conv: '189', revenue: 'R$ 4.200', roi: '89%' },
]

export const activities = [
  {
    type: 'conversion',
    title: 'Nova conversão registrada',
    desc: 'Campanha Black Friday 2025 — R$ 45,00',
    time: '2 min atrás',
  },
  {
    type: 'affiliate',
    title: 'Novo afiliado aprovado',
    desc: 'Maria Silva entrou no programa',
    time: '15 min atrás',
  },
  {
    type: 'alert',
    title: 'Orçamento atingindo limite',
    desc: 'App Install - iOS em 85% do budget',
    time: '1h atrás',
  },
  {
    type: 'approved',
    title: 'Campanha aprovada',
    desc: 'E-commerce BR liberada para veiculação',
    time: '3h atrás',
  },
  {
    type: 'milestone',
    title: 'Meta diária atingida',
    desc: '150 conversões hoje — recorde!',
    time: '5h atrás',
  },
]
