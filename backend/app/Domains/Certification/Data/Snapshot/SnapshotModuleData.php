<?php

namespace App\Domains\Certification\Data\Snapshot;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Um módulo do temário impresso na página 2 (D-P9). `contents` é texto livre
 * autoral, uma linha por item, com ou sem marcador escrito à mão.
 */
#[TypeScript]
class SnapshotModuleData extends Data
{
    public function __construct(
        public int $sort_order,
        public string $name,
        public ?string $contents,
    ) {}

    /** @param array<string, mixed>|null $raw */
    public static function fromArray(?array $raw): self
    {
        $contents = data_get($raw, 'contents');

        return new self(
            sort_order: (int) data_get($raw, 'sort_order', 0),
            name: (string) data_get($raw, 'name', ''),
            contents: $contents === null ? null : (string) $contents,
        );
    }

    /**
     * Os itens do temário, sem o marcador que o redator escreveu à mão.
     *
     * O `preg_replace` com `/u` e lookahead existe porque `ltrim` com charlist
     * multibyte opera byte a byte e comia pedaço de `•`/`–`; e o lookahead
     * preserva sinal técnico colado no número (`-5 kV`, `–5 kV a 15 kV`).
     * Entrada inválida em UTF-8 devolve `null` no `preg_replace`, e aí a linha
     * segue crua em vez de sumir.
     *
     * @return list<string>
     */
    public function bullets(): array
    {
        return collect(preg_split('/\R/', (string) $this->contents))
            ->map(fn (string $line) => preg_replace(
                '/^[ \t]*(?:[*•–—-](?=[ \t]|$))[ \t]*/u',
                '',
                trim($line),
            ) ?? trim($line))
            ->filter()
            ->values()
            ->all();
    }
}
