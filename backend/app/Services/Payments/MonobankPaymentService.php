<?php

namespace App\Services\Payments;

use App\Models\Company;
use App\Models\PaymentInvoice;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class MonobankPaymentService
{
    /**
     * @param array{name: string, amount: int, months: int, recurring: bool} $plan
     */
    public function createInvoice(PaymentInvoice $invoice, Company $company, array $plan): PaymentInvoice
    {
        $token = $this->token();
        $frontendUrl = rtrim((string) config('services.payments.frontend_url'), '/');
        $backendUrl = rtrim((string) config('app.url'), '/');

        $payload = [
            'amount' => $invoice->amount,
            'ccy' => $invoice->currency,
            'merchantPaymInfo' => [
                'reference' => $invoice->reference,
                'destination' => "Digital Menu Portal: {$plan['name']} for {$company->name}",
                'comment' => "Subscription {$plan['name']} for {$company->name}",
                'basketOrder' => [
                    [
                        'name' => "Digital Menu Portal {$plan['name']}",
                        'qty' => 1,
                        'sum' => $invoice->amount,
                        'total' => $invoice->amount,
                        'unit' => 'service',
                    ],
                ],
            ],
            'redirectUrl' => "{$frontendUrl}/admin?payment={$invoice->reference}",
            'webHookUrl' => "{$backendUrl}/api/payments/monobank/webhook",
            'validity' => 3600,
            'paymentType' => 'debit',
        ];

        $response = Http::timeout(12)
            ->acceptJson()
            ->withHeaders([
                'X-Token' => $token,
                'X-Cms' => 'Digital Menu Portal',
                'X-Cms-Version' => '1.0.0',
            ])
            ->post("{$this->baseUrl()}/api/merchant/invoice/create", $payload);

        if (! $response->successful()) {
            $invoice->update([
                'status' => 'provider_error',
                'provider_payload' => [
                    'request' => $payload,
                    'response' => $response->json() ?? $response->body(),
                ],
            ]);

            throw new PaymentProviderException($response->body() ?: 'Monobank rejected invoice creation.');
        }

        $data = $response->json();

        if (! is_array($data) || empty($data['invoiceId']) || empty($data['pageUrl'])) {
            throw new PaymentProviderException('Monobank response does not contain invoiceId/pageUrl.');
        }

        $invoice->update([
            'provider_invoice_id' => $data['invoiceId'],
            'checkout_url' => $data['pageUrl'],
            'provider_payload' => [
                'request' => $payload,
                'response' => $data,
            ],
        ]);

        return $invoice->fresh();
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signature): bool
    {
        if (! (bool) config('services.monobank.verify_webhook_signature')) {
            return true;
        }

        if (! $signature) {
            return false;
        }

        $publicKeyBase64 = $this->publicKey();
        $signatureBytes = base64_decode($signature, true);
        $publicKey = openssl_get_publickey((string) base64_decode($publicKeyBase64, true));

        if ($signatureBytes === false || $publicKey === false) {
            return false;
        }

        return openssl_verify($rawBody, $signatureBytes, $publicKey, OPENSSL_ALGO_SHA256) === 1;
    }

    private function publicKey(): string
    {
        $token = $this->token();

        return Cache::remember('monobank_payment_public_key', now()->addHours(12), function () use ($token): string {
            $response = Http::timeout(8)
                ->acceptJson()
                ->withHeaders(['X-Token' => $token])
                ->get("{$this->baseUrl()}/api/merchant/pubkey");

            if (! $response->successful() || ! is_string($response->json('key'))) {
                throw new PaymentProviderException('Cannot fetch Monobank webhook public key.');
            }

            return $response->json('key');
        });
    }

    private function token(): string
    {
        $token = config('services.monobank.token');

        if (! is_string($token) || trim($token) === '') {
            throw new PaymentProviderNotConfiguredException('MONOBANK_TOKEN is not configured.');
        }

        return trim($token);
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.monobank.base_url'), '/');
    }
}
