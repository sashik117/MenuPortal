<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);
        $validated = $this->validatedData($request);

        $category = Category::query()->create([
            ...$validated,
            'company_id' => $companyId,
            'slug' => $this->uniqueSlug($validated['name'], $companyId),
        ]);

        $this->bumpMenuVersion($companyId);

        return response()->json([
            'data' => $category->load(['subcategories', 'dishes']),
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $this->authorizeCategory($request, $category);
        $validated = $this->validatedData($request, partial: true);

        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $validated['slug'] = $this->uniqueSlug($validated['name'], $category->company_id, $category->id);
        }

        $category->update($validated);
        $this->bumpMenuVersion($category->company_id);

        return response()->json([
            'data' => $category->fresh(['subcategories', 'dishes']),
        ]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        $this->authorizeCategory($request, $category);
        $companyId = $category->company_id;

        $category->delete();
        $this->bumpMenuVersion($companyId);

        return response()->json(status: 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:160'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
    }

    private function authorizeCategory(Request $request, Category $category): void
    {
        abort_if($request->user()->company_id !== $category->company_id, 403);
    }

    private function companyId(Request $request): int
    {
        $companyId = $request->user()->company_id;

        abort_if(! $companyId, 403);

        return $companyId;
    }

    private function uniqueSlug(string $name, int $companyId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'category';
        $slug = $base;
        $index = 2;

        while (
            Category::query()
                ->where('company_id', $companyId)
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$index}";
            $index++;
        }

        return $slug;
    }

    private function bumpMenuVersion(int $companyId): void
    {
        Company::query()->whereKey($companyId)->increment('menu_version');
    }
}
