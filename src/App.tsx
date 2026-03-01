import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Calendar, 
  ShieldAlert, 
  Quote, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  Sun,
  Moon,
  Lock,
  Star
} from 'lucide-react';
import { User, Day, Prayer, Checklist } from './types';

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'gold';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-zinc-800 hover:bg-zinc-700 text-white',
    secondary: 'bg-white text-black hover:bg-zinc-200',
    outline: 'border border-white/20 hover:bg-white/10 text-white',
    gold: 'gold-gradient text-white shadow-lg shadow-gold-600/20 hover:opacity-90'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const percentage = Math.min((current / total) * 100, 100);
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className="h-full gold-gradient"
      />
    </div>
  );
};

// --- Pages ---

const LoginPage = ({ onLogin }: { onLogin: (email: string) => void }) => {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic gold-text">Virada Espiritual</h1>
          <p className="text-zinc-400">Sua jornada de 30 dias com Deus começa aqui.</p>
        </div>

        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Seu melhor e-mail"
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-gold-500 transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button 
            variant="gold" 
            className="w-full py-4 text-lg"
            onClick={() => email && onLogin(email)}
          >
            Entrar na Jornada
          </Button>
        </div>

        <div className="flex items-center gap-4 py-4">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-zinc-500 text-sm">ou continue com</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="flex items-center justify-center gap-2">
            Google
          </Button>
          <Button variant="outline" className="flex items-center justify-center gap-2">
            Apple
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

const HomePage = ({ 
  user, 
  onStartDay, 
  onOpenCrisis, 
  onOpenChecklist, 
  onOpenDeclarations 
}: { 
  user: User; 
  onStartDay: (dayId: number) => void;
  onOpenCrisis: () => void;
  onOpenChecklist: () => void;
  onOpenDeclarations: () => void;
}) => {
  return (
    <div className="min-h-screen pb-24">
      <header className="p-6 flex justify-between items-center">
        <div>
          <p className="text-zinc-500 text-sm">Bem-vindo de volta,</p>
          <h2 className="text-xl font-medium">{user.name}</h2>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-white/5">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span className="font-bold text-sm">{user.streak}</span>
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Progress Card */}
        <section className="card-dark p-6 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-serif italic">Dia {user.progress + 1}</h3>
              <p className="text-zinc-400 text-sm">Progresso: {user.progress}/30 dias</p>
            </div>
            <div className="text-gold-400 text-sm font-medium">
              {Math.round((user.progress / 30) * 100)}%
            </div>
          </div>
          <ProgressBar current={user.progress} total={30} />
          <Button 
            variant="gold" 
            className="w-full py-4 flex items-center justify-center gap-2"
            onClick={() => onStartDay(user.progress + 1)}
          >
            Começar meus 10 minutos
            <ChevronRight className="w-5 h-5" />
          </Button>
        </section>

        {/* Quick Access */}
        <section className="grid grid-cols-2 gap-4">
          <button 
            onClick={onOpenCrisis}
            className="card-dark p-4 flex flex-col items-center gap-3 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <span className="font-medium">Modo Crise</span>
          </button>
          <button 
            onClick={onOpenDeclarations}
            className="card-dark p-4 flex flex-col items-center gap-3 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center">
              <Quote className="w-6 h-6 text-gold-500" />
            </div>
            <span className="font-medium">Declarações</span>
          </button>
          <button 
            onClick={onOpenChecklist}
            className="card-dark p-4 flex flex-col items-center gap-3 hover:bg-zinc-800/50 transition-colors col-span-2"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="font-medium">Checklists Diários</span>
          </button>
        </section>

        {/* Daily Verse */}
        <section className="text-center py-8 space-y-4 opacity-60">
          <Quote className="w-8 h-8 mx-auto text-gold-500/40" />
          <p className="text-lg font-serif italic leading-relaxed">
            "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho."
          </p>
          <p className="text-sm uppercase tracking-widest">Salmos 119:105</p>
        </section>
      </main>
    </div>
  );
};

