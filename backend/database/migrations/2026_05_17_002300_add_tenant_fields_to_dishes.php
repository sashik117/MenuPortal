<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dishes', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('subcategory_id')->nullable()->after('category_id')->constrained()->nullOnDelete();
            $table->unsignedInteger('likes_count')->default(0)->after('is_available');
            $table->index(['company_id', 'is_available', 'likes_count']);
        });
    }

    public function down(): void
    {
        Schema::table('dishes', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'is_available', 'likes_count']);
            $table->dropConstrainedForeignId('subcategory_id');
            $table->dropConstrainedForeignId('company_id');
            $table->dropColumn('likes_count');
        });
    }
};
