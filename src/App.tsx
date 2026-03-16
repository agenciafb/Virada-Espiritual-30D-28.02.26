import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Calendar, 
  Heart, 
  Quote, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  Lock,
  Star,
  BookOpen,
  User as UserIcon,
  Share2,
  Trophy,
  MessageSquare,
  Save,
  Check,
  Volume2,
  Loader2,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  X
} from 'lucide-react';
import { User, Day, Prayer, Checklist, Declaration } from './types';
import { GoogleGenAI, Modality } from "@google/genai";

// --- Components ---

const AudioButton = ({ text, className = "" }: { text: string; className?: string }) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const handlePlay = async () => {
    if (loading || playing) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Diga com autoridade e fé: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Gemini TTS returns raw 16-bit PCM (L16)
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768;
        }

        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => {
          setPlaying(false);
          audioContext.close();
        };
        setPlaying(true);
        source.start();
      }
    } catch (err) {
      console.error("TTS Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePlay}
      className={`p-2 rounded-full transition-all ${playing ? 'bg-gold-500 text-white' : 'bg-gold-500/10 text-gold-500 hover:bg-gold-500/20'} ${className}`}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
};

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

const InstallGuide = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass-card w-full max-w-sm p-8 space-y-8 relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl gold-gradient mx-auto flex items-center justify-center shadow-lg shadow-gold-500/20">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl display-bold gold-text">Instalar no Celular</h2>
          <p className="text-xs opacity-50 uppercase tracking-widest font-bold">Web App Premium</p>
        </div>

        <div className="space-y-8">
          {/* iOS Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span className="text-xs font-bold">iOS</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">iPhone / iPad</h3>
            </div>
            <ul className="space-y-3 text-sm opacity-60">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">1</div>
                <p>Abra no <span className="font-bold text-white">Safari</span></p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">2</div>
                <p>Toque no ícone de <span className="font-bold text-white">Compartilhar</span> <Share className="w-4 h-4 inline mb-1" /></p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">3</div>
                <p>Selecione <span className="font-bold text-white">"Adicionar à Tela de Início"</span> <PlusSquare className="w-4 h-4 inline mb-1" /></p>
              </li>
            </ul>
          </div>

          <div className="h-px bg-white/5" />

          {/* Android Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span className="text-xs font-bold">AND</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Android / Chrome</h3>
            </div>
            <ul className="space-y-3 text-sm opacity-60">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">1</div>
                <p>Abra no <span className="font-bold text-white">Google Chrome</span></p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">2</div>
                <p>Toque nos <span className="font-bold text-white">três pontos</span> <MoreVertical className="w-4 h-4 inline mb-1" /> no topo</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">3</div>
                <p>Toque em <span className="font-bold text-white">"Instalar Aplicativo"</span> <Download className="w-4 h-4 inline mb-1" /></p>
              </li>
            </ul>
          </div>
        </div>

        <Button variant="gold" className="w-full py-4" onClick={onClose}>
          Entendi
        </Button>
      </motion.div>
    </motion.div>
  );
};

const LoginPage = ({ onLogin, theme, onToggleTheme }: { onLogin: (email: string) => void; theme: 'light' | 'dark'; onToggleTheme: () => void }) => {
  const [email, setEmail] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="min-h-screen flex flex-col p-8 md:p-12 bg-zinc-950 text-white">
      <AnimatePresence>
        {showGuide && <InstallGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>

      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center shadow-lg shadow-gold-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <span className="display-bold text-2xl tracking-tight gold-text">Virada 30D</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowGuide(true)}
            className="p-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5 opacity-60" />
            <span className="text-[10px] uppercase tracking-widest font-bold hidden sm:inline">Instalar</span>
          </button>
          <button onClick={onToggleTheme} className="p-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-16"
      >
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl display-bold leading-[1.1] tracking-tighter">
            Transforme sua <span className="serif-italic gold-text">essência</span> em 30 dias.
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-lg leading-relaxed">
            Uma jornada guiada para renovar sua mente, fortalecer sua fé e viver o propósito extraordinário de Deus.
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Seu Acesso</label>
              <span className="text-[9px] uppercase tracking-widest opacity-30 mb-1">Acesso exclusivo para compradores</span>
            </div>
            <input 
              type="email" 
              placeholder="E-mail usado na compra"
              className="app-input text-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <Button 
              variant="gold" 
              className="w-full py-6 text-xl font-medium shadow-2xl shadow-gold-500/20"
              onClick={() => email && onLogin(email)}
            >
              Iniciar Minha Jornada
            </Button>
            <p className="text-center text-[10px] opacity-30 uppercase tracking-widest">
              Comprou agora? O acesso é liberado automaticamente após a aprovação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 py-4 opacity-20">
          <div className="h-px bg-current flex-1" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Conexão Segura</span>
          <div className="h-px bg-current flex-1" />
        </div>
      </motion.div>

      <footer className="mt-auto pt-12 flex justify-between items-end opacity-30">
        <div className="text-[10px] uppercase tracking-widest leading-loose">
          © 2026 Virada 30D<br />Edição Premium
        </div>
        <div className="text-right">
          <p className="serif-italic text-sm">"Tudo posso naquele que me fortalece."</p>
        </div>
      </footer>
    </div>
  );
};

const HomePage = ({ 
  user, 
  onStartDay, 
  onOpenCrisis, 
  onOpenChecklist, 
  onOpenDeclarations,
  theme,
  onToggleTheme
}: { 
  user: User; 
  onStartDay: (dayId: number) => void;
  onOpenCrisis: () => void;
  onOpenChecklist: () => void;
  onOpenDeclarations: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) => {
  const [dailyDeclaration, setDailyDeclaration] = useState<Declaration | null>(null);

  useEffect(() => {
    fetch('/api/declarations')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load declarations'))
      .then(data => {
        const currentDayDecl = data.find((d: any) => d.id === (user.progress + 1)) || data[0];
        setDailyDeclaration(currentDayDecl);
      })
      .catch(err => console.error(err));
  }, [user.progress]);

  return (
    <div className="min-h-screen pb-32">
      <header className="p-8 flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Bem-vindo à sua jornada</p>
          <h2 className="text-2xl md:text-3xl display-bold">Olá, <span className="serif-italic gold-text">{user.name}</span></h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onToggleTheme} className="p-3 rounded-full border border-zinc-200 dark:border-white/10 glass-card">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full border border-zinc-200 dark:border-white/5">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            <span className="display-bold text-lg">{user.streak}</span>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Progress Card */}
        <section className="glass-card p-8 space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-5xl display-bold">{Math.round((user.progress / 30) * 100)}%</span>
              <p className="text-xs uppercase tracking-widest opacity-50">Progresso Total</p>
            </div>
            <div className="text-right space-y-1">
              <span className="text-2xl display-bold text-gold-500">
                {user.progress >= 30 ? "Concluído" : `Dia ${user.progress + 1}`}
              </span>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Status Atual</p>
            </div>
          </div>
          <ProgressBar current={user.progress} total={30} />
          <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold opacity-40">
            <span>Início</span>
            <span>Destino</span>
          </div>
          
          {user.progress < 30 ? (
            <Button 
              variant="gold" 
              className="w-full py-5 text-lg font-medium shadow-2xl shadow-gold-500/20 flex items-center justify-center gap-3 group"
              onClick={() => onStartDay(user.progress + 1)}
            >
              Iniciar Dia {user.progress + 1}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <div className="p-6 bg-gold-500/5 border border-gold-500/20 rounded-2xl text-center">
              <p className="gold-text font-bold text-lg">Jornada Concluída com Sucesso!</p>
            </div>
          )}
        </section>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onOpenChecklist}
            className="glass-card p-6 flex flex-col items-center text-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-bold uppercase tracking-widest">Hábitos</span>
              <p className="text-[10px] opacity-50">Checklist Diário</p>
            </div>
          </button>
          <button 
            onClick={onOpenDeclarations}
            className="glass-card p-6 flex flex-col items-center text-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Quote className="w-6 h-6 text-gold-500" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-bold uppercase tracking-widest">Decretos</span>
              <p className="text-[10px] opacity-50">Palavras de Fé</p>
            </div>
          </button>
        </div>

        {/* Daily Verse */}
        {dailyDeclaration && (
          <section className="glass-card p-8 relative overflow-hidden group">
            <Quote className="absolute -top-4 -left-4 w-24 h-24 opacity-[0.03] rotate-12" />
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <p className="serif-italic text-2xl leading-relaxed italic opacity-90 flex-1">
                  "{dailyDeclaration.content}"
                </p>
                <AudioButton text={dailyDeclaration.content} className="ml-4" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-px w-8 bg-gold-500/30" />
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">
                  {dailyDeclaration.reference}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Emergency Button */}
        <button 
          onClick={onOpenCrisis}
          className="w-full py-6 rounded-2xl border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-[0.3em] hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          Botão de Emergência
        </button>
      </main>
    </div>
  );
};

