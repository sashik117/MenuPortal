<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id',
    'food_rating',
    'service_rating',
    'atmosphere_rating',
    'value_rating',
    'message',
    'guest_name',
    'guest_contact',
])]
class RestaurantFeedback extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'food_rating' => 'integer',
            'service_rating' => 'integer',
            'atmosphere_rating' => 'integer',
            'value_rating' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
