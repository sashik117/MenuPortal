<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\CompanyRegistrationController;
use App\Http\Controllers\Api\ContactMessageController;
use App\Http\Controllers\Api\DeliveryOrderController;
use App\Http\Controllers\Api\DishController;
use App\Http\Controllers\Api\DishLikeController;
use App\Http\Controllers\Api\ImageUploadController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PlatformCompanyController;
use App\Http\Controllers\Api\PublicMenuController;
use App\Http\Controllers\Api\RestaurantFeedbackController;
use App\Http\Controllers\Api\SubcategoryController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/owners/register', [CompanyRegistrationController::class, 'store']);
Route::post('/contact', [ContactMessageController::class, 'store']);

Route::get('/dishes', [DishController::class, 'index']);
Route::get('/restaurants/{company:slug}/menu', [PublicMenuController::class, 'show']);
Route::get('/restaurants/{company:slug}/menu/version', [PublicMenuController::class, 'version']);
Route::post('/restaurants/{company:slug}/feedback', [RestaurantFeedbackController::class, 'store']);
Route::post('/restaurants/{company:slug}/delivery-orders', [DeliveryOrderController::class, 'store']);
Route::post('/dishes/{dish}/like', [DishLikeController::class, 'store']);
Route::post('/payments/monobank/webhook', [PaymentController::class, 'monobankWebhook']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/company', [CompanyController::class, 'show']);
    Route::patch('/company', [CompanyController::class, 'update']);

    Route::post('/dishes', [DishController::class, 'store']);
    Route::patch('/dishes/{dish}', [DishController::class, 'update']);
    Route::delete('/dishes/{dish}', [DishController::class, 'destroy']);
    Route::patch('/dishes/{dish}/toggle', [DishController::class, 'toggle']);

    Route::post('/categories', [CategoryController::class, 'store']);
    Route::patch('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    Route::post('/subcategories', [SubcategoryController::class, 'store']);
    Route::patch('/subcategories/{subcategory}', [SubcategoryController::class, 'update']);
    Route::delete('/subcategories/{subcategory}', [SubcategoryController::class, 'destroy']);

    Route::post('/uploads/dish-image', [ImageUploadController::class, 'dish']);
    Route::post('/uploads/company-avatar', [ImageUploadController::class, 'companyAvatar']);

    Route::post('/payments/subscription', [PaymentController::class, 'subscription']);
    Route::get('/payments/{paymentInvoice}', [PaymentController::class, 'show']);

    Route::get('/platform/companies', [PlatformCompanyController::class, 'index']);
    Route::patch('/platform/companies/{company}', [PlatformCompanyController::class, 'update']);
    Route::delete('/platform/companies/{company}', [PlatformCompanyController::class, 'destroy']);
});
