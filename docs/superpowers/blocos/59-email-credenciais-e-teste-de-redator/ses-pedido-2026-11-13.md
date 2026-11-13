# Bloco 59 — texto do pedido de production access (2026-11-13)

Enviado pelo João no console da AWS ao reabrir o caso `179408306900526` (2026-11-13, ~15:35). A
Task 5 consome este texto: o runbook §13.6 registra o "texto usado". O primeiro parágrafo entrou no
lugar da primeira linha do rascunho; o resto foi colado sem mudança.

**Dois pontos a corrigir antes de copiar para o runbook (Task 5):**

- O item 2 diz "The IAM user used by the application is restricted by policy (ses:FromAddress)".
  A credencial real é a instance role `lotus-ec2` (ADR-23). A política `ses:FromAddress` é a mesma,
  mas é a role que a carrega, não um usuário IAM.
- O item 5 afirma que os administradores leem `lotus@lotusotec.cl`. É a dúvida que mantém a P-98
  aberta (spec §4.4). A Task 5 confirma a caixa e a P-98, ou corrige o texto.

---

```text
Our SES account in sa-east-1 still shows this case (179408306900526) as a DENIED review, and
any new request through PutAccountDetails fails with ConflictException. Please either re-review
the request with the complete information below, or clear the stale review so we can submit a
new one. Please also update the website URL to https://lotusotec.cl.

1. Website or application
- Application: https://app.lotusotec.cl (private intranet; visitors only see a login page).
- Company website: https://lotusotec.cl
Lotus is a Chilean company that delivers professional training for the regulated high-voltage electrical sector. The intranet manages quotes, courses, classes and certificates. Only our own staff and our contracted instructors can log in (about 10 to 20 accounts).

2. Email type: transactional only
We send no marketing, newsletters or promotional email. The messages are:
- Account invitation: when an administrator creates an account for a staff member or a contracted instructor, the system sends one email with a single-use link to set a password. The link expires in 7 days.
- Password reset: sent only when the user requests it on the login page. The link expires in 60 minutes.
- Security alerts to our own administrators (for example, repeated failed logins).
- Later: class confirmations (dates and location) to the contact person of a corporate client that hired a course.
All messages are sent from a single address, lotus@lotusotec.cl. The IAM user used by the application is restricted by policy (ses:FromAddress) to that address only.

3. Volume
Low and predictable: a few dozen emails per month today, well under 500 per month in the next year, and never more than about 50 in one day. Sending is one email per user action, never batch campaigns.

4. Recipient source
We do not run a mailing list and have no public sign-up. Every recipient is someone we already have a working relationship with:
- Staff and instructors: an administrator types the address by hand when creating the person's account, under an existing employment or service contract.
- Password resets: only to the address already on the account, and only when that user asks.
- Corporate clients (later): the client provides the contact address when it hires a course.
We never buy, rent, scrape or import lists.

5. Bounce and complaint handling
- The SES account-level suppression list is enabled for BOUNCE and COMPLAINT, so a suppressed address is never sent to again.
- Email feedback forwarding is enabled on the lotusotec.cl identity, so bounce and complaint notices reach lotus@lotusotec.cl, which our administrators read.
- On a bounce, an administrator corrects the address on the user record. On a complaint, the administrator deactivates the account, which stops all email to that person.
- Because every recipient is entered by hand, an invalid address is a one-off typo that we fix at the source.
- Authentication: lotusotec.cl is a verified domain identity in sa-east-1 with DKIM signing, a custom MAIL FROM domain (ses.lotusotec.cl), SPF and DMARC.

6. Sample email (account invitation; sent in Spanish because our users are in Chile)
From: Lotus <lotus@lotusotec.cl>
Subject: Acceso a la plataforma Lotus
Body:
Hola <name>,
Tu cuenta de relator fue creada. Define tu clave para entrar.
[button: Definir mi clave] (single-use link to https://app.lotusotec.cl)
Este enlace vence en 7 dias. Si vence, puedes pedir uno nuevo en "Olvide mi clave".

English translation:
Hello <name>, your instructor account was created. Set your password to log in. [Set my password]. This link expires in 7 days. If it expires, you can request a new one under "Forgot my password".

The password reset email has the same layout, with the subject "Recuperacion de clave - Lotus", a 60-minute link, and the line "If it was not you, ignore this email."

We agree to send email only to individuals who have explicitly requested it or have an existing relationship with us, and we have the bounce and complaint process described above.
```
