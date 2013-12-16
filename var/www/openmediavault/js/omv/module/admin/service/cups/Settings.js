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

// require("js/omv/WorkspaceManager.js")
// require("js/omv/workspace/form/Panel.js")

Ext.define("OMV.module.admin.service.cups.Settings", {
    extend : "OMV.workspace.form.Panel",

    rpcService   : "Cups",
    rpcGetMethod : "getSettings",
    rpcSetMethod : "setSettings",

    initComponent : function() {
        var me = this;

        me.on('load', function () {
            var checked = me.findField('enable').checked;
            var parent = me.up('tabpanel');
            var panels = [
                _("Printers"),
                _("Jobs"),
                _("Printer sharing")
            ];

            if (!parent)
                return;

            Ext.Array.each(panels, function(title) {
                var panel = parent.down('panel[title=' + title + ']');

                if (panel)
                    checked ? panel.enable() : panel.disable();
            });
        });

        me.callParent(arguments);
    },

    getFormItems : function() {
        return [{
            xtype    : "fieldset",
            title    : _("General Settings"),
            defaults : {
                labelSeparator : ""
            },
            items : [{
                xtype      : "checkbox",
                name       : "enable",
                fieldLabel : _("Enable"),
                checked    : false
            },{
                xtype         : "numberfield",
                name          : "maxjobs",
                fieldLabel    : _("Max Jobs"),
                minValue      : 0,
                maxValue      : 65535,
                value         : 100,
                width         : 70,
                allowDecimals : false,
                allowNegative : false,
                plugins    : [{
                    ptype : "fieldinfo",
                    text  : _("Once the number of print jobs reaches the limit, the oldest completed job is automatically purged from the system to make room for the new one. If all of the known jobs are still pending or active then the new job will be rejected.")
                }]
            },{
                xtype      : "checkbox",
                name       : "enable_samba",
                fieldLabel : _("Enable SMB Sharing"),
                boxLabel   : _("Enable sharing of printers over OpenMediaVault's SMB/CIFS service."),
                checked    : true
            },{
                xtype      : "checkbox",
                name       : "airprint",
                fieldLabel : _("Enable AirPrint"),
                boxLabel   : _("<i>Experimental</i>. Provides 'AirPrint' compatibility with Apple iOS devices."),
                checked    : false
            },{
                xtype      : "checkbox",
                name       : "remote_printers",
                fieldLabel : _("Remote printers"),
                boxLabel   : _("Enables listing of remote printers when adding a printer."),
                checked    : false
            },{
                border : false,
                html   : "<p>"
                       + _("Users in the <b>lpadmin</b> OpenMediaVault group will be able to administer printers using their OpenMediaVault username / password.")
                       + "</p>"
            }]
        }];
    }
});

OMV.WorkspaceManager.registerPanel({
    id        : "settings",
    path      : "/service/cups",
    text      : _("Settings"),
    position  : 10,
    className : "OMV.module.admin.service.cups.Settings"
});
