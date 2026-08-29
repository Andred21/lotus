<?php

namespace App\Shared\Alerts\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Aviso ao admin de que uma das três famílias de acesso suspeito cruzou o
 * limiar (spec §4.6). Idioma fixado por quem envia, como no
 * `RedatorAccessInvitation`: o destinatário não está numa request e não tem
 * `Accept-Language`.
 *
 * NÃO carrega e-mail alheio, senha nem token — só id de usuário, IP e
 * contagem, que é o mesmo conteúdo da linha do canal de segurança.
 */
class AcessoSuspeito extends Notification
{
    public function __construct(
        private string $familia,
        private ?int $usuarioId,
        private ?string $ip,
        private int $ocorrencias,
    ) {}

    /** @return array<int,string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('seguranca.alerta.subject'))
            ->greeting(__('seguranca.alerta.greeting'))
            ->line(__('seguranca.alerta.familia.'.$this->familia))
            ->line(__('seguranca.alerta.ocorrencias', ['ocorrencias' => $this->ocorrencias]))
            ->line(__('seguranca.alerta.ip', ['ip' => $this->ip ?? '—']))
            ->line($this->usuarioId === null
                ? __('seguranca.alerta.sem_usuario')
                : __('seguranca.alerta.usuario', ['usuario' => $this->usuarioId]))
            ->line(__('seguranca.alerta.rodape'));
    }
}
