<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('provider')->default('monobank');
            $table->string('provider_invoice_id')->nullable()->unique();
            $table->string('reference')->unique();
            $table->string('plan');
            $table->unsignedInteger('amount');
            $table->unsignedSmallInteger('currency')->default(980);
            $table->string('status')->default('created');
            $table->string('checkout_url', 2048)->nullable();
            $table->string('failure_reason')->nullable();
            $table->string('err_code')->nullable();
            $table->json('provider_payload')->nullable();
            $table->timestamp('provider_modified_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_invoices');
    }
};
