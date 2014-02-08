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

require_once "openmediavault/object.inc";
require_once "openmediavault/error.inc";
require_once "openmediavault/util.inc";
require_once "openmediavault/rpc.inc";
require_once "openmediavault/notify.inc";
require_once "openmediavault/initscript.inc";

class OMVRpcServiceCups extends OMVRpcServiceAbstract
{
    private function getXPath()
    {
        return "//services/cups";
    }

    public function getName()
    {
        return "Cups";
    }

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
     * Resync avahi service definitions
     */
    private function resync()
    {
        # Regenerate service definitions
        $cmd = "sudo /usr/local/bin/omvcups-avahi.py 2>&1";
        OMVUtil::exec($cmd, $output, $result);
        if ($result !== 0)
            throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
    }

    public function getSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Get the configuration object.
        $object = $xmlConfig->get($this->getXPath());
        if (is_null($object))
            throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath());

        // Modify result data
        $settingsObject["enable"]          = boolval($object["enable"]);
        $settingsObject["enable_samba"]    = boolval($object["enable_samba"]);
        $settingsObject["airprint"]        = boolval($object["airprint"]);
        $settingsObject["maxjobs"]         = intval($object["maxjobs"]);
        $settingsObject["remote_printers"] = boolval($object["remote_printers"]);

        return $settingsObject;
    }

    public function setSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "enable"          : { "type" : "boolean" },
                "enable_samba"    : { "type" : "boolean" },
                "airprint"        : { "type" : "boolean" },
                "maxjobs"         : { "type" : "integer" },
                "remote_printers" : { "type" : "boolean" }
            }
        }');

        // Prepare configuration data
        $object = array(
            "enable"          => array_boolval($params, "enable"),
            "enable_samba"    => array_boolval($params, "enable_samba"),
            "airprint"        => array_boolval($params, "airprint"),
            "maxjobs"         => $params["maxjobs"],
            "remote_printers" => array_boolval($params, "remote_printers"),
        );

        // Set configuration object
        if (false === $xmlConfig->replace($this->getXPath(), $object))
            throw new OMVException(OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED,
                $this->getXPath());

        // Notify configuration changes
        $dispatcher = &OMVNotifyDispatcher::getInstance();
        $dispatcher->notify(OMV_NOTIFY_MODIFY, "org.openmediavault.services.cups", $object);

        $oldConf = $xmlConfig->get($this->getXPath());

        if ($oldConf["enable"] != $object["enable"])
            $this->notifySamba($object["enable"]);

        return $object;
    }

    public function getPrinters($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        return $this->isRunning() ?
            $this->runCupsCommand("getPrinters") : array();
    }

    /**
     * Get a specific printer
     */
    public function getPrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "uuid" : { "type" : "string" }
            }
        }');

        return $this->runCupsCommand("getPrinter", array($params["uuid"]));
    }

    public function setPrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "uuid"            : { "type" : "string" },
                "PrinterLocation" : { "type" : "string" , "optional" : true },
                "PrinterInfo"     : { "type" : "string" }
            }
        }');

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
     * Add a printer
     */
    public function addPrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "device"      : { "type" : "string" },
                "ppd"         : { "type" : "string" },
                "name"        : { "type" : "string" },
                "location"    : { "type" : "string", "optional" : true },
                "description" : { "type" : "string" }
            }
        }');

        // Search for existing printer with that name
        $printer = null;

        try {
            $printer = $this->getPrinter($params["name"]);
        } catch (Exception $e) {
            // Nothing
        }

        if ($printer)
            throw new Exception("A printer with the name {$params['name']} already exists.");

        if (empty($params["location"]))
            $params["location"] = "";

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

        // Resync services
        $this->resync();
    }

    /**
     * Delete a printer
     */
    public function deletePrinter($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "pname" : { "type" : "string" }
            }
        }');

        $this->runCupsCommand("deletePrinter", array($params["pname"]));
    }

    /**
     * Send a test page to printer
     */
    public function printTestPage($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "pname" : { "type" : "string" }
            }
        }');

        $this->runCupsCommand("printTestPage", array($params["pname"]));
    }

    /**
     * Resume printing
     */
    public function resumePrinting($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "pname" : { "type" : "string" }
            }
        }');

        $this->runCupsCommand("resumePrinting", array($params["pname"]));
    }

    /**
     * Pause printing
     */
    public function pausePrinting($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "pname" : { "type" : "string" }
            }
        }');

        $this->runCupsCommand("pausePrinting", array($params["pname"]));
    }

    /**
     * Get a list of makes and models
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
     * Get a list of directly connected devices
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
        $scanForRemotePrinters = $xmlConfig->get($this->getXPath() . "/remote_printers");
        $arg = $scanForRemotePrinters ? "--network" : "--no-network";

        return $this->runCupsCommand("findDirectPrinters", array($arg));
    }

    public function getJobs($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "start"     : { "type" : "integer" },
                "limit"     : {' . $GLOBALS["OMV_JSONSCHEMA_COUNTFIELD"] . '},
                "sortfield" : {' . $GLOBALS["OMV_JSONSCHEMA_SORTFIELD"] . '},
                "sortdir"   : {' . $GLOBALS["OMV_JSONSCHEMA_SORTDIR"] . '},
                "which"     : { "type" : "string", "optional" : true }
            }
        }');

        // Default to showing only not completed jobs
        if (isset($params["which"]) === false)
            $params["which"] = "not-completed";

        $jobs = array();

        if ($this->isRunning()) {
            $jobs = $this->runCupsCommand(
                "getJobs",
                array($params["which"])
            );
        }

        // Filter result
        return $this->applyFilter(
            $jobs,
            $params["start"],
            $params["limit"],
            $params["sortfield"],
            $params["sortdir"]
        );
    }

    /**
     * Cancel a single job
     */
    function cancelJob($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "jobid" : { "type" : "integer" }
            }
        }');

        $this->runCupsCommand("cancelJob", array($params["jobid"]));
    }

    /**
     * Cancel all jobs for printer
     */
    function cancelJobs($params, $context)
    {
        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams($params, '{
            "type"       : "object",
            "properties" : {
                "pname" : { "type" : "string" }
            }
        }');

        $this->runCupsCommand("cancelAllJobs", array($params["pname"]));
    }

    /**
     * Run a cups command
     */
    private function runCupsCommand($fn, $args = array())
    {
        if (count($args)) {
            $args = implode(" ", array_map("escapeshellarg", $args));
        } else {
            $args = "";
        }

        $cmd = "sudo /usr/local/bin/omvcups.py {$fn} {$args} 2>&1";
        OMVUtil::exec($cmd, $output, $result);
        $output = implode("\n", $output);

        if (0 !== $result)
            throw new OMVException(OMVErrorMsg::E_EXEC_FAILED,
                $cmd, $output);

        $obj = json_decode($output, true);

        if (!empty($obj["error"]))
            throw new Exception($obj["error"]);

        return $obj;
    }

    private function notifySamba($enabled)
    {
        global $xmlConfig;

        $object = $xmlConfig->get("//services/smb");
        $dispatcher->notify(OMV_NOTIFY_MODIFY, "org.openmediavault.services.smb", $object);

        // If we're enabled, make sure sharing is enabled
        if ($enabled)
            $this->runCupsCommand("enableSharing");
    }

    private function isRunning()
    {
        $initd = new OMVSysVInitScript("cups");
        return $initd->status() == 0;
    }
}

// Register the RPC service.
$rpcServiceMgr = &OMVRpcServiceMgr::getInstance();
$rpcServiceMgr->registerService(new OMVRpcServiceCups());
