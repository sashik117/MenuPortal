<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_feedback', function (Blueprint $table) {
            $table->unsignedTinyInteger('food_rating')->nullable()->after('company_id');
            $table->unsignedTinyInteger('service_rating')->nullable()->after('food_rating');
            $table->unsignedTinyInteger('atmosphere_rating')->nullable()->after('service_rating');
            $table->unsignedTinyInteger('value_rating')->nullable()->after('atmosphere_rating');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_feedback', function (Blueprint $table) {
            $table->dropColumn([
                'food_rating',
                'service_rating',
                'atmosphere_rating',
                'value_rating',
            ]);
        });
    }
};
