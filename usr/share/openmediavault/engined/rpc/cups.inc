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

        // CRUD
        $this->registerMethod('getPrinter');
        $this->registerMethod('setPrinter');
        $this->registerMethod('deletePrinter');
    }

    public function getSettings($params, $context)
    {

    }

    public function setSettings($params, $context)
    {

    }

    function getPrinters($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext($context, array(
            "role" => OMV_ROLE_ADMINISTRATOR
        ));

        return $this->runCupsCommand("getPrinters");
    }

    function getPrinter($params, $context)
    {

    }

    public function setPrinter($params, $context)
    {

    }

    public function deletePrinter($params, $context)
    {

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
