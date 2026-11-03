# Bloco 55 — rulings da execução

Decisões tomadas pela sessão em nome do João durante o `/executar-bloco 55`, na ordem em que foram
tomadas. Cada uma diz o que custa se estiver errada.

1. **O desvio "pipeline de profundidade 1" (Passo 5.1 do `/executar-bloco`) NÃO foi usado.** As
   tasks rodaram em sequência: G1 (T1, T2, T4), depois T3, depois T5. Nenhuma revisão rodou em
   paralelo com implementação. Se estiver errada, o custo é só de tempo de relógio.
2. **Papéis por `.claude/papeis.md`.** T1 e T4 foram para o `implementador-mecanico`. T2 e T3 para o
   `implementador-integracao`. Cada task teve um `revisor-task`, e as correções tiveram um
   `re-revisor`. A T5 ficou na sessão. A revisão final foi do `revisor-branch`. Se estiver errada,
   uma task foi para um papel de esforço menor que o necessário, mas a revisão de cada task cobriu.
3. **A T2 aceita 422→404 em `PUT api/users/{user}` e `POST api/users/{user}/photo` com id não-staff
   e corpo inválido.** O binding staff passou a recusar antes da validação do Data. Antes, o
   `abort_unless` ficava no corpo do método, depois da validação. A spec §7 previa o efeito
   ("o 404 vem antes de 422"), e o objetivo 4 pede o binding recusando não-staff. Mesmo assim, o
   D7a diz que o 403→404 é a "única" mudança de resposta. **Pede o seu ok na aceitação.** Se
   estiver errada, quem esperava 422 antes do 404 para id não-staff passa a ver só 404. Nenhum
   cliente faz isso hoje. Está registrada na `prova.md`, DoD 1.
4. **A ordem throttle × permissão foi aceita, a sessão tentou corrigi-la e depois revogou a
   correção. Sem mudança de código.** A T3 reportou que, nas 7 rotas POST com `throttle:upload`,
   o throttle sai antes de `permission:` no `route:list`. A sessão mandou mover o throttle para o
   `HasMiddleware`. O implementador provou, e a sessão conferiu pelo `tinker`, que a ordem de
   execução vem do `middlewarePriority`: o `SubstituteBindings` do grupo `api` puxa o
   `throttle:upload` para antes dele, portanto antes do `permission:`, que não tem prioridade.
   Isso já valia antes do bloco e continua igual depois. A re-revisão marcou REFUTED. Se estiver
   errada, quem não tem permissão gasta a própria cota de upload antes do 403 e, com a cota
   esgotada, recebe 429 em vez de 403. Mudar isso é comportamento novo, fora do escopo
   (`appendToMiddlewarePriority`). Fica como pendência para o João decidir.
5. **A exceção `SEM_PERMISSAO` passa a ter chave `"{METODOS} {uri}"` (M-1 da revisão final).** Isso
   é mais estrito que a letra do D3, que lista URIs. São 11 chaves para as mesmas 9 URIs. Fecha o
   caso de um `DELETE api/me` sem permissão entrar sem a catraca reprovar. Se estiver errada, um
   método novo e legítimo numa URI do D3 exige uma linha nova na lista.
6. **M-2, M-3 e M-4 da revisão final ficam sem correção.**
   - M-2: `resolveRouteBinding` em vez de `resolveRouteBindingQuery`. Segue o molde do `Turma`, e
     o `StaffUserBindingTest` pega rota com `withTrashed`.
   - M-3: `DetectorDeAcessoSuspeito.php:112` ainda faz `where('type', 'admin')`. Já existia antes
     do bloco e está fora da contagem do D7.
   - M-4: o vermelho da T1 e do D7a aparece na prova só por citação do relatório.

   Se estiver errada, cada uma vira ficha num bloco futuro.

Minors aceitos sem correção (triados pela revisão final como "pode ficar"):
- o teste da T1 não confere o corpo 7807;
- o fallback `'/login'` em `bootstrap/app.php`;
- o D7a só é testado em `GET`;
- o laço de `{user}` sem piso de rotas;
- MySQL converte `'1abc'` em 1 no binding (já existia antes);
- a catraca não vê middleware em closure nem `role_or_permission:` (falha do lado seguro);
- a varredura de órfãs é por linha (lado seguro);
- o ramo de parse sem `:` é inalcançável.

Para o `/finalizar-bloco`, além do que o plano já lista:
- pendência para a ordem cota de upload × permissão (item 4);
- o ok do João para o 422→404 (item 3);
- registro, previsto na spec §8, de que uma lane viva que acrescente rota ou permissão pode quebrar
  as catracas novas depois do merge.
