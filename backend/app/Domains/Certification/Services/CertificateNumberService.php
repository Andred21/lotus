<?php

namespace App\Domains\Certification\Services;

use Illuminate\Support\Facades\DB;

class CertificateNumberService
{
    public function next(int $year): string
    {
        return DB::transaction(function () use ($year) {
            DB::table('certificate_sequences')->insertOrIgnore([
                'year' => $year,
                'last_seq' => 999,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = DB::table('certificate_sequences')
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            $seq = (int) $row->last_seq + 1;

            DB::table('certificate_sequences')
                ->where('year', $year)
                ->update(['last_seq' => $seq, 'updated_at' => now()]);

            return sprintf('LOT-%d-%d', $year, $seq);
        });
    }
}
