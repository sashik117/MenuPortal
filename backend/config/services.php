<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
    ],

    'payments' => [
        'provider' => env('PAYMENT_PROVIDER', 'monobank'),
        'currency' => (int) env('PAYMENT_CURRENCY', 980),
        'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:5174'),
    ],

    'monobank' => [
        'token' => env('MONOBANK_TOKEN'),
        'base_url' => env('MONOBANK_BASE_URL', 'https://api.monobank.ua'),
        'verify_webhook_signature' => filter_var(
            env('MONOBANK_VERIFY_WEBHOOK_SIGNATURE', true),
            FILTER_VALIDATE_BOOLEAN,
        ),
    ],

];
