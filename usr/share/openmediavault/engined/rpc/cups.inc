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

require_once "openmediavault/error.inc";
require_once "openmediavault/notify.inc";
require_once "openmediavault/rpc.inc";

class OMVRpcServiceCups extends OMVRpcServiceAbstract
{
    private $eventMessagePath = "org.openmediavault.services.cups";
    private $sambaEventMessagePath = "org.openmediavault.services.smb";

    private function getXpath()
    {
        return "/config/services/cups";
    }

    /**
     * Get the name of the RPC service.
     *
     * @return string
     */
    public function getName()
    {
        return "Cups";
    }

    /**
     * Initialize the RPC service.
     *
     * @return void
     */
    public function initialize()
    {
        $this->registerMethod("getSettings");
        $this->registerMethod("setSettings");

        $this->registerMethod("getPrinters");
        $this->registerMethod("getPrinter");
        $this->registerMethod("setPrinter");
        $this->registerMethod("addPrinter");
        $this->registerMethod("deletePrinter");

        $this->registerMethod("printTestPage");
        $this->registerMethod("resumePrinting");
        $this->registerMethod("pausePrinting");
        $this->registerMethod("getMakesModels");
        $this->registerMethod("findDirectPrinters");

        $this->registerMethod("getJobs");
        $this->registerMethod("cancelJob");
        $this->registerMethod("cancelJobs");
    }

