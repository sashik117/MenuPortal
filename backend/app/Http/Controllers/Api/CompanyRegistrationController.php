<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Company;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CompanyRegistrationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'venue_name' => ['required', 'string', 'max:160'],
            'venue_type' => ['required', 'string', 'in:cafe,restaurant,pub,sushi'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'start_mode' => ['sometimes', 'string', 'in:trial,pay_now'],
        ]);

        $slugBase = Str::slug($validated['venue_name']);
        $slug = $this->uniqueCompanySlug($slugBase ?: 'restaurant');
        $startMode = $validated['start_mode'] ?? 'trial';

        $result = DB::transaction(function () use ($validated, $slug, $startMode): array {
            $company = Company::query()->create([
                'owner_first_name' => $validated['first_name'],
                'owner_last_name' => $validated['last_name'],
                'name' => $validated['venue_name'],
                'slug' => $slug,
                'venue_type' => $validated['venue_type'],
                'status' => $startMode === 'trial' ? 'trialing' : 'pending_payment',
                'trial_ends_at' => $startMode === 'trial' ? now()->addDays(7) : null,
                'working_hours' => '11:00 - 22:00',
                'feedback_email' => $validated['email'],
            ]);

            $user = User::query()->create([
                'company_id' => $company->id,
                'role' => 'owner',
                'name' => "{$validated['first_name']} {$validated['last_name']}",
                'login' => $validated['email'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);

            $categories = [];

            foreach ($this->starterCategories() as $category) {
                $categories[$category['slug']] = Category::query()->create([
                    'company_id' => $company->id,
                    'name' => $category['name'],
                    'slug' => $category['slug'],
                    'sort_order' => $category['sort_order'],
                ]);
            }

            foreach ($this->starterSubcategories() as $categorySlug => $subcategories) {
                foreach ($subcategories as $subcategory) {
                    Subcategory::query()->create([
                        'company_id' => $company->id,
                        'category_id' => $categories[$categorySlug]->id,
                        'name' => $subcategory['name'],
                        'slug' => $subcategory['slug'],
                        'sort_order' => $subcategory['sort_order'],
                    ]);
                }
            }

            return [$company, $user];
        });

        [$company, $user] = $result;
        $token = $user->createToken('admin-dashboard')->plainTextToken;

        return response()->json([
            'token' => $token,
            'admin' => [
                'id' => $user->id,
                'name' => $user->name,
                'login' => $user->login,
                'role' => $user->role,
            ],
            'company' => $company->fresh(),
            'next_url' => $startMode === 'pay_now' ? "/plans?company={$company->slug}" : "/admin",
        ], 201);
    }

    /**
     * @return array<int, array{name: string, slug: string, sort_order: int}>
     */
    private function starterCategories(): array
    {
        return [
            ['name' => 'Напої', 'slug' => 'drinks', 'sort_order' => 10],
            ['name' => 'Кухня', 'slug' => 'kitchen', 'sort_order' => 20],
            ['name' => 'Десерти', 'slug' => 'desserts', 'sort_order' => 30],
        ];
    }

    /**
     * @return array<string, array<int, array{name: string, slug: string, sort_order: int}>>
     */
    private function starterSubcategories(): array
    {
        return [
            'drinks' => [
                ['name' => 'Алкогольні', 'slug' => 'alcohol', 'sort_order' => 10],
                ['name' => 'Безалкогольні', 'slug' => 'soft', 'sort_order' => 20],
                ['name' => 'Гарячі', 'slug' => 'hot', 'sort_order' => 30],
            ],
            'kitchen' => [
                ['name' => 'Основні', 'slug' => 'mains', 'sort_order' => 10],
                ['name' => 'Сніданки', 'slug' => 'breakfast', 'sort_order' => 20],
            ],
            'desserts' => [
                ['name' => 'Торти', 'slug' => 'cakes', 'sort_order' => 10],
                ['name' => 'Випічка', 'slug' => 'bakery', 'sort_order' => 20],
            ],
        ];
    }

    private function uniqueCompanySlug(string $slugBase): string
    {
        $slug = $slugBase;
        $suffix = 2;

        while (Company::query()->where('slug', $slug)->exists()) {
            $slug = "{$slugBase}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
