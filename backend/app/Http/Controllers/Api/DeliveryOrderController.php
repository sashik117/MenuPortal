<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\DeliveryOrder;
use App\Models\Dish;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class DeliveryOrderController extends Controller
{
    public function __construct(private readonly TelegramService $telegram)
    {
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        if (! $company->hasActiveAccess()) {
            return response()->json([
                'message' => 'Тестовий період завершено. Будь ласка, оплатіть підписку.',
                'status' => 'subscription_required',
            ], 402);
        }

        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:80'],
            'address' => ['required', 'string', 'max:255'],
            'comment' => ['nullable', 'string', 'max:1200'],
            'items' => ['required', 'array', 'min:1', 'max:40'],
            'items.*.dish_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:20'],
        ]);

        $ids = collect($validated['items'])->pluck('dish_id')->unique()->values();
        $dishes = Dish::query()
            ->where('company_id', $company->id)
            ->where('is_available', true)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        if ($dishes->count() !== $ids->count()) {
            throw ValidationException::withMessages([
                'items' => ['Одна зі страв недоступна для доставки.'],
            ]);
        }

        $order = DB::transaction(function () use ($company, $dishes, $validated): DeliveryOrder {
            $total = collect($validated['items'])->sum(function (array $item) use ($dishes): float {
                $dish = $dishes->get($item['dish_id']);

                return (float) $dish->price * (int) $item['quantity'];
            });

            $order = DeliveryOrder::query()->create([
                'company_id' => $company->id,
                'customer_name' => $validated['customer_name'],
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'comment' => $validated['comment'] ?? null,
                'status' => 'new',
                'total' => $total,
            ]);

            foreach ($validated['items'] as $item) {
                $dish = $dishes->get($item['dish_id']);
                $quantity = (int) $item['quantity'];
                $unitPrice = (float) $dish->price;

                $order->items()->create([
                    'dish_id' => $dish->id,
                    'dish_name' => $dish->name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $unitPrice * $quantity,
                ]);
            }

            return $order->load('items');
        });

        if ($company->feedback_email) {
            Mail::raw(
                "Venue: {$company->name}\nCustomer: {$order->customer_name}\nPhone: {$order->phone}\nAddress: {$order->address}\nTotal: {$order->total}\n\n{$order->comment}",
                fn ($mail) => $mail
                    ->to($company->feedback_email)
                    ->subject("New delivery order: {$company->name}"),
            );
        }

        $this->telegram->sendDeliveryOrder($company, $order);

        return response()->json([
            'data' => $order,
        ], 201);
    }
}
