#!/usr/bin/env bash
#
# Provider OIDC + role de deploy para a Actions do corporativo (item 12, §9).
# Idempotente: reexecutar nao estraga nada, e termina em readback.
# Quem roda e' o JOAO, com credencial administrativa da conta; a sessao confere
# a saida. Console clicando nao deixa rastro e IaC seria estado novo para
# manter por causa de dois recursos.
#
# Uso:  LOTUS_INSTANCIA=i-0123456789abcdef0 deploy/aws/criar-oidc-e-role.sh
set -euo pipefail

REPO="${LOTUS_REPO:-Gatika-CL/lotus}"
REGIAO="${LOTUS_REGIAO:-sa-east-1}"
INSTANCIA="${LOTUS_INSTANCIA:-}"
[ -n "$INSTANCIA" ] || { echo "erro: defina LOTUS_INSTANCIA=i-..." >&2; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

CONTA=$(aws sts get-caller-identity --query Account --output text)
EMISSOR=token.actions.githubusercontent.com
ARN_OIDC="arn:aws:iam::$CONTA:oidc-provider/$EMISSOR"
ROLE=lotus-deploy

echo "==> conta $CONTA, regiao $REGIAO, repositorio $REPO, instancia $INSTANCIA"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$ARN_OIDC" >/dev/null 2>&1; then
  echo "==> provider OIDC ja existe"
else
  # O thumbprint deixou de ser verificado pela AWS para ESTE emissor em 2023,
  # mas a API continua exigindo o campo. Valor documentado pela AWS.
  aws iam create-open-id-connect-provider --url "https://$EMISSOR" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 >/dev/null
  echo "==> provider OIDC criado"
fi

# `sub` fixado na main do corporativo: workflow_dispatch de outra branch, ou de
# outro repositorio, recebe AccessDenied em vez de deploy. Curinga aqui seria
# entregar a conta a qualquer branch que alguem crie.
cat > "$TMP/trust.json" <<JSON
{"Version":"2012-10-17","Statement":[{
  "Effect":"Allow",
  "Principal":{"Federated":"$ARN_OIDC"},
  "Action":"sts:AssumeRoleWithWebIdentity",
  "Condition":{"StringEquals":{
    "$EMISSOR:aud":"sts.amazonaws.com",
    "$EMISSOR:sub":"repo:$REPO:ref:refs/heads/main"}}}]}
JSON

if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" --policy-document "file://$TMP/trust.json"
  echo "==> trust da role $ROLE atualizada"
else
  aws iam create-role --role-name "$ROLE" \
    --assume-role-policy-document "file://$TMP/trust.json" \
    --description "Promocao de release por OIDC da Actions de $REPO" >/dev/null
  echo "==> role $ROLE criada"
fi

# Minima de verdade: mandar UM comando, para UMA instancia, com UM documento.
# Nada de ssm:StartSession — esta role nao abre shell. `GetCommandInvocation` e
# `ListCommandInvocations` ficam em "*" porque sao leitura e o id do comando so
# existe depois do send.
cat > "$TMP/ssm.json" <<JSON
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":"ssm:SendCommand","Resource":[
   "arn:aws:ec2:$REGIAO:$CONTA:instance/$INSTANCIA",
   "arn:aws:ssm:$REGIAO::document/AWS-RunShellScript"]},
 {"Effect":"Allow","Action":["ssm:GetCommandInvocation","ssm:ListCommandInvocations"],
  "Resource":"*"}]}
JSON
aws iam put-role-policy --role-name "$ROLE" --policy-name lotus-deploy-ssm \
  --policy-document "file://$TMP/ssm.json"
echo "==> politica lotus-deploy-ssm aplicada"

# Sem isto o agente do host nao fala com o servico, e o send-command fica
# eternamente Pending. Nao mexe no que a lotus-ec2 ja tem (S3 do backup, SNS).
aws iam attach-role-policy --role-name lotus-ec2 \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
echo "==> lotus-ec2 com AmazonSSMManagedInstanceCore"

echo
echo "===== readback ====="
aws iam get-role --role-name "$ROLE" --query 'Role.AssumeRolePolicyDocument' --output json
aws iam list-role-policies --role-name "$ROLE" --output text
aws iam list-attached-role-policies --role-name lotus-ec2 --output text
PING=$(aws ssm describe-instance-information --region "$REGIAO" \
  --filters "Key=InstanceIds,Values=$INSTANCIA" \
  --query 'InstanceInformationList[0].PingStatus' --output text)
echo "PingStatus de $INSTANCIA: $PING"
[ "$PING" = "Online" ] || { echo "erro: o agente SSM de $INSTANCIA nao esta Online" >&2; exit 1; }
echo
echo "secret AWS_DEPLOY_ROLE_ARN = arn:aws:iam::$CONTA:role/$ROLE"
echo "secret AWS_INSTANCE_ID     = $INSTANCIA"
