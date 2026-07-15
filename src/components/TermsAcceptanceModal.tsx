import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAppStore } from '../store/useStore'

export default function TermsAcceptanceModal() {
  const acceptTerms = useAppStore((s) => s.acceptTerms)
  const signOut = useAppStore((s) => s.signOut)
  const [checked, setChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleAccept() {
    if (!checked || submitting) return
    setSubmitting(true)
    try {
      await acceptTerms()
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-2.5 px-6 pt-6 pb-4 shrink-0">
          <ShieldCheck size={20} className="text-purple-300 light:text-purple-600 shrink-0" />
          <h2 className="text-lg font-bold text-white light:text-zinc-900">Termos de Uso e Privacidade</h2>
        </div>

        <div className="px-6 overflow-y-auto text-sm text-zinc-400 light:text-zinc-600 leading-relaxed flex flex-col gap-4">
          <p>
            Para usar o Flawless, você precisa ler e aceitar os termos abaixo. Isso é necessário porque o app trata
            dados pessoais seus (nome, e-mail, foto de perfil e o conteúdo que você cria).
          </p>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-300 light:text-zinc-700 mb-1.5">
              1. Quais dados coletamos
            </h3>
            <p>
              Nome, e-mail e senha (ou dados básicos do Google/Microsoft quando você entra por lá), foto de perfil
              (se você enviar uma) e todo o conteúdo que você cria no app: tarefas, subtarefas, comunidades,
              relatos de bug/melhoria e preferências de notificação. Se você ativar notificações push, também
              guardamos a inscrição do seu navegador para poder te enviar avisos.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-300 light:text-zinc-700 mb-1.5">
              2. Para que usamos
            </h3>
            <p>
              Só para fazer o app funcionar: autenticar seu login, mostrar suas tarefas e das comunidades das quais
              você participa, calcular rankings e pontuação, enviar notificações (in-app, push ou por e-mail, de
              acordo com suas preferências) e permitir que administradores de comunidade organizem o trabalho da
              equipe. Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-300 light:text-zinc-700 mb-1.5">
              3. O que fica visível para outras pessoas
            </h3>
            <p>
              Seu nome, foto e estatísticas de produtividade (tarefas concluídas, pontos, nível) ficam visíveis para
              membros das mesmas comunidades e no Ranking Geral da plataforma. O conteúdo de tarefas de comunidades
              das quais você não participa não é exibido a você, nem o seu a quem não participa das suas.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-300 light:text-zinc-700 mb-1.5">
              4. Seus direitos
            </h3>
            <p>
              Você pode editar seu nome e foto a qualquer momento pelo próprio perfil, e pode pedir a exclusão da
              sua conta e dos seus dados a qualquer momento pelo e-mail de contato abaixo. Seus dados ficam
              guardados enquanto sua conta existir.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-300 light:text-zinc-700 mb-1.5">
              5. Regras de uso
            </h3>
            <p>
              Não é permitido usar nomes ofensivos, assediar outros usuários ou usar o app para fins ilegais. O
              Flawless é fornecido "como está", sem garantia de disponibilidade contínua. Estes termos podem ser
              atualizados; se isso acontecer, pediremos seu aceite novamente.
            </p>
          </div>

          <p className="text-xs text-zinc-500">
            Dúvidas ou pedidos sobre seus dados: rafael.farialmeida@gmail.com
          </p>
        </div>

        <div className="px-6 py-5 flex flex-col gap-3 shrink-0">
          <label className="flex items-start gap-2.5 text-sm text-zinc-300 light:text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </label>
          <div className="flex gap-2">
            <button onClick={() => signOut()} className="btn-ghost flex-1">
              Sair
            </button>
            <button onClick={handleAccept} disabled={!checked || submitting} className="btn-primary flex-1 disabled:opacity-50">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : 'Aceitar e continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
