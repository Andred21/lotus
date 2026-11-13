// Impressao digital das contas de redator do teste (bloco 59). LEITURA PURA: nao escreve nada.
// Uso: ver README.md. Nao edite a allowlist em producao. (ASCII de proposito: o PsySH embaralha UTF-8.)

$ids = app()->environment('production') ? [252, 253] : [2, 5];

echo 'env='.app()->environment().' session='.config('session.driver')."\n";

$recusas = [];
foreach ($ids as $id) {
    $u = \App\Domains\Identity\Models\User::find($id);
    if ($u === null) {
        $recusas[] = "RECUSADO: {$id} nao existe";
    } elseif ($u->type !== 'redator') {
        $recusas[] = "RECUSADO: {$id} type={$u->type}";
    } elseif ($u->is_active !== true) {
        $recusas[] = "RECUSADO: {$id} inativo";
    }
}
foreach ($recusas as $r) {
    echo $r."\n";
}

foreach ($ids as $id) {
    $u = \App\Domains\Identity\Models\User::find($id);
    if ($u === null) {
        echo "{$id} (nao existe)\n";
        continue;
    }
    $t = fn ($tabela, $col, $val) => \Illuminate\Support\Facades\DB::table($tabela)->where($col, $val)->count();
    echo sprintf(
        '%d type=%s ativo=%d hash=%s sessoes=%d convites=%d resets=%d logins=%d updated_at=%s',
        $u->id,
        $u->type,
        $u->is_active ? 1 : 0,
        substr(hash('sha256', $u->getAuthPassword()), 0, 8),
        $t('sessions', 'user_id', $u->id),
        $t('invitation_tokens', 'email', $u->email),
        $t('password_reset_tokens', 'email', $u->email),
        $t('login_logs', 'user_id', $u->id),
        $u->updated_at->toIso8601String(),
    )."\n";
}
