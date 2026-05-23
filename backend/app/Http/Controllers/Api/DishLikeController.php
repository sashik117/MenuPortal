<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Dish;
use App\Models\DishLike;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DishLikeController extends Controller
{
    public function store(Request $request, Dish $dish): JsonResponse
    {
        $validated = $request->validate([
            'visitor_key' => ['required', 'string', 'max:120'],
        ]);

        $created = false;

        DB::transaction(function () use ($dish, $validated, &$created): void {
            try {
                DishLike::query()->create([
                    'dish_id' => $dish->id,
                    'visitor_key' => $validated['visitor_key'],
                ]);

                $dish->increment('likes_count');
                Company::query()->whereKey($dish->company_id)->increment('menu_version');
                $created = true;
            } catch (QueryException) {
                $created = false;
            }
        });

        return response()->json([
            'data' => [
                'liked' => true,
                'created' => $created,
                'likes_count' => $dish->fresh()->likes_count,
            ],
        ]);
    }
}
