<?php

/**
 * Copyright (C) 2015 OpenMediaVault Plugin Developers
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

require_once "openmediavault/log.inc";

// Register new logfile type.
OMVLogFile::registerType(
    "cupsaccess",
    [
        "filename" => "access_log",
        "filepath" => "/var/log/cups/access_log",
        "regex" => "/^(.*?)\s+[^\s]+\s+(.*?)\s+\[(.+?)\s+.*?\]\s+(.*)$/",
        "columns" => [
            "host" => 1,
            "user" => 2,
            "date" => [
                "index" => 3,
                "func"  => create_function(
                    "\$v",
                    "return strpdate(\$v,\"j/M/Y:G:i:s\");"
                )
            ],
            "event" => 4
        ]
    ]
);

// Register new logfile type.
OMVLogFile::registerType(
    "cupserror",
    [
        "filename" => "error_log",
        "filepath" => "/var/log/cups/error_log",
        "regex" => "/^(.)\s+\[(.+?)\s+.*?\]\s+(.*)$/",
        "columns" => [
            "severity" => 1,
            "date" => [
                "index" => 2,
                "func" => create_function(
                    "\$v",
                    "return strpdate(\$v,\"j/M/Y:G:i:s\");"
                )
            ],
            "event" => 3
        ]
    ]
);
