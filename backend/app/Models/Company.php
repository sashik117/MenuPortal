<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'owner_first_name',
    'owner_last_name',
    'name',
    'slug',
    'venue_type',
    'avatar_url',
    'status',
    'menu_version',
    'trial_ends_at',
    'subscription_ends_at',
    'wifi_name',
    'wifi_password',
    'working_hours',
    'address',
    'maps_url',
    'google_place_id',
    'address_lat',
    'address_lng',
    'phone',
    'delivery_url',
    'feedback_email',
    'telegram_chat_id',
])]
class Company extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
            'menu_version' => 'integer',
            'address_lat' => 'decimal:7',
            'address_lng' => 'decimal:7',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(Subcategory::class);
    }

    public function dishes(): HasMany
    {
        return $this->hasMany(Dish::class);
    }

    public function deliveryOrders(): HasMany
    {
        return $this->hasMany(DeliveryOrder::class);
    }

    public function paymentInvoices(): HasMany
    {
        return $this->hasMany(PaymentInvoice::class);
    }

    public function hasActiveAccess(): bool
    {
        if ($this->status === 'active') {
            return true;
        }

        if ($this->status === 'trialing' && $this->trial_ends_at?->isFuture()) {
            return true;
        }

        return $this->subscription_ends_at?->isFuture() ?? false;
    }
}
