<?php

/**
 * Copyright (C) 2011 Ian Moore
 * Copyright (C) 2013 OpenMediaVault Plugin Developers
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

class OMVRpcServiceCups extends OMVRpcServiceAbstract
{
    private function getXPath()
    {
        return "//services/cups";
    }

    public function getName()
    {
        return 'Cups';
    }

    public function initialize()
    {
        $this->registerMethod('getSettings');
        $this->registerMethod('setSettings');
        $this->registerMethod('getPrinters');
        $this->registerMethod('getPrinter');
        $this->registerMethod('setPrinter');
        $this->registerMethod('deletePrinter');
        $this->registerMethod('getJobs');
    }

    public function getSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        // Get the configuration object.
        $xpath = "//services/pptp";
        $object = $xmlConfig->get($xpath);

        $object = $xmlConfig->get($this->getXPath());
        if (is_null($object))
            throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath());

        return var_export($object, true);

        // Modify result data
        $settingsObject['enable']       = boolval($object['enable']);
        $settingsObject['enable_samba'] = boolval($object['enable_samba']);
        $settingsObject['airprint']     = boolval($object['airprint']);
        $settingsObject['maxjobs']      = intval($object['maxjobs']);

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
                "enable"       : { "type" : "boolean" },
                "enable_samba" : { "type" : "boolean" },
                "airprint"     : { "type" : "boolean" },
                "maxjobs"      : { "type" : "integer" }
            }
        }');

        // Prepare configuration data
        $object = array(
            "enable"       => array_boolval($params, 'enable'),
            'enable_samba' => array_boolval($params, 'enable_samba'),
            'airprint'     => array_boolval($params, 'airprint'),
            'maxjobs'      => $params['maxjobs']
        );

        // Set configuration object
        if (false === $xmlConfig->replace($this->getXPath(), $object))
            throw new OMVException(OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED,
                $this->getXPath());

        // Notify configuration changes
        $dispatcher = &OMVNotifyDispatcher::getInstance();
        $dispatcher->notify(OMV_NOTIFY_MODIFY, "org.openmediavault.services.cups", $object);

        return $object;
    }

    public function getPrinters($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        return $this->runCupsCommand("getPrinters");
    }

    public function getPrinter($params, $context)
    {

    }

    public function setPrinter($params, $context)
    {

    }

    public function deletePrinter($params, $context)
    {

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
                "limit"     : {' . $GLOBALS['OMV_JSONSCHEMA_COUNTFIELD'] . '},
                "sortfield" : {' . $GLOBALS['OMV_JSONSCHEMA_SORTFIELD'] . '},
                "sortdir"   : {' . $GLOBALS['OMV_JSONSCHEMA_SORTDIR'] . '},
                "which"     : { "type" : "string", "optional" : true }
            }
        }');

        // Default to showing only not completed jobs
        if (isset($params['which']) === false)
            $params['which'] = 'not-completed';

        // Filter result
        return $this->applyFilter(
            $this->runCupsCommand(
                'getJobs',
                array($params['which'])
            ),
            $params['start'],
            $params['limit'],
            $params['sortfield'],
            $params['sortdir']
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
            "type        : "object",
            "properties" : {
                "jobid" : { "type" : "integer" }
            }
        }');

        $this->runCupsCommand('cancelJob', array($params['jobid']));
    }

    /**
     * Run a cups command
     */
    private function runCupsCommand($fn, $args = array())
    {
        if (count($args)) {
            $args = implode(" ", array_map('escapeshellarg', $args));
        } else {
            $args = '';
        }

        $cmd = "sudo /usr/local/bin/omvcups.py {$fn} {$args} 2>&1";
        OMVUtil::exec($cmd, $output, $result);
        $output = implode("\n", $output);

        if (0 !== $result)
            throw new OMVException(OMVErrorMsg::E_EXEC_FAILED,
                $cmd, $output);

        $obj = json_decode($output, true);

        if (!empty($obj['error']))
            throw new Exception($obj['error']);

        return $obj;
    }
}

// Register the RPC service.
$rpcServiceMgr = &OMVRpcServiceMgr::getInstance();
$rpcServiceMgr->registerService(new OMVRpcServiceCups());
