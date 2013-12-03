<?php
/**
 *
 * @license   http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author    Aaron Murray <aaron@omv-extras.org>
 * @copyright Copyright (c) 2013 Aaron Murray
 *
 * OpenMediaVault is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * OpenMediaVault is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with OpenMediaVault. If not, see <http://www.gnu.org/licenses/>.
 */
require_once("openmediavault/module.inc");
require_once("openmediavault/config.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/initscript.inc");
require_once("openmediavault/log.inc");

class OMVModuleCups extends OMVModuleServiceAbstract
  implements OMVINotifyListener, OMVIModuleServiceStatus {
    /**
     * Get the module name.
     */
    public function getName() {
        return "cups";
    }

  /**
     * Get the status of the managed service.
     */
    public function getStatus() {
        global $xmlConfig;
        // Get the configuration object
        $xpath  = "//services/cups";
        $object = $xmlConfig->get($xpath);
        if (is_null($object)) {
            throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
        }
        $initd = new OMVSysVInitScript("cups");
        return array(
            "name"    => $this->getName(),
            "title"   => gettext("Printing (cups)"),
            "enabled" => boolval($object['enable']),
            "running" => ($initd->status() == 0)
        );
    }


// Register module.
$moduleMgr = &OMVModuleMgr::getInstance();
$moduleMgr->registerModule(new OMVModuleCups());

// Register new logfile type
OMVLogFile::registerType("cupsaccess", array(
    "filename" => "access_log",
    "filepath" => "/var/log/cups/access_log",
    "regex"    => "/^(.*?)\s+[^\s]+\s+(.*?)\s+\[(.+?)\s+.*?\]\s+(.*)$/",
    "columns"  => array(
             "host"  => 1,
             "user"  => 2,
             "date"  => array(
                 "index" => 3,
                 "func"  => create_function('$v', 'return strpdate($v,"j/M/Y:G:i:s");')
             ),
             "event" => 4
         )
    )
);

// Register new logfile type
OMVLogFile::registerType("cupserror", array(
    "filename" => "error_log",
    "filepath" => "/var/log/cups/error_log",
    "regex"    => "/^(.)\s+\[(.+?)\s+.*?\]\s+(.*)$/",
    "columns"  => array(
             "severity" => 1,
             "date"     => array(
                 "index" => 2,
                 "func"  => create_function('$v', 'return strpdate($v,"j/M/Y:G:i:s");')
             ),
             "event"    => 3
         )
    )
);
?>
