import cors from "cors";
import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tournamentsFilePath = path.join(__dirname, "..", "data", "tournaments.json");
const registrationsFilePath = path.join(__dirname, "..", "data", "registrations.json");
const usersFilePath = path.join(__dirname, "..", "data", "users.json");
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function readJsonFile(filePath) {
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function readTournaments() {
  return readJsonFile(tournamentsFilePath);
}

async function writeTournaments(tournaments) {
  await writeJsonFile(tournamentsFilePath, tournaments);
}

async function readRegistrations() {
  return readJsonFile(registrationsFilePath);
}

async function writeRegistrations(registrations) {
  await writeJsonFile(registrationsFilePath, registrations);
}

async function readUsers() {
  return readJsonFile(usersFilePath);
}

async function writeUsers(users) {
  await writeJsonFile(usersFilePath, users);
}

function registrationTypeForTournament(tournamentType) {
  return tournamentType === "escolar" ? "jep" : "comunidade";
}

function normalizeTournament(payload) {
  return {
    id: randomUUID(),
    title: payload.title.trim(),
    type: payload.type === "escolar" ? "escolar" : "municipal",
    status: payload.status?.trim() || "Inscrições abertas",
    startDate: payload.startDate,
    endDate: payload.endDate,
    location: payload.location?.trim() || "Local a definir",
    teams: Number(payload.teams) || 0,
    modality: payload.modality?.trim() || "Modalidade a definir",
  };
}

function validateTournament(payload) {
  if (!payload?.title?.trim()) {
    return "Informe o nome do campeonato.";
  }

  if (!payload?.startDate || !payload?.endDate) {
    return "Informe a data de início e a data de término.";
  }

  return null;
}

function validateRegistration(payload, tournament) {
  if (!payload?.tournamentId) {
    return "Selecione um campeonato para continuar.";
  }

  if (!tournament) {
    return "O campeonato selecionado não foi encontrado.";
  }

  if (registrationTypeForTournament(tournament.type) !== payload?.type) {
    return "O tipo de inscrição não corresponde ao campeonato selecionado.";
  }

  if (!payload?.organizationName?.trim()) {
    return payload?.type === "jep" ? "Informe o nome da escola." : "Informe o nome do time.";
  }

  if (!payload?.responsibleName?.trim()) {
    return "Informe o nome do responsável.";
  }

  if (!payload?.responsibleCpf?.trim()) {
    return "Informe o CPF do responsável.";
  }

  if (!payload?.email?.trim() || !payload?.phone?.trim()) {
    return "Informe o e-mail e o telefone de contato.";
  }

  return null;
}

function normalizeRegistration(payload, tournament) {
  return {
    id: randomUUID(),
    userId: payload.userId,
    tournamentId: tournament.id,
    tournamentTitle: tournament.title,
    tournamentType: tournament.type,
    type: payload.type,
    organizationName: payload.organizationName.trim(),
    responsibleName: payload.responsibleName.trim(),
    responsibleCpf: payload.responsibleCpf.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    athletes: [],
    createdAt: new Date().toISOString(),
  };
}

function validateAthlete(payload) {
  if (!payload?.name?.trim()) {
    return "Informe o nome do atleta.";
  }

  if (!payload?.cpf?.trim()) {
    return "Informe o CPF do atleta.";
  }

  if (!payload?.identity?.trim()) {
    return "Informe a identidade do atleta.";
  }

  return null;
}

function normalizeAthlete(payload) {
  return {
    id: randomUUID(),
    name: payload.name.trim(),
    cpf: payload.cpf.trim(),
    identity: payload.identity.trim(),
  };
}

function roleFromRegistrationType(type) {
  return type === "jep" ? "professor" : "capitao";
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    registrationType: user.registrationType,
  };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/auth/login", async (request, response) => {
  try {
    const users = await readUsers();
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password?.trim();

    const user = users.find(
      (item) =>
        item.email.toLowerCase() === email &&
        item.password === password,
    );

    if (!user) {
      response.status(401).json({ message: "E-mail ou senha inválidos." });
      return;
    }

    response.json({ user: sanitizeUser(user) });
  } catch (error) {
    response.status(500).json({ message: "Não foi possível realizar o login." });
  }
});

