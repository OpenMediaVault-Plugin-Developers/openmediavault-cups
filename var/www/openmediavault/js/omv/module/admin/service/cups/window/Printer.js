/**
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

// require("js/omv/WorkspaceManager.js")
// require("js/omv/workspace/window/Form.js")
// require("js/omv/workspace/window/plugin/ConfigObject.js")

Ext.define("OMV.module.admin.service.cups.window.Printer", {
    extend : "OMV.workspace.window.Form",
    uses   : [
        "OMV.workspace.window.plugin.ConfigObject"
    ],

    plugins : [{
        ptype : "configobject"
    }],

    rpcService      : "Cups",
    rpcGetMethod    : "getPrinter",
    rpcSetMethod    : "setPrinter",
    width           : 500,
    height          : 200,
    hideResetButton : true,
    uuid            : null,

    getFormItems : function () {
        return [
            {
                xtype      : "textfield",
                name       : "uuid",
                fieldLabel : _("Name"),
                readOnly   : true
            },
            {
                xtype      : "textfield",
                name       : "PrinterInfo",
                fieldLabel : _("Description"),
                plugins    : [{
                    ptype : "fieldinfo",
                    text  : _('Human-readable description such as "HP LaserJet with Duplexer"'),
                }],
                allowBlank : false
            },
            {
                xtype      : "textfield",
                name       : "PrinterLocation",
                fieldLabel : "Location",
                plugins    : [{
                    ptype : "fieldinfo",
                    text  : _('Human-readable location such as "Lab 1"')
                }]
            }
        ];
    }
});
