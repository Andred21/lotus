// Xadrez que deixa o fundo transparente ENXERGÁVEL. A assinatura é traço escuro,
// então o fundo é claro nos DOIS temas: os tokens `--signature-bg-*` fixam isso
// (em vez de seguir as superfícies, que escurecem no tema escuro).
// Exportado para quem mostra a assinatura JÁ enviada (Configuración › Certificados).
export const signatureCheckerboard = {
  backgroundImage: 'repeating-conic-gradient(var(--signature-bg-a) 0% 25%, var(--signature-bg-b) 0% 50%)',
  backgroundSize: '16px 16px',
}
