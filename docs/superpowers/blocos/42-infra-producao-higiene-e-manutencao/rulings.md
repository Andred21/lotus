# Bloco 42 — rulings

Decisões tomadas pela sessão de execução em nome do João. Cada linha traz o que custa se estiver
errada.

1. **Execução sequencial, sem o pipeline de profundidade 1 do Passo 5.1.** Cada revisor leu a árvore
   da lane com a task dele no topo, sem worktree destacada. Se errado: só tempo de relógio. Não há
   desvio do harness a declarar.
2. **Corrigi M1, M2 e M3 da revisão de branch no runbook antes da Task 9** (`44a68868`):
   - M1: `flock` no cadeado do deploy para a poda à mão (§16.1);
   - M2: `sts get-caller-identity` antes do `put-bucket-policy` (§3);
   - M3: `apt-get clean` depois do upgrade (§16.4).

   Eram baratos e reduziam risco na produção. Se errado: reverter um commit de doc.
3. **Deferi M4, M5 e M6 da revisão de branch:**
   - M4: a espera crescente do retry do `backup-db.sh` (30 s, depois 60 s) não tem prova em teste;
   - M5: a tabela do §3 do runbook não tem catraca;
   - M6: o regex do teste da Q-1 é estreito.

   Nenhum afeta a produção. Se errado: uma regressão silenciosa futura em doc ou teste.
4. **Aceitei o segundo `sudo`, redundante, no `flock` do §16.1**, em vez de editar o
   `runbook-higiene.test.ts`, fixado pela Task 8. O `sudo` a mais é inofensivo. Se errado: um
   comando com ruído no runbook.
5. **A sonda do `/up` da janela rodou 30 minutos (360 × 5 s), em vez de 15.** Ela começou antes do
   João, para cobrir o upgrade inteiro com folga. Se errado: nada, só um log maior.

## Decisões do João registradas aqui (2026-10-27)

6. **A saída de emergência da política é o IAM, não o login da raiz.** O João não tem as
   credenciais da raiz da conta `760144413534`. O Step 2 da Task 10 foi trocado por uma prova feita
   antes do `put`, com o simulador:
   - o `lotus-infra` desfaz a política;
   - o `JoaoVBA` tem `iam:CreateAccessKey` sobre o `lotus-infra`;
   - o `aws:PrincipalArn` é comparado como texto, então recriar o usuário devolve o acesso.

   O detalhe está no `execucao-producao.md`, seção "Login da raiz". Se errado: perdidos ao mesmo
   tempo a chave do `lotus-infra` e todo acesso de administrador ao IAM, só a raiz, ou o
   `AssumeRoot` da conta gestora da Organization, tira a política. O `JoaoVBA` está sem MFA: fica
   recomendado.
7. **A janela manual e a remoção dos órfãos rodaram em horário comercial no Chile** (15:41 e
   16:04 em Santiago).
   - A janela tirou o app do ar por menos de 1 minuto no total.
   - Os órfãos estavam todos em prefixos de entidades que já não existem, então não havia upload em
     andamento a pegar no meio.

   Se errado: um usuário teria visto o app fora por segundos.
