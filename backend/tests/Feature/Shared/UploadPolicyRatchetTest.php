<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * Catraca 2 do bloco de hardening (spec §5). Três políticas literais em sete
 * controllers já tinham produzido quatro endpoints sem tipo; ao escrever o
 * plano descobriu-se um quinto e um sexto — `store` e `update` de redator —
 * que não tinham regra NENHUMA. Esta catraca existe para que o próximo não
 * exista.
 *
 * Varre a fonte porque a propriedade é sobre o CÓDIGO: um controller que lê
 * `$request->file(...)` e valida à mão não se distingue pelo roteador.
 * `codigoSemComentarios` porque citar `mimes:` num comentário que EXPLICA a
 * política não pode reprovar a política (mesmo cuidado do review de 2026-08-04).
 */
class UploadPolicyRatchetTest extends TestCase
{
    use ScansPhpSource;

    /**
     * Os três sinais de que um arquivo mexe com upload. Medido: `UploadedFile`
     * sozinho não acha NENHUM controller — eles nunca nomeiam a classe.
     */
    private const SINAIS_DE_UPLOAD = [
        'UploadedFile',      // Actions e Services que recebem o arquivo tipado
        'request->file(',    // controllers que o tiram da requisição
        "'file' =>",         // controllers que declaram a regra do campo `file`
    ];

    /**
     * As formas de pedir a política. `ContentClass::` é a direta; os cinco
     * controllers de foto pedem por `UserPhotoService::rules()`, que é a fonte
     * única deles e é ela quem chama a `ContentClass` — exigir a forma direta
     * deles seria mandá-los furar a própria fonte única.
     */
    private const REFERENCIAS_DE_POLITICA = [
        'ContentClass::',
        'UserPhotoService::rules(',
    ];

    /**
     * Arquivos que casam um sinal de upload mas legitimamente NÃO pedem a
     * política, e por quê. Silêncio reprova: entrada nova aqui é escrita
     * explícita, com motivo ao lado.
     *
     * @var array<string,string>
     */
    private const ISENTOS = [
        'app/Shared/Files/Actions/UploadFileAction.php' => 'É a escrita no disco, não a porta de entrada: recebe o arquivo já validado por quem o recebeu do cliente.',
        'app/Domains/Operation/Services/SpreadsheetRowReader.php' => 'Só itera a planilha que o `EnrollmentController::import` já validou pela classe Planilha, e despacha o leitor pelo MIME de CONTEÚDO — os mesmos três que aquela classe aceita.',
        'app/Domains/Operation/Actions/ImportStudentsAction.php' => 'Recebe o `UploadedFile` já validado pelo `EnrollmentController::import`, que pede a classe Planilha.',
        'app/Domains/Operation/Actions/StoreTurmaDocumentAction.php' => 'Recebe o arquivo já validado pelo `TurmaDocumentController`, que pede a classe DocumentoDeTurma.',
        'app/Domains/Identity/Actions/CreateRedatorAction.php' => 'Recebe os documentos já validados pelo `RedatorController::documentsFromRequest`, um a um.',
        'app/Domains/Identity/Actions/UpdateRedatorAction.php' => 'Recebe os documentos já validados pelo `RedatorController::documentsFromRequest`, um a um.',
        'app/Domains/Identity/Actions/StoreRedatorDocumentAction.php' => 'Recebe o arquivo já validado pelos controllers de documento de redator e de perfil.',
        'app/Domains/Identity/Data/RedatorData.php' => 'DTO de leitura e escrita do redator: o campo multipart `documents` é validado no controller, não aqui.',
        'app/Providers/AppServiceProvider.php' => 'A chave `file` que casa aqui é a entrada do morph map do ADR-10, e não tem nada com upload.',
        'app/Shared/Files/Rules/ScannedForMalware.php' => 'É a regra de antivírus que a própria peça de política publica: roda dentro dela, nunca antes dela.',
    ];

    /** @return list<string> paths relativos que mexem com upload, ignorando comentários */
    private function sitiosDeUpload(): array
    {
        $sitios = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);

