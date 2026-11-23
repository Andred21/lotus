<?php
// Bloco 60, §5.1 da spec. Só leitura: contagens de formato. Não imprime nenhum RUT, telefone nem e-mail.
// Rodar da raiz da worktree da lane (o tinker por stdin recusa a linha `<?php`, daí o `tail`):
//   tail -n +2 docs/superpowers/blocos/60-codigos-mascaras-comercial-e-avaliacoes/scripts/medir-formatos-producao.php | \
//     ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 \
//     'sudo docker exec -i $(sudo docker ps -qf label=com.docker.compose.service=app) php artisan tinker' \
//     | grep -oE '(RUT|FONE|EMAIL|FILES_TURMA) .*'

$fmt = '^[0-9]{1,3}([.][0-9]{3})*-[0-9K]$';   // 12.345.678-5
$cru = '^[0-9]{6,9}[0-9K]$';                  // 123456785
$hif = '^[0-9]{6,9}-[0-9K]$';                 // 12345678-5

$rut = DB::table('users')
    ->selectRaw('type, count(*) total, sum(rut is null) sem_rut, sum(rut regexp ?) formatado, sum(rut regexp ?) cru, sum(rut regexp ?) so_hifen', [$fmt, $cru, $hif])
    ->groupBy('type')->get();
echo 'RUT ', json_encode($rut), PHP_EOL;

foreach (['users', 'client_contacts'] as $t) {
    $p = DB::table($t)->selectRaw(
        "count(*) total, sum(phone is null or phone = '') vazio, sum(phone regexp '^[0-9]+$') so_digitos, sum(phone regexp '^[+]') com_mais, sum(phone regexp '[ ().-]') com_separador"
    )->first();
    echo 'FONE ', $t, ' ', json_encode($p), PHP_EOL;
}

$emailDup = DB::table('users')
    ->selectRaw('lower(trim(email)) e, count(*) n')
    ->whereNotNull('email')
    ->groupByRaw('lower(trim(email))')
    ->havingRaw('count(*) > 1')
    ->get()->count();
$emailSujo = DB::table('users')->whereNotNull('email')->whereRaw('email <> lower(trim(email))')->count();
echo 'EMAIL ', json_encode(['grupos_duplicados_normalizado' => $emailDup, 'fora_da_forma_normalizada' => $emailSujo]), PHP_EOL;

$files = DB::table('files')
    ->selectRaw('type, count(*) total, sum(deleted_at is null) ativos')
    ->where('fileable_type', 'turma')
    ->groupBy('type')->get();
echo 'FILES_TURMA ', json_encode($files), PHP_EOL;
