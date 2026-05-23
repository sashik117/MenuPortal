<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id',
    'provider',
    'provider_invoice_id',
    'reference',
    'plan',
    'amount',
    'currency',
    'status',
    'checkout_url',
    'failure_reason',
    'err_code',
    'provider_payload',
    'provider_modified_at',
    'paid_at',
])]
class PaymentInvoice extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'provider_payload' => 'array',
            'provider_modified_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
