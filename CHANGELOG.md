# Changelog

## [1.9.1](https://github.com/Andred21/lotus/compare/v1.9.0...v1.9.1) (2026-10-31)

### Correções

* **ci:** copia pnpm-workspace.yaml antes do install do spa (160426b)
* **deps:** follow-redirects 1.16.2 e override de minimatch ^11.0.1 (c87c047)

## [1.9.0](https://github.com/Andred21/lotus/compare/v1.8.0...v1.9.0) (2026-10-31)

### Funcionalidades

* **40:** avisos de assinatura na emissão e cidade do emissor (29a87d3)
* **40:** tetos de caracteres nos formulários (80eb9d0)
* **40:** aba Configuración com o submódulo Certificados (e70d3d4)
* **40:** slot de assinatura no redator e no Meu Perfil (0f417c9)
* **40:** tetos de caracteres dos campos impressos em toda entrada (7356552)
* **40:** certificado no layout v5 com assinaturas e sem corte de texto (2f5c370)
* **40:** assinaturas vivas lidas na hora de imprimir (f4dbde1)
* **40:** limpeza da assinatura no navegador (ef7893c)
* **40:** texto do certificado em formato chileno (0448262)
* **40:** configuração de certificados com a assinatura da gerente (fc7d1ae)
* **40:** documento FIRMA do redator e classe de conteúdo da assinatura (9efd1e9)

### Correções

* **40:** AppButton nasce type=button, firma da gerente não envia o form (2d7ef8e)
* **40:** sonda do Gotenberg falha em vez de pular, auditoria da firma da gerente provada, raio da prévia e comentário da cidade (6c6864f)
* **40:** limiar de mancha da assinatura relativo à espessura do traço (ce7257f)
* **40:** papel da assinatura estimado por região e manchas pequenas apagadas (7dadbe4)
* **40:** aviso da firma da gerente volta a dizer a consequência (D6) (dcf0467)
* **40:** aviso da firma da gerente diz quem a carrega (1f6baa1)
* **40:** firma da gerente avisa que vale na hora, mostra a imagem e cobre falha (15d2293)
* **40:** cabeçalho do quadro do temário na medida da referência v5 (d3b9432)
* **40:** assinaturas inteiras na quebra de página e fidelidade tipográfica à v5 (97cd792)
* **40:** recorte da assinatura por componentes conexos, sem cortar traço fino (418a8e5)
* **40:** recorte da assinatura ignora pixel isolado e comentário diz a verdade sobre a calibração (fad7cfb)
* **40:** periodo do mesmo mes e descricao vazia no texto do certificado (4937cc0)
* **40:** migration da permissão de configuração de certificados (3eb8467)
* **40:** firma vigente filtra tipo e vigência na subquery do ofMany (2c123dd)

## [1.8.0](https://github.com/Andred21/lotus/compare/v1.7.0...v1.8.0) (2026-10-29)

### Funcionalidades

* **43:** diálogo de upload por tipo e tag na lista de documentos (8d8bccc)
* **43:** formulários de aluno e matrícula em grade (cc8c22f)
* **43:** moldura de diálogo com tamanho e header e footer navy (bd719cd)
* **43:** confirmação compacta com três severidades (e74f7b2)
* **43:** enum de tipo de anexo do orçamento com orden de compra (022f8a6)

### Correções

* **43:** diálogos de pessoas, cliente e designação em lg (9bd0ec8)
* **43:** ordem dos cartões de tipo derivada do Record exaustivo (1b497ec)
* **43:** coluna da foto em 176px para o rótulo caber numa linha (f5ae001)
* **43:** escolher arquivo ou tipo limpa o erro do envio anterior (0188d58)
* **43:** cartões de tipo do upload se empilham em uma coluna (d31869d)
* **43:** ícone de severidade centrado no círculo da confirmação (8198181)

## [1.7.0](https://github.com/Andred21/lotus/compare/v1.6.0...v1.7.0) (2026-10-28)

### Funcionalidades

* **42:** deploy.sh poda imagens depois da promocao (1c37a49)
* **42:** politica e lifecycle do bucket versionados (2fa151e)
* **42:** user-data com teto do journal, limpeza do apt e reboot automatico (fc3db79)
* **42:** podar-imagens.sh guarda o SHA atual e o anterior (83ded2d)

### Correções

* **deps:** sobe symfony/mime para 7.4.22 (CVE-2026-45070) (02f57fe)
* **42:** verificar-backup.sh nao le consulta falha como bucket vazio (23815e5)
* **42:** backup-db.sh tenta o upload tres vezes (a8b5770)

