<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

/**
 * Domain Service compartilhado: provisiona o User de login de um "ator"
 * (cliente, redator, aluno) — toda entidade que é extensão 1:1 de User.
 *
 * Normaliza o RUT, garante unicidade de RUT **e** e-mail (incluindo
 * soft-deletados, pois os índices únicos de users.rut/users.email não
 * distinguem deleted_at) e cria o User com senha placeholder e o acesso que o
 * tipo permite (RN-01).
 *
 * É a fonte única desta regra — as Actions de cada domínio
 * (CreateClientAction, CreateRedatorAction, ...) chamam este service em vez de
 * duplicar o provisionamento.
 */
class UserProvisioner
{
    private const DUPLICADO = [
        'rut' => 'Este RUT já está cadastrado.',
        'email' => 'Este e-mail já está cadastrado.',
    ];

    public function provision(
        string $type,
        string $name,
        string $rut,
        string $email,
        ?string $phone = null,
    ): User {
        $rut = $this->ensureIdentityAvailable($rut, $email);

        return $this->writing(fn () => User::create([
            'name' => $name,
            'rut' => $rut,
            'email' => $email,
            'phone' => $phone,
            'password' => bin2hex(random_bytes(16)),
            'type' => $type,
            'is_active' => $this->accessDefaultFor($type),
        ]));
    }

    /**
     * O default de acesso depende do ator (RN-01). Redator autentica, então
     * nasce ativo e o gate real dele passa a ser SABER a senha — que só chega
     * pelo convite. Cliente e aluno não logam e continuam inativos.
     */
    private function accessDefaultFor(string $type): bool
    {
        return $type === 'redator';
    }

    /**
     * Porta única da checagem de identidade: RUT **e** e-mail, na mesma
     * chamada. Existe porque a metade era esquecível — `provision()` fechava só
     * o RUT e quatro dos nove caminhos de escrita não chamavam a outra, o que
     * transformava colisão de e-mail em 500 genérico.
     *
     * As duas checagens rodam SEMPRE e os erros sobem juntos: quem cadastrou um
     * registro repetido inteiro corrige os dois campos num passe, em vez de
     * descobrir o e-mail depois de consertar o RUT.
     *
     * `$rut` nulo significa "esta entidade não tem RUT" (staff) — pula a
     * checagem de RUT e NUNCA a de e-mail.
     *
     * @param  int|null  $exceptUserId  id do próprio user, ignorado na checagem (update)
     * @return string|null o RUT já formatado, ou null quando não havia RUT
     */
    public function ensureIdentityAvailable(?string $rut, string $email, ?int $exceptUserId = null): ?string
    {
        $erros = [];
        $formatado = null;

        if ($rut !== null) {
            $formatado = Rut::parse($rut)->format();

            if ($estado = $this->duplicateStatus('rut', $formatado, $exceptUserId)) {
                $erros['rut'] = $estado === 'arquivado'
                    ? 'Este RUT pertence a um cadastro arquivado. Restaure-o em vez de criar outro.'
                    : self::DUPLICADO['rut'];
            }
        }

        if ($estado = $this->duplicateStatus('email', $email, $exceptUserId)) {
            $erros['email'] = $estado === 'arquivado'
                ? 'Este e-mail pertence a um cadastro arquivado. Restaure-o em vez de criar outro.'
                : self::DUPLICADO['email'];
        }

        if ($erros !== []) {
            throw ValidationException::withMessages($erros);
        }

        return $formatado;
    }

    /**
     * Executa a escrita traduzindo colisão de índice único de `users` em 422 do
     * campo — a MESMA resposta que `ensureIdentityAvailable` dá quando ganha a
     * corrida (P-29). O check não trava linha inexistente, então duas escritas
     * concorrentes passam as duas por ele e o perdedor estoura no índice.
     *
     * A detecção é pela mensagem, e não pelo SQLSTATE: `QueryException::getCode`
     * carrega o código da PDOException por baixo, cuja forma varia por driver.
     * Cobrimos as duas grafias — sqlite (`users.rut`) porque é onde a suíte
     * roda, MySQL (`users_rut_unique`) porque é onde o cliente está.
     *
     * @template T
     *
     * @param  Closure():T  $write
     * @return T
     */
    public function writing(Closure $write): mixed
    {
        try {
            return $write();
        } catch (QueryException $e) {
            $coluna = $this->duplicateColumn($e);

            if ($coluna === null) {
                throw $e;
            }

            throw ValidationException::withMessages([$coluna => self::DUPLICADO[$coluna]]);
        }
    }

    private function duplicateColumn(QueryException $e): ?string
    {
        $mensagem = $e->getMessage();

        foreach (array_keys(self::DUPLICADO) as $coluna) {
            // Casamento por substring, sem qualificador de tabela: uma tabela
            // futura terminada em "_users" (ex.: `corporate_users`) com coluna
            // `rut`/`email` única faria "corporate_users.rut" casar aqui como
            // falso positivo. Se isso nascer, qualifique com `users.{$coluna}`
            // como prefixo (ou ancore em início de palavra) em vez de `str_contains`.
            if (str_contains($mensagem, "users_{$coluna}_unique") || str_contains($mensagem, "users.{$coluna}")) {
                return $coluna;
            }
        }

        return null;
    }

    /**
     * `withTrashed` porque os índices únicos de `users.rut` e `users.email` não
     * distinguem `deleted_at`: sem ele o conflito com um arquivado viraria 500.
     * A coluna vem na projeção — e não uma segunda consulta — porque o operador
     * precisa saber que o caminho é RESTAURAR, não criar outro. Como as duas
     * colunas são únicas, há no máximo uma linha por valor.
     *
     * @return 'vivo'|'arquivado'|null
     */
    private function duplicateStatus(string $coluna, string $valor, ?int $exceptUserId): ?string
    {
        $duplicado = User::withTrashed()
            ->where($coluna, $valor)
            ->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->first(['id', 'deleted_at']);

        if ($duplicado === null) {
            return null;
        }

        return $duplicado->deleted_at === null ? 'vivo' : 'arquivado';
    }
}
