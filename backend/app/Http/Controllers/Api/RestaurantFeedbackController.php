<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\RestaurantFeedback;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class RestaurantFeedbackController extends Controller
{
    public function __construct(private readonly TelegramService $telegram)
    {
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        $validated = $request->validate([
            'food_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'service_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'atmosphere_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'value_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'message' => ['required', 'string', 'max:2000'],
            'guest_name' => ['nullable', 'string', 'max:120'],
            'guest_contact' => ['nullable', 'string', 'max:160'],
        ]);

        $feedback = RestaurantFeedback::query()->create([
            ...$validated,
            'company_id' => $company->id,
        ]);

        if ($company->feedback_email) {
            Mail::raw(
                "Venue: {$company->name}\nGuest: {$feedback->guest_name}\nContact: {$feedback->guest_contact}\nFood: {$feedback->food_rating}/5\nService: {$feedback->service_rating}/5\nAtmosphere: {$feedback->atmosphere_rating}/5\nValue: {$feedback->value_rating}/5\n\n{$feedback->message}",
                fn ($mail) => $mail
                    ->to($company->feedback_email)
                    ->subject("New guest feedback: {$company->name}"),
            );
        }

        $this->telegram->sendFeedback($company, $feedback);

        return response()->json([
            'data' => $feedback,
        ], 201);
    }
}