## [1.6.0](https://github.com/Andred21/lotus/compare/v1.5.0...v1.6.0) (2026-10-25)

### Funcionalidades

* **41:** conclusão lista pendências e alunos sem nota ou presença (84a6d40)
* **41:** status sugerido pela regra mínima, com aviso de divergência (41418d9)
* **41:** nota e presença na tabela de alunos (cb40193)
* **41:** admin corrige resultado de turma concluída sem certificado (5202ec9)
* **41:** conclusão exige redator e configuração completa (0283896)
* **41:** regra de aprovação no contrato da turma (4deb166)

### Correções

* **41:** ações da matrícula seguem a permissão (Q-1) (29ed378)
* **41:** comentários do bloqueio acadêmico atualizados; testes do aviso da regra e da tabela concluída (6055ea6)
* **41:** título da lista de incompletos traz a contagem (5015cd1)
* **41:** presença com vírgula chega à API com ponto; docblock do lock da correção diz o que vale (9497b33)

## [1.5.0](https://github.com/Andred21/lotus/compare/v1.4.1...v1.5.0) (2026-10-24)

### Funcionalidades

* **38:** comando lotus:carga-inicial com --simular e recusa por conflito (b5b6fa5)
* **39:** amostra do certificado na tabela de cursos (a851230)
* **38:** comando lotus:extrair-carga-inicial com documentos e relatório (1796681)
* **39:** aviso de idoneidade na designação (129df60)
* **38:** carga do histórico com código legado e snapshot da linha (c58d542)
* **38:** extrator lê REGISTROS e normaliza o recorte com as exclusões (85390b1)
* **39:** idoneidade do redator vira aviso (2b1552e)
* **39:** preview do certificado do curso (3c20682)
* **38:** carga dos cadastros com datas históricas e sem convite (b1777ac)
* **39:** emissão sem template por curso (f29b295)
* **38:** contrato do arquivo canônico da carga inicial (fad2304)
* **13:** conferir-golive.sh — smoke SMOKE-GOLIVE e modo --final; fixture boa inteira (8243ca8)
* **13:** conferir-golive.sh — idade do backup no S3 (670be6a)
* **13:** conferir-golive.sh — dados-antigos (D-37) e sondas-dev (P-44) (60b65eb)
* **13:** conferir-golive.sh — migrations e rbac contra a imagem viva (badc64d)
* **13:** conferir-golive.sh — esqueleto, fakes e verificacao env (652ad9a)

### Correções

* **38:** régua de exceção literal exclui app/Console por escrito (19570b2)
* **38:** extrator recusa reprobado como o contrato da carga (a4cda8d)
* **38:** documento do redator anota o path antes do insert em files (0292fb2)
* **deps:** corrige advisories do pnpm audit (aab0ede)
* **38:** carga real descarta do disco o que subiu antes da falha; roteiro fecha a pasta de dados (46735bd)
* **38:** certificado só para aprobado, habilitação só do redator criado, leitor corta antes da CLAVE (c71fbc8)
* **38:** leitor usa o valor calculado das fórmulas e o cabeçalho real (0bab71d)
* **38:** extrator apaga carga.json antigo antes de gravar (20b5aeb)
* **13:** idade do backup em segundos, dump conferido, custo (685ccc6)
* **13:** revisao final — revogacao no restore, RPO/RTO, guarda de data (b13b172)

## [1.4.1](https://github.com/Andred21/lotus/compare/v1.4.0...v1.4.1) (2026-10-24)

### Correções

* **deps:** undici 8.12.3 (GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472) (d8e1423)
* **deps:** zod 4.6.7 (GHSA-mrhx-c7xc-m3w5) (e5ea359)
* **deps:** corrige advisories do pnpm audit (a1ed636)
* **docker:** bases php 8.3.36 e node 22.23.4 contra o PHP2Shell (8cb3f8a)

## [1.4.0](https://github.com/Andred21/lotus/compare/v1.3.0...v1.4.0) (2026-10-05)

### Funcionalidades

* **deploy:** script de IAM, log groups, filtros e alarmes da observabilidade (b5e3eb0)
* **deploy:** user-data instala o CloudWatch agent e o timer da sonda (79b50ad)
* **deploy:** sonda de /up e do certificado servido, uma linha por minuto (872a4e6)

### Correções

