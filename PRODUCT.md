# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Administradores** — a equipe interna da Lotus OTEC (cerca de 10 pessoas). Trabalham no
  computador do escritório, em sessões longas e com várias abas abertas, e conduzem o ciclo
  inteiro: cotação, curso, turma, matrícula e certificado.
- **Redactores** — os relatores (instrutores) que dão as aulas. Não fazem parte da administração da
  OTEC. São habilitados por curso, designados a turmas (N:N) e lançam nota, frequência e documentos
  das matrículas. Lançar pelo celular, em campo, não foi apontado como contexto de uso.
- **Terceiros sem login** — quem escaneia o QR de um certificado: a empresa mandante, um fiscal ou o
  próprio aluno. Abrem a página pública `/validar/:uuid` no celular e precisam saber, sem margem de
  dúvida, se o certificado é válido.

Clientes e alunos são entidades registradas, não usuários: não autenticam (RN-01).

## Product Purpose

O Lotus centraliza a operação de uma OTEC chilena que capacita profissionais do setor elétrico de
alta tensão, um setor regulado. O produto final é um certificado com peso legal, e cada passo até
ele precisa ser correto e rastreável.

A v2 tem sucesso quando:

1. **O certificado é defensável:** nenhum erro no documento emitido, trilha de auditoria completa e
   validação pública por QR que resiste a uma fiscalização.
2. **O ciclo anda mais rápido:** menos retrabalho e menos planilha entre a cotação, a turma, a
   matrícula e o certificado.
3. **A gestão enxerga o negócio:** o painel e as pendências mostram o que está travado e o que vai
   vencer.

Paridade com a v1 não é critério de sucesso. A v1 documenta *o quê* o sistema faz, nunca *como*.

## Positioning

O Lotus não é um LMS nem um SaaS de cursos. É o sistema de registro de uma OTEC específica, e o
produto final dele é um documento com peso legal: cada certificado vem da sua cotação, da sua turma
e das notas e frequências lançadas pelo seu relator, e qualquer pessoa consegue verificá-lo pelo QR,
sem login.

## Operating Context

- **Ciclo:** cotação (com um código legível, como `Scap 100 - Cot 2`, que o cliente usa ao pedir
  por telefone ou e-mail, ADR-17) → curso (catálogo, modelos de certificado, habilitação de
  redactores) → turma (designação de redactores, alunos, documentos) → matrícula (nota e frequência
  lançadas pelo redactor) → conclusão em dois estágios (a documentação habilita e o admin confirma)
  → certificado (individual ou em lote, PDF, histórico, revogação) → validação pública por QR.
- **Módulos da SPA:** Dashboard, Comercial, Operación, Cursos, Certificados, Personas e
  Administración, além de Mi perfil. As rotas são em espanhol, e a navegação muda conforme as
  permissões de cada perfil.
- **Idiomas:** es-CL é a referência dos rótulos e o idioma de fallback. pt-BR e en têm as mesmas
  chaves (ADR-15).
- **Temas:** claro e escuro, alternados em tempo de execução (ADR-16).
- **Documentos:** o certificado é um PDF gerado sob demanda pelo Gotenberg, com número
  `LOT-<ano>-<seq>` e QR. O manual da turma sai em PDF e em Word (.docx). O RUT chileno identifica
  as pessoas e é único.

## Capabilities and Constraints

- Só admin e redactor autenticam. Cliente e aluno nunca logam (RN-01).
- O financeiro é registro histórico e nunca bloqueia uma ação.
- As operações relevantes são auditadas na aplicação. Entidades de negócio usam soft delete.
- O certificado congela um snapshot dos dados no momento da emissão. Depois de emitido ele é
  histórico: não se edita nem se apaga, só se revoga.
- O modelo de certificado é configuração versionada do curso. O valor fica registrado na cotação. A
  relação entre redactor e turma é N:N.
- Com cerca de 10 usuários internos e baixa concorrência, toda escolha deve ser proporcional. Nada
  de superdimensionar.
- Restrições de UI que trabalhos futuros devem respeitar: as features só usam PrimeReact pelos
  wrappers de `frontend/src/shared/ui` e não importam outra feature; o Tailwind cuida do layout; o
  tema é o Lara gerado do ADR-16; todo texto de tela passa pelo i18n, com as três línguas; os tipos
  TS são gerados do backend; os erros da API chegam em RFC 7807.
- **Em aberto:** o uso autenticado no celular não foi confirmado como contexto real. O único uso
  móvel confirmado é a página pública de validação.

## Brand Commitments

- O nome é **Lotus** (Lotus OTEC). Os logos estão em `frontend/src/assets/`: `Logo.png`,
  `LogoLight.png`, `LogoDark.png` e `LogoGlyph.png`.
- A identidade visual em vigor é uma decisão fechada no ADR-16, ponto 5 (`docs/adrs.md`). Mudá-la
  exige o João Victor.
- O tom de voz ainda não foi definido. Os rótulos de referência são os do es-CL.

## Evidence on Hand

- Capturas da interface com dados demonstrativos (1440 × 900, pt-BR, tema escuro):
  `.github/assets/readme/` (`dashboard.png`, `comercial.png`, `operacao.png`, `certificados.png`).
- Dados demonstrativos do seeder, que só rodam nos ambientes `local` e `demo`.
- O modelo do certificado em `backend/resources/views/certification/certificate.blade.php` e o do
  manual da turma em `backend/resources/views/operation/manual/`.
- **Não existem e não devem ser inventados:** depoimentos, métricas de uso, lista de clientes ou
  material de marketing. Nenhum dado de produção aparece em captura, e nenhum certificado, número
  `LOT-` ou RUT fictício pode ser apresentado como real.

## Product Principles

1. **O documento é o produto.** Toda tela existe para chegar a um certificado correto. Quando
   correção e velocidade entram em conflito, a correção vence.
2. **Rastreável por padrão.** Precisa ser possível recuperar quem fez o quê e quando. Ações
   irreversíveis viram revogação ou arquivamento, e nada some sem deixar rastro.
3. **Registro, não portão.** Financeiro e pendências informam e priorizam, mas não bloqueiam o
   trabalho.
4. **Dois públicos, duas promessas.** A equipe interna opera com densidade no desktop. Quem escaneia
   o QR recebe, no celular e sem login, uma resposta clara: válido ou não.
5. **Proporcional.** São cerca de 10 usuários internos. Uma solução simples e correta vence uma
   solução ampla.
