<?php

namespace App\Services\Payments;

use InvalidArgumentException;

class PaymentPlans
{
    /**
     * @var array<string, array{name: string, amount: int, months: int, recurring: bool}>
     */
    private const PLANS = [
        'month' => [
            'name' => '1 month',
            'amount' => 39000,
            'months' => 1,
            'recurring' => false,
        ],
        'six_months' => [
            'name' => '6 months',
            'amount' => 199000,
            'months' => 6,
            'recurring' => false,
        ],
        'year' => [
            'name' => '1 year',
            'amount' => 349000,
            'months' => 12,
            'recurring' => false,
        ],
        'auto_monthly' => [
            'name' => 'Monthly renewal',
            'amount' => 39000,
            'months' => 1,
            'recurring' => true,
        ],
    ];

    /**
     * @return array{name: string, amount: int, months: int, recurring: bool}
     */
    public function get(string $plan): array
    {
        if (! isset(self::PLANS[$plan])) {
            throw new InvalidArgumentException("Unknown payment plan [{$plan}].");
        }

        return self::PLANS[$plan];
    }

    /**
     * @return array<int, string>
     */
    public function codes(): array
    {
        return array_keys(self::PLANS);
    }
}
