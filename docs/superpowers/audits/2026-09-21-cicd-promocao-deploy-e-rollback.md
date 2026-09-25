# Evidências — `cicd-promocao-deploy-e-rollback` (item 12)

Plano: [`plans/2026-09-21-cicd-promocao-deploy-e-rollback.md`](../plans/2026-09-21-cicd-promocao-deploy-e-rollback.md)

## Task 8 — identidade na AWS

Executada pelo João em 2026-09-24, com o profile `lotus` (`AWS_PROFILE=lotus`), a partir da árvore
`../lotus-infra` na branch `cicd/promocao-deploy-e-rollback` — o script só existe nela até a Task 11.
A primeira tentativa respondeu `UnrecognizedClientException … security token … invalid`: era o
profile padrão da máquina, não o da conta. Nada foi escrito na conta com a credencial errada.

- **`describe-instance-information` antes da role:** a saída colada foi a listagem de instâncias
  (`i-0789e30d781790dd4 | lotus-prod`), não o inventário do SSM. O estado do agente antes da role
  fica provado pelo próprio script, abaixo: a espera começou em `estado: None`, que é a instância
  **ausente** do inventário do SSM, e não `ConnectionLost` ou `Inactive`.
- **Saída do `criar-oidc-e-role.sh` (readback completo):**

  ```text
  LOTUS_INSTANCIA=i-0789e30d781790dd4 deploy/aws/criar-oidc-e-role.sh
  ==> conta 760144413534, regiao sa-east-1, repositorio Gatika-CL/lotus, instancia i-0789e30d781790dd4
  ==> provider OIDC ja existe, com a audiencia sts.amazonaws.com
  ==> role lotus-deploy criada
  ==> politica lotus-deploy-ssm aplicada
  ==> lotus-ec2 com AmazonSSMManagedInstanceCore

  ===== readback =====
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Principal": {
                  "Federated": "arn:aws:iam::760144413534:oidc-provider/token.actions.githubusercontent.com"
              },
              "Action": "sts:AssumeRoleWithWebIdentity",
              "Condition": {
                  "StringEquals": {
                      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                      "token.actions.githubusercontent.com:sub": "repo:Gatika-CL/lotus:ref:refs/heads/main"
                  }
              }
          }
      ]
  }
  POLICYNAMES     lotus-deploy-ssm
  ATTACHEDPOLICIES        arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore    AmazonSSMManagedInstanceCore
      agente ainda nao respondeu (estado: None) — esperando ate 300s
      (… a mesma linha, dez vezes no total …)
  PingStatus de i-0789e30d781790dd4: Online

  secret AWS_DEPLOY_ROLE_ARN = arn:aws:iam::760144413534:role/lotus-deploy
  secret AWS_INSTANCE_ID     = i-0789e30d781790dd4
  ```

  Conferência da sessão: `sub` fixado em `repo:Gatika-CL/lotus:ref:refs/heads/main`, **sem
  curinga**; `aud` em `sts.amazonaws.com`; `lotus-deploy-ssm` é a única inline da `lotus-deploy`;
  `AmazonSSMManagedInstanceCore` anexada à `lotus-ec2`; `PingStatus … Online`. O provider OIDC **já
  existia** na conta e o script mediu a audiência em vez de presumi-la.
- **`gh secret list --repo Gatika-CL/lotus`:**

  ```text
  NAME                 UPDATED
  AWS_DEPLOY_ROLE_ARN  less than a minute ago
  AWS_INSTANCE_ID      about 1 minute ago
  ```

  Nome e data, nunca valor, como tem de ser.
- **Agente SSM:** o agente já vinha instalado no host, mas estava fora do inventário do SSM porque a
  `lotus-ec2` não tinha permissão. Ficou `Online` sozinho depois que a política foi anexada, após dez
  ciclos de espera. **O Step 3 não foi necessário**, e por isso `deploy/aws/user-data.sh` não foi
  emendado.
