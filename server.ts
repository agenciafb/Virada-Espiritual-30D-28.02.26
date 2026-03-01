import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    plan TEXT DEFAULT 'free',
    streak INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    last_access TEXT
  );

  CREATE TABLE IF NOT EXISTS days (
    id INTEGER PRIMARY KEY,
    title TEXT,
    verse TEXT,
    reflection TEXT,
    application TEXT,
    exercise TEXT,
    declaration TEXT
  );

  CREATE TABLE IF NOT EXISTS prayers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    title TEXT,
    content TEXT,
    declaration TEXT
  );

  CREATE TABLE IF NOT EXISTS declarations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    reference TEXT
  );

  CREATE TABLE IF NOT EXISTS checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    morning_status TEXT, -- JSON string of checked items
    night_status TEXT,    -- JSON string of checked items
    UNIQUE(user_id, date)
  );
`);

// Seed initial data if empty
const dayCount = db.prepare("SELECT COUNT(*) as count FROM days").get() as { count: number };
if (dayCount.count === 0) {
  const insertDay = db.prepare("INSERT INTO days (id, title, verse, reflection, application, exercise, declaration) VALUES (?, ?, ?, ?, ?, ?, ?)");
  
  // Seed first 3 days as examples
  insertDay.run(1, "O Despertar da Identidade", "Gênesis 1:27", "Você foi criado à imagem e semelhança de Deus. Sua identidade não vem do que você faz, mas de quem você é n'Ele.", "Passe 5 minutos em silêncio hoje apenas ouvindo o que Deus diz sobre você.", "Escreva três mentiras que você acreditava sobre si mesmo e substitua-as por verdades bíblicas.", "Eu sou obra-prima de Deus, criado para grandes coisas.");
  insertDay.run(2, "A Força da Gratidão", "1 Tessalonicenses 5:18", "A gratidão abre portas para o sobrenatural. Quando agradecemos, mudamos nossa perspectiva do problema para o Provedor.", "Liste 10 coisas pelas quais você é grato hoje, mesmo as pequenas.", "Ligue para alguém hoje apenas para agradecer por algo que essa pessoa fez por você.", "Meu coração transborda gratidão e minha boca proclama as bondades do Senhor.");
  insertDay.run(3, "Vencendo o Medo", "Josué 1:9", "O medo é um ladrão de destinos. A coragem não é a ausência de medo, mas a presença de Deus que nos impulsiona.", "Identifique um passo que você tem evitado por medo e dê esse passo hoje.", "Escreva o seu maior medo e coloque o versículo de Josué 1:9 por cima dele.", "O Senhor é comigo, por isso não temerei mal algum. Sou corajoso e forte.");
  insertDay.run(4, "O Poder da Palavra", "Provérbios 18:21", "Suas palavras têm poder de vida e morte. O que você declara sobre sua vida hoje determina o seu amanhã.", "Passe o dia sem reclamar de absolutamente nada. Substitua cada queixa por um louvor.", "Escreva 5 declarações positivas sobre sua família e saúde.", "Minhas palavras são sementes de vida e prosperidade.");
  insertDay.run(5, "A Disciplina da Oração", "Mateus 6:6", "Oração não é um monólogo, é um diálogo. É no secreto que as maiores vitórias são forjadas.", "Dedique 15 minutos extras hoje apenas para conversar com Deus como um amigo.", "Escreva um pedido de oração que parece impossível e entregue-o a Deus.", "O meu Pai me ouve no secreto e me recompensa publicamente.");

  // Seed Crisis Prayers
  const insertPrayer = db.prepare("INSERT INTO prayers (category, title, content, declaration) VALUES (?, ?, ?, ?)");
  insertPrayer.run("Ansiedade", "Paz que Excede Entendimento", "Senhor, entrego agora todo o peso do meu coração. Minha mente está agitada, mas Tu é o Príncipe da Paz. Eu escolho não andar ansioso por coisa alguma, mas em tudo apresentar meus pedidos a Ti com ações de graças.", "Minha mente está guardada em Cristo Jesus. Eu descanso n'Ele.");
  insertPrayer.run("Medo", "Escudo e Fortaleza", "Pai, o medo tenta me paralisar. Mas Tua Palavra diz que não me deste espírito de temor, mas de poder, de amor e de moderação. Eu repreendo todo espírito de medo agora e me escondo sob Tuas asas.", "O Senhor é a minha luz e a minha salvação; de quem terei medo?");
  insertPrayer.run("Desânimo", "Renovação de Forças", "Senhor, sinto minhas forças se esgotando. Mas Tu prometeste que aqueles que esperam no Senhor renovarão suas forças. Voarão como águias. Correrão e não se cansarão.", "O Senhor é a força da minha vida. Eu me levanto em vitória.");
  insertPrayer.run("Financeiro", "O Senhor é meu Pastor", "Pai, as contas batem à porta, mas eu sei que Tu és o meu Provedor. Abro mão de toda preocupação e confio que suprirás cada uma das minhas necessidades segundo as Tuas riquezas em glória.", "O Senhor é meu pastor e nada me faltará.");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/days", (req, res) => {
    const days = db.prepare("SELECT * FROM days").all();
    res.json(days);
  });

  app.get("/api/days/:id", (req, res) => {
    const day = db.prepare("SELECT * FROM days WHERE id = ?").get(req.params.id);
    res.json(day);
  });

  app.get("/api/prayers", (req, res) => {
    const prayers = db.prepare("SELECT * FROM prayers").all();
    res.json(prayers);
  });

  app.get("/api/user/:email", (req, res) => {
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(req.params.email);
    if (!user) {
      db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(req.params.email, req.params.email.split('@')[0]);
      user = db.prepare("SELECT * FROM users WHERE email = ?").get(req.params.email);
    }
    res.json(user);
  });

  app.post("/api/user/progress", (req, res) => {
    const { email, progress, streak } = req.body;
    db.prepare("UPDATE users SET progress = ?, streak = ?, last_access = ? WHERE email = ?")
      .run(progress, streak, new Date().toISOString(), email);
    res.json({ success: true });
  });

  app.get("/api/checklists/:userId/:date", (req, res) => {
    const checklist = db.prepare("SELECT * FROM checklists WHERE user_id = ? AND date = ?")
      .get(req.params.userId, req.params.date);
    res.json(checklist || { morning_status: "[]", night_status: "[]" });
  });

  app.post("/api/checklists", (req, res) => {
    const { user_id, date, morning_status, night_status } = req.body;
    db.prepare(`
      INSERT INTO checklists (user_id, date, morning_status, night_status)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
      morning_status = excluded.morning_status,
      night_status = excluded.night_status
    `).run(user_id, date, JSON.stringify(morning_status), JSON.stringify(night_status));
    res.json({ success: true });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
