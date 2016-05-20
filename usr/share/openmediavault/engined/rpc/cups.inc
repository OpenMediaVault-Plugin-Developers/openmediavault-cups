<?php

/**
 * Copyright (C)      2011 Ian Moore
 * Copyright (C) 2013-2015 OpenMediaVault Plugin Developers.
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

namespace OMV\Engined\Rpc;

use Exception;
use OMV\Config\Database;
use OMV\Engine\Notify\Dispatcher;
use OMV\Rpc\ServiceAbstract;
use OMV\System\Process;

class Cups extends ServiceAbstract
{
    /** @var Database */
    private $database;

    /** @var string */
    private $dataModelPath = 'conf.service.cups';

    /** @var Dispatcher */
    private $dispatcher;

    /** @var string */
    private $eventMessagePath = 'org.openmediavault.conf.service.cups';

    /** @var string */
    private $sambaDataModelPath = 'conf.service.smb';

    /** @var string */
    private $sambaEventMessagePath = 'org.openmediavault.conf.service.smb';

    public function __construct(Database $database = null, Dispatcher $dispatcher = null)
    {
        $this->database = $database ?: Database::getInstance();
        $this->dispatcher = $database ?: Dispatcher::getInstance();
    }

    /**
     * Get the name of the RPC service.
     *
     * @return string
     */
    public function getName()
    {
        return 'Cups';
    }

    /**
     * Initialize the RPC service.
     *
     * @return void
     */
    public function initialize()
    {
        $this->registerMethod('getSettings');
        $this->registerMethod('setSettings');

        $this->registerMethod('getPrinters');
        $this->registerMethod('getPrinter');
        $this->registerMethod('setPrinter');
        $this->registerMethod('addPrinter');
        $this->registerMethod('deletePrinter');

        $this->registerMethod('printTestPage');
        $this->registerMethod('resumePrinting');
        $this->registerMethod('pausePrinting');
        $this->registerMethod('getMakesModels');
        $this->registerMethod('findDirectPrinters');

        $this->registerMethod('getJobs');
        $this->registerMethod('cancelJob');
        $this->registerMethod('cancelJobs');
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);

        $object = $this->database->get($this->dataModelPath);

        return $object->getAssoc();
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.setsettings');

        $object = $this->database->get($this->dataModelPath);
        $wasEnabled = $object->get('enable');
        $object->setAssoc($params);
        $currentlyEnabled = $object->get('enable');

        $this->database->set($object);
        $this->dispatcher->notify(OMV_NOTIFY_MODIFY, $this->eventMessagePath, $object);

        if ($wasEnabled !== $currentlyEnabled) {
            $smbSettings = $this->database->get($this->sambaDataModelPath);
            $this->dispatcher->notify(OMV_NOTIFY_MODIFY, $this->sambaEventMessagePath, $object);

            if ($currentlyEnabled) {
                $this->runCupsCommand('enableSharing');
            }
        }

        return $object->getAssoc();
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);

        try {
            return $this->runCupsCommand('getPrinters');
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.getprinter');

        return $this->runCupsCommand('getPrinter', $params['uuid']);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.setprinter');

        $this->runCupsCommand('setPrinter', $params['uuid'], $params['PrinterInfo'], $params['PrinterLocation']);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.addprinter');

        $printer = null;

        try {
            // Check if the name is already in use.
            $printer = $this->getPrinter($params['name']);
        } catch (Exception $e) {
            // Nothing.
        }

        if ($printer) {
            throw new Exception(sprintf('A printer with the name "%s" already exists.', $params['name']));
        }

        if (empty($params['location'])) {
            $params['location'] = '';
        }

        $this->runCupsCommand(
            'addPrinter',
            $params['name'],
            $params['ppd'],
            $params['description'],
            $params['location'],
            $params['device']
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.printername');

        $this->runCupsCommand('deletePrinter', $params['pname']);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.printername');

        $this->runCupsCommand('printTestPage', $params['pname']);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.printername');

        $this->runCupsCommand('resumePrinting', $params['pname']);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.printername');

        $this->runCupsCommand('pausePrinting', $params['pname']);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);

        return $this->runCupsCommand('getMakesModels');
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);

        $object = $this->database->get($this->dataModelPath);
        $arg = $object->get('remote_printers') ? '--network' : '--no-network';

        return $this->runCupsCommand('findDirectPrinters', $arg);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.getjobs');

        // Default to showing only not completed jobs.
        if (!isset($params['which'])) {
            $params['which'] = 'not-completed';
        }

        try {
            $jobs = $this->runCupsCommand('getJobs', $params['which']);
        } catch (Exception $e) {
            $jobs = [];
        }

        return $this->applyFilter(
            $jobs,
            $params['start'],
            $params['limit'],
            $params['sortfield'],
            $params['sortdir']
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.canceljob');

        $this->runCupsCommand('cancelJob', $params['jobid']);
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
        $this->validateMethodContext($context, ['role' => OMV_ROLE_ADMINISTRATOR]);
        $this->validateMethodParams($params, 'rpc.cups.printername');

        $this->runCupsCommand('cancelAllJobs', $params['pname']);
    }

    /**
     * Generate Avahi service definitions for each printer.
     *
     * @return void
     */
    private function regenerateServiceDefinitions()
    {
        $cmd = new Process('omv-cups-avahi');
        $cmd->setRedirect2to1();
        $cmd->execute();
    }

    /**
     * Run a CUPS command and return the result.
     *
     * @param string $command The command to run.
     * @param string ...$args The arguments.
     *
     * @return array|object
     */
    private function runCupsCommand($command, ...$args)
    {
        $escapedArgs = [];
        $escapedArgs[] = escapeshellarg($command);

        foreach ($args as $arg) {
            $escapedArgs[] = escapeshellarg($arg);
        }

        $cmd = new Process('omv-cups', $escapedArgs);
        $cmd->setRedirect2to1();
        $cmd->execute($output);

        $data = json_decode(implode('', $output), true);

        if (!empty($data['error'])) {
            throw new Exception($data['error']);
        }

        return $data;
    }
}
