<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->string('telegram_chat_id')->nullable()->after('feedback_email');
            $table->string('google_place_id')->nullable()->after('maps_url');
            $table->decimal('address_lat', 10, 7)->nullable()->after('google_place_id');
            $table->decimal('address_lng', 10, 7)->nullable()->after('address_lat');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->dropColumn([
                'telegram_chat_id',
                'google_place_id',
                'address_lat',
                'address_lng',
            ]);
        });
    }
};
