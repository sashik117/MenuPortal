<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactMessageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $message = ContactMessage::query()->create($validated);
        $recipient = env('CONTACT_MAIL_TO');

        if ($recipient) {
            Mail::raw(
                "Name: {$message->name}\nEmail: {$message->email}\n\n{$message->message}",
                fn ($mail) => $mail
                    ->to($recipient)
                    ->subject('Digital Menu Portal contact'),
            );
        }

        return response()->json([
            'data' => $message,
        ], 201);
    }
}
