<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentInvoice;
use App\Services\Payments\MonobankPaymentService;
use App\Services\Payments\PaymentPlans;
use App\Services\Payments\PaymentProviderException;
use App\Services\Payments\PaymentProviderNotConfiguredException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentPlans $plans,
        private readonly MonobankPaymentService $monobank,
    ) {
    }

    public function subscription(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan' => ['required', 'string', Rule::in($this->plans->codes())],
        ]);

        $company = $request->user()?->company;

        abort_if(! $company, 403);
        abort_if($company->status === 'banned', 403, 'Company is banned.');

        $plan = $this->plans->get($validated['plan']);
        $provider = (string) config('services.payments.provider', 'monobank');

        if ($provider !== 'monobank') {
            return response()->json([
                'message' => 'Payment provider is not supported yet.',
            ], 422);
        }

        $invoice = PaymentInvoice::query()->create([
            'company_id' => $company->id,
            'provider' => $provider,
            'reference' => 'sub_'.Str::ulid(),
            'plan' => $validated['plan'],
            'amount' => $plan['amount'],
            'currency' => (int) config('services.payments.currency', 980),
            'status' => 'created',
        ]);

        try {
            $invoice = $this->monobank->createInvoice($invoice, $company, $plan);
        } catch (PaymentProviderNotConfiguredException $exception) {
            $invoice->update(['status' => 'not_configured']);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 503);
        } catch (PaymentProviderException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 502);
        }

        return response()->json([
            'data' => $this->invoicePayload($invoice),
        ], 201);
    }

    public function show(Request $request, PaymentInvoice $paymentInvoice): JsonResponse
    {
        $user = $request->user();

        abort_if(
            $user?->role !== 'platform_admin' && $user?->company_id !== $paymentInvoice->company_id,
            403,
        );

        return response()->json([
            'data' => $this->invoicePayload($paymentInvoice),
        ]);
    }

    public function monobankWebhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();

        try {
            $signatureIsValid = $this->monobank->verifyWebhookSignature($rawBody, $request->header('X-Sign'));
        } catch (PaymentProviderNotConfiguredException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        } catch (PaymentProviderException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        }

        abort_if(! $signatureIsValid, 403, 'Invalid Monobank signature.');

        $payload = $request->json()->all();
        $providerInvoiceId = $payload['invoiceId'] ?? null;

        abort_if(! is_string($providerInvoiceId) || $providerInvoiceId === '', 422);

        $invoice = PaymentInvoice::query()
            ->where('provider', 'monobank')
            ->where('provider_invoice_id', $providerInvoiceId)
            ->first();

        if (! $invoice) {
            return response()->json(['message' => 'Invoice is unknown.'], 404);
        }

        $providerModifiedAt = $this->parseProviderDate($payload['modifiedDate'] ?? null);

        if (
            $providerModifiedAt
            && $invoice->provider_modified_at
            && $providerModifiedAt->lessThanOrEqualTo($invoice->provider_modified_at)
        ) {
            return response()->json(['data' => $this->invoicePayload($invoice)]);
        }

        $invoice->update([
            'status' => is_string($payload['status'] ?? null) ? $payload['status'] : $invoice->status,
            'failure_reason' => is_string($payload['failureReason'] ?? null) ? $payload['failureReason'] : null,
            'err_code' => is_string($payload['errCode'] ?? null) ? $payload['errCode'] : null,
            'provider_modified_at' => $providerModifiedAt,
            'provider_payload' => [
                'webhook' => $payload,
                'created_invoice' => $invoice->provider_payload,
            ],
        ]);

        if (($payload['status'] ?? null) === 'success') {
            $this->activateSubscription($invoice->fresh(['company']));
        }

        return response()->json([
            'data' => $this->invoicePayload($invoice->fresh()),
        ]);
    }

    private function activateSubscription(PaymentInvoice $invoice): void
    {
        if ($invoice->paid_at) {
            return;
        }

        $plan = $this->plans->get($invoice->plan);
        $company = $invoice->company;
        $baseDate = $company->subscription_ends_at?->isFuture()
            ? $company->subscription_ends_at
            : now();

        $company->update([
            'status' => 'active',
            'subscription_ends_at' => $baseDate->copy()->addMonths($plan['months']),
        ]);

        $invoice->update([
            'paid_at' => now(),
        ]);
    }

    private function parseProviderDate(mixed $date): ?Carbon
    {
        if (! is_string($date) || $date === '') {
            return null;
        }

        return Carbon::parse($date);
    }

    /**
     * @return array<string, mixed>
     */
    private function invoicePayload(PaymentInvoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'provider' => $invoice->provider,
            'provider_invoice_id' => $invoice->provider_invoice_id,
            'reference' => $invoice->reference,
            'plan' => $invoice->plan,
            'amount' => $invoice->amount,
            'currency' => $invoice->currency,
            'status' => $invoice->status,
            'checkout_url' => $invoice->checkout_url,
            'paid_at' => $invoice->paid_at,
        ];
    }
}
