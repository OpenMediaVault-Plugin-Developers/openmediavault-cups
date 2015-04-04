<?php

/**
 * Copyright (C)      2011 Ian Moore
 * Copyright (C) 2013-2015 OpenMediaVault Plugin Developers
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
    private function getXpath()
    {
        return "/config/services/cups";
    }

    /**
     * Get the module name.
     *
     * @return string
     */
    public function getName()
    {
        return "cups";
    }

    /**
     * Get the status of the managed service.
     *
     * @return array
     */
    public function getStatus()
    {
        global $xmlConfig;

        $object = $xmlConfig->get($this->getXpath());

        if (is_null($object)) {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXpath()
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
     * Generate the configuration.
     *
     * @return void
     */
    public function applyConfig()
    {
        $cmd = sprintf("export LANG=C; omv-mkconf %s 2>&1", $this->getName());

        if (0 !== $this->exec($cmd, $output)) {
            throw new OMVException(
                OMVErrorMsg::E_EXEC_FAILED,
                $cmd,
                implode("\n", $output)
            );
        }
    }

    /**
     * Start the managed service.
     *
     * @return void
     */
    public function startService()
    {
        global $xmlConfig;

        $object = $xmlConfig->get($this->getXpath());

        if (is_null($object)) {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXpath()
            );
        }

        if (!boolval($object["enable"])) {
            return;
        }

        $initd = new OMVSysVInitScript($this->getName(), true);
        $initd->exec();

        $this->regenerateServiceDefinitions();
    }

    /**
     * Stop the managed service.
     *
     * @return void
     */
    public function stopService()
    {
        $initd = new OMVSysVInitScript($this->getName(), false);
        $initd->exec();
    }

    /**
     * Generate Avahi service definitions for each printer.
     *
     * @return void
     */
    private function regenerateServiceDefinitions()
    {
        $cmd = "export LANG=C; omv-cups-avahi 2>&1";

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
     *
     * @param OMVNotifyDispatcher $dispatcher The dispatcher object.
     *
     * @return void
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
