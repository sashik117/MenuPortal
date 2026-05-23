<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageUploadController extends Controller
{
    public function dish(Request $request): JsonResponse
    {
        return $this->storeImage($request, 'dishes');
    }

    public function companyAvatar(Request $request): JsonResponse
    {
        return $this->storeImage($request, 'companies');
    }

    private function storeImage(Request $request, string $directory): JsonResponse
    {
        $validated = $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $path = $validated['image']->store($directory, 'public');

        return response()->json([
            'data' => [
                'url' => url(Storage::disk('public')->url($path)),
                'path' => $path,
            ],
        ], 201);
    }
}