const DayDetail = ({ 
  day, 
  userId,
  onComplete, 
  onBack 
}: { 
  day: Day; 
  userId: number;
  onComplete: (reflection: string) => void; 
  onBack: () => void;
}) => {
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    if (!userId || !day.id) return;
    fetch(`/api/reflections/${encodeURIComponent(userId)}/${encodeURIComponent(day.id)}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load reflection'))
      .then(data => setReflection(data?.content || ''))
      .catch(err => console.error(err));
  }, [userId, day.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen pb-32"
    >
      <header className="p-6 flex items-center justify-between sticky top-0 z-50 nav-blur">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Jornada 30D</p>
            <h2 className="text-lg display-bold">Dia {day.id}</h2>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-12 mt-8">
        <div className="space-y-6">
          <h1 className="text-3xl md:text-5xl display-bold leading-tight gold-text">{day.title}</h1>
          <div className="glass-card p-8 border-l-4 border-l-gold-500 relative overflow-hidden">
            <Quote className="absolute -top-4 -right-4 w-24 h-24 opacity-[0.03] rotate-12" />
            <p className="serif-italic text-2xl leading-relaxed italic opacity-90">
              "{day.verse}"
            </p>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Reflexão Profunda</h3>
          </div>
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <p className="text-xl leading-relaxed opacity-80 whitespace-pre-line serif-italic">
              {day.reflection}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Aplicação Prática</h3>
          </div>
          <div className="glass-card p-8 bg-gold-500/[0.02]">
            <p className="text-lg leading-relaxed opacity-80">
              {day.application}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Diário de Transformação</h3>
          </div>
          <p className="text-sm opacity-50 italic">{day.exercise}</p>
          <textarea 
            className="app-input min-h-[200px] resize-none text-lg serif-italic"
            placeholder="O que o Espírito Santo falou ao seu coração hoje?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        </section>

        <section className="glass-card p-8 text-center space-y-4 bg-gold-500/[0.03] border-gold-500/20 relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <AudioButton text={day.declaration} />
          </div>
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Decreto de Hoje</h3>
          <p className="text-2xl display-bold italic">"{day.declaration}"</p>
        </section>

        <Button 
          variant="gold" 
          className="w-full py-6 text-xl font-medium shadow-2xl shadow-gold-500/30" 
          onClick={() => onComplete(reflection)}
        >
          Concluir Dia {day.id}
        </Button>
      </main>
    </motion.div>
  );
};

const CrisisMode = ({ onBack }: { onBack: () => void }) => {
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const categories = ["Ansiedade", "Medo", "Desânimo", "Ataque Espiritual", "Confusão", "Financeiro", "Família"];

  useEffect(() => {
    fetch('/api/prayers')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load prayers'))
      .then(data => setPrayers(data || []))
      .catch(err => console.error(err));
  }, []);

  const getPrayerByCategory = (cat: string) => {
    return prayers.find(p => p.category === cat) || prayers[0];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 z-50 nav-blur">
        <button onClick={onBack} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Orações de Poder</h2>
      </header>

      <main className="px-6 space-y-8 mt-6">
        <AnimatePresence mode="wait">
          {!selectedPrayer ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Socorro Bem Presente</p>
                <h3 className="text-2xl display-bold">O que você está enfrentando?</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedPrayer(getPrayerByCategory(cat))}
                    className="glass-card p-6 flex justify-between items-center group"
                  >
                    <span className="text-lg font-medium group-hover:gold-text transition-colors">{cat}</span>
                    <ChevronRight className="w-5 h-5 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="prayer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-12"
            >
              <div className="space-y-4 flex justify-between items-start">
                <div className="space-y-4">
                  <span className="text-red-500 font-bold uppercase text-[10px] tracking-[0.3em] px-3 py-1 bg-red-500/10 rounded-full">{selectedPrayer.category}</span>
                  <h1 className="text-2xl md:text-4xl display-bold leading-tight gold-text">{selectedPrayer.title}</h1>
                </div>
                <AudioButton text={selectedPrayer.content} className="mt-2" />
              </div>

              <div className="space-y-6 text-xl leading-relaxed serif-italic opacity-90">
                {selectedPrayer.content.split('\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>

              <div className="glass-card p-8 text-center space-y-4 bg-red-500/[0.03] border-red-500/20 relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AudioButton text={selectedPrayer.declaration} />
                </div>
                <h3 className="text-red-500 font-bold uppercase text-[10px] tracking-[0.3em]">Declaração de Autoridade</h3>
                <p className="text-2xl display-bold italic">"{selectedPrayer.declaration}"</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full py-5 rounded-2xl border-white/10 hover:bg-white/5" 
                onClick={() => { setSelectedPrayer(null); }}
              >
                Escolher outro motivo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
};

const DeclarationsPage = ({ onBack }: { onBack: () => void }) => {
  const [declarations, setDeclarations] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/declarations')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load declarations'))
      .then(data => setDeclarations(data || []))
      .catch(err => console.error(err));
  }, []);

  const handleShare = (decl: any) => {
    if (navigator.share) {
      navigator.share({
        title: 'Declaração Profética',
        text: `"${decl.content}" - ${decl.reference}`,
        url: window.location.href,
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 z-50 nav-blur">
        <button onClick={onBack} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Decretos de Fé</h2>
      </header>

      <main className="px-6 space-y-8 mt-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Ativação Espiritual</p>
          <h3 className="text-xl md:text-2xl display-bold">Declare a Palavra</h3>
        </div>
        
        <div className="space-y-6">
          {declarations.map(decl => (
            <motion.div 
              key={decl.id}
              whileHover={{ y: -4 }}
              className="glass-card p-8 space-y-4 relative group"
            >
              <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <AudioButton text={decl.content} />
                <button 
                  onClick={() => handleShare(decl)}
                  className="p-2 bg-zinc-800/50 rounded-full hover:bg-zinc-700 transition-colors"
                >
                  <Share2 className="w-4 h-4 opacity-40 hover:opacity-100" />
                </button>
              </div>
              <Quote className="w-8 h-8 text-gold-500 opacity-20" />
              <p className="text-2xl serif-italic leading-relaxed">"{decl.content}"</p>
              <div className="flex items-center gap-3">
                <div className="h-px w-6 bg-gold-500/30" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-gold-600 dark:text-gold-500">
                  {decl.reference}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </motion.div>
  );
};

const CongratulationsPage = ({ onBack }: { onBack: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12 bg-zinc-950"
    >
      <div className="relative">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="w-48 h-48 rounded-full gold-gradient flex items-center justify-center shadow-[0_0_100px_rgba(212,175,55,0.2)]"
        >
          <Trophy className="w-24 h-24 text-white" />
        </motion.div>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: -100, x: (i - 2.5) * 40 }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
            className="absolute top-1/2 left-1/2"
          >
            <Star className="w-6 h-6 text-gold-400 fill-gold-400" />
          </motion.div>
        ))}
      </div>

      <div className="space-y-6 max-w-md">
        <h1 className="text-4xl md:text-6xl display-bold gold-text">Vitória!</h1>
        <p className="text-xl md:text-2xl serif-italic opacity-90">Você concluiu os 30 dias da sua jornada espiritual.</p>
        <p className="text-zinc-500 leading-relaxed">
          Sua dedicação produziu frutos eternos. Este não é o fim, mas o início de uma nova estação de autoridade e propósito em sua vida.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <Button 
          variant="gold" 
          className="w-full py-6 text-xl font-medium shadow-2xl shadow-gold-500/30" 
          onClick={onBack}
        >
          Continuar Navegando
        </Button>
        <div className="space-y-2 opacity-30">
          <p className="serif-italic text-sm">"Combati o bom combate, acabei a carreira, guardei a fé."</p>
          <p className="text-[10px] uppercase tracking-widest font-bold">2 Timóteo 4:7</p>
        </div>
      </div>
    </motion.div>
  );
};

const ProfilePage = ({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 z-50 nav-blur">
        <button onClick={onBack} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Meu Perfil</h2>
      </header>

      <main className="px-6 space-y-12 mt-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-32 h-32 rounded-full gold-gradient flex items-center justify-center text-white text-5xl display-bold shadow-2xl shadow-gold-500/20">
            {user.name[0].toUpperCase()}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl display-bold">{user.name}</h1>
            <p className="opacity-40 text-sm font-medium tracking-widest uppercase">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-8 text-center space-y-2">
            <Trophy className="w-8 h-8 mx-auto text-gold-500 opacity-50" />
            <div className="text-4xl display-bold">{user.progress}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">Dias Concluídos</div>
          </div>
          <div className="glass-card p-8 text-center space-y-2">
            <Flame className="w-8 h-8 mx-auto text-orange-500 opacity-50" />
            <div className="text-4xl display-bold">{user.streak}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">Dias Seguidos</div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 ml-1">Configurações</h3>
          <div className="space-y-3">
            <button onClick={onLogout} className="w-full glass-card p-6 text-left text-red-500 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="font-bold uppercase tracking-widest text-sm">Sair da Conta</span>
              </div>
              <ChevronRight className="w-5 h-5 opacity-20 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

const ChecklistPage = ({ userId, onBack }: { userId: number; onBack: () => void }) => {
  const [morning, setMorning] = useState<string[]>([]);
  const [night, setNight] = useState<string[]>([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userId || !today) return;
    fetch(`/api/checklists/${encodeURIComponent(userId)}/${encodeURIComponent(today)}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load checklist'))
      .then(data => {
        if (data) {
          setMorning(JSON.parse(data.morning_status || "[]"));
          setNight(JSON.parse(data.night_status || "[]"));
        }
      })
      .catch(err => console.error(err));
  }, [userId, today]);

  const saveChecklist = async (m: string[], n: string[]) => {
    await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, date: today, morning_status: m, night_status: n })
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 z-50 nav-blur">
        <button onClick={onBack} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Hábitos de Sucesso</h2>
      </header>

      <main className="px-6 space-y-12 mt-8">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Consistência Diária</p>
          <h3 className="text-xl md:text-2xl display-bold">Sua Rotina Espiritual</h3>
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Manhã com Deus</h3>
          </div>
          <div className="space-y-3">
            {['Oração ao acordar', 'Leitura da Palavra', 'Afirmações de Fé', 'Gratidão'].map((item) => (
              <button 
                key={item}
                onClick={() => {
                  const next = morning.includes(item) ? morning.filter(i => i !== item) : [...morning, item];
                  setMorning(next);
                  saveChecklist(next, night);
                }}
                className={`w-full p-6 rounded-2xl border transition-all flex items-center justify-between group ${
                  morning.includes(item)
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-500'
                    : 'bg-white/5 border-white/5 opacity-60'
                }`}
              >
                <span className="text-sm font-bold uppercase tracking-widest">{item}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  morning.includes(item) ? 'bg-gold-500 border-gold-500' : 'border-current opacity-20'
                }`}>
                  {morning.includes(item) && <Check className="w-4 h-4 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-blue-400" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Noite de Entrega</h3>
          </div>
          <div className="space-y-3">
            {['Revisão do dia', 'Oração de entrega', 'Diário de gratidão', 'Desconexão digital'].map((item) => (
              <button 
                key={item}
                onClick={() => {
                  const next = night.includes(item) ? night.filter(i => i !== item) : [...night, item];
                  setNight(next);
                  saveChecklist(morning, next);
                }}
                className={`w-full p-6 rounded-2xl border transition-all flex items-center justify-between group ${
                  night.includes(item)
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border-white/5 opacity-60'
                }`}
              >
                <span className="text-sm font-bold uppercase tracking-widest">{item}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  night.includes(item) ? 'bg-blue-500 border-blue-500' : 'border-current opacity-20'
                }`}>
                  {night.includes(item) && <Check className="w-4 h-4 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </motion.div>
  );
};

