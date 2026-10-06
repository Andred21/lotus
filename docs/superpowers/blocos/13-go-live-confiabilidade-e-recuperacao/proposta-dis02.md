# Propuesta de revisión del requisito RNF-DIS-02 — disponibilidad y recuperación

**Para:** Lotus · **De:** equipo de desarrollo de la plataforma · **Fecha:** 2026-10-06 ·
**Estado:** pendiente de aceptación

## 1. Qué dice el requisito hoy

El `RNF-DIS-02` de `requisitos-negocio.md` exige un *servidor redundante listo para asumir en caso
de caída*.

## 2. Qué entrega la arquitectura actual

Una única instancia EC2 en la región `sa-east-1` (São Paulo), con la base de datos MySQL 8 en
contenedor dentro de la misma instancia. **No hay servidor redundante.** La decisión se tomó por
costo, proporcional a ~10 usuarios internos de baja concurrencia, y está registrada en
las decisiones ADR-09 y ADR-14 del repositorio.

## 3. Qué garantiza la arquitectura actual

| Medida | Valor | Cómo se garantiza |
|---|---|---|
| **RPO** (pérdida máxima de datos) | **≤ 24 horas con respaldo sano** | respaldo diario de la base a las 06:10 UTC hacia S3, con retención de 30 días; la verificación alerta si el último respaldo supera 48 horas |
| **RTO** (tiempo máximo de recuperación) | **`<RTO medido>`** | restauración manual según el runbook, medida en el go-live sobre una base pequeña (fecha y tamaño del respaldo registrados en el ADR-14); crece con el volumen |

## 4. Qué se pierde en una restauración

Todo lo escrito después del último respaldo: hasta un día de certificados emitidos, matrículas y
registros de auditoría. Un certificado emitido y luego perdido en una restauración deja de
validarse por su código QR y tendría que **volver a emitirse**. También se pierde toda revocación
hecha después del respaldo: un certificado revocado vuelve a figurar como emitido y la validación
pública lo mostraría como válido, por lo que la revocación debe repetirse. Además, la numeración
vuelve al valor del respaldo: el número visible de un certificado perdido (`LOT-<año>-<n>`)
**puede asignarse de nuevo** a otro certificado emitido después de la restauración. Por eso, tras
una restauración, los certificados perdidos se reemiten y quien tenga el documento original debe
ser avisado de que ya no es válido.

## 5. Ruta futura de alta disponibilidad

Base de datos gestionada (RDS multi-AZ) y segunda instancia EC2 detrás de un balanceador (ALB).
**Se activa si** Lotus exige un RTO/RPO menor que los declarados arriba, o si una indisponibilidad
real supera el RTO declarado. Costo estimado adicional: `<costo estimado>`.

## 6. Lo que se pide

Que Lotus **acepte explícitamente** la revisión del `RNF-DIS-02` en estos términos: sin servidor
redundante, RPO ≤ 24 h, RTO `<RTO medido>`, y la ruta de alta disponibilidad como etapa futura
con los gatillos del punto 5. La aceptación (o el rechazo) queda registrada en el repositorio con
fecha y nombre de quien responde.