const DayDetail = ({ 
  day, 
  onComplete, 
  onBack 
}: { 
  day: Day; 
  onComplete: () => void; 
  onBack: () => void;
}) => {
  const [reflection, setReflection] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-black pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-medium">Dia {day.id}</h2>
      </header>

      <main className="px-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif italic gold-text">{day.title}</h1>
          <div className="p-4 bg-zinc-900/50 border-l-2 border-gold-500 italic text-zinc-300">
            "{day.verse}"
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-gold-500 font-bold uppercase text-xs tracking-widest">Reflexão</h3>
          <p className="text-zinc-300 leading-relaxed">{day.reflection}</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-gold-500 font-bold uppercase text-xs tracking-widest">Aplicação Prática</h3>
          <p className="text-zinc-300 leading-relaxed">{day.application}</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-gold-500 font-bold uppercase text-xs tracking-widest">Exercício de Escrita</h3>
          <p className="text-zinc-400 text-sm">{day.exercise}</p>
          <textarea 
            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-gold-500"
            placeholder="Escreva aqui seus pensamentos..."
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        </section>

        <section className="card-dark p-6 text-center space-y-4 bg-gold-950/20 border-gold-500/20">
          <h3 className="text-gold-500 font-bold uppercase text-xs tracking-widest">Declaração Profética</h3>
          <p className="text-xl font-serif italic">"{day.declaration}"</p>
        </section>

        <Button variant="gold" className="w-full py-4" onClick={onComplete}>
          Concluir Dia {day.id}
        </Button>
      </main>
    </motion.div>
  );
};

