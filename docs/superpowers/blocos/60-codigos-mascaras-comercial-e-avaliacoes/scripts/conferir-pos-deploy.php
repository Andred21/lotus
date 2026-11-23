<?php
// Bloco 60, conferência pós-deploy. Só leitura: contagens. Não imprime nenhum telefone, RUT nem e-mail.
// Rodar da raiz da worktree da lane (o tinker por stdin recusa a linha `<?php`, daí o `tail`):
//   tail -n +2 docs/superpowers/blocos/60-codigos-mascaras-comercial-e-avaliacoes/scripts/conferir-pos-deploy.php | \
//     ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 \
//     'sudo docker exec -i $(sudo docker ps -qf label=com.docker.compose.service=app) php artisan tinker' \
//     | grep -oE '(FONE_E164|FONE_FORA|FONE_ZERADOS) [a-z_]+ [0-9]+|CURSO_SEM_CODE [0-9]+'
//
// Esperado: zero telefones fora de E.164 (users e client_contacts) e zero cursos sem code. A conta dos
// zerados é a que o João precisa ver: telefone legado que a conversão (migration 2026_11_22_000004) não soube validar
// e esvaziou. O valor antigo de cada um está no `old_values` do `audits`, e o id no log `telefones.e164`.

$e164 = '^[+][1-9][0-9]{7,14}$';

foreach (['users', 'client_contacts'] as $t) {
    $c = DB::table($t)->selectRaw(
        'sum(phone regexp ?) em_e164, sum(phone is not null and phone not regexp ?) fora_de_e164',
        [$e164, $e164]
    )->first();
    echo 'FONE_E164 ', $t, ' ', (int) $c->em_e164, PHP_EOL;
    echo 'FONE_FORA ', $t, ' ', (int) $c->fora_de_e164, PHP_EOL;
}

// Zerado = audit `updated` de console (sem usuário) em que o phone tinha texto e passou a NULL
// explícito. Chave ausente em `new_values` é "phone não mudou", e não conta.
$antigo = "trim(coalesce(json_unquote(json_extract(old_values, '$.phone')), ''))";
foreach (['user' => 'users', 'client_contact' => 'client_contacts'] as $alias => $t) {
    $n = DB::table('audits')
        ->where('auditable_type', $alias)
        ->where('event', 'updated')
        ->whereNull('user_id')
        ->whereRaw("json_type(json_extract(old_values, '$.phone')) = 'STRING'")
        ->whereRaw("$antigo <> ''")
        ->whereRaw("json_type(json_extract(new_values, '$.phone')) = 'NULL'")
        ->count();
    echo 'FONE_ZERADOS ', $t, ' ', $n, PHP_EOL;
}

echo 'CURSO_SEM_CODE ', DB::table('courses')->whereNull('code')->count(), PHP_EOL;
