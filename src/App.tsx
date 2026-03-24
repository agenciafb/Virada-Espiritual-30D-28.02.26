import React, { useState, useEffect, Component } from 'react';
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
  Bell,
  Share2,
  Trophy,
  MessageSquare,
  Circle,
  Target,
  Award,
  Zap,
  Save,
  Check,
  Volume2,
  Loader2,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  X,
  ShieldCheck,
  Users,
  UserPlus,
  Trash2,
  Pause,
  WifiOff,
  Settings
} from 'lucide-react';
import { User, Day, Prayer, Checklist, Declaration } from './types';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  getDocFromServer,
  Timestamp,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Types & Enums ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

// --- Components ---

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Ocorreu um erro inesperado. Por favor, tente recarregar o aplicativo.";
      let isPermissionError = false;

      try {
        if (error?.message) {
          const parsedError = JSON.parse(error.message) as FirestoreErrorInfo;
          if (parsedError.error.includes('insufficient permissions') || parsedError.error.includes('permission-denied')) {
            errorMessage = `Erro de permissão no Firestore: ${parsedError.operationType} em ${parsedError.path}. Verifique as regras de segurança.`;
            isPermissionError = true;
          }
        }
      } catch (e) {
        // Not a JSON error, use default message
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-app">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4">{isPermissionError ? "Erro de Segurança" : "Ops! Algo deu errado."}</h2>
          <p className="text-muted mb-8 max-w-xs mx-auto">
            {errorMessage}
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-gold-500 text-white rounded-full font-bold shadow-lg shadow-gold-500/20"
            >
              Recarregar App
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-muted hover:text-app transition-colors"
            >
              Recarregar e Tentar Novamente
            </button>
          </div>
          {(import.meta as any).env.DEV && (
            <pre className="mt-8 p-4 bg-item rounded text-left text-xs overflow-auto max-w-full text-red-500">
              {error?.toString()}
            </pre>
          )}
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const OfflineBanner = () => (
  <motion.div 
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-2 text-center sticky top-0 z-[100] flex items-center justify-center gap-2"
  >
    <WifiOff className="w-3 h-3" />
    Você está offline. Alterações serão sincronizadas quando voltar.
  </motion.div>
);

const AudioButton = ({ text, className = "" }: { text: string; className?: string }) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = React.useRef<{ context: AudioContext; source: AudioBufferSourceNode } | null>(null);

  const handleToggle = async () => {
    if (loading) return;
    
    if (playing && audioRef.current) {
      audioRef.current.source.stop();
      audioRef.current.context.close();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

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
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const audioContext = new AudioContextClass({ sampleRate: 24000 });
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
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
          audioRef.current = null;
          audioContext.close();
        };
        
        audioRef.current = { context: audioContext, source };
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
      onClick={handleToggle}
      className={`p-2 rounded-full transition-all ${playing ? 'bg-red-500 text-white' : 'bg-gold-500/10 text-gold-500 hover:bg-gold-500/20'} ${className}`}
      disabled={loading || !navigator.onLine}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : playing ? <X className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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
    primary: 'hover:opacity-90',
    secondary: 'hover:opacity-90',
    outline: 'border hover:opacity-90',
    gold: 'gold-gradient text-white shadow-lg shadow-gold-600/20 hover:opacity-90'
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-text)'
    },
    secondary: {
      backgroundColor: 'var(--btn-secondary-bg)',
      color: 'var(--btn-secondary-text)'
    },
    outline: {
      borderColor: 'var(--card-border)',
      color: 'var(--text-app)'
    },
    gold: {}
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={variantStyles[variant]}
      className={`px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const percentage = Math.min((current / total) * 100, 100);
  return (
    <div className="w-full h-2 bg-item rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className="h-full gold-gradient"
      />
    </div>
  );
};

// --- Pages ---

const InstallGuide = ({ onClose, deferredPrompt, onInstall }: { onClose: () => void; deferredPrompt: any; onInstall: () => void }) => {
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
        className="glass-card w-full max-w-sm p-8 space-y-8 relative overflow-hidden max-h-[90vh] overflow-y-auto"
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

        {deferredPrompt && (
          <div className="p-4 rounded-2xl bg-gold-500/10 border border-gold-500/20 space-y-4">
            <p className="text-sm text-center text-gold-500 font-medium">
              Seu dispositivo suporta instalação direta!
            </p>
            <Button variant="gold" className="w-full py-4 font-bold shadow-lg shadow-gold-500/20" onClick={onInstall}>
              Instalar Agora
            </Button>
          </div>
        )}

        <div className="space-y-8">
          {/* iOS Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-item flex items-center justify-center">
                <span className="text-xs font-bold">iOS</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted">iPhone / iPad</h3>
            </div>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">1</div>
                <p>Abra no <span className="font-bold text-app">Safari</span></p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">2</div>
                <p>Toque no ícone de <span className="font-bold text-app">Compartilhar</span> <Share className="w-4 h-4 inline mb-1" /></p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">3</div>
                <p>Selecione <span className="font-bold text-app">"Adicionar à Tela de Início"</span> <PlusSquare className="w-4 h-4 inline mb-1" /></p>
              </li>
            </ul>
          </div>

          <div className="h-px bg-item" />

          {/* Android Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-item flex items-center justify-center">
                <span className="text-xs font-bold">AND</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Android / Chrome</h3>
            </div>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">1</div>
                <p>Abra no <span className="font-bold text-app">Google Chrome</span></p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">2</div>
                <p>Toque nos <span className="font-bold text-app">três pontos</span> <MoreVertical className="w-4 h-4 inline mb-1" /> no topo</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-[10px] font-bold text-gold-500 mt-0.5">3</div>
                <p>Toque em <span className="font-bold text-app">"Instalar Aplicativo"</span> <Download className="w-4 h-4 inline mb-1" /></p>
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

// LoginPage removed to start from zero

const DAILY_PHRASES = [
  "Confie no processo, Deus está no controle.",
  "O seu milagre está mais perto do que você imagina.",
  "Não temas, pois Eu sou contigo.",
  "A sua fé moverá montanhas hoje.",
  "Descanse no Senhor e Ele agirá.",
  "Grandes coisas estão por vir.",
  "Você é precioso aos olhos do Pai.",
  "A paz de Deus excede todo entendimento.",
  "Sua força vem do alto.",
  "Deus tem um plano perfeito para sua vida.",
  "Nada é impossível para aquele que crê.",
  "O choro pode durar uma noite, mas a alegria vem pela manhã.",
  "Seja forte e corajoso.",
  "Deus é o seu refúgio e fortaleza.",
  "A graça de Deus te basta.",
  "O Senhor é o seu pastor e nada lhe faltará.",
  "Tudo coopera para o bem daqueles que amam a Deus.",
  "Deus ouve a sua oração em segredo.",
  "Sua história ainda não terminou.",
  "O amor de Deus por você é infinito.",
  "Espere no Senhor com paciência.",
  "Deus renova as suas forças hoje.",
  "A luz de Cristo brilha em você.",
  "Você foi escolhido para este tempo.",
  "Deus está preparando algo novo.",
  "A vitória é certa em nome de Jesus.",
  "Deus cuida de cada detalhe do seu dia.",
  "Sua fé é o seu maior escudo.",
  "O Senhor te abençoe e te guarde.",
  "Hoje é dia de ver a glória de Deus."
];

const HomePage = ({ 
  user, 
  onStartDay, 
  onOpenCrisis, 
  onOpenChecklist, 
  onOpenDeclarations, 
  onOpenProfile, 
  onOpenDiary,
  onOpenAdmin,
  theme,
  onToggleTheme,
  deferredPrompt,
  onInstall,
  isOnline
}: { 
  user: User; 
  onStartDay: (dayId: number) => void;
  onOpenCrisis: () => void;
  onOpenChecklist: () => void;
  onOpenDeclarations: () => void;
  onOpenProfile: () => void;
  onOpenDiary: () => void;
  onOpenAdmin: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  deferredPrompt: any;
  onInstall: () => void;
  isOnline: boolean;
}) => {
  const [dailyDeclaration, setDailyDeclaration] = useState<Declaration | null>(null);
  const [mission, setMission] = useState({
    devotional: false,
    prayer: false,
    gratitude: false,
    reflection: false
  });

  const allDone = mission.devotional && mission.prayer && mission.gratitude && mission.reflection;
  const progressPercent = (user.progress / 30) * 100;
  
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  
  // Use day of the month to pick a phrase (1-31)
  const dayOfMonth = now.getDate();
  const phraseIndex = (dayOfMonth - 1) % DAILY_PHRASES.length;
  const dailyPhrase = DAILY_PHRASES[phraseIndex];

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isDayCompletedToday = user.last_completion_date === today;

  useEffect(() => {
    fetch('/api/declarations')
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        throw new Error(`Failed to load declarations (${res.status})`);
      })
      .then(data => {
        const currentDayDecl = data.find((d: any) => d.id === (user.progress + 1)) || data[0];
        setDailyDeclaration(currentDayDecl);
      })
      .catch(err => console.error(err));

    // Load mission status from Firestore
    if (user.id) {
      const checklistRef = doc(db, 'users', user.id, 'checklists', today);
      const unsubscribe = onSnapshot(checklistRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mission_status) {
            setMission(data.mission_status);
          }
        } else {
          setMission({
            devotional: false,
            prayer: false,
            gratitude: false,
            reflection: false
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.id}/checklists/${today}`);
      });
      return () => unsubscribe();
    }
  }, [user.progress, user.id, today]);

  const updateMission = async (newMission: typeof mission) => {
    setMission(newMission);
    try {
      const checklistRef = doc(db, 'users', user.id, 'checklists', today);
      await setDoc(checklistRef, {
        user_id: user.id,
        date: today,
        mission_status: newMission
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.id}/checklists/${today}`);
    }
  };

  const shareProgress = () => {
    const text = `✨ Minha Jornada de 30 Dias: Dia ${user.progress}/30 Concluído! 🙏🔥\n\nEstou vivendo uma transformação real na minha vida espiritual. Junte-se a mim nessa Virada! 🚀`;
    const url = window.location.origin;
    
    if (navigator.share) {
      navigator.share({
        title: 'Virada Espiritual 30D',
        text: text,
        url: url,
      }).catch(console.error);
    } else {
      const shareText = `${text}\n\n${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
    }
  };

  const [showInstallGuide, setShowInstallGuide] = useState(false);

  return (
    <div className="min-h-screen pb-32">
      <AnimatePresence>
        {showInstallGuide && <InstallGuide onClose={() => setShowInstallGuide(false)} deferredPrompt={deferredPrompt} onInstall={onInstall} />}
      </AnimatePresence>

      <header className="p-8 flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">
            {greeting}, {dailyPhrase}
          </p>
          <h2 className="text-2xl md:text-3xl display-bold">Olá, <span className="serif-italic gold-text">{user.name.split(' ')[0]}</span></h2>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <WifiOff className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Offline</span>
            </div>
          )}
          {user.email === 'fbassistecjari@gmail.com' && (
            <button 
              onClick={onOpenAdmin} 
              className="p-3 rounded-full border border-gold-500/30 glass-card text-gold-500 hover:bg-gold-500/10 transition-colors"
              title="Painel Admin"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => deferredPrompt ? onInstall() : setShowInstallGuide(true)}
            className="p-3 rounded-full border border-item glass-card flex items-center gap-2"
          >
            <Download className="w-5 h-5 text-muted" />
            <span className="text-[10px] uppercase tracking-widest font-bold hidden sm:inline text-muted">Instalar</span>
          </button>
          <button onClick={onToggleTheme} className="p-3 rounded-full border border-item glass-card">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Daily Mission */}
        <section className="glass-card p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-gold-500" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Missão de Hoje</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                {Object.values(mission).filter(Boolean).length}/4
              </span>
            </div>
          </div>

          {isDayCompletedToday && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center"
            >
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                ✨ Missão de hoje concluída! ✨
              </p>
              <p className="text-[10px] text-muted mt-1 uppercase tracking-widest font-bold">
                Próximo dia disponível amanhã após as 00:00hs.
              </p>
            </motion.div>
          )}

          <div className="space-y-3">
            {[
              { id: 'devotional', label: 'Ler o devocional', icon: BookOpen, action: () => onStartDay(user.progress + 1) },
              { id: 'prayer', label: 'Fazer oração guiada', icon: Heart, action: () => onStartDay(user.progress + 1) },
              { id: 'gratitude', label: 'Escrever uma gratidão', icon: Star, action: onOpenDiary },
              { id: 'reflection', label: 'Refletir no diário espiritual', icon: MessageSquare, action: onOpenDiary },
            ].map((item) => {
              const isDone = mission[item.id as keyof typeof mission];
              const isDisabled = isDayCompletedToday && (item.id === 'devotional' || item.id === 'prayer');
              
              return (
                <motion.div 
                  key={item.id} 
                  layout
                  className={`flex gap-3 p-1 rounded-2xl border transition-all duration-500 ${
                    isDone 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : 'bg-item border-item'
                  } ${isDisabled ? 'opacity-50 grayscale' : ''}`}
                >
                  <button
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      const newMission = { ...mission, [item.id]: !isDone };
                      updateMission(newMission);
                    }}
                    className={`p-4 rounded-xl transition-all duration-300 ${
                      isDone 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-white/5 text-muted hover:bg-white/10'
                    }`}
                  >
                    <motion.div
                      animate={{ scale: isDone ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </motion.div>
                  </button>
                  <button
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      item.action();
                    }}
                    className={`flex-grow flex items-center justify-between px-2 py-4 text-left group ${isDisabled ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg transition-colors ${isDone ? 'text-emerald-500' : 'text-muted opacity-50'}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-bold uppercase tracking-widest transition-all duration-500 ${
                        isDone ? 'text-emerald-500/70 line-through opacity-50' : 'text-app'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                    {!isDone && <ArrowRight className="w-4 h-4 opacity-20 group-hover:opacity-50 group-hover:translate-x-1 transition-all" />}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="relative overflow-hidden rounded-3xl p-8 text-center space-y-6 bg-gradient-to-br from-gold-500/20 via-gold-500/5 to-transparent border border-gold-500/30 shadow-2xl shadow-gold-500/10"
            >
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold-500/10 blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gold-500/10 blur-3xl rounded-full" />
              </div>

              <div className="relative z-10 space-y-4">
                <motion.div 
                  animate={{ 
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="w-20 h-20 mx-auto rounded-full bg-gold-500 flex items-center justify-center shadow-2xl shadow-gold-500/40"
                >
                  <Trophy className="w-10 h-10 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h3 className="text-2xl display-bold gold-text">Dia Concluído!</h3>
                  <p className="text-xs text-muted font-bold uppercase tracking-widest">Sua luz brilhou intensamente hoje.</p>
                </div>
                
                {user.progress < 30 && (
                  <Button 
                    variant="gold" 
                    className="w-full py-6 text-xl font-medium shadow-2xl shadow-gold-500/20 flex items-center justify-center gap-3 group mt-4"
                    onClick={() => onStartDay(user.progress + 1)}
                  >
                    Iniciar Dia {user.progress + 1}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </section>

        {/* Viral Sharing */}
        <section className="glass-card p-8 bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
            <Share2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-widest text-sm">Inspirar Outros</h4>
            <p className="text-xs text-muted leading-relaxed">Compartilhe sua luz e ajude outros a começarem a virada espiritual.</p>
          </div>
          <button 
            onClick={shareProgress}
            className="w-full py-4 rounded-2xl border border-gold-500/30 text-gold-500 text-xs font-bold uppercase tracking-widest hover:bg-gold-500/10 transition-colors"
          >
            Compartilhar Progresso
          </button>
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

        {/* Emergency Button */}
        <button 
          onClick={onOpenCrisis}
          className="w-full py-6 rounded-2xl border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-[0.3em] hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          Botão de Emergência
        </button>

        {/* Stats Cards - MOVED TO BOTTOM */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onOpenProfile}
            className="glass-card p-6 flex flex-col gap-2 relative overflow-hidden group text-left"
          >
            <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-110 transition-transform">
              <Flame className="w-16 h-16 text-orange-500" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted">Streak</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl display-bold">🔥 {user.streak}</span>
            </div>
            <span className="text-[10px] text-muted">Dias com Deus</span>
          </button>
          <button 
            onClick={onOpenProfile}
            className="glass-card p-6 flex flex-col gap-2 relative overflow-hidden group text-left"
          >
            <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-110 transition-transform">
              <Target className="w-16 h-16 text-gold-500" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted">Jornada</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl display-bold">{user.progress}/30</span>
            </div>
            <span className="text-[10px] text-muted">Dias Concluídos</span>
          </button>
        </div>

        {/* Progress Bar - MOVED TO BOTTOM */}
        <section className="glass-card p-8 space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-5xl display-bold">{Math.round(progressPercent)}%</span>
              <p className="text-xs uppercase tracking-widest text-muted">Progresso Total</p>
            </div>
            <div className="text-right space-y-1">
              <span className="text-2xl display-bold text-gold-500">
                {user.progress >= 30 ? "Concluído" : `Dia ${user.progress + 1}`}
              </span>
              <p className="text-[10px] uppercase tracking-widest text-muted">Status Atual</p>
            </div>
          </div>
          <ProgressBar current={user.progress} total={30} />
          <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-muted">
            <span>Início</span>
            <span>Destino</span>
          </div>
        </section>
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
  userId: string;
  onComplete: (reflection: string) => void; 
  onBack: () => void;
}) => {
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    if (!userId || userId === 'guest' || !day.id) return;
    const reflectionRef = doc(db, 'users', userId, 'reflections', day.id.toString());
    const unsubscribe = onSnapshot(reflectionRef, (docSnap) => {
      if (docSnap.exists()) {
        setReflection(docSnap.data().content || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/reflections/${day.id}`);
    });
    return () => unsubscribe();
  }, [userId, day.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen pb-32"
    >
      <header className="p-6 flex items-center justify-between sticky top-0 z-50 nav-blur">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-app transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Jornada 30D</p>
            <h2 className="text-lg display-bold">Dia {day.id}</h2>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-12 mt-8">
        <div className="space-y-6">
          <h1 className="text-3xl md:text-5xl display-bold leading-tight gold-text">{day.title}</h1>
          <div className="glass-card p-8 border-l-4 border-l-gold-500 relative overflow-hidden">
            <Quote className="absolute -top-4 -right-4 w-24 h-24 opacity-[0.03] rotate-12" />
            <p className="serif-italic text-2xl leading-relaxed italic">
              "{day.verse}"
            </p>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-gold-500" />
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Reflexão Profunda</h3>
            </div>
            <AudioPlayer text={day.reflection} />
          </div>
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <p className="text-xl leading-relaxed serif-italic">
              {day.reflection}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Aplicação Prática</h3>
          </div>
          <div className="glass-card p-8 bg-gold-500/[0.02]">
            <p className="text-lg leading-relaxed">
              {day.application}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-gold-500" />
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Diário de Transformação</h3>
          </div>
          <p className="text-sm text-muted italic">{day.exercise}</p>
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
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Decreto de Hoje</h3>
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
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        throw new Error(`Failed to load prayers (${res.status})`);
      })
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
        <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-app transition-colors">
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
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Socorro Bem Presente</p>
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
                    <ChevronRight className="w-5 h-5 text-muted/30 group-hover:text-gold-500 group-hover:translate-x-1 transition-all" />
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

              <div className="space-y-6 text-xl leading-relaxed serif-italic">
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
                className="w-full py-5 rounded-2xl border-item hover-bg-item" 
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
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        throw new Error(`Failed to load declarations (${res.status})`);
      })
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
        <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-app transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Decretos de Fé</h2>
      </header>

      <main className="px-6 space-y-8 mt-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Ativação Espiritual</p>
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
                  className="p-2 bg-item rounded-full hover-bg-item transition-colors"
                >
                  <Share2 className="w-4 h-4 text-muted hover:text-app" />
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
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12 bg-app"
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

      <div className="space-y-6 max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl display-bold gold-text">Vitória!</h1>
        <p className="text-xl md:text-2xl lg:text-3xl serif-italic">Você concluiu os 30 dias da sua jornada espiritual.</p>
        <p className="text-muted text-lg leading-relaxed max-w-lg mx-auto">
          Sua dedicação produziu frutos eternos. Este não é o fim, mas o início de uma nova estação de autoridade e propósito em sua vida.
        </p>
      </div>

      <div className="w-full max-w-sm mx-auto space-y-6">
        <Button 
          variant="gold" 
          className="w-full py-6 text-xl font-medium shadow-2xl shadow-gold-500/30" 
          onClick={onBack}
        >
          Continuar Navegando
        </Button>
        <div className="space-y-2 text-muted">
          <p className="serif-italic text-sm">"Combati o bom combate, acabei a carreira, guardei a fé."</p>
          <p className="text-[10px] uppercase tracking-widest font-bold">2 Timóteo 4:7</p>
        </div>
      </div>
    </motion.div>
  );
};

