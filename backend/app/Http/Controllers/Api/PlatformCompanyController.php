<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlatformCompanyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePlatformAdmin($request);

        $companies = Company::query()
            ->withCount(['users', 'dishes'])
            ->with(['users:id,company_id,name,email,login'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $companies,
        ]);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $this->authorizePlatformAdmin($request);

        $validated = $request->validate([
            'owner_first_name' => ['sometimes', 'string', 'max:120'],
            'owner_last_name' => ['sometimes', 'string', 'max:120'],
            'name' => ['sometimes', 'string', 'max:160'],
            'venue_type' => ['sometimes', 'string', 'max:80'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
            'status' => ['sometimes', 'string', 'in:trialing,active,pending_payment,banned,canceled'],
            'trial_ends_at' => ['nullable', 'date'],
            'subscription_ends_at' => ['nullable', 'date'],
            'wifi_name' => ['nullable', 'string', 'max:160'],
            'wifi_password' => ['nullable', 'string', 'max:160'],
            'working_hours' => ['nullable', 'string', 'max:160'],
            'address' => ['nullable', 'string', 'max:255'],
            'maps_url' => ['nullable', 'url', 'max:255'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'address_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'address_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:60'],
            'delivery_url' => ['nullable', 'url', 'max:255'],
            'feedback_email' => ['nullable', 'email', 'max:160'],
            'telegram_chat_id' => ['nullable', 'string', 'max:120'],
        ]);

        $company->update($validated);
        $company->increment('menu_version');

        return response()->json([
            'data' => $company->fresh(['users'])->loadCount(['users', 'dishes']),
        ]);
    }

    public function destroy(Request $request, Company $company): JsonResponse
    {
        $this->authorizePlatformAdmin($request);

        $company->delete();

        return response()->json(status: 204);
    }

    private function authorizePlatformAdmin(Request $request): void
    {
        abort_if($request->user()?->role !== 'platform_admin', 403);
    }
}