const DiaryPage = ({ userId, onBack }: { userId: number; onBack: () => void }) => {
  const [gratitude, setGratitude] = useState('');
  const [learning, setLearning] = useState('');
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userId || !today) return;
    fetch(`/api/diary/${encodeURIComponent(userId)}/${encodeURIComponent(today)}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load diary'))
      .then(data => {
        if (data) {
          setGratitude(data.gratitude || '');
          setLearning(data.learning || '');
        }
      })
      .catch(err => console.error(err));
  }, [userId, today]);

  const handleSave = () => {
    fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        date: today,
        gratitude,
        learning
      })
    }).then(res => {
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        console.error('Failed to save diary');
      }
    }).catch(err => console.error(err));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 z-50 nav-blur">
        <button onClick={onBack} className="p-2 -ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Diário de Bordo</h2>
      </header>

      <main className="px-6 space-y-12 mt-8">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Reflexão Diária</p>
          <h3 className="text-xl md:text-2xl display-bold">Sua Jornada com Deus</h3>
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Heart className="w-4 h-4 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Gratidão</h3>
          </div>
          <p className="text-sm opacity-50 italic">Pelo que você é grato hoje?</p>
          <textarea 
            className="app-input min-h-[150px] resize-none text-lg serif-italic"
            placeholder="Hoje sou grato por..."
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
          />
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Aprendizado</h3>
          </div>
          <p className="text-sm opacity-50 italic">O que o Senhor te ensinou?</p>
          <textarea 
            className="app-input min-h-[150px] resize-none text-lg serif-italic"
            placeholder="Deus me ensinou que..."
            value={learning}
            onChange={(e) => setLearning(e.target.value)}
          />
        </section>

        <Button 
          variant="gold" 
          className="w-full py-6 text-xl font-medium shadow-2xl shadow-gold-500/30 flex items-center justify-center gap-3" 
          onClick={handleSave}
        >
          {saved ? <CheckCircle2 className="w-6 h-6" /> : <Save className="w-6 h-6" />}
          {saved ? 'Salvo com Sucesso!' : 'Guardar Reflexão'}
        </Button>

        {saved && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-emerald-500 text-sm font-medium"
          >
            Sua reflexão foi guardada no Reino.
          </motion.p>
        )}
      </main>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<'login' | 'home' | 'day' | 'crisis' | 'checklist' | 'declarations' | 'diary' | 'profile' | 'congratulations'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }

    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
      handleLogin(savedEmail);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const handleLogin = async (email: string) => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(email)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha no login');
      }
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('user_email', email);
      setView('home');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao entrar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const startDay = async (dayId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/days/${encodeURIComponent(dayId)}`);
      if (!res.ok) throw new Error('Failed to load day');
      const dayData = await res.json();
      setCurrentDay(dayData);
      setView('day');
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar o dia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const completeDay = async (reflection: string) => {
    if (!user || !currentDay) return;
    
    const newProgress = Math.max(user.progress, currentDay.id);

    try {
      // Save reflection
      const refRes = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, day_id: currentDay.id, content: reflection })
      });
      if (!refRes.ok) throw new Error('Failed to save reflection');

      // Update progress
      const progRes = await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, progress: newProgress })
      });
      if (!progRes.ok) throw new Error('Failed to update progress');
      const progData = await progRes.json();
      
      setUser({ ...user, progress: newProgress, streak: progData.streak ?? user.streak });
      if (newProgress === 30) {
        setView('congratulations');
      } else {
        setView('home');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen shadow-2xl shadow-black/20 dark:shadow-white/5">
      <AnimatePresence mode="wait">
        {view === 'login' && <LoginPage onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />}
        {view === 'home' && user && (
          <HomePage 
            user={user} 
            onStartDay={startDay}
            onOpenCrisis={() => setView('crisis')}
            onOpenChecklist={() => setView('checklist')}
            onOpenDeclarations={() => setView('declarations')} 
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        {view === 'day' && currentDay && user && (
          <DayDetail 
            day={currentDay} 
            userId={user.id}
            onComplete={completeDay} 
            onBack={() => setView('home')} 
          />
        )}
        {view === 'crisis' && <CrisisMode onBack={() => setView('home')} />}
        {view === 'declarations' && <DeclarationsPage onBack={() => setView('home')} />}
        {view === 'checklist' && <ChecklistPage userId={user.id} onBack={() => setView('home')} />}
        {view === 'diary' && <DiaryPage userId={user.id} onBack={() => setView('home')} />}
        {view === 'congratulations' && <CongratulationsPage onBack={() => setView('home')} />}
        {view === 'profile' && <ProfilePage user={user} onBack={() => setView('home')} onLogout={() => {
          localStorage.removeItem('user_email');
          setView('login');
        }} />}
      </AnimatePresence>

      {/* Navigation Bar (only on home) */}
      {['home', 'diary', 'profile'].includes(view) && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto nav-blur px-8 py-4 flex justify-between items-center z-20">
          <button 
            onClick={() => setView('home')}
            className={`${view === 'home' ? 'text-gold-500' : 'opacity-40'} flex flex-col items-center gap-1`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Jornada</span>
          </button>
          <button 
            onClick={() => setView('diary')}
            className={`${view === 'diary' ? 'text-gold-500' : 'opacity-40'} flex flex-col items-center gap-1`}
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Diário</span>
          </button>
          <button 
            onClick={() => setView('profile')}
            className={`${view === 'profile' ? 'text-gold-500' : 'opacity-40'} flex flex-col items-center gap-1`}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Perfil</span>
          </button>
        </nav>
      )}
    </div>
  );
}
