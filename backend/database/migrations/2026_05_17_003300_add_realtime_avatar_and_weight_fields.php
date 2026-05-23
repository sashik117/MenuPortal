<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->string('avatar_url', 2048)->nullable()->after('venue_type');
            $table->unsignedBigInteger('menu_version')->default(1)->after('status');
        });

        Schema::table('dishes', function (Blueprint $table): void {
            $table->string('weight', 80)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('dishes', function (Blueprint $table): void {
            $table->dropColumn('weight');
        });

        Schema::table('companies', function (Blueprint $table): void {
            $table->dropColumn(['avatar_url', 'menu_version']);
        });
    }
};