* **deploy:** 5xx tenta o literal antes da regex (ed05b6b)
* **deploy:** fetch-config falho apaga a config do agente (125628f)
* **docker:** imagem de produção sem argumentos no stack trace (71cfad3)
* **deploy:** comentario da fixture aws-falso em ASCII (52f50fa)
* **backend:** QueryException sem os bindings na mensagem (D-74) (d5878d6)
* **deploy:** sondar-saude.test sem atribuicao inutil em linhas (no-useless-assignment) (6daab29)

## [1.3.0](https://github.com/Andred21/lotus/compare/v1.2.0...v1.3.0) (2026-10-04)

### Funcionalidades

* **33:** molde de producao em MAIL_MAILER=ses, com catraca (27cb318)

### Correções

* **33:** falha de envio de e-mail vai ao log sem o destinatario, com aws_erro (0ba029b)
* **deps:** sobe axios, undici e brace-expansion para fora dos advisories (761e42e)
* **33:** grep do alerta D7 com ponto literal (57ce5ea)
* **33:** runbook par. 13 — CSRF no loop D7, grep e config reais, sonda pelo Reason (5766ce7)

## [1.2.0](https://github.com/Andred21/lotus/compare/v1.1.0...v1.2.0) (2026-09-28)

### Funcionalidades

* **identity:** Ultimo acceso sai no Timestamp e formatDateTime deixa de existir (c41c88f)
* **ui:** Timestamp com relogio e calendario, e o Clock passa a usa-lo (8e7c7f5)

### Correções

* **ui:** dica das acoes de linha abre a esquerda e volta no botao apagado (167fb7a)
* **tabelas:** Cursos e Usuarios arquivados sobem ao teto medido do piso de 390 (341972f)
* **tabelas:** corrige os pisos de Cursos e Usuarios após a remedição real do Step 4 (29a63e7)
* **tabelas:** Usuarios ganha o piso de 390 medido no item 23 (6b7ddeb)
* **tabelas:** Redactores ganha o piso de 390 medido no item 23 (3902b98)
* **tabelas:** Turmas ganha o piso de 390 medido no item 23 (0964896)
* **tabelas:** Presupuestos ganha o piso de 390 medido no item 23 (a1c5b68)
* **tabelas:** Clientes ganha o piso de 390 medido no item 23 (ea4a508)
* **tabelas:** Cursos ganha o piso de 390 medido no item 23 (8f2edaf)
* **tabelas:** Roles ganha o piso de 390 medido no item 23 (b195e12)
* **tabelas:** Alumnos ganha o piso de 390 medido no item 23 (ddb47f3)
* **tabelas:** Emisión ganha o piso de 390 medido no item 23 (00a55eb)
* **tabelas:** Matrícula arquivada ganha o piso de 390 medido no item 23 (c072d0b)
* **tabelas:** Matrícula ganha o piso de 390 medido no item 23 (0c33539)

## [1.1.0](https://github.com/Andred21/lotus/compare/v1.0.1...v1.1.0) (2026-09-28)

### Funcionalidades

* **deploy:** hook de renovacao do certbot versionado, com nginx -t antes do reload (761d356)
* **tls:** HSTS de um ano no servidor 443, repetido nas locations com add_header (09a1bd7)

### Correções

* **deploy:** APP_URL e FRONTEND_URL do molde em https, com catraca dos seis campos do TLS (caf04fb)

## [1.0.1](https://github.com/Andred21/lotus/compare/v1.0.0...v1.0.1) (2026-09-27)

### Correções

* **shell:** cabecalho rotula o role por roleLabel e displayRole sai (3225014)
* **ui:** acoes da linha colapsam num menu abaixo de sm em Pessoas e Administracion (8b40d17)
* **ui:** D-59 — o alternador de cotacoes sobe para o cabecalho (180bfa1)
* **ui:** as duas reguas de aba que faltavam sao medidas (5330664)
* **ui:** tabela vazia volta a zerar a largura minima mesmo com pt do chamador (8cde4da)
* **ui:** UI-02 — Usuarios e Roles nao rolam mais sem precisar em 1024x768 (566e46b)
* **ui:** UI-01 — Administracion mostra o rotulo do role, nao o slug (1149900)
* **ui:** UI-03 — Redactores nao rola mais sem precisar em 1024x768 (19a616f)
* **ui:** UI-02 — RUT nao mais vaza sobre Cursos habilitados em 1024x768 (dbc6504)
* **ui:** UI-04 — historial de turmas do Alumno usa dataKey correto (d00c730)
* **ui:** UI-01 — cabecalho Redactores nao trunca mais em 1024x768 (0bdb2e7)

## [1.0.0](https://github.com/Andred21/lotus/releases/tag/v1.0.0) (2026-09-26)

Primeira versão em produção (go-live).
