<?php

namespace App\Domains\Certification\Models;

use Illuminate\Database\Eloquent\Model;

class CertificateSequence extends Model
{
    protected $fillable = ['year', 'last_seq'];
}
