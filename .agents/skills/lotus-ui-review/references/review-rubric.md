# Régua de revisão UI/UX do Lotus

Aplicar os eixos na ordem abaixo. Classificar somente o que foi observado na superfície e na
jornada aprovadas. Separar fato, inferência, impacto e recomendação no relatório.

## Eixo 1 — conclusão da jornada e affordance

### Observação obrigatória

Confirmar se a pessoa reconhece o próximo passo, conclui cada ação read-only e consegue retornar ao
estado anterior sem ambiguidade.

### Evidência mínima

Snapshots antes/depois de cada interação e reprodução textual com o controle acionado e o resultado.

### Condição A — adequado

A jornada termina, os controles comunicam sua função e o resultado corresponde à expectativa.

### Condição B — melhorável

A jornada termina, mas rótulo, posição ou feedback aumentam hesitação ou esforço evitável.

### Condição C — defeito

A jornada não termina, leva a destino incorreto, perde contexto ou oferece controle inoperante.

### Falsos positivos a evitar

Não inferir falha só por preferência de rótulo; exigir impacto observável na jornada.

## Eixo 2 — hierarquia visual e ação primária

### Observação obrigatória

Verificar título, agrupamento, ação primária, ações secundárias e ordem de leitura em cada viewport.

### Evidência mínima

Screenshot da superfície completa por viewport, com indicação da área que sustenta a conclusão.

### Condição A — adequado

Conteúdo e ação principal são reconhecíveis sem competir com controles secundários.

### Condição B — melhorável

A prioridade é compreensível, mas contraste, escala ou posição criam competição ou atraso.

### Condição C — defeito

A ação necessária fica oculta, indistinguível, inacessível ou induz uma ação diferente.

### Falsos positivos a evitar

Não confundir estética pessoal com hierarquia; relacionar a observação à leitura ou decisão.

## Eixo 3 — espaçamento, densidade e ritmo

### Observação obrigatória

Comparar alinhamentos, intervalos, agrupamentos, densidade de tabela/formulário e repetição visual.

### Evidência mínima

Screenshot com contexto suficiente para comparar ao menos dois grupos ou itens equivalentes.

### Condição A — adequado

Espaçamento comunica grupos e mantém leitura confortável sem desperdiçar área útil.

### Condição B — melhorável

Há inconsistência ou densidade excessiva/baixa que dificulta varredura, sem impedir o uso.

### Condição C — defeito

Elementos se sobrepõem, truncam conteúdo essencial ou tornam controles impraticáveis.

### Falsos positivos a evitar

Não exigir simetria absoluta nem promover diferenças intencionais de grupo a defeito.

## Eixo 4 — responsividade e overflow

### Observação obrigatória

Executar a mesma jornada em `1440x900`, `1024x768` e `390x844`, verificando reflow, scroll,
truncamento, diálogos e controles fora da viewport.

### Evidência mínima

Screenshot e snapshot em cada viewport, mais reprodução de qualquer overflow encontrado.

### Condição A — adequado

Conteúdo e controles permanecem acessíveis, legíveis e operáveis nas três viewports.

### Condição B — melhorável

O layout funciona, mas exige scroll ou apresenta compactação que aumenta esforço sem bloquear.

### Condição C — defeito

Conteúdo essencial ou controle fica inacessível, sobreposto, cortado ou cria overflow indevido.

### Falsos positivos a evitar

Scroll vertical esperado não é defeito; distinguir container rolável intencional de vazamento.

## Eixo 5 — estados normal, loading, vazio, erro, disabled e read-only

### Observação obrigatória

Registrar quais estados foram alcançados sem mutação e como preservam contexto, mensagem e ação segura.

### Evidência mínima

Snapshot/screenshot de cada estado alcançado e lista explícita dos estados não testados.

### Condição A — adequado

Estados observados são distintos, compreensíveis e não oferecem ação incompatível com o modo.

### Condição B — melhorável

O estado é compreendido, mas mensagem, recuperação ou diferenciação visual pode ser mais clara.

### Condição C — defeito

Estado mente, bloqueia recuperação disponível, permite escrita em read-only ou mistura resultados.

### Falsos positivos a evitar

Estado inalcançável sem mutação deve ser declarado não testado; não fabricar dados ou falhas.

