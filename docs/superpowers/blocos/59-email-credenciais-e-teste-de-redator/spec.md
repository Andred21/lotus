# Spec — `email-credenciais-e-teste-de-redator` — 2026-11-07

> Item 59, lane aberta pelo `lane.sh abrir` em 2026-11-07 (`lane_base cd2a8a57`), offset +1.
> `Contexto: não`: as fontes estão no repositório (ADR-23, runbook `deploy/aws/README.md` §13,
> P-98, FUT-4) e na medição de produção feita no brainstorming (§1). Ficha e bloco saem na mesma
> branch e PR, a pedido do João (desvio da invariante 10, como o item 42).

## 1. Contexto — medido em 2026-11-07, não suposto

- **SES em sandbox, por decisão** (ADR-23, emenda de 2026-10-01). `aws sesv2 get-account
  --profile lotus --region sa-east-1`: `ProductionAccessEnabled: false`, `SendingEnabled: true`,
  200/24 h, 1/s, `SentLast24Hours: 0`. Identidades: `lotusotec.cl` (DOMAIN, `SUCCESS`) e o Gmail
  pessoal do João (EMAIL_ADDRESS, `SUCCESS`). Nenhuma outra.
- **Produção** (`/opt/lotus/.env`): `MAIL_MAILER=ses`, `MAIL_FROM_ADDRESS=lotus@lotusotec.cl`,
  `MAIL_FROM_NAME=Lotus`, `APP_NAME=Lotus`, `FRONTEND_URL=https://app.lotusotec.cl`,
  `SESSION_DRIVER=database` (molde `deploy/aws/env.prod.example:59`).
- **Usuários que autenticam em produção:** admin 1 (`gmail.com`, superadmin), admin 2
  (`lotusotec.cl`, superadmin), redatores 252 (`switch-chile.cl`), 253 e 254 (`gmail.com`), todos
  ativos e com role `redator`. Os três redatores nasceram da carga inicial de 2026-10-24, que
  contorna o `CreateRedatorAction` e **não** dispara convite (`CarregadorDeCadastros::redatores`).
  Nenhum tem linha em `invitation_tokens` nem em `password_reset_tokens`, nenhum tem `login_logs`.
  **O redator 252 tem as 12 turmas de produção; 253 e 254 têm zero.**
- **Consequência:** hoje um convite ou reset para qualquer redator é recusado pelo SES
  (`MessageRejected`), calado por dentro (`FalhaDeObservabilidade`). O CloudWatch
  (`/lotus/prod/containers`, retenção 30 dias) não tem nenhum `Falha ao enviar` desde 2026-10-08:
  ninguém tentou.