const ProfilePage = ({ user, achievements, onBack, onLogout, deferredPrompt, onInstall }: { user: User; achievements: any[]; onBack: () => void; onLogout: () => void; deferredPrompt: any; onInstall: () => void }) => {
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'loading'>('loading');
  const [loading, setLoading] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission as any);
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission as any);
      
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const res = await fetch('/api/push/vapid-public-key');
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error(`Failed to fetch VAPID key: ${res.status}`);
      }
      const { publicKey } = await res.json();

      if (!publicKey) {
        alert('Configuração de notificações pendente no servidor.');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, subscription: JSON.stringify(subscription) })
      });

      alert('Notificações ativadas com sucesso! 🙏');
    } catch (error) {
      console.error('Push subscription error:', error);
      alert('Erro ao ativar notificações. Verifique as permissões do navegador.');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        alert('Notificação de teste enviada! Verifique seu dispositivo.');
      } else {
        alert('Erro ao enviar teste. Você está inscrito?');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen pb-32"
    >
      <header className="p-6 flex items-center justify-between sticky top-0 z-50 nav-blur">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-app transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg display-bold">Meu Perfil</h2>
        </div>
        <button 
          onClick={() => deferredPrompt ? onInstall() : setShowInstallGuide(true)}
          className="p-2 rounded-xl bg-gold-500/10 text-gold-500 hover:bg-gold-500/20 transition-all flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Instalar App</span>
        </button>
      </header>

      <main className="px-6 space-y-12 mt-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full gold-gradient flex items-center justify-center text-white text-5xl md:text-6xl display-bold shadow-2xl shadow-gold-500/20">
            {user.name[0].toUpperCase()}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl display-bold">{user.name}</h1>
            <p className="text-muted text-sm md:text-base font-medium tracking-widest uppercase">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-6 md:p-8 text-center space-y-2">
            <Target className="w-8 h-8 mx-auto text-gold-500 opacity-50" />
            <div className="text-4xl display-bold">{user.progress}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted">Dias Concluídos</div>
          </div>
          <div className="glass-card p-6 md:p-8 text-center space-y-2">
            <Flame className="w-8 h-8 mx-auto text-orange-500 opacity-50" />
            <div className="text-4xl display-bold">{user.streak}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted">Dias Seguidos</div>
          </div>
          <div className="glass-card p-6 md:p-8 text-center space-y-2">
            <Trophy className="w-8 h-8 mx-auto text-gold-500 opacity-50" />
            <div className="text-4xl display-bold">{achievements.filter(a => a.earned_at).length}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted">Conquistas</div>
          </div>
          <div className="glass-card p-6 md:p-8 text-center space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-emerald-500 opacity-50" />
            <div className="text-4xl display-bold">30</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted">Meta Total</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Achievements */}
          <div className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted ml-1">Conquistas</h3>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`glass-card p-6 flex flex-col items-center text-center gap-3 transition-all ${
                    achievement.earned_at ? 'opacity-100' : 'opacity-40 grayscale'
                  }`}
                >
                  <span className="text-4xl">{achievement.icon}</span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-tight block">{achievement.title}</span>
                    {achievement.earned_at && (
                      <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Conquistado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted ml-1">Configurações</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowInstallGuide(true)}
                className="w-full glass-card p-6 text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-widest text-sm block">Instalar App</span>
                    <span className="text-[10px] text-muted uppercase tracking-widest font-bold">Guia de Instalação</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted group-hover:translate-x-1 transition-all opacity-30" />
              </button>

              <button 
                onClick={subscribeToPush}
                disabled={pushStatus === 'granted' || loading}
                className="w-full glass-card p-6 text-left flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-500">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-widest text-sm block">Notificações</span>
                    <span className="text-[10px] text-muted uppercase tracking-widest font-bold">
                      {pushStatus === 'granted' ? 'Ativadas' : pushStatus === 'denied' ? 'Bloqueadas' : 'Ativar Lembretes'}
                    </span>
                  </div>
                </div>
                {pushStatus !== 'granted' && !loading && <ChevronRight className="w-5 h-5 text-muted group-hover:translate-x-1 transition-all opacity-30" />}
              </button>

              {pushStatus === 'granted' && (
                <button 
                  onClick={sendTestNotification}
                  className="w-full py-4 rounded-2xl border border-item text-muted text-[10px] font-bold uppercase tracking-widest hover-bg-item transition-all"
                >
                  Enviar Notificação de Teste
                </button>
              )}

              <button onClick={onLogout} className="w-full glass-card p-6 text-left text-red-500 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-sm">Sair da Conta</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted group-hover:translate-x-1 transition-all opacity-30" />
              </button>
            </div>
          </div>
        </div>
      </main>
      <AnimatePresence>
        {showInstallGuide && <InstallGuide onClose={() => setShowInstallGuide(false)} deferredPrompt={deferredPrompt} onInstall={onInstall} />}
      </AnimatePresence>
    </motion.div>
  );
};

const ChecklistPage = ({ userId, onBack }: { userId: string; onBack: () => void }) => {
  const [morning, setMorning] = useState<string[]>([]);
  const [night, setNight] = useState<string[]>([]);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (!userId || !today) return;
    const checklistRef = doc(db, 'users', userId, 'checklists', today);
    const unsubscribe = onSnapshot(checklistRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMorning(data.morning_status || []);
        setNight(data.night_status || []);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/checklists/${today}`);
    });
    return () => unsubscribe();
  }, [userId, today]);

  const saveChecklist = async (m: string[], n: string[]) => {
    try {
      const checklistRef = doc(db, 'users', userId, 'checklists', today);
      await setDoc(checklistRef, {
        user_id: userId,
        date: today,
        morning_status: m,
        night_status: n
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/checklists/${today}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 z-50 nav-blur">
        <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-app transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Hábitos de Sucesso</h2>
      </header>

      <main className="px-6 space-y-12 mt-8 max-w-4xl mx-auto w-full">
        <div className="space-y-1 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Consistência Diária</p>
          <h3 className="text-xl md:text-2xl display-bold">Sua Rotina Espiritual</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-gold-500" />
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Manhã com Deus</h3>
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
                      : 'bg-item border-item text-muted hover-bg-item'
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-widest">{item}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    morning.includes(item) ? 'bg-gold-500 border-gold-500' : 'border-card'
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
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Noite de Entrega</h3>
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
                      : 'bg-item border-item text-muted hover-bg-item'
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-widest">{item}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    night.includes(item) ? 'bg-blue-500 border-blue-500' : 'border-card'
                  }`}>
                    {night.includes(item) && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </motion.div>
  );
};

const DiaryPage = ({ userId, onBack, onUpdateMission }: { userId: string; onBack: () => void; onUpdateMission?: (mission: any) => void }) => {
  const [gratitude, setGratitude] = useState('');
  const [learning, setLearning] = useState('');
  const [saved, setSaved] = useState(false);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (!userId || !today) return;
    const diaryRef = doc(db, 'users', userId, 'diary', today);
    const unsubscribe = onSnapshot(diaryRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGratitude(data.gratitude || '');
        setLearning(data.learning || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/diary/${today}`);
    });
    return () => unsubscribe();
  }, [userId, today]);

  const handleSave = async () => {
    if (!userId) return;
    console.log("Saving diary for user:", userId, "date:", today);
    try {
      const diaryRef = doc(db, 'users', userId, 'diary', today);
      await setDoc(diaryRef, {
        user_id: userId,
        date: today,
        gratitude,
        learning
      }, { merge: true });

      // Update mission status for today
      const checklistRef = doc(db, 'users', userId, 'checklists', today);
      await setDoc(checklistRef, {
        user_id: userId,
        date: today,
        mission_status: {
          gratitude: true,
          reflection: true
        }
      }, { merge: true });

      setSaved(true);
      console.log("Diary saved successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving diary:", err);
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/diary/${today}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-12"
    >
      <header className="p-6 flex items-center gap-4 sticky top-0 z-50 nav-blur">
        <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-app transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Diário de Bordo</h2>
      </header>

      <main className="px-6 space-y-12 mt-8 max-w-4xl mx-auto w-full">
        <div className="space-y-1 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Reflexão Diária</p>
          <h3 className="text-xl md:text-2xl display-bold">Sua Jornada com Deus</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-gold-500" />
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Gratidão</h3>
            </div>
            <p className="text-sm text-muted italic">Pelo que você é grato hoje?</p>
            <textarea 
              className="app-input min-h-[200px] resize-none text-lg serif-italic"
              placeholder="Hoje sou grato por..."
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
            />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-gold-500" />
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Aprendizado</h3>
            </div>
            <p className="text-sm text-muted italic">O que o Senhor te ensinou?</p>
            <textarea 
              className="app-input min-h-[200px] resize-none text-lg serif-italic"
              placeholder="Deus me ensinou que..."
              value={learning}
              onChange={(e) => setLearning(e.target.value)}
            />
          </section>
        </div>

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

const AudioPlayer = ({ text }: { text: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const generateAndPlay = async () => {
    if (audioUrl) {
      if (isPlaying) {
        audio?.pause();
        setIsPlaying(false);
      } else {
        audio?.play();
        setIsPlaying(true);
      }
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Leia com uma voz calma, inspiradora e espiritual: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const url = `data:audio/mp3;base64,${base64Audio}`;
        const newAudio = new Audio(url);
        newAudio.onended = () => setIsPlaying(false);
        setAudioUrl(url);
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Error generating audio:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={generateAndPlay}
      disabled={loading || !navigator.onLine}
      className="flex items-center gap-2 px-4 py-2 rounded-full gold-gradient text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-gold-500/20 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : isPlaying ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      {loading ? 'Gerando...' : isPlaying ? 'Pausar' : !navigator.onLine ? 'Offline' : 'Ouvir'}
    </button>
  );
};

const AdminPage = ({ onBack, currentUser }: { onBack: () => void, currentUser: User | null }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [bypassKiwify, setBypassKiwify] = useState(false);

  const fetchConfig = async () => {
    try {
      if (!currentUser?.email) return;
      const res = await fetch(`/api/admin/config?adminEmail=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        const bypass = data.find((c: any) => c.key === 'bypass_kiwify');
        setBypassKiwify(bypass?.value === 'true');
      }
    } catch (err) {
      console.error("Error fetching config:", err);
    }
  };

  const toggleBypass = async () => {
    try {
      const newValue = !bypassKiwify;
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: 'bypass_kiwify', 
          value: newValue, 
          adminEmail: currentUser?.email 
        })
      });
      if (res.ok) {
        setBypassKiwify(newValue);
      }
    } catch (err) {
      console.error("Error toggling bypass:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      // Firestore users
      const q = query(collection(db, 'users'), orderBy('progress', 'desc'));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);

      // SQLite users
      if (currentUser?.email) {
        const res = await fetch(`/api/admin/db-users?adminEmail=${encodeURIComponent(currentUser.email)}`);
        if (res.ok) {
          const data = await res.json();
          setDbUsers(data);
        }
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchConfig();
  }, [currentUser]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !currentUser?.email) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          adminEmail: currentUser.email
        })
      });
      if (res.ok) {
        setNewEmail('');
        setNewName('');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (!currentUser?.email) return;
    if (!window.confirm(`Remover acesso de ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}?adminEmail=${encodeURIComponent(currentUser.email)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-6 space-y-8 max-w-6xl mx-auto w-full pb-24">
      <header className="flex items-center gap-4 sticky top-0 z-50 nav-blur py-4">
        <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-app transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg display-bold">Painel Administrativo</h2>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 text-center space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Total de Almas</p>
          <p className="text-4xl display-bold gold-text">{users.length}</p>
        </div>
        <div className="glass-card p-8 text-center space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Média de Progresso</p>
          <p className="text-4xl display-bold gold-text">
            {users.length > 0 ? (users.reduce((acc, u) => acc + (u.progress || 0), 0) / users.length).toFixed(1) : 0}
          </p>
        </div>
        <div className="glass-card p-8 text-center space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Acessos Liberados</p>
          <p className="text-4xl display-bold gold-text">{dbUsers.length}</p>
        </div>
      </div>

      {/* Configurações Globais */}
      <div className="glass-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gold-500" />
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted">Configurações de Acesso</h3>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div>
            <p className="font-bold text-sm">Liberar Acesso para Todos</p>
            <p className="text-[10px] text-muted">Se ativado, qualquer pessoa poderá se cadastrar sem verificação do Kiwify.</p>
          </div>
          <button 
            onClick={toggleBypass}
            className={`w-12 h-6 rounded-full transition-colors relative ${bypassKiwify ? 'bg-emerald-500' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${bypassKiwify ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-gold-500" />
            <h3 className="text-lg display-bold">Liberar Acesso Manual</h3>
          </div>
          <form onSubmit={handleAddUser} className="space-y-4">
            <input 
              type="email" 
              placeholder="E-mail do Cliente" 
              className="app-input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="Nome do Cliente (Opcional)" 
              className="app-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button variant="gold" className="w-full" disabled={adding}>
              {adding ? 'Liberando...' : 'Liberar Acesso'}
            </Button>
          </form>

          <div className="space-y-4 mt-8">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted">Acessos Ativos</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {dbUsers.map(u => (
                <div key={u.email} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{u.name}</span>
                    <span className="text-[10px] text-muted">{u.email}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveUser(u.email)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gold-500" />
            <h3 className="text-lg display-bold">Ranking de Progresso</h3>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {users.map((u, i) => (
              <div key={u.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-white font-bold text-xs">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{u.name}</p>
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Dia {u.progress || 0} • Streak {u.streak || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold gold-text">{Math.round(((u.progress || 0) / 30) * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<'home' | 'day' | 'crisis' | 'checklist' | 'declarations' | 'diary' | 'profile' | 'congratulations' | 'admin'>('home');
  const [user, setUser] = useState<User | null>({
    id: 'guest',
    email: 'guest@example.com',
    name: 'Visitante',
    plan: 'premium',
    streak: 0,
    progress: 0,
    last_access: new Date().toISOString(),
    last_completion_date: ''
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("[PWA] beforeinstallprompt event fired");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  useEffect(() => {
    // Auth logic removed to start from zero
    setIsAuthReady(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;
    console.log("[Achievements] Fetching for user:", user.id);
    try {
      // Fetch all achievement definitions from backend
      const res = await fetch('/api/achievements');
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error(`Failed to fetch definitions: ${res.status}`);
      }
      const allAchievements = await res.json();
      console.log("[Achievements] Definitions loaded:", allAchievements.length);

      // Fetch earned achievements from Firestore
      const earnedRef = collection(db, 'users', user.id, 'achievements');
      let querySnapshot;
      try {
        querySnapshot = await getDocs(earnedRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `users/${user.id}/achievements`);
      }
      const earnedData = querySnapshot?.docs.reduce((acc: any, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {}) || {};
      console.log("[Achievements] Earned data loaded:", Object.keys(earnedData).length);

      // Merge
      const merged = allAchievements.map((ach: any) => ({
        ...ach,
        earned_at: earnedData[ach.id]?.earned_at || null
      }));

      console.log("[Achievements] Merged:", merged.filter((a: any) => a.earned_at).length, "earned of", merged.length);
      setAchievements(merged);
    } catch (err) {
      console.error("[Achievements] Error fetching:", err);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const handleLogin = (fUser: FirebaseUser) => {
    // Login logic removed
  };

  const handleLogout = async () => {
    setUser(null);
    setFirebaseUser(null);
    setView('home');
  };


  const startDay = async (dayId: number) => {
    if (user) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (dayId > user.progress && user.last_completion_date === todayStr) {
        alert("Você já completou a missão de hoje! A próxima missão estará disponível amanhã após as 00:00hs.");
        return;
      }
    }

    // Check cache first
    const cachedDay = localStorage.getItem(`day_${dayId}`);
    if (!navigator.onLine && cachedDay) {
      setCurrentDay(JSON.parse(cachedDay));
      setView('day');
      return;
    }

    setLoading(true);
    try {
      const url = `/api/days/${dayId}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao carregar o dia (${res.status})`);
      }
      
      const dayData = await res.json();
      
      if (!dayData || typeof dayData !== 'object') {
        throw new Error("Dados do dia inválidos recebidos do servidor");
      }
      
      // Save to cache
      localStorage.setItem(`day_${dayId}`, JSON.stringify(dayData));
      
      setCurrentDay(dayData);
      setView('day');
    } catch (err: any) {
      console.error("Erro ao iniciar dia:", err);
      if (cachedDay) {
        setCurrentDay(JSON.parse(cachedDay));
        setView('day');
      } else {
        alert(err.message || "Erro ao carregar o conteúdo do dia. Verifique sua conexão.");
      }
    } finally {
      setLoading(false);
    }
  };

  const completeDay = async (reflection: string) => {
    if (!user || !currentDay) return;
    console.log("Completing day:", currentDay.id, "Current progress:", user.progress);
    setLoading(true);
    try {
      // Save reflection to Firestore
      const reflectionRef = doc(db, 'users', user.id, 'reflections', currentDay.id.toString());
      try {
        await setDoc(reflectionRef, {
          user_id: user.id,
          day_id: currentDay.id,
          content: reflection
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.id}/reflections/${currentDay.id}`);
      }

      // Update user progress in Firestore
      const userRef = doc(db, 'users', user.id);
      const newProgress = Math.max(user.progress || 0, currentDay.id);
      console.log("[Progress] New progress:", newProgress);
      
      // Calculate streak
      let newStreak = user.streak || 0;
      const now = new Date();
      
      // Use local date strings for streak calculation to avoid timezone issues
      const getLocalDateString = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };

      const todayStr = getLocalDateString(now);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      
      const lastAccessStr = user.last_access ? getLocalDateString(new Date(user.last_access)) : null;

      console.log("[Streak] Today:", todayStr, "Yesterday:", yesterdayStr, "Last access:", lastAccessStr);

      if (!lastAccessStr || newStreak === 0) {
        newStreak = 1;
        console.log("[Streak] First completion or streak was 0, setting to 1");
      } else if (todayStr === lastAccessStr) {
        console.log("[Streak] Same day, keeping streak:", newStreak);
      } else if (lastAccessStr === yesterdayStr) {
        newStreak += 1;
        console.log("[Streak] Consecutive day! Incrementing to:", newStreak);
      } else {
        newStreak = 1;
        console.log("[Streak] Gap detected, resetting to 1");
      }

      console.log("[Progress] Updating Firestore with progress:", newProgress, "streak:", newStreak);
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          progress: newProgress,
          streak: newStreak,
          last_access: now.toISOString(),
          last_completion_date: todayStr
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      }

      // Sync with backend SQLite
      try {
        const res = await fetch('/api/user/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            newStreak,
            newProgress,
            lastCompletionDate: todayStr
          })
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          console.log("[Progress] Backend sync successful");
        } else {
          console.warn("[Progress] Backend sync returned non-JSON or error:", res.status);
        }
      } catch (err) {
        console.error("[Progress] Backend sync failed:", err);
      }

      // Update mission status for today
      const checklistRef = doc(db, 'users', user.id, 'checklists', todayStr);
      try {
        await setDoc(checklistRef, {
          user_id: user.id,
          date: todayStr,
          mission_status: {
            devotional: true,
            prayer: true
          }
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.id}/checklists/${todayStr}`);
      }

      // Award achievements in Firestore
      const thresholds: Record<string, number> = {
        "streak_3": 3,
        "streak_7": 7,
        "streak_15": 15,
        "streak_30": 30
      };

      console.log("[Achievements] Checking thresholds for streak:", newStreak);
      for (const [achId, threshold] of Object.entries(thresholds)) {
        // Only award if not already earned
        const alreadyEarned = achievements.find(a => a.id === achId)?.earned_at;
        
        // Special case for streak_30: also award if progress is 30
        const isProgress30 = achId === 'streak_30' && newProgress >= 30;

        if ((newStreak >= threshold || isProgress30) && !alreadyEarned) {
          console.log("[Achievements] Awarding:", achId);
          const achRef = doc(db, 'users', user.id, 'achievements', achId);
          try {
            await setDoc(achRef, {
              user_id: user.id,
              achievement_id: achId,
              earned_at: now.toISOString()
            }, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.id}/achievements/${achId}`);
          }
        }
      }

      // Re-fetch achievements to update UI
      await fetchAchievements();

      console.log("Day completion successful. Navigating...");
      if (newProgress >= 30) {
        setView('congratulations');
      } else {
        setView('home');
      }
    } catch (err) {
      console.error("Error in completeDay:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentDay && view === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full"
          />
          <p className="text-xs font-bold uppercase tracking-widest text-gold-500 animate-pulse">Carregando Jornada...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto min-h-screen shadow-2xl shadow-black/20 dark:shadow-white/5">
        <AnimatePresence>
          {!isOnline && <OfflineBanner />}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {view === 'home' && user && (
            <HomePage 
              user={user} 
              onStartDay={startDay}
              onOpenCrisis={() => setView('crisis')}
              onOpenChecklist={() => setView('checklist')}
              onOpenDeclarations={() => setView('declarations')} 
              onOpenProfile={() => setView('profile')}
              onOpenDiary={() => setView('diary')}
              onOpenAdmin={() => setView('admin')}
              theme={theme}
              onToggleTheme={toggleTheme}
              deferredPrompt={deferredPrompt}
              onInstall={handleInstall}
              isOnline={isOnline}
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
          {view === 'checklist' && user && <ChecklistPage userId={user.id} onBack={() => setView('home')} />}
          {view === 'diary' && user && (
            <DiaryPage 
              userId={user.id} 
              onBack={() => setView('home')} 
            />
          )}
          {view === 'admin' && <AdminPage onBack={() => setView('home')} currentUser={user} />}
          {view === 'congratulations' && <CongratulationsPage onBack={() => setView('home')} />}
          {view === 'profile' && user && <ProfilePage user={user} achievements={achievements} onBack={() => setView('home')} onLogout={handleLogout} deferredPrompt={deferredPrompt} onInstall={handleInstall} />}
        </AnimatePresence>

        {/* Navigation Bar */}
        {['home', 'diary', 'profile', 'checklist', 'declarations', 'crisis'].includes(view) && (
          <nav className="fixed bottom-0 left-0 right-0 max-w-6xl mx-auto nav-blur px-8 py-4 flex justify-between items-center z-20">
            <button 
              onClick={() => setView('home')}
              className={`${view === 'home' ? 'text-gold-500' : 'opacity-40'} flex flex-col items-center gap-1 transition-all hover:scale-110`}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Jornada</span>
            </button>
            <button 
              onClick={() => setView('diary')}
              className={`${view === 'diary' ? 'text-gold-500' : 'opacity-40'} flex flex-col items-center gap-1 transition-all hover:scale-110`}
            >
              <BookOpen className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Diário</span>
            </button>
            <button 
              onClick={() => setView('profile')}
              className={`${view === 'profile' ? 'text-gold-500' : 'opacity-40'} flex flex-col items-center gap-1 transition-all hover:scale-110`}
            >
              <UserIcon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Perfil</span>
            </button>
          </nav>
        )}
      </div>
    </ErrorBoundary>
  );
}
