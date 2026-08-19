<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
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
    public function provision(
        string $type,
        string $name,
        string $rut,
        string $email,
        ?string $phone = null,
    ): User {
        $rut = $this->ensureIdentityAvailable($rut, $email);

        return User::create([
            'name' => $name,
            'rut' => $rut,
            'email' => $email,
            'phone' => $phone,
            'password' => bin2hex(random_bytes(16)),
            'type' => $type,
            'is_active' => $this->accessDefaultFor($type),
        ]);
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
