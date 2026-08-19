<?php

namespace App\Domains\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Convite de primeiro acesso do redator. O destinatário não tem sessão nem
 * `Accept-Language`, então o idioma não pode vir da request: quem envia fixa
 * `es_CL` com `->locale()`, e o texto sai dos quatro `identity.php` de
 * `lang/`.
 */
class RedatorAccessInvitation extends Notification
{
    public function __construct(private string $token) {}

    /** @return array<int,string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/definir-clave/%s?email=%s&flow=invite',
            rtrim((string) config('app.frontend_url'), '/'),
            $this->token,
            urlencode($notifiable->email),
        );

        return (new MailMessage)
            ->subject(__('identity.invitation.subject'))
            ->greeting(__('identity.invitation.greeting', ['name' => $notifiable->name]))
            ->line(__('identity.invitation.line'))
            ->action(__('identity.invitation.action'), $url)
            ->line(__('identity.invitation.expiry'));
    }
}
