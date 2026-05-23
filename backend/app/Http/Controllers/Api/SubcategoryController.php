<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Company;
use App\Models\Subcategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SubcategoryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);
        $validated = $this->validatedData($request);
        $category = Category::query()
            ->whereKey($validated['category_id'])
            ->where('company_id', $companyId)
            ->firstOrFail();

        $subcategory = Subcategory::query()->create([
            ...$validated,
            'company_id' => $companyId,
            'category_id' => $category->id,
            'slug' => $this->uniqueSlug($validated['name'], $category->id),
        ]);

        $this->bumpMenuVersion($companyId);

        return response()->json([
            'data' => $subcategory,
        ], 201);
    }

    public function update(Request $request, Subcategory $subcategory): JsonResponse
    {
        $this->authorizeSubcategory($request, $subcategory);
        $validated = $this->validatedData($request, partial: true);

        if (isset($validated['category_id'])) {
            Category::query()
                ->whereKey($validated['category_id'])
                ->where('company_id', $subcategory->company_id)
                ->firstOrFail();
        }

        $categoryId = $validated['category_id'] ?? $subcategory->category_id;

        if (isset($validated['name']) && $validated['name'] !== $subcategory->name) {
            $validated['slug'] = $this->uniqueSlug($validated['name'], $categoryId, $subcategory->id);
        }

        $subcategory->update($validated);
        $this->bumpMenuVersion($subcategory->company_id);

        return response()->json([
            'data' => $subcategory->fresh(),
        ]);
    }

    public function destroy(Request $request, Subcategory $subcategory): JsonResponse
    {
        $this->authorizeSubcategory($request, $subcategory);
        $companyId = $subcategory->company_id;

        $subcategory->delete();
        $this->bumpMenuVersion($companyId);

        return response()->json(status: 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $companyId = $request->user()->company_id;

        abort_if(! $companyId, 403);

        return $request->validate([
            'category_id' => [
                $required,
                'integer',
                Rule::exists('categories', 'id')->where('company_id', $companyId),
            ],
            'name' => [$required, 'string', 'max:160'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
    }

    private function authorizeSubcategory(Request $request, Subcategory $subcategory): void
    {
        abort_if($request->user()->company_id !== $subcategory->company_id, 403);
    }

    private function companyId(Request $request): int
    {
        $companyId = $request->user()->company_id;

        abort_if(! $companyId, 403);

        return $companyId;
    }

    private function uniqueSlug(string $name, int $categoryId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'subcategory';
        $slug = $base;
        $index = 2;

        while (
            Subcategory::query()
                ->where('category_id', $categoryId)
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
