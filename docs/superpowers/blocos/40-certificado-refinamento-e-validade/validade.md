# Bloco 40 — Pesquisa de validade do certificado OTEC

> Pesquisa feita em 2026-10-29 (Task 13). Não é parecer jurídico: serve para a Lotus decidir com
> base em norma lida, e diz o que não conseguiu confirmar. Citações literais das normas ficam no
> espanhol original; o resto é pt-BR.

## 1. Resumo

- **O certificado da Lotus (imagem de assinatura + N° de registro, sem FEA) é um instrumento
  privado.** A Ley 19.799 só exige firma electrónica avanzada (FEA) para documento eletrônico que
  pretenda ser instrumento **público** (art. 4). Para instrumento privado com firma electrónica
  simples, o art. 5 dá "el valor probatorio que corresponda, de acuerdo a las reglas generales".
  Não há exigência legal de FEA aqui; ela só reforçaria a prova (vai para Deferred, spec §4.7).
- **A NCh 2728 é exigência sobre a OTEC (sistema de gestão), não sobre o certificado.** Ley 19.518
  art. 21 nº 2 e DS 98 art. 10 exigem que a OTEC tenha a certificação; nenhum dos dois manda
  imprimir selo ou número de norma no certificado do aluno. Isso sustenta a D7 (selos fora).
- **O certificado de asistencia do SENCE não é este documento.** Ele é emitido dentro do sistema do
  SENCE (Libro de Clases Electrónico), com campos próprios. O certificado da Lotus é um documento
  da OTEC, e a pesquisa não achou, em fonte primária, norma que fixe o conteúdo mínimo dele.
- **Não confirmado:** prazo de guarda (o "≥ 3 anos" do `context.md` fato 7 não se sustenta, ver
  §3), conteúdo mínimo de certificado de aprovação, exigência do setor elétrico.

## 2. Fontes: o que abriu e o que não abriu

**Regra do brief:** preferir bcn.cl, sence.gob.cl, inn.cl; fonte que não abriu fica registrada,
com a secundária usada no lugar.

| Fonte | Estado | Observação |
|---|---|---|
| bcn.cl/leychile (Ley 19.799 `idNorma=196640`, Ley 19.518 `idNorma=30284`) | **não abriu** | O site é uma aplicação JS: o `WebFetch` só recebe o cabeçalho e a mensagem "Este proceso demora demasiado…". Nenhum texto de artigo veio. O endpoint XML (`obtxml`) devolve 401 e não foi contornado. |
| iura.cl (espelho declarado da BCN) | **abriu**, **fonte secundária** usada no lugar | Ley 19.799 arts. 2, 3, 4, 5; Ley 19.518 art. 21; DS 98 art. 10. A página diz "Fuente: BCN". Limitação: o rótulo "sin modificaciones" dele não é confiável (no art. 5 o corpo é a redação vigente, mas o cabeçalho diz "texto original"; ver também a Ley 19.967 em §3). |
| chile.justia.com (Ley 19.799) | **abriu** | É a versão **"Texto Original"** (vigência até 11-11-2007). Útil para ver o que mudou no art. 5. A URL `…/ley-19799/gdoc/` deu 404; `…/ley-n-19-799/gdoc` abriu. |
| suseso.gob.cl (compêndio, Ley 19.799) | **abriu**, secundária | Traz o art. 5 na redação vigente, igual à do iura.cl (ver R4). Sem data de consolidação. |
| chilevalora.cl (PDF da Ley 19.518) | **404** | Não usado. |
| sii.cl, Circular nº 16/2005 (PDF) | **abriu** (via `pdftotext`) | Secundária; instrui sobre a Ley 19.967 (2004), que alterou a Ley 19.518. |
| sence.gob.cl, formato "Certificado de asistencia" (`articles-7280_documento_9.doc`) | **abriu** | Primária (SENCE). Campos do certificado de asistencia. |
| sence.gob.cl, Preguntas frecuentes del Sistema de Certificados (PDF) | **abriu** (via `pdftotext`) | Primária. Mostra que o certificado de asistencia é emitido no sistema do SENCE. |
| sence.gob.cl/empresas/franquicia-tributaria | **abriu** | Primária. 75% de asistencia; certificado emitido do LCE. Não menciona certificado de aprovação nem diploma. |
| sence.gob.cl, `instrucciones-de-acreditacion-actualizacion_2019.pdf` | **404** no fetch | Só snippet de busca; não usado como base de afirmação. |
| sence.gob.cl, Manual de franquicia tributaria 2022 (PDF) | **abriu**, sem utilidade | É folheto institucional; não traz os campos do certificado nem prazo de guarda. |
| ecommerce.inn.cl, ficha NCh 2728:2015 | **abriu** | Primária (INN, loja). Só a ficha: título, "Vigente", publicação 21/12/2015, escopo. **O texto da norma é pago e não foi lido.** |
| inn.cl `download.php?id=156` | **404** | Não usado. |
| empresas.sence.cl, `NCh2728-2002.pdf` | **abriu** (via `pdftotext`) | É o **projeto de norma em consulta pública de 2002**, não a edição vigente. Usado só como indício do que a cláusula 4.2.4 diz; certeza baixa para a edição 2015. |
| Drive, Notion | indisponíveis na sessão | Fora do escopo desta pesquisa. |