app.get("/api/tournaments", async (_request, response) => {
  try {
    const tournaments = await readTournaments();
    response.json(tournaments);
  } catch (error) {
    response.status(500).json({ message: "Não foi possível carregar os torneios." });
  }
});

app.post("/api/tournaments", async (request, response) => {
  const validationError = validateTournament(request.body);

  if (validationError) {
    response.status(400).json({ message: validationError });
    return;
  }

  try {
    const tournaments = await readTournaments();
    const tournament = normalizeTournament(request.body);
    const nextTournaments = [tournament, ...tournaments];

    await writeTournaments(nextTournaments);
    response.status(201).json(tournament);
  } catch (error) {
    response.status(500).json({ message: "Não foi possível criar o campeonato." });
  }
});

app.get("/api/registrations", async (request, response) => {
  try {
    const registrations = await readRegistrations();
    const type = request.query.type;
    const userId = request.query.userId;

    let filteredRegistrations = registrations;

    if (typeof type === "string") {
      filteredRegistrations = filteredRegistrations.filter((registration) => registration.type === type);
    }

    if (typeof userId === "string") {
      filteredRegistrations = filteredRegistrations.filter((registration) => registration.userId === userId);
    }

    response.json(filteredRegistrations);
  } catch (error) {
    response.status(500).json({ message: "Não foi possível carregar as inscrições." });
  }
});

app.post("/api/registrations", async (request, response) => {
  try {
    const tournaments = await readTournaments();
    const users = await readUsers();
    const tournament = tournaments.find((item) => item.id === request.body?.tournamentId);
    const validationError = validateRegistration(request.body, tournament);

    if (validationError) {
      response.status(400).json({ message: validationError });
      return;
    }

    let user = users.find(
      (item) => item.email.toLowerCase() === request.body.email.trim().toLowerCase(),
    );

    if (!user) {
      user = {
        id: randomUUID(),
        name: request.body.responsibleName.trim(),
        email: request.body.email.trim().toLowerCase(),
        password: request.body.responsibleCpf.trim(),
        role: roleFromRegistrationType(request.body.type),
        registrationType: request.body.type,
      };

      await writeUsers([user, ...users]);
    }

    const registrations = await readRegistrations();
    const registration = normalizeRegistration(
      {
        ...request.body,
        userId: user.id,
      },
      tournament,
    );
    const nextRegistrations = [registration, ...registrations];

    await writeRegistrations(nextRegistrations);
    response.status(201).json({
      registration,
      credentials: {
        email: user.email,
        passwordHint: "Use o CPF informado como senha inicial.",
      },
      user: sanitizeUser(user),
    });
  } catch (error) {
    response.status(500).json({ message: "Não foi possível concluir a inscrição." });
  }
});

app.post("/api/registrations/:registrationId/athletes", async (request, response) => {
  const validationError = validateAthlete(request.body);

  if (validationError) {
    response.status(400).json({ message: validationError });
    return;
  }

  try {
    const registrations = await readRegistrations();
    const registrationIndex = registrations.findIndex(
      (item) => item.id === request.params.registrationId,
    );

    if (registrationIndex < 0) {
      response.status(404).json({ message: "Inscrição não encontrada." });
      return;
    }

    const athlete = normalizeAthlete(request.body);
    const registration = registrations[registrationIndex];
    const updatedRegistration = {
      ...registration,
      athletes: [...registration.athletes, athlete],
    };

    const nextRegistrations = [...registrations];
    nextRegistrations[registrationIndex] = updatedRegistration;

    await writeRegistrations(nextRegistrations);
    response.status(201).json(updatedRegistration);
  } catch (error) {
    response.status(500).json({ message: "Não foi possível cadastrar o atleta." });
  }
});

app.listen(port, () => {
  console.log(`API do Porteirinha Joga rodando na porta ${port}`);
});
