<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\ChangeOwnPasswordAction;
use App\Domains\Identity\Data\ProfilePasswordData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProfilePasswordController extends Controller
{
    public function update(ProfilePasswordData $data, Request $request, ChangeOwnPasswordAction $action): Response
    {
        $action->execute($request->user(), $data->password, $request->session()->getId());

        return response()->noContent();
    }
}
