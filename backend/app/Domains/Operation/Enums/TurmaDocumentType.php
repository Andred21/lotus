<?php

namespace App\Domains\Operation\Enums;

use App\Shared\Files\ContentClass;
use App\Shared\Files\TipoDeArquivo;

/**
 * Tipos de documento da turma (RN-16 — RF-RED-07). Enum do domínio, não
 * global: a `files` polimórfica tem `type` string livre; este enum rotula e
 * restringe os docs de turma (mesmo padrão do RedatorDocumentType).
 *
 * Só `MANUAL` e `EVALUACION_REDATOR` bloqueiam a conclusão e a habilitação; as
 * evaluaciones do cliente e dos alunos são opcionais — a turma conclui sem
 * elas e o dashboard cobra a falta (bloco 60).
 */
enum TurmaDocumentType: string implements TipoDeArquivo
{
    case MANUAL = 'MANUAL';
    case EVALUACION_REDATOR = 'EVALUACION_REDATOR';
    case EVALUACION_CLIENTE = 'EVALUACION_CLIENTE';
    case EVALUACION_ALUNO = 'EVALUACION_ALUNO';

    public function conteudo(): ContentClass
    {
        return ContentClass::DocumentoDeTurma;
    }

    public function aceitaValidade(): bool
    {
        return false;
    }

    /** Este tipo impede concluir e habilitar a turma enquanto faltar? */
    public function bloqueiaConclusao(): bool
    {
        return in_array($this, self::bloqueantes(), true);
    }

    /**
     * O dono da pergunta "o que bloqueia": o `TurmaHabilitacaoService`, o SQL de
     * `whereDisplayStatus()` e a conclusão leem esta lista, e só ela.
     *
     * @return array<self>
     */
    public static function bloqueantes(): array
    {
        return [self::MANUAL, self::EVALUACION_REDATOR];
    }

    /**
     * Os tipos que a turma pode ter sem que isso trave nada.
     *
     * @return array<self>
     */
    public static function opcionais(): array
    {
        return [self::EVALUACION_CLIENTE, self::EVALUACION_ALUNO];
    }

    /**
     * Todos os tipos que a `Turma::documentos()` reconhece (bloqueantes e
     * opcionais) — o que a turma PODE ter, não o que ela PRECISA ter.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