const CrisisMode = ({ onBack }: { onBack: () => void }) => {
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const categories = ["Ansiedade", "Medo", "Desânimo", "Ataque Espiritual", "Confusão", "Financeiro", "Família"];

  const prayers: Record<string, Prayer> = {
    "Ansiedade": {
      id: 1,
      category: "Ansiedade",
      title: "Paz que Excede Entendimento",
      content: "Senhor, entrego agora todo o peso do meu coração. Minha mente está agitada, mas Tu és o Príncipe da Paz. Eu escolho não andar ansioso por coisa alguma, mas em tudo apresentar meus pedidos a Ti...",
      declaration: "Minha mente está guardada em Cristo Jesus. Eu descanso n'Ele."
    },
    "Medo": {
      id: 2,
      category: "Medo",
      title: "Escudo e Fortaleza",
      content: "Pai, o medo tenta me paralisar. Mas Tua Palavra diz que não me deste espírito de temor, mas de poder, de amor e de moderação. Eu repreendo todo espírito de medo agora...",
      declaration: "O Senhor é a minha luz e a minha salvação; de quem terei medo?"
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-black pb-12"
    >
      <header className="p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-medium">Modo Crise</h2>
      </header>

      <main className="px-6 space-y-6">
        <AnimatePresence mode="wait">
          {!selectedPrayer ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-3"
            >
              <p className="text-zinc-400 mb-2">O que você está enfrentando agora?</p>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedPrayer(prayers[cat] || prayers["Ansiedade"])}
                  className="card-dark p-5 flex justify-between items-center hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-lg font-medium">{cat}</span>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="prayer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <span className="text-red-500 font-bold uppercase text-xs tracking-widest">{selectedPrayer.category}</span>
                <h1 className="text-3xl font-serif italic gold-text">{selectedPrayer.title}</h1>
              </div>

              <div className="space-y-4 text-zinc-300 leading-relaxed text-lg">
                {selectedPrayer.content.split('\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>

              <div className="card-dark p-6 text-center space-y-4 bg-red-950/10 border-red-500/20">
                <h3 className="text-red-500 font-bold uppercase text-xs tracking-widest">Declaração de Poder</h3>
                <p className="text-xl font-serif italic">"{selectedPrayer.declaration}"</p>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setSelectedPrayer(null)}>
                Escolher outro motivo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
};

const ChecklistPage = ({ onBack }: { onBack: () => void }) => {
  const [morning, setMorning] = useState<string[]>([]);
  const [night, setNight] = useState<string[]>([]);

  const morningItems = [
    "Agradeci 3 bênçãos",
    "Declarei minha identidade",
    "Li um versículo",
    "Orei por proteção",
    "Identifiquei um ato de obediência"
  ];

  const nightItems = [
    "Onde vi Deus agir hoje?",
    "Que vitória celebro?",
    "O que aprendi?",
    "Pelo que sou grato?"
  ];

  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-black pb-12"
    >
      <header className="p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-medium">Checklists Diários</h2>
      </header>

      <main className="px-6 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-gold-400">
            <Sun className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Checklist Matinal</h3>
          </div>
          <div className="space-y-2">
            {morningItems.map(item => (
              <button 
                key={item}
                onClick={() => toggleItem(item, morning, setMorning)}
                className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
                  morning.includes(item) 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                    : 'bg-zinc-900 border-white/5 text-zinc-400'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                  morning.includes(item) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                }`}>
                  {morning.includes(item) && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
                <span>{item}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Moon className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Checklist Noturno</h3>
          </div>
          <div className="space-y-2">
            {nightItems.map(item => (
              <button 
                key={item}
                onClick={() => toggleItem(item, night, setNight)}
                className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
                  night.includes(item) 
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                    : 'bg-zinc-900 border-white/5 text-zinc-400'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                  night.includes(item) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'
                }`}>
                  {night.includes(item) && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
                <span>{item}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </motion.div>
  );
};

const SubscriptionPage = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen bg-black p-6 flex flex-col">
      <header className="flex justify-end">
        <button onClick={onBack} className="p-2 text-zinc-500">Fechar</button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
        <div className="w-20 h-20 rounded-3xl gold-gradient flex items-center justify-center shadow-2xl shadow-gold-500/20">
          <Lock className="w-10 h-10 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-serif italic gold-text">Acesso Premium</h1>
          <p className="text-zinc-400 max-w-xs mx-auto">Desbloqueie a jornada completa e ative todas as promessas.</p>
        </div>

        <div className="w-full space-y-4">
          <div className="card-dark p-6 border-gold-500/50 bg-gold-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gold-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">Melhor Valor</div>
            <div className="flex justify-between items-center">
              <div className="text-left">
                <h3 className="font-bold text-lg">Plano Anual</h3>
                <p className="text-zinc-400 text-sm">Acesso por 12 meses</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">R$ 97,00</div>
                <div className="text-zinc-500 text-xs">R$ 8,08/mês</div>
              </div>
            </div>
          </div>

          <div className="card-dark p-6 hover:border-white/20 transition-colors">
            <div className="flex justify-between items-center">
              <div className="text-left">
                <h3 className="font-bold text-lg">Plano Mensal</h3>
                <p className="text-zinc-400 text-sm">Cancele quando quiser</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">R$ 14,90</div>
                <div className="text-zinc-500 text-xs">por mês</div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-4">
          <ul className="text-left space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-2"><Star className="w-4 h-4 text-gold-500" /> Jornada 30 dias completa</li>
            <li className="flex items-center gap-2"><Star className="w-4 h-4 text-gold-500" /> Biblioteca de declarações</li>
            <li className="flex items-center gap-2"><Star className="w-4 h-4 text-gold-500" /> Áudios de oração exclusivos</li>
            <li className="flex items-center gap-2"><Star className="w-4 h-4 text-gold-500" /> Atualizações futuras</li>
          </ul>
        </div>

        <Button variant="gold" className="w-full py-4 text-lg">
          Assinar Agora
        </Button>
        <p className="text-zinc-600 text-[10px] uppercase tracking-widest">3 dias de teste gratuito incluídos</p>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'login' | 'home' | 'day' | 'crisis' | 'checklist' | 'declarations' | 'subscription'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
      handleLogin(savedEmail);
    }
  }, []);

  const handleLogin = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${email}`);
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('user_email', email);
      setView('home');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startDay = async (dayId: number) => {
    // Check if day is locked (for free users)
    if (dayId > 3 && user?.plan === 'free') {
      setView('subscription');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/days/${dayId}`);
      const dayData = await res.json();
      setCurrentDay(dayData);
      setView('day');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const completeDay = async () => {
    if (!user || !currentDay) return;
    
    const newProgress = Math.max(user.progress, currentDay.id);
    const newStreak = user.streak + 1; // Simplified streak logic

    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, progress: newProgress, streak: newStreak })
      });
      
      setUser({ ...user, progress: newProgress, streak: newStreak });
      setView('home');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-black min-h-screen shadow-2xl shadow-white/5">
      <AnimatePresence mode="wait">
        {view === 'login' && <LoginPage onLogin={handleLogin} />}
        {view === 'home' && user && (
          <HomePage 
            user={user} 
            onStartDay={startDay}
            onOpenCrisis={() => setView('crisis')}
            onOpenChecklist={() => setView('checklist')}
            onOpenDeclarations={() => setView('subscription')} // Mocking declarations as premium
          />
        )}
        {view === 'day' && currentDay && (
          <DayDetail 
            day={currentDay} 
            onComplete={completeDay} 
            onBack={() => setView('home')} 
          />
        )}
        {view === 'crisis' && <CrisisMode onBack={() => setView('home')} />}
        {view === 'checklist' && <ChecklistPage onBack={() => setView('home')} />}
        {view === 'subscription' && <SubscriptionPage onBack={() => setView('home')} />}
      </AnimatePresence>

      {/* Navigation Bar (only on home) */}
      {view === 'home' && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-950/80 backdrop-blur-lg border-t border-white/5 px-8 py-4 flex justify-between items-center z-20">
          <button className="text-gold-500 flex flex-col items-center gap-1">
            <Calendar className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Jornada</span>
          </button>
          <button onClick={() => setView('subscription')} className="text-zinc-500 flex flex-col items-center gap-1">
            <Star className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Premium</span>
          </button>
          <button onClick={() => {
            localStorage.removeItem('user_email');
            setView('login');
          }} className="text-zinc-500 flex flex-col items-center gap-1">
            <Lock className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Sair</span>
          </button>
        </nav>
      )}
    </div>
  );
}
