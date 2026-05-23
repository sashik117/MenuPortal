<?php

namespace App\Services;

use App\Models\Company;
use App\Models\DeliveryOrder;
use App\Models\RestaurantFeedback;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    public function sendFeedback(Company $company, RestaurantFeedback $feedback): void
    {
        $this->send($company, implode("\n", [
            '🔔 <b>Новий відгук від клієнта!</b>',
            "🏪 <b>Заклад:</b> {$this->escape($company->name)}",
            "🍽 <b>Кухня:</b> {$feedback->food_rating}/5",
            "🤝 <b>Сервіс:</b> {$feedback->service_rating}/5",
            "✨ <b>Атмосфера:</b> {$feedback->atmosphere_rating}/5",
            $feedback->guest_name ? "👤 <b>Гість:</b> {$this->escape($feedback->guest_name)}" : null,
            $feedback->guest_contact ? "📞 <b>Контакт:</b> {$this->escape($feedback->guest_contact)}" : null,
            '',
            "💬 {$this->escape($feedback->message)}",
        ]));
    }

    public function sendDeliveryOrder(Company $company, DeliveryOrder $order): void
    {
        $items = $order->items
            ->map(fn ($item) => "• {$this->escape($item->dish_name)} × {$item->quantity} = {$item->line_total}")
            ->implode("\n");

        $this->send($company, implode("\n", [
            '🚗 <b>Нове замовлення доставки</b>',
            "🏪 <b>Заклад:</b> {$this->escape($company->name)}",
            "👤 <b>Клієнт:</b> {$this->escape($order->customer_name)}",
            "📞 <b>Телефон:</b> {$this->escape($order->phone)}",
            "📍 <b>Адреса:</b> {$this->escape($order->address)}",
            "💳 <b>Разом:</b> {$order->total}",
            '',
            $items,
            $order->comment ? "\n📝 {$this->escape($order->comment)}" : null,
        ]));
    }

    private function send(Company $company, string $text): void
    {
        $token = config('services.telegram.bot_token');

        if (! $token || ! $company->telegram_chat_id) {
            return;
        }

        try {
            Http::timeout(3)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $company->telegram_chat_id,
                'text' => $text,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Telegram notification failed', [
                'company_id' => $company->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function escape(?string $value): string
    {
        return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
