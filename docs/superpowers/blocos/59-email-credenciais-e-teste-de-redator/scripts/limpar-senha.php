// Limpa a senha dos redatores do teste: senha aleatoria descartada, remember_token nulo, sessoes
// apagadas (bloco 59). ESCREVE em users via Eloquent. Nao imprime senha. Nao edite a allowlist em
// producao. (ASCII de proposito: o PsySH embaralha UTF-8.)

$ids = app()->environment('production') ? [252, 253] : [2, 5];

echo 'env='.app()->environment().' session='.config('session.driver')."\n";

// Fecha em erro: tinker segue depois de uma excecao; so $guardaOk === true libera a escrita.
$guardaOk = false;
$recusas = [];

// Sem driver database as sessoes nao se apagam por user_id: recusa inteira.
if (config('session.driver') !== 'database') {
    $recusas[] = 'RECUSADO: session.driver='.config('session.driver').' (precisa ser database)';
}

// Guarda: checa TODOS os ids antes do primeiro save(); um recusado e nenhum e escrito.
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
$guardaOk = true;
foreach ($recusas as $r) {
    echo $r."\n";
}

if ($guardaOk === true && $recusas === [] && count($ids) === 2) {
    foreach ($ids as $id) {
        $u = \App\Domains\Identity\Models\User::find($id);
        $u->password = \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(64));
        $u->setRememberToken(null);
        $u->save();
        \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $id)->delete();
        $u = \App\Domains\Identity\Models\User::find($id);
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
    unset($u);
}
