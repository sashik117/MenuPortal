<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Company;
use App\Models\Dish;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $company = Company::query()->updateOrCreate(
            ['slug' => 'demo-bistro'],
            [
                'owner_first_name' => 'Demo',
                'owner_last_name' => 'Owner',
                'name' => 'Demo Bistro',
                'venue_type' => 'restaurant',
                'avatar_url' => 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=400&q=80',
                'status' => 'trialing',
                'menu_version' => 1,
                'trial_ends_at' => now()->addDays(7),
                'wifi_name' => 'Demo Bistro Guest',
                'wifi_password' => 'demo2026',
                'working_hours' => '11:00 - 22:00',
                'address' => 'Kyiv, Khreshchatyk 1',
                'maps_url' => 'https://maps.google.com/?q=Kyiv%20Khreshchatyk%201',
                'phone' => '+380501112233',
                'delivery_url' => 'https://example.com/delivery',
                'feedback_email' => 'admin@digital-menu.local',
            ],
        );

        User::query()->updateOrCreate(
            ['login' => 'admin'],
            [
                'company_id' => $company->id,
                'role' => 'owner',
                'name' => 'Menu Admin',
                'email' => 'admin@digital-menu.local',
                'password' => Hash::make('admin12345'),
            ],
        );

        User::query()->updateOrCreate(
            ['login' => 'superadmin'],
            [
                'company_id' => null,
                'role' => 'platform_admin',
                'name' => 'Platform Admin',
                'email' => 'superadmin@digital-menu.local',
                'password' => Hash::make('superadmin12345'),
            ],
        );

        $pizza = Category::query()->updateOrCreate(
            ['slug' => 'pizza'],
            ['company_id' => $company->id, 'name' => 'Pizza', 'sort_order' => 10],
        );

        $drinks = Category::query()->updateOrCreate(
            ['slug' => 'drinks'],
            ['company_id' => $company->id, 'name' => 'Drinks', 'sort_order' => 20],
        );

        $desserts = Category::query()->updateOrCreate(
            ['slug' => 'desserts'],
            ['company_id' => $company->id, 'name' => 'Desserts', 'sort_order' => 30],
        );

        $classicPizza = Subcategory::query()->updateOrCreate(
            ['category_id' => $pizza->id, 'slug' => 'classic'],
            ['company_id' => $company->id, 'name' => 'Classic', 'sort_order' => 10],
        );

        $signaturePizza = Subcategory::query()->updateOrCreate(
            ['category_id' => $pizza->id, 'slug' => 'signature'],
            ['company_id' => $company->id, 'name' => 'Signature', 'sort_order' => 20],
        );

        $hotDrinks = Subcategory::query()->updateOrCreate(
            ['category_id' => $drinks->id, 'slug' => 'hot'],
            ['company_id' => $company->id, 'name' => 'Hot', 'sort_order' => 10],
        );

        $sweetDesserts = Subcategory::query()->updateOrCreate(
            ['category_id' => $desserts->id, 'slug' => 'sweet'],
            ['company_id' => $company->id, 'name' => 'Sweet', 'sort_order' => 10],
        );

        $dishes = [
            [
                'company_id' => $company->id,
                'category_id' => $pizza->id,
                'subcategory_id' => $classicPizza->id,
                'name' => 'Margherita',
                'description' => 'Tomato sauce, mozzarella, basil, olive oil',
                'weight' => '430 г',
                'image_url' => 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=900&q=80',
                'price' => 245,
                'is_available' => true,
                'likes_count' => 19,
                'sort_order' => 10,
            ],
            [
                'company_id' => $company->id,
                'category_id' => $pizza->id,
                'subcategory_id' => $signaturePizza->id,
                'name' => 'Diavola',
                'description' => 'Spicy salami, mozzarella, tomato sauce, chili oil',
                'weight' => '470 г',
                'image_url' => 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80',
                'price' => 310,
                'is_available' => true,
                'likes_count' => 27,
                'sort_order' => 20,
            ],
            [
                'company_id' => $company->id,
                'category_id' => $drinks->id,
                'subcategory_id' => $hotDrinks->id,
                'name' => 'Espresso tonic',
                'description' => 'Double espresso, tonic water, citrus zest',
                'weight' => '250 мл',
                'image_url' => 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80',
                'price' => 120,
                'is_available' => true,
                'likes_count' => 34,
                'sort_order' => 10,
            ],
            [
                'company_id' => $company->id,
                'category_id' => $desserts->id,
                'subcategory_id' => $sweetDesserts->id,
                'name' => 'Basque cheesecake',
                'description' => 'Cream cheese, vanilla, caramelized top',
                'weight' => '160 г',
                'image_url' => 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80',
                'price' => 165,
                'is_available' => true,
                'likes_count' => 23,
                'sort_order' => 10,
            ],
        ];

        foreach ($dishes as $dish) {
            Dish::query()->updateOrCreate(
                ['name' => $dish['name']],
                $dish,
            );
        }
    }
}
