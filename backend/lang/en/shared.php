<?php

declare(strict_types=1);

return [
    'file' => [
        'malware_rejected' => 'The file was rejected: the antivirus detected malicious content.',
        'set_too_large' => 'The file set exceeds the maximum of :max MB. Send them in separate requests.',
        'scanner_unavailable' => 'The antivirus service is unavailable. The file was not saved; try again in a few minutes.',
        'image_too_narrow' => 'The signature must be at least :min px wide; the one sent is :width px.',
        'image_unreadable' => 'The signature image could not be read. Send a valid PNG.',
    ],
    'rule' => [
        'rut_invalid' => 'The RUT provided is not valid.',
        'grade_not_printable' => 'The final grade must be a number or a non-empty text.',
    ],
    'spreadsheet' => [
        'unsupported_format' => 'Unsupported format — send xlsx or csv.',
        'too_many_rows' => 'The spreadsheet exceeds the maximum of :max rows. Split it and send it again.',
    ],
];
