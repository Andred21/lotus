# Rulings — bloco 47, ajustes de interface lote 2

Decisões tomadas em nome do João durante a execução (`/executar-bloco 47`, SDD). Cada linha diz o
que custa se estiver errada.

- Reversão da D8 (spec de upload de 2026-07-31): nasce o `AppFileSlot` compartilhado em `shared/ui`, por decisão do João (spec §4.1); o docblock do `AppFileActions` e o do `AppFileSlot` registram a reversão. Custo se errado: voltar a slots por tela.
- Pipeline de profundidade 1 (Passo 5.1): o revisor de uma task rodou em segundo plano, numa worktree destacada, enquanto a task seguinte do mesmo grupo era implementada. Custo se errado: achado fantasma ou retrabalho.
- T1: aceito o toque em `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php` (entrada em ISENTOS para a action nova, no padrão da `StoreRedatorDocumentAction`), fora da lista de arquivos da task. Custo se errado: isenção indevida na catraca de upload.
- T2: aceitos os toques fora da lista em `RedatorDocumentSlot.tsx` e `useTurmaDocsSection.ts`, consequência direta de migrar o `SlotBody`. Custo se errado: regressão no CV ou na turma fora do escopo revisado.
- T2/T9: o `DocumentTypeCard.test.tsx` nasceu na T2 e a T9 o estendeu, em vez de criar. Custo se errado: só a redação do plano.
- T3: o `useSignatureCleaner` ganhou `reject(message)`, para o slot mostrar o erro de arquivo acima de 25 MB. Custo se errado: contrato maior que o brief.
- T3: aceitos `shared/testing/signature.ts` (helpers) e a divisão do teste de modos da firma por `max-lines`. Custo se errado: nenhum funcional.
- T3: a dica de formatos da firma aparece só onde há envio; some na visualização e no Perfil gerenciado. Custo se errado: o João quer a dica sempre visível; mudança pequena.
- T5: o defeito do cabeçalho do Perfil foi corrigido no consumidor (`ProfileDocumentSlotHeader` ocupa a linha), não no `AppFileSlot`. Custo se errado: um consumidor futuro com título de nó único repete o defeito.
- T6: o ícone de enviar da foto passou de `pi-camera` a `pi-upload`, e a confirmação usa `common.deleteFileMessage` com `photo.fileName`. Custo se errado: o João quer a câmera de volta; troca de uma linha.
- T4: autorizado tocar `CertificateSettingsPanel.test.tsx`, fora da lista, só no que a remoção do `AppSignatureUpload` exigiu. Custo se errado: o teste do painel perde cobertura (a revisão a achou intacta).
- T4: o componente `AppSignatureUpload` foi apagado e o teste dele virou `useSignatureCleaner.test.tsx`. Custo se errado: um caso perdido na migração; o de cancelar a prévia se perdeu e foi reposto (3281078a).
- T8: o M1 (erro de tamanho atrás de erro de envio antigo) e o nome acessível concatenado foram corrigidos na hora, com as chaves novas `common.uploadNamed`/`common.replaceNamed`. Custo se errado: escopo um pouco maior que o brief.
- T10: a limpeza de locale removeu só as chaves que este bloco matou, medidas contra a merge-base `d220a04f`. Custo se errado: uma chave morta que fica ou uma chave viva removida.
- T10: a prova mexeu nos dados de desenvolvimento do banco da lane, inclusive a senha do redator `juan.morales@lotus.cl` (lista no `prova.md`). Custo se errado: os dados da lane diferem do seed.
- T10: a rolagem de 14 px do diálogo do redator a 390 px (cartões `AppSelectableCard` de curso) e o "Not uploaded" duplicado no Perfil ficaram registrados como fora do escopo. Custo se errado: o bloco devia a correção.
- Revisão final, I2: o nome acessível com o tipo vale para enviar, substituir e excluir em toda tela com vários documentos (redator, turma, cotização, presupuesto, Perfil), com a chave nova `common.deleteNamed`. Na turma, "Remover" virou "Excluir {{tipo}}" e "Subir PDF" virou "Enviar {{tipo}}"; o diálogo de confirmação manteve o texto da turma. Custo se errado: o João preferia os verbos antigos da turma; troca de chave.
- Revisão final: a lixeira da própria cotação (não do arquivo dela) fica com `common.delete`, porque não é documento. Custo se errado: D-23 parcial na linha da cotação.
- Revisão final: a pasta `shared/ui/AppSignatureUpload` não foi renomeada; só o texto do `docs/estrutura-monolito.md` mudou. Custo se errado: o nome da pasta engana quem procura o componente.
- Revisão final, M7: o banner do presupuesto mostra `sizeError ?? uploadError ?? fileError`, e remover zera os erros locais. Custo se errado: um erro de remoção fica atrás de um de tamanho na mesma tela.
- Revisão final: adiados para o `/revisar-bloco` o verbo diferente no excluir da firma (redator "Delete", gerente "Remove signature", ticket 03), a fiação repetida da assinatura (sem quarto consumidor) e as lacunas aceitas da prova (foto com arquivo só no Perfil admin; firma do redator provada por teste). Custo se errado: o ticket 03 "mesmo slot" fica com verbo diferente até a revisão.
