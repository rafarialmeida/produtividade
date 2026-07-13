import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Briefcase, CheckSquare, Dices, Globe2, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useStore'

const STEPS = [
  {
    icon: Sparkles,
    color: 'text-purple-300',
    title: 'Bem-vindo(a) ao Flawless!',
    body: 'Aqui você organiza suas tarefas pessoais e de trabalho em um só lugar. Vamos mostrar rapidinho as principais áreas do app — leva menos de um minuto.',
  },
  {
    icon: CheckSquare,
    color: 'text-emerald-300',
    title: 'Tarefas, subtarefas e complexidade',
    body: 'Cada tarefa tem urgência e complexidade, e pode ter subtarefas com responsáveis próprios. Complexidade mais alta vale mais pontos — e pesa mais nos rankings.',
  },
  {
    icon: Briefcase,
    color: 'text-sky-300',
    title: 'Comunidades de Trabalho e Competição',
    body: 'Comunidades de Trabalho têm dashboard de equipe e XP de trabalho separado. Comunidades de Competição são só pra disputar ranking com amigos, sem misturar com seu desempenho profissional.',
  },
  {
    icon: Dices,
    color: 'text-amber-300',
    title: 'Tabuleiro, ranking e presença',
    body: 'Comunidades de Trabalho podem ativar um tabuleiro 3D: cada tarefa concluída sobe um degrau. Um ranking à parte pondera tarefas, subtarefas, complexidade, lead time e cycle time — os 3 primeiros ganham medalha. Você também vê quem está online no app.',
  },
  {
    icon: Globe2,
    color: 'text-rose-300',
    title: 'Muro Global',
    body: 'Suas tarefas pessoais entram no ranking geral da plataforma, e o Muro da Procrastinação mostra, sem dó, quem mais perdeu prazos. Bora começar?',
  },
]

export default function OnboardingTour({ onDismiss }: { onDismiss?: () => void }) {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  function finish() {
    completeOnboarding()
    onDismiss?.()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md relative">
        <button
          onClick={finish}
          className="absolute top-4 right-4 text-xs text-zinc-500 hover:text-white light:hover:text-zinc-900 transition-colors"
        >
          Pular
        </button>

        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 light:bg-black/[0.03] light:border-black/10 flex items-center justify-center ${current.color}`}>
            <current.icon size={26} />
          </div>
          <h2 className="text-lg font-bold text-white light:text-zinc-900">{current.title}</h2>
          <p className="text-sm text-zinc-400 light:text-zinc-600 leading-relaxed">{current.body}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-5">
          {STEPS.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-purple-400' : 'bg-white/15'}`} />
          ))}
        </div>

        <div className="flex items-center gap-2 px-6 pb-6">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="btn-ghost flex-1">
              Voltar
            </button>
          )}
          <button onClick={() => (isLast ? finish() : setStep((s) => s + 1))} className="btn-primary flex-1">
            {isLast ? 'Começar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
