import { SettingOutlined } from '@ant-design/icons'
import PagePlaceholder from '@/components/common/PagePlaceholder'

export default function Configuracoes() {
  return (
    <PagePlaceholder
      title="Configurações"
      description="Configurações do sistema, perfil e integrações"
      icon={<SettingOutlined />}
    />
  )
}
