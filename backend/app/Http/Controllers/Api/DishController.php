<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Company;
use App\Models\Dish;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DishController extends Controller
{
    public function index(): JsonResponse
    {
        $companyId = auth('sanctum')->user()?->company_id;

        $categories = Category::query()
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->with([
                'subcategories' => fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
                'dishes' => fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedDishData($request);
        $data['company_id'] = $request->user()->company_id;

        $dish = Dish::query()->create($data);
        $this->bumpMenuVersion($data['company_id']);

        return response()->json([
            'data' => $dish->load('category'),
        ], 201);
    }

    public function update(Request $request, Dish $dish): JsonResponse
    {
        abort_if($request->user()->company_id !== $dish->company_id, 403);

        $dish->update($this->validatedDishData($request, partial: true));
        $this->bumpMenuVersion($dish->company_id);

        return response()->json([
            'data' => $dish->fresh('category'),
        ]);
    }

    public function destroy(Dish $dish): JsonResponse
    {
        abort_if(request()->user()->company_id !== $dish->company_id, 403);

        $dish->delete();
        $this->bumpMenuVersion($dish->company_id);

        return response()->json(status: 204);
    }

    public function toggle(Dish $dish): JsonResponse
    {
        abort_if(request()->user()->company_id !== $dish->company_id, 403);

        $dish->update([
            'is_available' => ! $dish->is_available,
        ]);
        $this->bumpMenuVersion($dish->company_id);

        return response()->json([
            'data' => $dish->fresh('category'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedDishData(Request $request, bool $partial = false): array
    {
        $rulePrefix = $partial ? 'sometimes' : 'required';
        $companyId = $request->user()->company_id;

        abort_if(! $companyId, 403);

        return $request->validate([
            'category_id' => [
                $rulePrefix,
                'integer',
                Rule::exists('categories', 'id')->where('company_id', $companyId),
            ],
            'subcategory_id' => [
                'nullable',
                'integer',
                Rule::exists('subcategories', 'id')->where(function ($query) use ($companyId, $request): void {
                    $query->where('company_id', $companyId);

                    if ($request->filled('category_id')) {
                        $query->where('category_id', $request->integer('category_id'));
                    }
                }),
            ],
            'name' => [$rulePrefix, 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'weight' => ['nullable', 'string', 'max:80'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'price' => [$rulePrefix, 'numeric', 'min:0', 'max:999999.99'],
            'is_available' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
    }

    private function bumpMenuVersion(?int $companyId): void
    {
        if (! $companyId) {
            return;
        }

        Company::query()->whereKey($companyId)->increment('menu_version');
    }
}
