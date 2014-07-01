<?php

/**
 * Copyright (C)      2011 Ian Moore
 * Copyright (C) 2013-2014 OpenMediaVault Plugin Developers
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

require_once "openmediavault/config.inc";
require_once "openmediavault/error.inc";
require_once "openmediavault/initscript.inc";
require_once "openmediavault/log.inc";
require_once "openmediavault/module.inc";

class OMVModuleCups extends OMVModuleServiceAbstract implements
    OMVINotifyListener,
    OMVIModuleServiceStatus
{
    private function getXPath()
    {
        return "//services/cups";
    }

    /**
     * Get the module name.
     */
    public function getName()
    {
        return "cups";
    }

    /**
     * Get the status of the managed service.
     */
    public function getStatus()
    {
        global $xmlConfig;

        // Get the configuration object
        $object = $xmlConfig->get($this->getXPath());

        if (is_null($object)) {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath()
            );
        }

        $initd = new OMVSysVInitScript($this->getName());

        return array(
            "name"    => $this->getName(),
            "title"   => gettext("Printing"),
            "enabled" => boolval($object["enable"]),
            "running" => $initd->status() == 0
        );
    }

    /**
     * Create and update the configuration
     */
    public function applyConfig()
    {
        $cmd = sprintf("sudo omv-mkconf %s 2>&1", $this->getName());

        if (0 !== $this->exec($cmd, $output)) {
            throw new OMVException(
                OMVErrorMsg::E_EXEC_FAILED,
                $cmd,
                implode("\n", $output)
            );
        }
    }

    public function startService()
    {
        global $xmlConfig;

        $object = $xmlConfig->get($this->getXPath());

        if (is_null($object)) {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath()
            );
        }

        if (!boolval($object["enable"])) {
            return;
        }

        $initd = new OMVSysVInitScript($this->getName(), true);
        $initd->exec();

        $this->regenerateServiceDefinitions();
    }

    public function stopService()
    {
        $initd = new OMVSysVInitScript($this->getName(), false);
        $initd->exec();
    }

    private function regenerateServiceDefinitions()
    {
        $cmd = "sudo /usr/local/bin/omvcups-avahi.py 2>&1";

        OMVUtil::exec($cmd, $output, $result);
        if ($result !== 0) {
            throw new OMVException(
                OMVErrorMsg::E_EXEC_FAILED,
                $cmd,
                implode("\n", $output)
            );
        }
    }

    /**
     * Bind listeners.
     */
    public function bindListeners(OMVNotifyDispatcher $dispatcher)
    {
        $dispatcher->addListener(
            OMV_NOTIFY_CREATE | OMV_NOTIFY_MODIFY | OMV_NOTIFY_DELETE,
            "org.openmediavault.services.cups",
            array($this, "setDirty")
        );
    }
}

// Register module.
$moduleMgr = &OMVModuleMgr::getInstance();
$moduleMgr->registerModule(new OMVModuleCups());

// Register new logfile type
OMVLogFile::registerType(
    "cupsaccess",
    array(
        "filename" => "access_log",
        "filepath" => "/var/log/cups/access_log",
        "regex"    => "/^(.*?)\s+[^\s]+\s+(.*?)\s+\[(.+?)\s+.*?\]\s+(.*)$/",
        "columns"  => array(
            "host" => 1,
            "user" => 2,
            "date" => array(
                "index" => 3,
                "func"  => create_function(
                    "\$v",
                    "return strpdate(\$v,\"j/M/Y:G:i:s\");"
                )
            ),
            "event" => 4
        )
    )
);

// Register new logfile type
OMVLogFile::registerType(
    "cupserror",
    array(
        "filename" => "error_log",
        "filepath" => "/var/log/cups/error_log",
        "regex"    => "/^(.)\s+\[(.+?)\s+.*?\]\s+(.*)$/",
        "columns"  => array(
            "severity" => 1,
            "date"     => array(
                "index" => 2,
                "func"  => create_function(
                    "\$v",
                    "return strpdate(\$v,\"j/M/Y:G:i:s\");"
                )
            ),
            "event" => 3
        )
    )
);
