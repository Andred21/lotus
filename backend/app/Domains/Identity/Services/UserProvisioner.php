<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use Illuminate\Validation\ValidationException;

/**
 * Domain Service compartilhado: provisiona o User de login de um "ator"
 * (cliente, redator, aluno) — toda entidade que é extensão 1:1 de User.
 *
 * Normaliza o RUT, garante unicidade (incluindo soft-deletados, pois o índice
 * único de users.rut não distingue deleted_at) e cria o User inativo com senha
 * placeholder: atores não logam até o fluxo de ativação (RN-01).
 *
 * É a fonte única desta regra — as Actions de cada domínio
 * (CreateClientAction, CreateRedatorAction, ...) chamam este service em vez de
 * duplicar o provisionamento.
 */
class UserProvisioner
{
    public function provision(
        string $type,
        string $name,
        string $rut,
        string $email,
        ?string $phone = null,
    ): User {
        $rut = $this->ensureRutAvailable($rut);

        return User::create([
            'name' => $name,
            'rut' => $rut,
            'email' => $email,
            'phone' => $phone,
            'password' => bin2hex(random_bytes(16)),
            'type' => $type,
            'is_active' => false,
        ]);
    }

    /**
     * Normaliza o RUT e garante unicidade — inclusive contra soft-deletados,
     * pois o índice único de users.rut não distingue deleted_at (senão o
     * conflito viraria 500 em vez de 422). Fonte única desta regra: create
     * (provision) e updates dos atores chamam este método.
     *
     * @param  int|null  $exceptUserId  id do próprio user, ignorado na checagem (update)
     * @return string o RUT já formatado, pronto para persistir
     */
    public function ensureRutAvailable(string $rut, ?int $exceptUserId = null): string
    {
        $rut = Rut::parse($rut)->format();

        $duplicate = User::withTrashed()
            ->where('rut', $rut)
            ->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return $rut;
    }

    /**
     * Garante unicidade de e-mail — inclusive contra soft-deletados (o índice
     * único de users.email não distingue deleted_at; senão a colisão vira 500 em
     * vez de 422). Fonte única: as Actions de staff chamam antes de persistir.
     */
    public function ensureEmailAvailable(string $email, ?int $exceptUserId = null): void
    {
        $exists = User::withTrashed()
            ->where('email', $email)
            ->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['email' => 'Este e-mail já está cadastrado.']);
        }
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
                    : 'Este RUT já está cadastrado.';
            }
        }

        if ($estado = $this->duplicateStatus('email', $email, $exceptUserId)) {
            $erros['email'] = $estado === 'arquivado'
                ? 'Este e-mail pertence a um cadastro arquivado. Restaure-o em vez de criar outro.'
                : 'Este e-mail já está cadastrado.';
        }

        if ($erros !== []) {
            throw ValidationException::withMessages($erros);
        }

        return $formatado;
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
