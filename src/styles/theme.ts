import type { ThemeConfig } from 'antd'

export const synTheme: ThemeConfig = {
  token: {
    colorPrimary: '#7C3AED',
    colorInfo: '#7C3AED',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorTextBase: '#1F2937',
    colorBgBase: '#F9FAFB',
    borderRadius: 8,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: 14,
    colorLink: '#7C3AED',
    colorLinkHover: '#5B21B6',
  },
  components: {
    Layout: {
      siderBg: '#1A1033',
      headerBg: '#FFFFFF',
      bodyBg: '#F3F4F6',
    },
    Menu: {
      darkItemBg: '#1A1033',
      darkItemColor: '#C4B5FD',
      darkItemHoverBg: '#2D1B69',
      darkItemHoverColor: '#FFFFFF',
      darkItemSelectedBg: '#7C3AED',
      darkItemSelectedColor: '#FFFFFF',
      darkSubMenuItemBg: '#150D2A',
    },
    Card: {
      borderRadiusLG: 12,
    },
    Button: {
      borderRadius: 8,
    },
    Table: {
      borderRadius: 12,
    },
  },
}

export const SYN_COLORS = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  primaryDark: '#5B21B6',
  sidebarBg: '#1A1033',
  sidebarText: '#C4B5FD',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  bgPage: '#F3F4F6',
  bgCard: '#FFFFFF',
  border: '#E5E7EB',
}
