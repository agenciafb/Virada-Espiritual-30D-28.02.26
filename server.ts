import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");
const ADMIN_EMAIL = "fbassistecjari@gmail.com";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    streak INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    last_access TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS days (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    verse TEXT NOT NULL,
    reflection TEXT NOT NULL,
    application TEXT NOT NULL,
    exercise TEXT NOT NULL,
    declaration TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prayers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    declaration TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS declarations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    reference TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    morning_status TEXT DEFAULT '[]',
    night_status TEXT DEFAULT '[]',
    mission_status TEXT DEFAULT '{}',
    UNIQUE(user_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_checklists_user_date ON checklists(user_id, date);

  CREATE TABLE IF NOT EXISTS diary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    gratitude TEXT,
    learning TEXT,
    UNIQUE(user_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_diary_user_date ON diary(user_id, date);

  CREATE TABLE IF NOT EXISTS day_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    day_id INTEGER NOT NULL,
    content TEXT,
    UNIQUE(user_id, day_id)
  );
  CREATE INDEX IF NOT EXISTS idx_reflections_user_day ON day_reflections(user_id, day_id);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    subscription TEXT NOT NULL,
    UNIQUE(user_id, subscription)
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    PRIMARY KEY(user_id, achievement_id)
  );
`);

// Seed initial data if empty or outdated
const dayCount = db.prepare("SELECT COUNT(*) as count FROM days").get() as { count: number };
// Force update to include full verse descriptions and declarations
const firstDay = db.prepare("SELECT verse FROM days WHERE id = 1").get() as { verse: string } | undefined;
const lastDay = db.prepare("SELECT declaration FROM days WHERE id = 30").get() as { declaration: string } | undefined;
if (dayCount.count !== 30 || (firstDay && !firstDay.verse.includes("-")) || (lastDay && !lastDay.declaration)) {
  db.prepare("DELETE FROM days").run();
  const insertDay = db.prepare("INSERT INTO days (id, title, verse, reflection, application, exercise, declaration) VALUES (?, ?, ?, ?, ?, ?, ?)");
  
  const daysData = [
    [1, "Transformado Pela Renovação", "Romanos 12:2 - E não vos conformeis com este mundo, mas transformai-vos pela renovação do vosso entendimento, para que experimenteis qual seja a boa, agradável e perfeita vontade de Deus.", "A transformação começa na mente. Deus muda pensamentos antes de mudar circunstâncias. Se sua mentalidade muda, sua vida muda.", "Identifique um pensamento negativo recorrente. Substitua por uma verdade bíblica.", "Hoje preciso renovar minha mente na área de:", "Minha mente está sendo renovada pela Palavra. Eu viverei a vontade perfeita de Deus."],
    [2, "Nada Me Faltará", "Salmos 23:1 - O Senhor é o meu pastor; nada me faltará.", "Deus não é apenas Salvador, Ele é Pastor diário. Quando Ele guia, não há falta — há direção.", "Entregue hoje uma preocupação específica a Deus. Evite reclamar sobre isso.", "Estou entregando ao Senhor:", "O Senhor é meu Pastor. Eu descanso na Sua direção."],
    [3, "Entregando o Controle", "Provérbios 3:5 - Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", "Confiar é abrir mão do controle. Fé começa onde o entendimento termina.", "Ore antes de decidir qualquer coisa hoje. Evite agir por impulso emocional.", "Preciso confiar em Deus na área de:", "Eu confio totalmente no Senhor."],
    [4, "Não Temas", "Isaías 41:10 - Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel.", "Deus não apenas manda você não temer — Ele promete presença. A coragem nasce da certeza de quem está ao seu lado.", "Liste três medos atuais. Ore entregando cada um a Deus.", "Meu maior medo hoje é:", "Deus está comigo. O medo não governa minha vida."],
    [5, "Vivendo Como Filho", "Romanos 8:1 - Portanto, agora nenhuma condenação há para os que estão em Cristo Jesus, que não andam segundo a carne, mas segundo o Espírito.", "A culpa paralisa. A graça libera. Você não vive mais sob acusação — vive sob adoção.", "Pare de se acusar por algo do passado. Receba o perdão de Deus.", "Preciso me libertar da culpa sobre:", "Sou livre da condenação. Sou filho amado de Deus."],
    [6, "Confiança que Produz Descanso", "Salmos 37:5 - Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", "Entregar é parar de tentar controlar. Quando você descansa, Deus age.", "Entregue um plano específico a Deus hoje.", "Estou entregando ao Senhor:", "Eu entrego meu caminho ao Senhor e descanso."],
    [7, "Paz na Ansiedade", "Filipenses 4:6 - Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças.", "Ansiedade diminui quando oração aumenta.", "Troque preocupação por oração imediata.", "Minha preocupação hoje é:", "A paz de Deus guarda minha mente."],
    [8, "Identidade Eterna", "Efésios 1:4 - Como também nos elegeu nele antes da fundação do mundo, para que fôssemos santos e irrepreensíveis diante dele em amor.", "Fui escolhido antes da fundação do mundo para ser santo e irrepreensível diante dele em amor.", "Reflita sobre o fato de que Deus te escolheu pessoalmente.", "O que significa para você ser escolhido por Deus?", "Fui escolhido antes da fundação do mundo."],
    [9, "Salvo Pela Graça", "Efésios 2:8 - Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus.", "Agradeça a Deus pelo presente gratuito da salvação.", "Como a graça de Deus mudou sua perspectiva hoje?", "Escreva sobre um momento onde você sentiu a graça de Deus:", "Sou salvo pela graça e vivo pelo favor imerecido de Deus."],
    [10, "Futuro Seguro", "Jeremias 29:11 - Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.", "Confie que os planos de Deus para você são bons.", "Qual área do seu futuro você entrega a Deus hoje?", "O que você espera que Deus faça no seu futuro?", "Meu futuro está nas mãos de Deus e é cheio de esperança."],
    [11, "Sacerdócio Real", "1 Pedro 2:9 - Mas vós sois a geração eleita, o sacerdócio real, a nação santa, o povo adquirido, para que anuncieis as virtudes daquele que vos chamou das trevas para a sua maravilhosa luz.", "Lembre-se da sua posição real em Cristo.", "Como você pode agir como um representante de Deus hoje?", "Quais virtudes de Deus você quer anunciar hoje?", "Sou geração escolhida, rei e sacerdote para Deus."],
    [12, "Sabedoria do Alto", "Tiago 1:5 - E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente, e o não lança em rosto, e ser-lhe-á dada.", "Peça sabedoria para um desafio específico que você enfrenta.", "Em qual situação você precisa da sabedoria de Deus agora?", "O que a sabedoria de Deus te direciona a fazer?", "Deus me concede sabedoria liberalmente para cada decisão."],
    [13, "Nova Criatura", "2 Coríntios 5:17 - Assim que, se alguém está em Cristo, nova criatura é; as coisas velhas já passaram; eis que tudo se fez novo.", "Deixe o passado para trás e abrace o novo de Deus.", "Qual 'coisa velha' você decide abandonar hoje?", "O que há de novo em sua vida em Cristo?", "Sou nova criação, o passado não tem poder sobre mim."],
    [14, "Prioridade Espiritual", "Mateus 6:33 - Mas, buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.", "Coloque Deus em primeiro lugar em sua agenda de hoje.", "Como você buscou o Reino em primeiro lugar hoje?", "Quais 'outras coisas' você entrega ao cuidado de Deus?", "Busco primeiro o Reino e todas as coisas me são acrescentadas."],
    [15, "Vida Pela Fé", "Hebreus 11:1 - Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem.", "Aja com base no que Deus prometeu, não no que você vê.", "Qual passo de fé você deu hoje?", "O que você está esperando com fé?", "Vivo pela fé e não pelo que vejo."],
    [16, "Oração com Fé", "Marcos 11:24 - Portanto, vos digo que tudo o que pedirdes, orando, crede que o recebereis, e tê-lo-eis.", "Ore por algo específico acreditando que Deus ouve e responde.", "Pelo que você orou com fé hoje?", "Como você se sente sabendo que Deus te ouviu?", "Minhas orações são ouvidas e respondidas pelo Pai."],
    [17, "Fé em Ação", "Tiago 2:26 - Porque, assim como o corpo sem o espírito está morto, assim também a fé sem obras é morta.", "Demonstre sua fé através de uma ação concreta.", "Qual ação acompanhou sua fé hoje?", "Como sua fé se tornou visível hoje?", "Minha fé produz obras e glorifica a Deus."],
    [18, "Armadura Espiritual", "Efésios 6:11 - Revesti-vos de toda a armadura de Deus, para que possais estar firmes contra as astutas ciladas do diabo.", "Declare cada peça da armadura sobre sua vida hoje.", "Qual parte da armadura você mais precisou hoje?", "Como você se sente protegido por Deus?", "Estou revestido da armadura de Deus e sou inabalável."],
    [19, "Autoridade Espiritual", "Lucas 10:19 - Eis que vos dou poder para pisar serpentes e escorpiões, e toda a força do inimigo, e nada vos fará dano algum.", "Exerça sua autoridade em Cristo sobre as circunstâncias.", "Em qual área você exerceu autoridade hoje?", "O que você declarou com autoridade hoje?", "Tenho autoridade em Cristo sobre todo o mal."],
    [20, "Poder do Espírito", "Atos 1:8 - Mas recebereis a virtude do Espírito Santo, que há de vir sobre vós; e ser-me-eis testemunhas, tanto em Jerusalém como em toda a Judeia e Samaria, e até aos confins da terra.", "Peça ao Espírito Santo que te capacite para testemunhar.", "Como o poder do Espírito se manifestou em você hoje?", "A quem você testemunhou do amor de Deus?", "Recebo poder do Espírito Santo para ser testemunha."],
    [21, "Amor Verdadeiro", "1 Coríntios 13:7 - Tudo sofre, tudo crê, tudo espera, tudo suporta.", "Pratique o amor paciente e bondoso com alguém difícil.", "Quem você escolheu amar hoje?", "Como o amor de Deus fluiu através de você?", "O amor de Deus em mim tudo suporta e nunca falha."],
    [22, "Mente no Alto", "Colossenses 3:2 - Pensai nas coisas que são de cima, e não nas que são da terra.", "Desvie o foco dos problemas terrenos para a realidade celestial.", "Quais pensamentos do alto ocuparam sua mente hoje?", "Como sua perspectiva mudou ao olhar para cima?", "Minha mente está nas coisas do alto, onde Cristo está."],
    [23, "Obra Completa", "Filipenses 1:6 - Tendo por certo isto mesmo, que aquele que em vós começou a boa obra a aperfeiçoará até ao dia de Jesus Cristo.", "Descanse na certeza de que Deus não deixa nada inacabado.", "Em que área você vê Deus trabalhando em você?", "O que você agradece a Deus por estar aperfeiçoando?", "Deus completará a boa obra que começou em mim."],
    [24, "Disciplina Espiritual", "1 Timóteo 4:7 - Mas rejeita as fábulas profanas e de velhas, e exercita-te a ti mesmo em piedade.", "Dedique tempo à leitura da Bíblia e oração como um exercício.", "Como foi seu exercício de fé hoje?", "Qual disciplina espiritual você quer fortalecer?", "Me exercito na piedade e cresço na graça."],
    [25, "Perseverança", "Mateus 24:13 - Mas aquele que perseverar até ao fim será salvo.", "Não desista, mesmo quando o caminho parecer difícil.", "O que te motivou a perseverar hoje?", "Em qual área você decidiu não desistir?", "Persevero com paciência e alcançarei a promessa."],
    [26, "Paz Verdadeira", "João 14:27 - Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize.", "Receba a paz que Jesus oferece, que é independente das circunstâncias.", "Como você experimentou a paz de Cristo hoje?", "O que tentou roubar sua paz e como você reagiu?", "A paz de Cristo, que excede o entendimento, guarda meu coração."],
    [27, "Permanecer em Cristo", "João 15:5 - Eu sou a videira, vós as varas; quem está em mim, e eu nele, esse dá muito fruto; porque sem mim nada podeis fazer.", "Mantenha sua conexão com Jesus através da oração constante.", "Como você permaneceu conectado a Jesus hoje?", "Quais frutos você deseja produzir permanecendo n'Ele?", "Permaneço em Cristo e n'Ele produzo muito fruto."],
    [28, "Deus é Amor", "1 João 4:8 - Aquele que não ama não conhece a Deus; porque Deus é amor.", "Reflita sobre a natureza amorosa de Deus.", "Como você sentiu o amor de Deus hoje?", "Como você pode demonstrar esse amor a alguém?", "Vivo mergulhado no amor de Deus, que me aceita."],
    [29, "Todas as Coisas Novas", "Apocalipse 21:5 - E o que estava assentado sobre o trono disse: Eis que faço novas todas as coisas. E disse-me: Escreve; porque estas palavras são verdadeiras e fiéis.", "Acredite que Deus pode restaurar qualquer situação.", "O que Deus está renovando em sua vida agora?", "Qual área morta você crê que Deus trará vida?", "Deus faz novas todas as coisas em minha vida hoje."],
    [30, "A Obra Concluída", "Filipenses 1:6 - Tendo por certo isto mesmo, que aquele que em vós começou a boa obra a aperfeiçoará até ao dia de Jesus Cristo.", "Celebre a jornada e a fidelidade de Deus.", "Qual a maior lição desses 30 dias?", "Como você se sente ao concluir esta jornada?", "Deus é fiel para completar tudo o que prometeu a meu respeito."]
  ];

  daysData.forEach(day => {
    insertDay.run(day[0], day[1], day[2], day[3], day[4], day[5], day[6]);
  });
}

const prayerCount = db.prepare("SELECT COUNT(*) as count FROM prayers").get() as { count: number };
if (prayerCount.count < 7) {
  db.prepare("DELETE FROM prayers").run();
  const insertPrayer = db.prepare("INSERT INTO prayers (category, title, content, declaration) VALUES (?, ?, ?, ?)");
  insertPrayer.run("Ansiedade", "Paz que Excede Entendimento", "Senhor, entrego agora todo o peso do meu coração. Minha mente está agitada, mas Tu é o Príncipe da Paz. Eu escolho não andar ansioso por coisa alguma, mas em tudo apresentar meus pedidos a Ti com ações de graças.", "Minha mente está guardada em Cristo Jesus. Eu descanso n'Ele.");
  insertPrayer.run("Medo", "Escudo e Fortaleza", "Pai, o medo tenta me paralisar. Mas Tua Palavra diz que não me deste espírito de temor, mas de poder, de amor e de moderação. Eu repreendo todo espírito de medo agora e me escondo sob Tuas asas.", "O Senhor é a minha luz e a minha salvação; de quem terei medo?");
  insertPrayer.run("Desânimo", "Renovação de Forças", "Senhor, sinto minhas forças se esgotando. Mas Tu prometeste que aqueles que esperam no Senhor renovarão suas forças. Voarão como águias. Correrão e não se cansarão.", "O Senhor é a força da minha vida. Eu me levanto em vitória.");
  insertPrayer.run("Ataque Espiritual", "Armadura de Deus", "Senhor, me revisto agora de toda a Tua armadura. Tomo o escudo da fé para apagar todos os dardos inflamados do maligno. Declaro que maior és Tu que habitas em mim do que qualquer força das trevas. Em nome de Jesus, todo ataque é derrotado.", "Estou revestido da armadura de Deus e sou inabalável em Cristo.");
  insertPrayer.run("Confusão", "Mente Renovada", "Pai, minha mente está confusa e cansada. Mas Tu não és Deus de confusão, e sim de paz. Renova minha mente agora pelo Teu Espírito. Dá-me clareza, direcionamento e entendimento sobrenatural para cada decisão.", "Tenho a mente de Cristo. Deus me dá clareza e direção.");
  insertPrayer.run("Financeiro", "O Senhor é meu Pastor", "Pai, as contas batem à porta, mas eu sei que Tu és o meu Provedor. Abro mão de toda preocupação e confio que suprirás cada uma das minhas necessidades segundo as Tuas riquezas em glória.", "O Senhor é meu pastor e nada me faltará.");
  insertPrayer.run("Família", "Casa Edificada na Rocha", "Senhor, consagro minha família a Ti. Que nossa casa seja um lugar de paz, perdão e alegria. Protege nossos relacionamentos de toda discórdia e maldade.", "Eu e minha casa serviremos ao Senhor.");
}

const declCount = db.prepare("SELECT COUNT(*) as count FROM declarations").get() as { count: number };
if (declCount.count !== 21) {
  // Clear old declarations and seed new ones
  db.prepare("DELETE FROM declarations").run();
  
  const insertDecl = db.prepare("INSERT INTO declarations (id, content, reference) VALUES (?, ?, ?)");
  const declarations = [
    ["Sou filho amado de Deus, aceito completamente em Cristo Jesus. Minha identidade não depende de desempenho, mas da obra consumada de Jesus.", "1 João 3:1"],
    ["Sou nova criatura em Cristo. As coisas velhas já passaram; tudo se fez novo.", "2 Coríntios 5:17"],
    ["Fui criado com propósito intencional por Deus. Sou obra-prima divina, criado para boas obras.", "Efésios 2:10"],
    ["Sou justificado pela fé em Cristo. Não há condenação para mim. Tenho paz com Deus.", "Romanos 5:1"],
    ["Sou templo do Espírito Santo. Deus habita em mim pelo Seu Espírito.", "1 Coríntios 6:19"],
    ["Fui escolhido antes da fundação do mundo para ser santo e irrepreensível diante de Deus.", "Efésios 1:4"],
    ["Sou mais que vencedor por meio daquele que me amou. Nada pode me separar do amor de Cristo.", "Romanos 8:37-39"],
    ["Deus suprirá todas as minhas necessidades segundo Suas riquezas em glória.", "Filipenses 4:19"],
    ["Nenhuma arma forjada contra mim prosperará.", "Isaías 54:17"],
    ["O Senhor é meu pastor; nada me faltará. Ele restaura minha alma e me guia.", "Salmos 23:1"],
    ["Toda graça abundará sobre mim, e terei o suficiente para toda boa obra.", "2 Coríntios 9:8"],
    ["Os anjos do Senhor acampam ao meu redor e me livram.", "Salmos 34:7"],
    ["O sangue de Jesus me purifica e tenho livre acesso ao trono da graça.", "Hebreus 4:16"],
    ["Maior é aquele que está em mim do que aquele que está no mundo.", "1 João 4:4"],
    ["Lanço toda minha ansiedade sobre Deus, porque Ele cuida de mim.", "1 Pedro 5:7"],
    ["Tudo posso naquele que me fortalece.", "Filipenses 4:13"],
    ["Deus tem planos de paz para mim, para me dar futuro e esperança.", "Jeremias 29:11"],
    ["A fé é o firme fundamento das coisas que espero.", "Hebreus 11:1"],
    ["Deus está fazendo uma coisa nova em minha vida.", "Isaías 43:19"],
    ["Porque eu creio, falarei. Minha boca declara a fidelidade do Senhor.", "2 Coríntios 4:13"],
    ["O que Deus começou em mim, Ele completará.", "Filipenses 1:6"]
  ];

  declarations.forEach((d, i) => {
    insertDecl.run(i + 1, d[0], d[1]);
  });
}

const achievementCount = db.prepare("SELECT COUNT(*) as count FROM achievements").get() as { count: number };
if (achievementCount.count === 0) {
  const insertAchievement = db.prepare("INSERT INTO achievements (id, title, description, icon) VALUES (?, ?, ?, ?)");
  insertAchievement.run("streak_3", "3 Dias com Deus", "Manteve sua chama acesa por 3 dias seguidos.", "🔥");
  insertAchievement.run("streak_7", "7 Dias com Deus", "Uma semana inteira de fidelidade e busca.", "🛡️");
  insertAchievement.run("streak_15", "15 Dias com Deus", "Metade do caminho percorrido com excelência.", "⚔️");
  insertAchievement.run("streak_30", "Guerreiro da Virada", "Concluiu os 30 dias de transformação total.", "🏆");
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1); // Trust Vercel/Cloud Run proxies
  app.use(express.json());

  // Logging middleware for API routes
  app.use("/api/*", (req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.originalUrl}`);
    next();
  });

  const PORT = process.env.PORT || 3000;

  // Web Push Configuration
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@example.com";

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/days", (req, res) => {
    try {
      const days = db.prepare("SELECT * FROM days").all();
      res.json(days || []);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch days" });
    }
  });

  app.get("/api/days/:id", (req, res) => {
    try {
      const day = db.prepare("SELECT * FROM days WHERE id = ?").get(req.params.id);
      res.json(day || null);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch day" });
    }
  });

  app.get("/api/prayers", (req, res) => {
    try {
      const prayers = db.prepare("SELECT * FROM prayers").all();
      res.json(prayers || []);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch prayers" });
    }
  });

  app.get("/api/declarations", (req, res) => {
    try {
      const declarations = db.prepare("SELECT * FROM declarations").all();
      res.json(declarations || []);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch declarations" });
    }
  });

  app.get("/api/user", (req, res) => {
    try {
      const emailParam = (req.query.email as string || "").toLowerCase().trim();
      if (!emailParam) {
        return res.status(400).json({ error: "E-mail não fornecido" });
      }

      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(emailParam) as any;
      
      // Auto-authorize the admin/developer
      if (!user && emailParam === ADMIN_EMAIL) {
        const id = Math.random().toString(36).substring(2, 15);
        db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(id, emailParam, "Admin");
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(emailParam);
      }
      
      if (!user) {
        return res.status(403).json({ 
          error: "Acesso negado. Este e-mail não possui uma compra ativa.",
          details: "Se você acabou de comprar, aguarde alguns minutos pela liberação."
        });
      }
      
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao verificar usuário" });
    }
  });

  app.get("/api/user/:email", (req, res) => {
    try {
      const email = req.params.email.toLowerCase().trim();
      
      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      
      // Auto-authorize the admin/developer
      if (!user && email === ADMIN_EMAIL) {
        const id = Math.random().toString(36).substring(2, 15);
        db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(id, email, "Admin");
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      }
      
      if (!user) {
        return res.status(403).json({ 
          error: "Acesso negado. Este e-mail não possui uma compra ativa.",
          details: "Se você acabou de comprar, aguarde alguns minutos pela liberação."
        });
      }
      
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao verificar usuário" });
    }
  });

  // Webhook para Kiwify
  app.post("/api/webhook/kiwify", (req, res) => {
    try {
      // Verificação de segurança (Token secreto configurado no Kiwify e no .env)
      const kiwifyToken = process.env.KIWIFY_TOKEN;
      const receivedToken = req.query.token || req.headers['x-kiwify-signature'];

      if (kiwifyToken && receivedToken !== kiwifyToken) {
        console.warn("Tentativa de acesso não autorizado ao Webhook Kiwify.");
        return res.status(401).send("Unauthorized");
      }

      const { order_status, customer } = req.body;

      // Log para debug (opcional)
      console.log("Webhook Kiwify recebido:", { order_status, email: customer?.email });

      // Kiwify envia 'paid' ou 'approved' dependendo da versão/configuração
      if (order_status === "paid" || order_status === "approved") {
        const email = customer.email.toLowerCase().trim();
        const name = customer.full_name || email.split('@')[0];

        // Verifica se o usuário já existe
        const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

        if (!existingUser) {
          const id = Math.random().toString(36).substring(2, 15);
          db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(id, email, name);
          console.log(`Novo comprador liberado: ${email}`);
        } else {
          console.log(`Comprador já possuía acesso: ${email}`);
        }
      }

      // Sempre retorne 200 para o Kiwify não tentar reenviar
      res.status(200).send("OK");
    } catch (err) {
      console.error("Erro no Webhook Kiwify:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/api/user/progress", (req, res) => {
    try {
      const { email, newProgress, newStreak } = req.body;
      if (!email || newProgress === undefined) {
        return res.status(400).json({ error: "Missing email or progress" });
      }

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.status(404).json({ error: "User not found" });

      const now = new Date();
      
      // Update user with the current timestamp (ISO)
      db.prepare("UPDATE users SET progress = ?, streak = ?, last_access = ? WHERE email = ?")
        .run(newProgress, newStreak, now.toISOString(), email);

      // Check for achievements - award all that apply up to current streak
      const achievements = db.prepare("SELECT id, title FROM achievements").all() as any[];
      const thresholds: Record<string, number> = {
        "streak_3": 3,
        "streak_7": 7,
        "streak_15": 15,
        "streak_30": 30
      };

      achievements.forEach(ach => {
        const threshold = thresholds[ach.id];
        const isProgress30 = ach.id === 'streak_30' && newProgress >= 30;
        if ((threshold && newStreak >= threshold) || isProgress30) {
          db.prepare("INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, earned_at) VALUES (?, ?, ?)")
            .run(user.id, ach.id, now.toISOString());
        }
      });

      res.json({ success: true, streak: newStreak, progress: newProgress });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });

  app.get("/api/achievements", (req, res) => {
    try {
      const achievements = db.prepare("SELECT * FROM achievements").all();
      res.json(achievements);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.get("/api/user/:userId/achievements", (req, res) => {
    try {
      const achievements = db.prepare(`
        SELECT a.*, ua.earned_at 
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      `).all(req.params.userId);
      res.json(achievements);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  app.post("/api/push/subscribe", (req, res) => {
    try {
      const { user_id, subscription } = req.body;
      if (!user_id || !subscription) {
        return res.status(400).json({ error: "Missing user_id or subscription" });
      }

      db.prepare(`
        INSERT INTO push_subscriptions (user_id, subscription)
        VALUES (?, ?)
        ON CONFLICT(user_id, subscription) DO NOTHING
      `).run(user_id, JSON.stringify(subscription));

      res.status(201).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  app.post("/api/push/send-all", async (req, res) => {
    try {
      const { title, body, url } = req.body;
      const subscriptions = db.prepare("SELECT subscription FROM push_subscriptions").all() as any[];
      
      const payload = JSON.stringify({ title, body, url: url || '/' });

      const results = await Promise.allSettled(subscriptions.map(sub => {
        return webpush.sendNotification(JSON.parse(sub.subscription), payload);
      }));

      res.json({ success: true, sent: results.filter(r => r.status === 'fulfilled').length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  app.post("/api/push/test", async (req, res) => {
    try {
      const { user_id } = req.body;
      const subscription = db.prepare("SELECT subscription FROM push_subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(user_id) as any;
      
      if (!subscription) return res.status(404).json({ error: "Subscription not found" });

      const payload = JSON.stringify({ 
        title: "Teste de Notificação", 
        body: "Sua conexão com o Reino está ativa! 🙏", 
        url: '/' 
      });

      await webpush.sendNotification(JSON.parse(subscription.subscription), payload);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  app.get("/api/checklists/:userId/:date", (req, res) => {
    try {
      const checklist = db.prepare("SELECT * FROM checklists WHERE user_id = ? AND date = ?")
        .get(req.params.userId, req.params.date);
      res.json(checklist || { morning_status: "[]", night_status: "[]", mission_status: "{}" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  app.post("/api/checklists", (req, res) => {
    try {
      const { user_id, date, morning_status, night_status, mission_status } = req.body;
      if (!user_id || !date) {
        return res.status(400).json({ error: "Missing user_id or date" });
      }

      db.prepare(`
        INSERT INTO checklists (user_id, date, morning_status, night_status, mission_status)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
        morning_status = COALESCE(excluded.morning_status, morning_status),
        night_status = COALESCE(excluded.night_status, night_status),
        mission_status = COALESCE(excluded.mission_status, mission_status)
      `).run(
        user_id, 
        date, 
        morning_status ? JSON.stringify(morning_status) : null, 
        night_status ? JSON.stringify(night_status) : null,
        mission_status ? JSON.stringify(mission_status) : null
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save checklist" });
    }
  });

  app.get("/api/diary/:userId/:date", (req, res) => {
    try {
      const entry = db.prepare("SELECT * FROM diary WHERE user_id = ? AND date = ?")
        .get(req.params.userId, req.params.date);
      res.json(entry || { gratitude: "", learning: "" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch diary entry" });
    }
  });

  app.post("/api/diary", (req, res) => {
    try {
      const { user_id, date, gratitude, learning } = req.body;
      if (!user_id || !date) {
        return res.status(400).json({ error: "Missing user_id or date" });
      }

      db.prepare(`
        INSERT INTO diary (user_id, date, gratitude, learning)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
        gratitude = excluded.gratitude,
        learning = excluded.learning
      `).run(user_id, date, gratitude, learning);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save diary entry" });
    }
  });

  app.get("/api/reflections/:userId/:dayId", (req, res) => {
    try {
      const reflection = db.prepare("SELECT * FROM day_reflections WHERE user_id = ? AND day_id = ?")
        .get(req.params.userId, req.params.dayId);
      res.json(reflection || { content: "" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch reflection" });
    }
  });

  app.post("/api/reflections", (req, res) => {
    try {
      const { user_id, day_id, content } = req.body;
      if (!user_id || !day_id) {
        return res.status(400).json({ error: "Missing user_id or day_id" });
      }

      db.prepare(`
        INSERT INTO day_reflections (user_id, day_id, content)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, day_id) DO UPDATE SET
        content = excluded.content
      `).run(user_id, day_id, content);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save reflection" });
    }
  });

  // API 404 handler - Catch all unhandled /api/* routes
  app.all("/api/*", (req, res) => {
    console.warn(`404 - API Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method, 
      path: req.originalUrl 
    });
  });

  // General Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Server Error:", err);
    if (req.path.startsWith("/api/")) {
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    } else {
      next(err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    
    // Simple scheduler for notifications
    setInterval(async () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Morning: 08:00
      if (hours === 8 && minutes === 0) {
        await sendAllNotifications("Seu devocional de hoje está pronto.", "Venha renovar suas forças!");
      }
      // Afternoon: 15:00
      if (hours === 15 && minutes === 0) {
        await sendAllNotifications("Pare 1 minuto.", "Deus quer falar com você agora.");
      }
      // Night: 21:00
      if (hours === 21 && minutes === 0) {
        await sendAllNotifications("Antes de dormir...", "Escreva uma gratidão pelo seu dia.");
      }
    }, 60000); // Check every minute
  });

  async function sendAllNotifications(title: string, body: string) {
    try {
      const subscriptions = db.prepare("SELECT subscription FROM push_subscriptions").all() as any[];
      const payload = JSON.stringify({ title, body, url: '/' });
      await Promise.allSettled(subscriptions.map(sub => {
        return webpush.sendNotification(JSON.parse(sub.subscription), payload);
      }));
    } catch (err) {
      console.error("Scheduled notification error:", err);
    }
  }
}

startServer();
