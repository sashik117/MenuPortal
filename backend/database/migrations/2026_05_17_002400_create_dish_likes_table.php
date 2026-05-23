<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dish_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dish_id')->constrained()->cascadeOnDelete();
            $table->string('visitor_key', 120);
            $table->timestamps();

            $table->unique(['dish_id', 'visitor_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dish_likes');
    }
};
