<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\PaymentInvoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_monobank_subscription_invoice(): void
    {
        config([
            'services.monobank.token' => 'test-token',
            'services.monobank.base_url' => 'https://api.monobank.ua',
            'services.payments.frontend_url' => 'http://127.0.0.1:5174',
            'app.url' => 'http://127.0.0.1:8000',
        ]);

        Http::fake([
            'https://api.monobank.ua/api/merchant/invoice/create' => Http::response([
                'invoiceId' => 'p2_test_invoice',
                'pageUrl' => 'https://pay.mbnk.biz/p2_test_invoice',
            ]),
        ]);

        $company = $this->company();
        $owner = User::factory()->create([
            'company_id' => $company->id,
            'role' => 'owner',
        ]);

        $response = $this
            ->actingAs($owner, 'sanctum')
            ->postJson('/api/payments/subscription', ['plan' => 'month']);

        $response->assertCreated()
            ->assertJsonPath('data.provider_invoice_id', 'p2_test_invoice')
            ->assertJsonPath('data.checkout_url', 'https://pay.mbnk.biz/p2_test_invoice')
            ->assertJsonPath('data.amount', 39000);

        $this->assertDatabaseHas('payment_invoices', [
            'company_id' => $company->id,
            'provider_invoice_id' => 'p2_test_invoice',
            'plan' => 'month',
            'amount' => 39000,
            'status' => 'created',
        ]);

        Http::assertSent(fn ($request) => $request->hasHeader('X-Token', 'test-token')
            && $request['amount'] === 39000
            && $request['ccy'] === 980
            && str_contains($request['webHookUrl'], '/api/payments/monobank/webhook'));
    }

    public function test_subscription_payment_requires_monobank_token(): void
    {
        config(['services.monobank.token' => null]);

        $company = $this->company();
        $owner = User::factory()->create([
            'company_id' => $company->id,
            'role' => 'owner',
        ]);

        $response = $this
            ->actingAs($owner, 'sanctum')
            ->postJson('/api/payments/subscription', ['plan' => 'month']);

        $response->assertStatus(503)
            ->assertJsonPath('message', 'MONOBANK_TOKEN is not configured.');
    }

    public function test_monobank_success_webhook_activates_company_subscription(): void
    {
        config([
            'services.monobank.verify_webhook_signature' => false,
        ]);

        $company = $this->company(['status' => 'pending_payment']);
        $invoice = PaymentInvoice::query()->create([
            'company_id' => $company->id,
            'provider' => 'monobank',
            'provider_invoice_id' => 'p2_test_invoice',
            'reference' => 'sub_test_reference',
            'plan' => 'six_months',
            'amount' => 199000,
            'currency' => 980,
            'status' => 'created',
        ]);

        $response = $this->postJson('/api/payments/monobank/webhook', [
            'invoiceId' => 'p2_test_invoice',
            'status' => 'success',
            'amount' => 199000,
            'ccy' => 980,
            'modifiedDate' => now()->toIso8601String(),
            'reference' => 'sub_test_reference',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'success');

        $this->assertNotNull($invoice->fresh()->paid_at);
        $this->assertSame('active', $company->fresh()->status);
        $this->assertTrue($company->fresh()->subscription_ends_at->isFuture());
    }

    /**
     * @param array<string, mixed> $overrides
     */
    private function company(array $overrides = []): Company
    {
        return Company::query()->create(array_merge([
            'owner_first_name' => 'Test',
            'owner_last_name' => 'Owner',
            'name' => 'Test Bistro',
            'slug' => 'test-bistro',
            'venue_type' => 'restaurant',
            'status' => 'trialing',
            'trial_ends_at' => now()->addDays(7),
        ], $overrides));
    }
}
