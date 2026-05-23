<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->company,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        abort_if(! $company, 403);

        $validated = $request->validate([
            'wifi_name' => ['nullable', 'string', 'max:160'],
            'wifi_password' => ['nullable', 'string', 'max:160'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
            'working_hours' => ['nullable', 'string', 'max:160'],
            'address' => ['nullable', 'string', 'max:255'],
            'maps_url' => ['nullable', 'url', 'max:2048'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'address_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'address_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:80'],
            'delivery_url' => ['nullable', 'url', 'max:2048'],
            'feedback_email' => ['nullable', 'email', 'max:160'],
            'telegram_chat_id' => ['nullable', 'string', 'max:120'],
        ]);

        $company->update($validated);
        $company->increment('menu_version');

        return response()->json([
            'data' => $company->fresh(),
        ]);
    }
}
