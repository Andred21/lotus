// Troca a senha dos redatores do teste por uma temporaria aleatoria (bloco 59).
// ESCREVE em users via Eloquent (a auditoria do owen-it so dispara assim). Nao edite a allowlist em
// producao. Nao cole a senha em lugar nenhum. (ASCII de proposito: o PsySH embaralha UTF-8.)

$ids = app()->environment('production') ? [252, 253] : [2, 5];

echo 'env='.app()->environment().' session='.config('session.driver')."\n";

// Guarda: checa TODOS os ids antes do primeiro save(); um recusado e nenhum e escrito.
// Fecha em erro: por stdin o PsySH le o arquivo como um buffer so e uma excecao aborta o resto,
// entao a escrita nao roda. $guardaOk e defesa em profundidade. NAO cole linha a linha no tinker
// interativo: ali a execucao segue depois da excecao e $guardaOk = true roda mesmo assim.
$guardaOk = false;
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
$guardaOk = true;
foreach ($recusas as $r) {
    echo $r."\n";
}

if ($guardaOk === true && $recusas === [] && count($ids) === 2) {
    foreach ($ids as $id) {
        $u = \App\Domains\Identity\Models\User::find($id);
        $senha = \Illuminate\Support\Str::password(32);
        $u->password = \Illuminate\Support\Facades\Hash::make($senha);
        $u->save();
        echo "{$id} senha={$senha}\n";
        unset($senha);
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
    unset($senha, $u);
}
