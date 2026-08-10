<?php

namespace App\Domains\Certification\Data\Snapshot;

use App\Domains\Certification\Exceptions\CorruptedSnapshotException;
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
 *
 * A versão **governa** a leitura, não é decoração: só a 1 cai para a config
 * quando falta `emissor`. Tolerância cega no lugar disso injetaria a OTEC de
 * hoje num documento de ontem.
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
        $version = (int) (data_get($raw, 'schema_version') ?? 1);

        return new self(
            schema_version: $version,
            aluno: SnapshotPartyData::fromArray(self::section($raw, 'aluno')),
            curso: SnapshotCourseData::fromArray(self::section($raw, 'curso')),
            turma: SnapshotTurmaData::fromArray(self::section($raw, 'turma')),
            cliente: SnapshotPartyData::fromArray(self::section($raw, 'cliente')),
            emissor: self::emissor($raw, $version),
            redator: SnapshotPartyData::fromArray(self::section($raw, 'redator')),
            resultado: SnapshotResultData::fromArray(self::section($raw, 'resultado')),
            template: SnapshotTemplateData::fromArray(self::section($raw, 'template')),
            ciudad_emision: self::nullableString(data_get($raw, 'ciudad_emision')),
            emitido_em: self::nullableString(data_get($raw, 'emitido_em')),
        );
    }

    /**
     * O documento pode ser apresentado? Companheiro booleano do
     * `assertPresentable()`, adjacente de propósito — mesmo par
     * pergunta/imposição do `CertificateEligibility` (B1). Quem lista usa este;
     * quem apresenta usa o outro.
     */
    public function isPresentable(): bool
    {
        return $this->missingRequiredFields() === [];
    }

    /**
     * A política de apresentação, num lugar só. Era copiada no
     * `CertificatePdfService` e no `PublicCertificateData` — dois consumidores
     * com a chance de divergir sobre o que é um documento apresentável.
     */
    public function assertPresentable(string $codigo): void
    {
        $missing = $this->missingRequiredFields();

        if ($missing !== []) {
            throw CorruptedSnapshotException::missingFields($codigo, $missing);
        }
    }

    /**
     * Os campos que um certificado não pode apresentar em branco: quem, o quê
     * e quem atesta. Vazio aqui não é ausência tolerável de campo novo — é
     * snapshot corrompido, e a leitura tolerante não pode disfarçá-lo de
     * documento válido.
     *
     * Privado: fora daqui ninguém precisa da LISTA, só do sim/não
     * (`isPresentable`) ou da recusa (`assertPresentable`); a lista continua
     * viva na mensagem da exceção, que é onde o suporte a lê.
     *
     * @return list<string>
     */
    private function missingRequiredFields(): array
    {
        $required = [
            'aluno.name' => $this->aluno->name,
            'curso.name' => $this->curso->name,
            'emissor.name' => $this->emissor->name,
        ];

        return array_keys(array_filter(
            $required,
            fn (string $value) => trim($value) === '',
        ));
    }

    /**
     * A identidade da OTEC emissora, com `schema_version` mandando.
     *
     * A versão 1 não tinha `emissor` — a OTEC era literal no Blade —, e a
     * config é o que reconstrói a identidade daquela época. Da versão 2 em
     * diante o emissor está congelado no documento, e cair na config
     * carimbaria a OTEC de HOJE num certificado antigo. Faltando ali, o
     * snapshot está corrompido e quem apresenta o documento recusa.
     *
     * @param  array<string, mixed>|null  $raw
     */
    private static function emissor(?array $raw, int $version): SnapshotPartyData
    {
        $frozen = self::section($raw, 'emissor');

        if ($version >= 2) {
            return SnapshotPartyData::fromArray($frozen);
        }

        return SnapshotPartyData::fromArray([
            'name' => data_get($frozen, 'name') ?? config('app.certificate_issuer.name'),
            'rut' => data_get($frozen, 'rut') ?? config('app.certificate_issuer.rut'),
        ]);
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