    /**
     * Get the main settings.
     *
     * @param array $params
     * @param array $context
     *
     * @return array
     */
    public function getSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Get the configuration object.
        $object = $xmlConfig->get($this->getXpath());
        if (is_null($object)) {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXpath()
            );
        }

        // Modify result data.
        $settingsObject["enable"] = boolval($object["enable"]);
        $settingsObject["enable_samba"] = boolval($object["enable_samba"]);
        $settingsObject["airprint"] = boolval($object["airprint"]);
        $settingsObject["maxjobs"] = intval($object["maxjobs"]);
        $settingsObject["remote_printers"] = boolval($object["remote_printers"]);

        return $settingsObject;
    }

    /**
     * Set the main settings.
     *
     * @param array $params
     * @param array $context
     *
     * @return array
     */
    public function setSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "enable": { "type": "boolean" },
                    "enable_samba": { "type": "boolean" },
                    "airprint": { "type": "boolean" },
                    "maxjobs": { "type": "integer" },
                    "remote_printers": { "type": "boolean" }
                }
            }'
        );

        // Prepare configuration data.
        $object = array(
            "enable" => boolval($params["enable"]),
            "enable_samba" => boolval($params["enable_samba"]),
            "airprint" => boolval($params["airprint"]),
            "maxjobs" => $params["maxjobs"],
            "remote_printers" => boolval($params["remote_printers"]),
        );

        // Set configuration object.
        if (false === $xmlConfig->replace($this->getXpath(), $object)) {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED,
                $this->getXpath()
            );
        }

        // Notify configuration changes
        $dispatcher = &OMVNotifyDispatcher::getInstance();
        $dispatcher->notify(
            OMV_NOTIFY_MODIFY,
            $this->eventMessagePath,
            $object
        );

        $oldConfig = $xmlConfig->get($this->getXpath());

        if ($oldConfig["enable"] != $object["enable"]) {
            $this->notifySamba($object["enable"]);
        }

        return $object;
    }

    /**
     * Get all printers.
     *
     * @param array $params
     * @param array $context
     *
     * @return array
     */
    public function getPrinters($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        try {
            return $this->runCupsCommand("getPrinters");
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Get a single printer.
     *
     * @param array $params
     * @param array $context
     *
     * @return array
     */
    public function getPrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "uuid": { "type": "string" }
                }
            }'
        );

        return $this->runCupsCommand("getPrinter", array($params["uuid"]));
    }

    /**
     * Set a single printer.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function setPrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "uuid": { "type": "string" },
                    "PrinterLocation": { "type": "string" , "optional": true },
                    "PrinterInfo": { "type": "string" }
                }
            }'
        );

        $this->runCupsCommand(
            "setPrinter",
            array(
                $params["uuid"],
                $params["PrinterInfo"],
                $params["PrinterLocation"]
            )
        );
    }

    /**
     * Add a printer.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function addPrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "device": { "type": "string" },
                    "ppd": { "type": "string" },
                    "name": { "type": "string" },
                    "location": { "type": "string", "optional": true },
                    "description": { "type": "string" }
                }
            }'
        );

        // Search for existing printer with that name.
        $printer = null;

        try {
            $printer = $this->getPrinter($params["name"]);
        } catch (Exception $e) {
            // Nothing.
        }

        if ($printer) {
            throw new Exception("A printer with the name {$params['name']} already exists.");
        }

        if (empty($params["location"])) {
            $params["location"] = "";
        }

        $this->runCupsCommand(
            "addPrinter",
            array(
                $params["name"],
                $params["ppd"],
                $params["description"],
                $params["location"],
                $params["device"]
            )
        );

        $this->regenerateServiceDefinitions();
    }

    /**
     * Delete a printer.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function deletePrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "pname": { "type": "string" }
                }
            }'
        );

        $this->runCupsCommand("deletePrinter", array($params["pname"]));
    }

    /**
     * Print a test page.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function printTestPage($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "pname": { "type": "string" }
                }
            }'
        );

        $this->runCupsCommand("printTestPage", array($params["pname"]));
    }

    /**
     * Resume printing.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function resumePrinting($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "pname": { "type": "string" }
                }
            }'
        );

        $this->runCupsCommand("resumePrinting", array($params["pname"]));
    }

    /**
     * Pause printing.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function pausePrinting($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "pname": { "type": "string" }
                }
            }'
        );

        $this->runCupsCommand("pausePrinting", array($params["pname"]));
    }

    /**
     * Get a list of printer makes and models.
     *
     * @param array $params
     * @param array $context
     *
     * @return array
     */
    public function getMakesModels($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        return $this->runCupsCommand("getMakesModels");
    }

    /**
     * Get a list of directly connected devices.
     *
     * @param array $params
     * @param array $context
     *
     * @return array
     */
    public function findDirectPrinters($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Get the configuration object.
        $scanForRemotePrinters = $xmlConfig->get(
            $this->getXpath() . "/remote_printers"
        );

        $arg = $scanForRemotePrinters ? "--network" : "--no-network";

        return $this->runCupsCommand("findDirectPrinters", array($arg));
    }

    /**
     * Get jobs.
     *
     * @param array $params
     * @param array $context
     *
     * @return array
     */
    public function getJobs($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "start": { "type": "integer" },
                    "limit": {' . $GLOBALS["OMV_JSONSCHEMA_COUNTFIELD"] . '},
                    "sortfield": {' . $GLOBALS["OMV_JSONSCHEMA_SORTFIELD"] . '},
                    "sortdir": {' . $GLOBALS["OMV_JSONSCHEMA_SORTDIR"] . '},
                    "which": { "type": "string", "optional": true }
                }
            }'
        );

        // Default to showing only not completed jobs.
        if (isset($params["which"]) === false) {
            $params["which"] = "not-completed";
        }

        try {
            $jobs = $this->runCupsCommand(
                "getJobs",
                array($params["which"])
            );
        } catch (Exception $e) {
            $jobs = array();
        }

        // Filter result.
        return $this->applyFilter(
            $jobs,
            $params["start"],
            $params["limit"],
            $params["sortfield"],
            $params["sortdir"]
        );
    }

    /**
     * Cancel a single job.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function cancelJob($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "jobid": { "type": "integer" }
                }
            }'
        );

        $this->runCupsCommand("cancelJob", array($params["jobid"]));
    }

    /**
     * Cancel all jobs for printer.
     *
     * @param array $params
     * @param array $context
     *
     * @return void
     */
    public function cancelJobs($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type": "object",
                "properties": {
                    "pname": { "type": "string" }
                }
            }'
        );

        $this->runCupsCommand("cancelAllJobs", array($params["pname"]));
    }

    /**
     * Notify Samba about configuration changes.
     *
     * @param bool $enabled Indicate if CUPS is enabled or not.
     *
     * @return void
     */
    private function notifySamba($enabled)
    {
        global $xmlConfig;

        $object = $xmlConfig->get("/config/services/smb");

        $dispatcher->notify(
            OMV_NOTIFY_MODIFY,
            $this->sambaEventMessagePath,
            $object
        );

        // If we're enabled, make sure sharing is enabled.
        if ($enabled) {
            $this->runCupsCommand("enableSharing");
        }
    }

    /**
     * Generate Avahi service definitions for each printer.
     *
     * @return void
     */
    private function regenerateServiceDefinitions()
    {
        $cmd = "export LANG=C; omv-cups-avahi 2>&1";

        if ($this->exec($cmd, $output) !== 0) {
            throw new OMVException(
                OMVErrorMsg::E_EXEC_FAILED,
                $cmd,
                implode("\n", $output)
            );
        }
    }

    /**
     * Run a CUPS command and return the result.
     *
     * @param string $command The command to run.
     * @param array $args The arguments.
     *
     * @return array|object
     */
    private function runCupsCommand($command, $args = array())
    {
        if (count($args)) {
            $args = implode(" ", array_map("escapeshellarg", $args));
        } else {
            $args = "";
        }

        $cmd = "export LANG=C; omv-cups {$command} {$args} 2>&1";

        if ($this->exec($cmd, $output) !== 0) {
            throw new OMVException(
                OMVErrorMsg::E_EXEC_FAILED,
                $cmd,
                implode("", $output)
            );
        }

        $obj = json_decode(implode("", $output), true);

        if (!empty($obj["error"])) {
            throw new Exception($obj["error"]);
        }

        return $obj;
    }
}

// Register the RPC service.
$rpcServiceMgr = &OMVRpcServiceMgr::getInstance();
$rpcServiceMgr->registerService(new OMVRpcServiceCups());