## Eixo 6 — teclado, foco, labels, contraste e alvos clicáveis

### Observação obrigatória

Percorrer a jornada por teclado, observar ordem e visibilidade de foco, nome acessível, associação de
labels, contraste aparente e tamanho/isolamento dos alvos.

### Evidência mínima

Snapshots antes/depois da navegação por teclado e screenshot quando a conclusão depender de foco,
contraste ou alvo visual.

### Condição A — adequado

A jornada read-only é operável por teclado, o foco é visível e os controles têm nomes coerentes.

### Condição B — melhorável

A operação funciona, mas ordem, foco, label, contraste ou alvo aumentam esforço ou ambiguidade.

### Condição C — defeito

Controle necessário não recebe foco, não tem nome utilizável, fica invisível ou não pode ser acionado.

### Falsos positivos a evitar

Snapshot não prova contraste e screenshot não prova semântica; usar cada evidência para seu domínio.

## Eixo 7 — consistência com telas irmãs, `shared/ui`, PrimeReact e ADR-16

### Observação obrigatória

Comparar padrões equivalentes somente quando os arquivos da superfície e uma tela irmã relevante
forem realmente inspecionados; confirmar wrappers, layout e variáveis do tema.

### Evidência mínima

Paths/linhas dos componentes comparados e screenshot das diferenças que tenham impacto visível.

### Condição A — adequado

A superfície segue os padrões Lotus aplicáveis ou justifica uma diferença pelo contexto de uso.

### Condição B — melhorável

Há divergência de padrão que aumenta inconsistência ou manutenção, sem quebrar a jornada.

### Condição C — defeito

A divergência quebra comportamento, tema, acessibilidade ou legibilidade da superfície.

### Falsos positivos a evitar

Não recomendar PrimeReact direto em feature: usar `shared/ui`; Tailwind é para layout e cor vem das
variáveis do tema. Diferença intencional não é automaticamente defeito.

## Eixo 8 — localização `es-CL` e clareza do texto

### Observação obrigatória

Verificar idioma efetivamente renderizado, termos chilenos, consistência de rótulos, mensagens e
formatação de dados visíveis na jornada.

### Evidência mínima

Screenshot ou snapshot com o texto exato e contexto de onde aparece.

### Condição A — adequado

Texto está em `es-CL`, é compreensível, consistente e compatível com a ação ou dado mostrado.

### Condição B — melhorável

Texto é compreensível, mas apresenta ambiguidade, inconsistência ou tradução pouco natural.

### Condição C — defeito

Texto induz ação errada, contradiz o estado, exibe idioma inesperado ou oculta informação necessária.

### Falsos positivos a evitar

Não elevar variação estilística sem impacto a achado; não assumir tradução sem observar a tela.

## Eixo 9 — console, rede e performance complementar

### Observação obrigatória

Limpar a leitura pós-login, percorrer a jornada e inspecionar erros/warnings de console, requisições,
status, repetição inesperada e sinais de lentidão. Usar Chrome DevTools somente como complemento.

### Evidência mínima

Log de console/rede da sessão, requisição relevante e medição quando houver alegação de performance.

### Condição A — adequado

Não há sinal técnico relevante na jornada ou os eventos observados são esperados e explicados.

### Condição B — melhorável

Há custo, warning ou repetição mensurável sem falha funcional comprovada.

### Condição C — defeito

Erro ou requisição quebrada afeta a jornada, expõe estado incorreto ou impede conteúdo/controle.

### Falsos positivos a evitar

4xx esperado por autorização não é automaticamente defeito. Ausência do Chrome DevTools é
`complementary_unavailable`, não invalida evidência concluída com Playwright.

## Regras de evidência e classificação

- Screenshot prova layout, não interação; snapshot prova estrutura acessível, não layout.
- Resposta 4xx esperada por autorização não é automaticamente defeito.
- Gosto pessoal sem impacto não vira achado.
- Módulo classificado no backlog como futuro não vira defeito visual por estar incompleto.
- Recomendar PrimeReact somente via `shared/ui`, Tailwind para layout e variáveis do tema para cor.
- Estado inalcançável sem mutação é declarado não testado.
- Comparação com Figma só existe quando arquivo e node foram recuperados de fato.