**Consequência:** nenhuma citação abaixo vem de bcn.cl ou do texto pago da NCh 2728:2015. Os
artigos de lei vêm do espelho iura.cl (mais SUSESO e Justia para cruzar o art. 5). Antes de a
Lotus citar artigo em documento oficial, vale conferir o texto vigente em bcn.cl no navegador.

## 3. Tabela de requisitos

Colunas: requisito | fonte (URL, norma, artigo) | certeza | situação no template.

**Situação no template** usa só o vocabulário da spec §4.7 (`atendido`, `decisão da Lotus`, `não se aplica`); nuances vão em "Nota".

**Template de referência:** o que o `certificate.blade.php` imprime hoje (commit `4937cc07`): frase
de abertura com cidade e data, emissor ("OTEC LOTUS SpA") e RUT, nome e RUT do aluno, empresa e
RUT, curso, carga horária, período, nota, asistencia, "válido hasta", N° de registro, assinatura
sobre o nome do instrutor e disclaimer. Na emissão, o layout v5 (D4/D8) acrescenta a assinatura da gerente.

| # | Requisito | Fonte primária / secundária | Certeza | Situação no template |
|---|---|---|---|---|
| R1 | Assinatura eletrônica de qualquer natureza vale como manuscrita. Literal: "La firma electrónica, cualquiera sea su naturaleza, se mirará como firma manuscrita para todos los efectos legales, sin perjuicio de lo establecido en los artículos siguientes." Atos assinados eletronicamente "serán válidos de la misma manera y producirán los mismos efectos que los celebrados por escrito y en soporte de papel." | Ley 19.799, **art. 3**. https://iura.cl/19799/3 (espelho BCN; bcn.cl não abriu) | Média-alta (texto lido em 1 fonte; art. 3 não aparece alterado nas versões vistas) | **atendido.** Nota: a imagem da assinatura precisa contar como "firma electrónica"; ver R2. |
| R2 | O que é firma electrónica: "cualquier sonido, símbolo o proceso electrónico, que permite al receptor de un documento electrónico identificar al menos formalmente a su autor". FEA é a "certificada por un prestador acreditado, que ha sido creada usando medios que el titular mantiene bajo su exclusivo control…". | Ley 19.799, **art. 2, letras f e g**. https://iura.cl/19799/2 | Média. A definição está lida; **enquadrar uma imagem de assinatura colada em PDF como "firma electrónica simple" é interpretação, sem jurisprudência ou doutrina verificada nesta pesquisa.** | **decisão da Lotus.** Nota: risco aceito. A imagem mais o N° de registro identificam "al menos formalmente" o autor; é o argumento mais forte, não uma garantia. |
| R3 | FEA só é exigida para documento eletrônico que pretenda ser instrumento **público**. Literal: "Los documentos electrónicos que tengan la calidad de instrumento público, deberán suscribirse mediante firma electrónica avanzada." | Ley 19.799, **art. 4**. https://iura.cl/19799/4 | Alta (texto curto, lido em 1 fonte e coerente com SUSESO/Justia sobre o art. 5) | **não se aplica.** Nota: o certificado de OTEC é instrumento privado; FEA fica em Deferred. |
| R4 | Valor probatório de instrumento privado com firma eletrônica simples. Literal (redação vigente, iura.cl e SUSESO): "En el caso de documentos electrónicos que posean la calidad de instrumento privado y estén suscritos mediante firma electrónica, tendrán el valor probatorio que corresponda, de acuerdo a las reglas generales." Já o nº 2 diz: "Los que posean la calidad de instrumento privado, en cuanto hayan sido suscritos con firma electrónica avanzada, tendrán el mismo valor probatorio señalado en el número anterior." O "número anterior" é o nº 1, o dos documentos do art. 4 (instrumento público), que "harán plena prueba de acuerdo con las reglas generales": a FEA dá ao instrumento privado a mesma força probatória, sem torná-lo instrumento público. A mesma redação traz a ressalva da data (R5). | Ley 19.799, **art. 5**. SUSESO https://www.suseso.gob.cl/620/w3-propertyvalue-123059.html ; Justia (texto original) https://chile.justia.com/nacionales/leyes/ley-n-19-799/gdoc ; iura https://iura.cl/19799/5 | **Média-alta.** Redação vigente (iura.cl e SUSESO concordam, conferidas em nova leitura) contra o texto original (Justia, "Texto Original" de 12-04-2002, com fim de vigência em 11-11-2007), que arruma o nº 2 de outro modo ("En caso contrario, tendrán el valor probatorio que corresponda, de acuerdo a las reglas generales"). Só o rótulo "sin modificaciones" do iura é errado; o corpo do artigo é o vigente. Em ambas as versões, firma simples = "reglas generales". Falta o texto consolidado da BCN, que não abriu. | **decisão da Lotus.** Nota: a prova do certificado é a "que corresponda" pelas regras gerais: mais fraca que FEA, aceita em juízo (art. 5, "podrán presentarse en juicio"). |
| R5 | Valor probatório da **data**: sem fechado eletrônico de prestador acreditado, instrumento com FEA não faz fé da data. Para firma simples, vale a regra geral. | Ley 19.799, art. 5 (acima) | Média-alta (ressalva da data lida na redação vigente, iura.cl e SUSESO; nos trechos lidos do texto original não aparece) | **decisão da Lotus.** Nota: a data de emissão impressa é declaração da própria OTEC, sem selo de tempo. Ver Pendência 6 (D5). |
| R6 | OTEC precisa ter a certificação NCh 2728 para se inscrever e se manter no Registro Nacional. Literal (nº 2): "Acreditar que disponen de la certificación bajo la Norma NCh 2728, establecida como Norma Oficial de la República por la Resolución Exenta Nº 155, del Ministerio de Economía, Fomento y Reconstrucción, publicada en el Diario Oficial el 19 de mayo de 2003, o aquélla que la reemplace." E: "cesará su inscripción en el Registro Nacional, perdiendo su calidad de organismos capacitadores." | Ley 19.518, **art. 21, nº 2 e último inciso**. https://iura.cl/19518/21 (espelho BCN) | Média-alta no texto; **o rótulo "sin modificaciones" do espelho é falso**: a Circular SII nº 16/2005 (https://www.sii.cl/documentos/circulares/2005/circu16.pdf) informa que a Ley 19.967 (2004) alterou a Ley 19.518. O texto lido já cita a Res. Ex. 155/2003, o que indica versão posterior a 2004. | **não se aplica.** Nota: exigência sobre a OTEC; nenhum inciso manda imprimir a norma ou selo no documento do aluno (D7). |
| R7 | Detalhe da exigência: a OTEC prova a NCh 2728 com certificado do sistema de gestão que traga a entidade, o N° de registro, a norma e a vigência, emitido por certificadora reconhecida pelo INN; sem certificação vigente, o Diretor Nacional do SENCE revoga a inscrição. Literal: "Sin perjuicio del cumplimiento permanente de todos los requisitos, para mantener la inscripción en el Registro Nacional de Organismos Técnicos de Capacitación, la certificación respectiva deberá estar vigente." | DS 98 (Min. Trabajo, 1997/98), **art. 10**, incisos 2 a 4. https://iura.cl/dto-98-mintrab/10.html (espelho BCN) | Média-alta (texto lido; espelho diz "texto original sin modificaciones", não confirmado na BCN) | **não se aplica.** Nota: obrigação operacional da Lotus: manter a certificação NCh 2728 vigente. Ver Pendência 7. |
| R8 | A NCh 2728 vigente é a edição de 2015, "Organismos técnicos de capacitación - Requisitos", publicada em 21/12/2015, com status "Vigente" na loja do INN. A ficha descreve requisitos para implementar um sistema de gestão da qualidade em OTEC. Não verificado: a base em NCh-ISO 9001:2008 veio de snippet de busca e não consta na ficha do INN (o projeto de 2002 cita ISO 9001:2000), por isso não é afirmada aqui. | INN. https://ecommerce.inn.cl/nch2728201549732 | Alta para a ficha (título, status, data). **Texto da norma não lido (pago).** | **não se aplica.** Nota: cláusulas específicas ficam para quem comprar a norma (Deferred do `context.md`). |
| R9 | Certificado de **asistencia** SENCE (franquicia tributária): campos do formato oficial: atividade, nome e RUT da OTEC, nome e RUT da empresa, OTIC se houver, nome da atividade, **código SENCE**, datas de início e fim, horas, N° de factura ou ordem de compra, N° de registro da ação SENCE, tabela de participantes (RUT, nome, % de asistencia) e bloco de assinatura do representante da OTEC inscrito (nome, RUT, firma). Atesta o resultado final de asistencia, "evidenciado en el libro físico de asistencia". | SENCE, formato "Certificado de asistencia actividad OTEC, CFT o entidad niveladora". https://sence.gob.cl/sites/default/files/articles-7280_documento_9.doc | Alta para o conteúdo do formato (lido). Média quanto à vigência desse formato: o `.doc` pode ter sido substituído pelo sistema eletrônico (R10). | **não se aplica.** Nota: o certificado da Lotus não é o de asistencia: não traz código SENCE, nem N° de factura, nem tabela. Ver Pendência 1. |
| R10 | Hoje o certificado de asistencia para franquicia é **emitido no sistema do SENCE** (Libro de Clases Electrónico), em PDF, em até 40 dias corridos (limite de 59) do fim do curso; liquidação em 60 dias corridos. Mínimo de 75% de asistencia (presencial), "independiente a la aprobación o reprobación". | SENCE, Preguntas frecuentes del Sistema de Certificados (PDF) https://sence.gob.cl/sites/default/files/preguntas_frecuentes_del_sistema_de_certificados_rev._1.1.pdf ; https://sence.gob.cl/empresas/franquicia-tributaria | Alta (ambos lidos). Data do PDF: 2021 (metadado); a página de franquicia é atual. | **não se aplica.** Nota: a franquicia se prova com o documento do SENCE, não com o da Lotus. O certificado da Lotus não é gate de franquicia; a "asistencia" impressa é informativa. |
| R11 | Conteúdo mínimo de um certificado de **aprovação** emitido pela OTEC ao aluno. | Nenhuma norma encontrada. A página de franquicia só diz que os trabalhadores baixam "certificados de capacitación" do buscador "Elige Mejor", sem detalhar. | **Baixa.** Ausência de resultado não prova que a norma não existe. Não li DS 98 inteiro nem as bases técnicas do SENCE. | **decisão da Lotus.** Nota: o conteúdo atual (aluno, RUT, curso, horas, período, nota, N° de registro) é escolha da Lotus. Ver Pendência 2. |
| R12 | Guarda de registros: a NCh 2728 exige procedimento documentado de "tiempo de retención" dos registros. | NCh 2728, cláusula **4.2.4**. **Lido apenas no projeto de 2002** (https://empresas.sence.cl/normacalidad/NCh2728-2002.pdf), que diz: "Se debe establecer un procedimiento documentado para definir los controles necesarios para la identificación, almacenamiento, protección, recuperación, tiempo de retención y disposición de los registros." A guia do projeto acrescenta que o prazo "debería estar definido en los procedimientos" e que se deve atender à "Autoridad Competente". | **Baixa para a edição 2015** (não lida). **Correção ao `context.md` fato 7:** o "≥ 3 anos" atribuído à cláusula 4.2.4 **não aparece no texto de 2002**; ali o prazo é definido pela própria OTEC. Não achei número em fonte primária. | **decisão da Lotus.** Nota: ver Pendência 3. |
| R13 | Selos SENCE e NCh no certificado. | Nenhuma norma lida manda imprimi-los (R6, R7). O aprovado de 2026-08-05 trazia "Res. SENCE N°0879 08/03/2022" e "NCH 2728 \| 2015". | Média-alta (ausência de exigência nos artigos lidos; não li o texto da NCh 2728:2015). | **não se aplica.** Nota: decidido fora: D7. Não é exigência legal lida; a Lotus pode reativar com asset aprovado. |
| R14 | Instrumento privado com FEA ou selo de tempo, para elevar o valor probatório. | Ley 19.799, arts. 4 e 5 (R3–R5). | Alta quanto a "não ser exigido"; baixa quanto ao ganho prático (sem jurisprudência lida). | **não se aplica.** Nota: Deferred (spec §4.7 e não-objetivos). |

## 4. Divergências encontradas contra o `context.md`

1. **Fato 6 (Ley 19.799):** art. 3, 4 e 5 confirmados em texto. Acréscimo: o art. 5 tem duas redações, a original
   (Justia, até 11-11-2007) e a vigente (iura.cl e SUSESO), e nas duas a conclusão para instrumento
   privado com firma simples é a mesma (R4). Também fica de pé a ressalva de R2 (imagem como "firma electrónica").
2. **Fato 7, retenção ≥ 3 anos na cláusula 4.2.4:** **não confirmado.** O texto de 2002 só pede
   procedimento de retenção, sem prazo. Trate como não verificado.
3. **Fato 7, Ley 19.518 art. 21 / DS 98 art. 10:** confirmados (R6, R7), com o nº 2 do art. 21 e
   os incisos 2 a 4 do art. 10 lidos.
4. **Fato 7, certificado de asistencia com código SENCE:** confirmado no formato oficial (R9), e
   com a nuance de R10: hoje ele sai do sistema do SENCE.
5. **Fato 7, conteúdo mínimo do certificado de aprovação:** continua **não verificado** (R11).

O gatilho de staleness "fonte primária contradizer os fatos 6–7" dispara só no ponto 2 (o "3 anos").

## 5. Pendências da Lotus

Itens que nenhuma fonte lida resolve; precisam de resposta da Lotus (ou de consulta ao SENCE).

1. **Código SENCE no certificado.** O certificado de asistencia oficial traz o código SENCE do
   curso (R9); o da Lotus não. A pergunta: a Lotus quer o código no certificado do aluno (por
   exemplo, quando o curso é franquiciável)? Hoje o código não está no snapshot nem no layout v5
   (a confirmar no modelo do curso antes de qualquer trabalho).
2. **Nota mínima de aprovação.** Nenhuma norma lida fixa nota nem % para "aprobar" (R11). O SENCE
   fixa só 75% de asistencia para a franquicia (R10). A Lotus define a regra de aprovação e se
   ela aparece no certificado.
3. **Prazo de guarda.** Sem número em fonte primária (R12). A Lotus decide o prazo de retenção do
   certificado, do snapshot e do registro de asistencia e o escreve no procedimento da NCh 2728. Se
   a política for apagar, isso conflita com "certificado emitido não muda" (D12) e com a retenção
   de 7 dias de versões de documento no S3 (ADR-11 emenda 2026-10-25); a Lotus deve saber disso.
4. **Exigência do setor elétrico.** Não achei exigência da SEC (Superintendencia de Electricidad
   y Combustibles) nem de empresas de alta tensão sobre o formato do certificado de OTEC. As
   fontes (ChileAtiende, notas do Ministério de Energia) falam de licença de instalador elétrico por
   título ou por certificação de competências (ChileValora), e de cursos de OTEC como preparação,
   sem exigir formato. **Fonte: só notícias e fichas de trâmite; certeza baixa.** Pergunte aos
   clientes do setor se algum auditor exige selos, código SENCE, assinatura avançada ou prazo de
   validade.
5. **Imagem de assinatura como firma electrónica (R2).** Se um cliente ou auditor questionar a
   autoria, a prova é "las reglas generales" (R4). A Lotus decide se aceita esse nível ou abre a
   ficha de FEA (Deferred).
6. **D5 (assinaturas vivas) e a data.** Pela D5, certificado já emitido é reimpresso com a
   assinatura e o nome da gerente **atuais**, e o nome do instrutor segue o do snapshot (D14). A
   data impressa é a de emissão original. Não achei norma que proíba, mas isso enfraquece a
   leitura de que o documento é "o mesmo" que foi assinado na época (R5). A Lotus deve saber disso;
   não é erro desta task.
7. **Vigência da própria NCh 2728 (obrigação operacional, R7).** A Lotus precisa manter a
   certificação NCh 2728 vigente, ou perde a inscrição (DS 98 art. 10, inciso 4). O SENCE indica
   vigência de 3 anos para a certificação (informação de snippet de busca de instruções do SENCE,
   não lida na fonte: certeza baixa). **Hipótese, não verificada:** os "3 anos" do fato 7 do
   `context.md` (atribuídos à retenção de registros na cláusula 4.2.4) podem ser, na verdade, essa
   vigência de 3 anos da certificação NCh 2728, confundida com prazo de guarda. Se for isso, não
   existe prazo de retenção em fonte alguma lida (ver Pendência 3). Fora do escopo do sistema, mas é o único requisito de
   validade da OTEC que a pesquisa confirmou em texto.

## 6. Decidido (para não reabrir)

- **Selos fora (D7).** Nenhum artigo lido os exige no certificado do aluno (R6, R7, R13).
- **FEA não exigida** para instrumento privado: Ley 19.799, arts. 3, 4 e 5 (R1, R3, R4). **Vai
  para Deferred**, em ficha própria, se a Lotus quiser reforçar a prova.

## 7. O que ainda precisa de olho humano

- Conferir em bcn.cl, no navegador, o texto consolidado do art. 5 da Ley 19.799 (R4) e do art. 21
  da Ley 19.518 (R6). Esta pesquisa não conseguiu abrir a BCN.
- Comprar ou consultar a NCh 2728:2015 no INN para a cláusula 4.2.4 e para qualquer menção a
  certificado ao participante (R8, R12).
- Perguntar ao SENCE (ou a um assessor jurídico da Lotus) se existe conteúdo mínimo para o
  certificado de aprovação de OTEC (R11).