            foreach (self::SINAIS_DE_UPLOAD as $sinal) {
                if (str_contains($codigo, $sinal)) {
                    $sitios[] = ltrim(str_replace(base_path(), '', $arquivo), '/');
                    break;
                }
            }
        }

        sort($sitios);

        return array_values(array_unique($sitios));
    }

    /**
     * A peça é onde a política MORA: ela não a "pede" nem a escreve "à mão", e
     * desde que ganhou o teto do conjunto (`assertCabeNoTransporte`, achado Q-3
     * do review de 2026-08-25) ela nomeia `UploadedFile` e passou a casar um
     * sinal de upload. Isentá-la é dizer o óbvio — não é abrir exceção.
     */
    private function eAPropriaPeca(string $relativo): bool
    {
        return str_ends_with($relativo, 'app/Shared/Files/ContentClass.php');
    }

    private function pedeAPolitica(string $codigo): bool
    {
        foreach (self::REFERENCIAS_DE_POLITICA as $referencia) {
            if (str_contains($codigo, $referencia)) {
                return true;
            }
        }

        return false;
    }

    public function test_todo_sitio_de_upload_pede_a_classe_de_conteudo(): void
    {
        $descobertos = [];

        foreach ($this->sitiosDeUpload() as $relativo) {
            if ($this->eAPropriaPeca($relativo) || array_key_exists($relativo, self::ISENTOS)) {
                continue;
            }

            if (! $this->pedeAPolitica($this->codigoSemComentarios(base_path($relativo)))) {
                $descobertos[] = $relativo;
            }
        }

        $this->assertSame([], $descobertos, implode("\n", array_merge(
            [
                'Sítio que mexe com upload sem pedir a política de conteúdo (spec D4).',
                'Peça uma `ContentClass` em vez de escrever `mimes:`/`max:` à mão — ou',
                'declare o arquivo em ISENTOS com o motivo, se ele recebe arquivo JÁ',
                'validado por outro. Arquivos:',
            ],
            $descobertos,
        )));
    }

    public function test_nenhum_sitio_escreve_a_politica_a_mao(): void
    {
        $descobertos = [];

        foreach ($this->sitiosDeUpload() as $relativo) {
            // A peça é o único lugar que pode escrever a política.
            if ($this->eAPropriaPeca($relativo)) {
                continue;
            }

            $codigo = $this->codigoSemComentarios(base_path($relativo));

            foreach (['mimes:', 'mimetypes:'] as $literal) {
                if (str_contains($codigo, $literal)) {
                    $descobertos[] = "{$relativo} -> {$literal}";
                }
            }
        }

        sort($descobertos);

        $this->assertSame([], array_values(array_unique($descobertos)), implode("\n", array_merge(
            ['Política de tipo escrita à mão fora do `ContentClass`. Foi assim que quatro endpoints ficaram sem tipo:'],
            $descobertos,
        )));
    }

    public function test_a_lista_de_isentos_esta_declarada_e_atual(): void
    {
        foreach (self::ISENTOS as $relativo => $motivo) {
            $this->assertFileExists(
                base_path($relativo),
                "Isento `{$relativo}` não existe mais — tire-o da lista em vez de deixar a isenção órfã.",
            );
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Isento {$relativo} com motivo curto demais para ser um motivo.",
            );
        }
    }

    public function test_a_lista_de_isentos_nao_esconde_sitio_que_pede_a_politica(): void
    {
        // Isenção que sobra é isenção que passa a cobrir um sítio que já ficou
        // certo — e a próxima regressão nele passaria calada.
        $desnecessarios = [];

        foreach (array_keys(self::ISENTOS) as $relativo) {
            if ($this->pedeAPolitica($this->codigoSemComentarios(base_path($relativo)))) {
                $desnecessarios[] = $relativo;
            }
        }

        $this->assertSame([], $desnecessarios, implode("\n", array_merge(
            ['Isento que já pede a política — tire-o da lista para que ele volte a ser guardado:'],
            $desnecessarios,
        )));
    }
}
