# Lotus — Plataforma de Capacitação Profissional

Plataforma corporativa para gestão do ciclo de capacitação (cursos, turmas,
certificados com QR). Stack: Laravel + React/TS + MySQL, conteinerizado.

## Rodar localmente
Pré-requisitos: WSL2 + Docker + Git.
\`\`\`bash
git clone git@github.com:SEU_USER/lotus.git
cd lotus
cp backend/.env.example backend/.env
docker compose up -d
docker compose run --rm app php artisan key:generate
docker compose run --rm app php artisan migrate
\`\`\`
- Backend: http://localhost:8080
- Frontend: http://localhost:5173

## Documentação
Planejamento (ADRs, DER, requisitos) no Google Drive. Tasks no Notion.
