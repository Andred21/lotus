<?php

namespace App\Domains\Certification\Data\Snapshot;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O documento congelado no ato da emissão — a única fonte legal do certificado
 * (§4.7, D12). Era um `array` sem forma, lido por dois consumidores com
 * políticas opostas de ausência: o `PublicCertificateData` assumia que toda
 * chave existe e o Blade assumia que pode faltar. Agora o tipo é a fonte única,
 * e quem lê recebe a mesma resposta.
 *
 * **Versões do schema** (`schema_version`, ausente = 1):
 * - **1** — até 2026-08-06: sem `emissor` (o Blade tinha a OTEC como literal),
 *   `curso.description`/`curso.modules`/`curso.technical_name`/`cliente.rut`
 *   podem faltar (nasceram no D-P9), e o template guardava `layout_config`.
 * - **2** — a partir daqui: `emissor` congelado, `template.city` nomeada.
 *
 * Snapshot já gravado **não é reescrito**: a leitura aceita as duas versões, e
 * é isso que faz um certificado de 2026 continuar imprimindo igual em 2028.
 */
#[TypeScript]
class CertificateSnapshotData extends Data
{
    public const CURRENT_VERSION = 2;

    public function __construct(
        public int $schema_version,
        public SnapshotPartyData $aluno,
        public SnapshotCourseData $curso,
        public SnapshotTurmaData $turma,
        public SnapshotPartyData $cliente,
        public SnapshotPartyData $emissor,
        public SnapshotPartyData $redator,
        public SnapshotResultData $resultado,
        public SnapshotTemplateData $template,
        public ?string $ciudad_emision,
        public ?string $emitido_em,
    ) {}

    /**
     * Leitura tolerante do JSON congelado. Nenhum caminho aqui pode estourar:
     * o snapshot é histórico e não se conserta depois de emitido.
     *
     * @param  array<string, mixed>|null  $raw
     */
    public static function fromArray(?array $raw): self
    {
        return new self(
            schema_version: (int) (data_get($raw, 'schema_version') ?? 1),
            aluno: SnapshotPartyData::fromArray(self::section($raw, 'aluno')),
            curso: SnapshotCourseData::fromArray(self::section($raw, 'curso')),
            turma: SnapshotTurmaData::fromArray(self::section($raw, 'turma')),
            cliente: SnapshotPartyData::fromArray(self::section($raw, 'cliente')),
            // Sem `emissor` no snapshot (versão 1) — ou com a chave presente e
            // `null` —, a identidade da OTEC vem da config. É o mesmo fallback
            // que o Blade fazia antes de existir tipo, agora num lugar só.
            emissor: SnapshotPartyData::fromArray([
                'name' => data_get($raw, 'emissor.name')
                    ?? config('app.certificate_issuer.name'),
                'rut' => data_get($raw, 'emissor.rut')
                    ?? config('app.certificate_issuer.rut'),
            ]),
            redator: SnapshotPartyData::fromArray(self::section($raw, 'redator')),
            resultado: SnapshotResultData::fromArray(self::section($raw, 'resultado')),
            template: SnapshotTemplateData::fromArray(self::section($raw, 'template')),
            ciudad_emision: self::nullableString(data_get($raw, 'ciudad_emision')),
            emitido_em: self::nullableString(data_get($raw, 'emitido_em')),
        );
    }

    /**
     * @param  array<string, mixed>|null  $raw
     * @return array<string, mixed>|null
     */
    private static function section(?array $raw, string $key): ?array
    {
        $section = data_get($raw, $key);

        return is_array($section) ? $section : null;
    }

    private static function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string) $value;
    }
}