- **Ensaio local em `main@cd2a8a57`:** `SendRedatorAccessInvitationAction` com o mailer forçado
  para `smtp://mailpit:1025` entrega no Mailpit `Acceso a la plataforma Lotus`, com link
  `/definir-clave/<token>?email=…&flow=invite`, 7 dias. O e-mail **não leva senha**: leva link de
  definir clave. Defeito de texto: o corpo trata por "tú" (`lang/es_CL/identity.php`) e o rodapé do
  template do Laravel por "usted" (`lang/es_CL.json:85`, "Si está teniendo problemas… copie y
  pegue…"). O `backend/.env` local está com `MAIL_MAILER=log`, então o dev não usa o Mailpit por
  padrão (o `.env.example` diz `smtp`/`mailpit`); não é versionado e não é escopo.

## 2. Intenção

O João quer duas coisas, nesta ordem:

1. **E-mail que entrega a qualquer domínio** sem verificar destinatário um a um. Começa pelas
   credenciais do redator (o convite de primeiro acesso, que já existe e tem botão em Personas ›
   Redatores) e prepara o terreno para, no futuro, mandar ao cliente os dados da turma para ele
   enviar a documentação (FUT-4).
2. **Ver o Lotus com os olhos de um redator real em produção**: as turmas dele, o menu, os módulos
   que ele não tem e a turma que ele não aplica.

Sucesso: a conta SES fora do sandbox, a entrega provada em dois domínios externos não verificados,
e o João tendo percorrido a interface como redator em produção — sem código novo de acesso, sem
trocar dado cadastral de ninguém e com rastro do que foi feito.

## 3. Decisões

**Do João:**

- **D1 — SES com production access, não Resend.** O Resend também exige domínio verificado para
  mandar a terceiros (DNS novo na zona `lotus-dns`, que é do site) e põe uma API key no host; o SES
  já tem a identidade `lotusotec.cl` com DKIM, SPF (MAIL FROM `ses.`) e DMARC passando, e a
  credencial é a instance role. A única trava é o sandbox, que é da conta. Resend fica como plano B
  **só se a AWS recusar** — e aí é outro bloco, com ADR próprio.
- **D2 — Sem "ver como" e sem código novo para o objetivo 2.** O acesso a redator real se faz
  trocando **só a senha** no banco de produção, mantendo o e-mail original. Depois do teste a senha
  é limpa.
- **D3 — Rastro de auditoria fica.** Nada do teste é apagado: nem `audits`, nem `login_logs`.
- **D4 — Contas do teste: 252 e 253.** O 252 mostra a parte real (12 turmas). O 253, sem turma,
  prova o acesso negado a uma turma do 252. *(O João escolheu "trocar a senha" em vez de criar
  usuário de teste ou trocar e-mail; 252 e 253 foram a proposta de contas, sobre o mesmo
  raciocínio dele de validar turmas e parte real.)*
- **D5 — Primeiro local, depois produção.**
- **D6 — Convite aos redatores reais fica fora.** O João libera o acesso deles quando decidir,
  pelo botão de reenviar convite.

**Do Claude (marcadas para o João conferir):**

- **D7 — A prova de entrega é uma sonda, não um convite.** Como D2 não manda e-mail e D6 tira o
  convite real, a prova do objetivo 1 é a sonda positiva do runbook §13.3, pelo `tinker`
  interativo: uma mensagem para um endereço `@prismusai.com` do João e outra para um Gmail que
  **não** é identidade verificada (o João indica qual). A prova é a mensagem na caixa, com SPF,
  DKIM e DMARC `pass` no cabeçalho, mais o `get-send-statistics` sem `Bounces`/`Rejects`.
- **D8 — Troca e limpeza por scripts versionados na pasta do bloco, que o João roda.** Escrita em
  produção é do João (o auto mode recusa). Os scripts vivem em
  `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/`, são PHP de `tinker`
  e mudam o `User` **pelo Eloquent** (nunca `DB::table()->update`), para gerar o evento. O
  `password` está fora do `$auditInclude` do `User`, então o audit sai com `old_values`/
  `new_values` vazios e, no `tinker`, sem autor: o rastro de **o quê e por quê** é o `audit.md` do
  bloco (§6), não o `audits`.
- **D9 — Senha de teste aleatória, nunca escrita em arquivo.** O script de troca gera
  `Str::password(32)` por conta, imprime uma vez no terminal do João e não grava em lugar nenhum.
- **D10 — Limpeza:** para cada conta, senha nova `Str::random(64)` que ninguém vê, `remember_token`
  nulo e as linhas de `sessions` do `user_id` apagadas (`SESSION_DRIVER=database`). Conferência
  por leitura: impressão digital do hash (8 primeiros hex do `sha256` do hash) antes da troca,
  depois da troca e depois da limpeza — os três diferentes —, e zero sessões. Os tokens de convite
  e reset seguem vazios. O primeiro acesso real virá pelo convite (D6), que define a clave por cima.
- **D11 — Emenda do ADR-23**, não ADR novo: o mailer, a identidade, a role e a policy não mudam;
  muda só o "sandbox por decisão". O gatilho escrito lá ("verificar externo virando rotina") disparou:
  os três redatores são externos.
- **D12 — A identidade pessoal do Gmail do João fica.** O runbook §13.6 diz que pode sair depois da
  aprovação; sair não ganha nada e é escrita na AWS. Fica, registrado.
- **D13 — Texto do e-mail:** só a chave do rodapé em `lang/es_CL.json:85` passa a "tú" ("Si tienes
  problemas para hacer clic en el botón \":actionText\", copia y pega la URL de abajo en tu
  navegador:"). O `pt_BR` já trata por "você" e o `en` não tem registro; a paridade não muda (mesma
  chave nos três).

## 4. O que se constrói

### 4.1 Código (TDD, Pint só nos arquivos tocados)

- `backend/lang/es_CL.json`, chave do rodapé (D13), com teste que renderiza o
  `RedatorAccessInvitation` em `es_CL` e reprova "copie y pegue"/"Si está teniendo". Visto
  reprovar contra o texto antigo antes do fix.

### 4.2 Scripts de produção (D8 a D10)

Na pasta `scripts/` do bloco:

- `impressao-digital.php` — leitura pura: para os ids informados, imprime `id`, `type`,
  `is_active`, impressão digital do hash, nº de sessões, nº de tokens de convite/reset, nº de
  `login_logs`, `updated_at`. Roda antes, entre e depois.
- `trocar-senha.php` — recusa se o id não for `type=redator` ativo ou estiver fora da allowlist
  `[252, 253]` (no ensaio local, a allowlist é a dos ids do seed, por variável no topo); troca pelo
  Eloquent; imprime a senha uma vez.
- `limpar-senha.php` — mesma recusa; senha aleatória invisível, `remember_token` nulo, sessões
  apagadas; imprime a impressão digital nova.

Como o João roda (texto pronto no plano): `ssh … "sudo docker exec -i lotus-app-1 php artisan
tinker" < <script>` a partir do host dele. O ensaio local usa os mesmos arquivos contra o
container `app` da lane.

### 4.3 Checklist do redator (local e produção)

Percorrido com cada conta, resultado anotado no `audit.md`:

1. Login com a senha de teste; o que aparece no menu lateral.
2. Lista de turmas: 252 vê as 12; 253 vê lista vazia.
3. Abrir uma turma do 252: alunos, documentos, notas. Anota quais ações a tela oferece e quais
   esconde ou desabilita.
4. 253 abre pela URL o id de uma turma do 252: espera 404 (turma alheia indistinguível de
   inexistente, D3 da spec de turma).
5. URL direta de módulos sem permissão (Comercial, Administración, Certificados, Dashboard
   gerencial): o que a tela mostra e o que a API responde (403 esperado).
6. Logout.

**D14 — Em produção, só leitura (decisão do Claude).** A role `redator` tem duas permissões de
escrita (`operation.turma.submit_docs`, `operation.enrollment.record_result`), e as turmas do 252
têm documentos e notas com peso legal. Em produção o checklist faz **só requisições de leitura**:
navegação, `GET` em turma alheia (404) e `GET` em módulo sem permissão (403). Nenhum `POST`, `PUT`,
`PATCH` ou `DELETE`, nem as ações próprias do redator, nem tentativas que deveriam ser recusadas —
uma recusa com defeito gravaria de verdade. A prova de que **escrita** sem permissão é recusada
fica no ensaio local, onde gravar não custa nada: a mesma conta de redator do seed tenta, pela API,
uma escrita admin-only em turma própria (concluir turma) e uma em turma alheia (enviar documento),
e espera 403 e 404. As ações próprias (`submit_docs`, `record_result`) são exercidas só no local.

Defeito encontrado vira ticket em `blocos/59-…/tickets/` (memória do projeto) e não é corrigido
neste bloco.

### 4.4 Docs

- **ADR-23:** emenda de 2026-11-07 — conta fora do sandbox, motivo, data da aprovação, efeito no
  site (D-54 de lá) e cota nova.
- **Runbook `deploy/aws/README.md` §13:** §13.1 vira histórico (destinatário não precisa mais de
  verificação), §13.6 registra o pedido feito (data, nº do caso, texto usado) e o readback.
- **`pendencias/abertas.md`:** a **P-98** perde a metade do redator (o production access a resolve)
  e **continua aberta** só com a metade do alerta: o D7 chega a uma caixa pessoal, e a ficha pede
  caixa `@lotusotec.cl` com leitor. O admin 2 já é `@lotusotec.cl`; se o João confirmar que a caixa
  tem leitor, a ficha fecha inteira. *(Decisão do Claude: a pergunta ficou sem resposta na
  aprovação da spec, e o caminho conservador é não fechar.)*
- **`backlog.md`:** **FUT-4** perde o pré-requisito do production access (pago aqui) e mantém o
  resto (RN-01 se der login a cliente/aluno). A ficha 59 sai no fechamento.
- **Aviso ao site:** uma linha para a sessão do `lotus-site` (D-54 de lá): o teto de 200/dia que
  segurava o `/api/contacto` deixou de existir. O João entrega; a prova é a linha registrada no
  `audit.md`.

## 5. Ordem

1. Código do rodapé (TDD) e scripts, com ensaio local completo (§4.2 e §4.3 contra o seed, Mailpit
   para a sonda). Isso não espera a AWS.
2. O João pede o production access (texto do §13.6 ajustado: "credenciais de acesso e
   recuperação de senha a relatores externos e, no futuro, comunicação transacional com clientes
   sobre turmas; dezenas de mensagens por mês; sem marketing"). É escrita na AWS: o João roda.
3. Teste em produção (D4, §4.3), troca e limpeza (D10) no mesmo dia, com leitura de conferência.
   **Não espera a AWS** (decisão do Claude, D15): troca de senha, checklist e limpeza não mandam
   e-mail, e esperar só alongaria a janela em que existe senha de teste em conta real.
4. Aprovado o production access: sonda (D7), aviso ao site e docs (§4.4) com os números reais.

Se a AWS não responder até o `/finalizar-bloco`, o bloco mescla em `blocked` aguardando aceitação
(o caminho do item 33), e só os itens 1, 2 e 5 da `## Verificação externa` são provados na lane
de aceitação; 3 e 4 já ficam provados antes do merge. Se a AWS **recusar**, o bloco para e volta
ao João (D1).

## 6. Rastro (`audit.md` do bloco)

Uma seção por fase, com data e hora (America/Santiago): pedido à AWS e nº do caso; readback do
`get-account`; sonda (destinatários pelo domínio, sem endereço completo; cabeçalhos); impressões
digitais antes/depois/limpeza; janela exata dos logins de teste por conta, para que os `login_logs`
de 252 e 253 nessa janela leiam como do João; checklist; aviso ao site. Nenhuma senha, nenhum
token, nenhum e-mail completo de terceiro.

## 7. Fora

Convite aos redatores reais (D6); "ver como"/impersonação (D2); e-mail ao cliente (FUT-4); correção
do que o checklist revelar (ticket); `MAIL_MAILER` do `.env` local; remover a identidade pessoal do
SES (D12); tópico de bounce/complaint (o ADR-23 aceita a suppression list).

## 8. Riscos

- **AWS recusa ou pede mais informação.** Resposta em 1 a alguns dias úteis. Pedido de informação:
  o João responde no caso. Recusa: para (D1).
- **Senha de conta real conhecida por alguém.** Mitigado por D9 e D10; a janela vai do script de
  troca ao de limpeza, no mesmo dia.
- **Gravação acidental em dado real durante o teste.** O checklist é só leitura; uma gravação
  feita por engano é auditada no nome do redator e precisa ser registrada no `audit.md` na hora.

## Verificação externa

1. Production access do SES aprovado em `sa-east-1`.
   - prova: nenhuma
2. Sonda entregue a um endereço `@prismusai.com` e a um Gmail não verificado, com SPF, DKIM e DMARC
   `pass`.
   - prova: nenhuma
3. Checklist do redator percorrido em produção com as contas 252 e 253.
   - prova: nenhuma
4. Senhas de teste limpas nas contas 252 e 253, conferidas por leitura (impressão digital e
   sessões).
   - prova: nenhuma
5. Aviso ao `lotus-site` sobre o fim do teto do sandbox entregue.
   - prova: nenhuma
