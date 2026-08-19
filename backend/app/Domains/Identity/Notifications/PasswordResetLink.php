<?php

namespace App\Domains\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Link de recuperação de senha. Mesma tela de destino do convite, `flow`
 * diferente: o endpoint que valida o token é outro, porque o TTL é outro.
 */
class PasswordResetLink extends Notification
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
            '%s/definir-clave/%s?email=%s&flow=reset',
            rtrim((string) config('app.frontend_url'), '/'),
            $this->token,
            urlencode($notifiable->email),
        );

        return (new MailMessage)
            ->subject(__('identity.reset.subject'))
            ->greeting(__('identity.reset.greeting', ['name' => $notifiable->name]))
            ->line(__('identity.reset.line'))
            ->action(__('identity.reset.action'), $url)
            ->line(__('identity.reset.expiry'));
    }
}
