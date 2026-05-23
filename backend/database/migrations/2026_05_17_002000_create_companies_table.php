<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('owner_first_name');
            $table->string('owner_last_name');
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('venue_type')->default('restaurant');
            $table->string('status')->default('trialing');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();
            $table->string('wifi_name')->nullable();
            $table->string('wifi_password')->nullable();
            $table->string('working_hours')->nullable();
            $table->string('address')->nullable();
            $table->string('maps_url', 2048)->nullable();
            $table->string('phone')->nullable();
            $table->string('delivery_url', 2048)->nullable();
            $table->string('feedback_email')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
