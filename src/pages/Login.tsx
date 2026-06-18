import { Form, Input, Button, Card, Typography, Divider, Alert } from 'antd'
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text, Link } = Typography

export default function Login() {
  const navigate = useNavigate()

  const handleSubmit = (values: { email: string; password: string }) => {
    console.log('Login:', values)
    navigate('/dashboard')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1A1033 0%, #2D1B69 50%, #1A1033 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#7C3AED',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 24 }}>S</span>
          </div>
          <Title level={3} style={{ color: '#FFFFFF', margin: 0, fontWeight: 700 }}>
            Syn Gestão
          </Title>
          <Text style={{ color: '#A78BFA', fontSize: 14 }}>
            Sistema de gestão administrativo e financeiro
          </Text>
        </div>

        {/* Card de login */}
        <Card
          style={{
            borderRadius: 16,
            border: 'none',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
          styles={{ body: { padding: '32px 36px' } }}
        >
          <Title level={4} style={{ margin: '0 0 4px', fontWeight: 600 }}>
            Bem-vindo de volta
          </Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 24 }}>
            Acesse sua conta para continuar
          </Text>

          <Alert
            message="Ambiente de demonstração"
            description="Use qualquer e-mail e senha para acessar."
            type="info"
            showIcon
            style={{ marginBottom: 24, borderRadius: 8, fontSize: 13 }}
          />

          <Form
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            autoComplete="off"
          >
            <Form.Item
              label="E-mail"
              name="email"
              rules={[
                { required: true, message: 'Informe seu e-mail' },
                { type: 'email', message: 'E-mail inválido' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: SYN_COLORS.textSecondary }} />}
                placeholder="seu@email.com.br"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              label="Senha"
              name="password"
              rules={[{ required: true, message: 'Informe sua senha' }]}
              style={{ marginBottom: 8 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: SYN_COLORS.textSecondary }} />}
                placeholder="••••••••"
                size="large"
                style={{ borderRadius: 8 }}
                iconRender={(visible) =>
                  visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Link style={{ fontSize: 13 }}>Esqueci minha senha</Link>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 44,
                  background: SYN_COLORS.primary,
                }}
              >
                Entrar
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '24px 0' }} />

          <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
            Syn Gestão © 2026 — Todos os direitos reservados
          </Text>
        </Card>
      </div>
    </div>
  )
}
