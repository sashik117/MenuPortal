<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;

class PublicMenuController extends Controller
{
    public function show(Company $company): JsonResponse
    {
        if (! $company->hasActiveAccess()) {
            return $this->subscriptionRequired();
        }

        return response()->json([
            'data' => $this->menuPayload($company),
        ]);
    }

    public function version(Company $company): JsonResponse
    {
        if (! $company->hasActiveAccess()) {
            return $this->subscriptionRequired();
        }

        return response()->json([
            'data' => [
                'version' => $company->menu_version,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function menuPayload(Company $company): array
    {
        $company->load([
            'categories' => fn ($query) => $query
                ->with([
                    'subcategories' => fn ($subQuery) => $subQuery
                        ->orderBy('sort_order')
                        ->orderBy('name'),
                    'dishes' => fn ($dishQuery) => $dishQuery
                        ->where('is_available', true)
                        ->orderBy('sort_order')
                        ->orderBy('name'),
                ])
                ->orderBy('sort_order')
                ->orderBy('name'),
        ]);

        $popular = $company->dishes()
            ->where('is_available', true)
            ->orderByDesc('likes_count')
            ->orderBy('name')
            ->limit(6)
            ->get();
        $categories = $company->categories;
        $company->unsetRelation('categories');

        return [
            'company' => $company,
            'categories' => $categories,
            'popular' => $popular,
        ];
    }

    private function subscriptionRequired(): JsonResponse
    {
        return response()->json([
            'message' => 'Тестовий період завершено. Будь ласка, оплатіть підписку.',
            'status' => 'subscription_required',
        ], 402);
    }
}
