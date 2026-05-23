<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Dish;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DishApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_menu_returns_categories_with_dishes(): void
    {
        $category = Category::query()->create([
            'name' => 'Pizza',
            'slug' => 'pizza',
        ]);

        Dish::query()->create([
            'category_id' => $category->id,
            'name' => 'Margherita',
            'description' => 'Tomato, mozzarella, basil',
            'price' => 245,
        ]);

        $response = $this->getJson('/api/dishes');

        $response->assertOk()
            ->assertJsonPath('data.0.slug', 'pizza')
            ->assertJsonPath('data.0.dishes.0.name', 'Margherita');
    }

    public function test_admin_can_toggle_dish_availability(): void
    {
        $admin = User::factory()->create();
        $category = Category::query()->create([
            'name' => 'Drinks',
            'slug' => 'drinks',
        ]);
        $dish = Dish::query()->create([
            'category_id' => $category->id,
            'name' => 'Espresso',
            'price' => 75,
            'is_available' => true,
        ]);

        $response = $this
            ->actingAs($admin, 'sanctum')
            ->patchJson("/api/dishes/{$dish->id}/toggle");

        $response->assertOk()
            ->assertJsonPath('data.is_available', false);

        $this->assertFalse($dish->fresh()->is_available);
    }
}
