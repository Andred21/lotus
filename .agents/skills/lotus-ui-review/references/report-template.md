# Contrato do relatório de revisão UI/UX

Preencher o bloco abaixo sem remover campos nem markers.

```text
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface:
Local URL:
Branch/commit:
Date/time:
Agent:
Playwright CLI:
Chrome DevTools: used|unavailable|not-needed
Git working tree before/after:

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |

## Technical signals
Console:
Network:
Performance:
Untested states:

## Findings
### UI-01 — título
Classification: A|B|C
Surface/journey:
Viewport:
Reproduction:
Evidence:
Observed fact:
Inference:
Impact:
Recommendation:
Rule/reference:

## Summary
A:
B:
C:
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

Admitir no máximo dez achados. Agrupar itens A na síntese quando não precisarem de reprodução
individual. Cada item B ou C exige reprodução e evidência próprias, separando fato observado,
inferência, impacto e recomendação.
