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

// require("js/omv/WorkspaceManager.js")
// require("js/omv/workspace/grid/Panel.js")
// require("js/omv/module/admin/service/cups/stores/PrinterStore.js")
// require("js/omv/module/admin/service/cups/window/PrinterWizard.js")
// require("js/omv/module/admin/service/cups/window/Printer.js")

Ext.define("OMV.module.admin.service.cups.Printers", {
    extend : "OMV.workspace.grid.Panel",
    requires : [
        "OMV.module.admin.service.cups.stores.PrinterStore",
        "OMV.module.admin.service.cups.window.PrinterWizard",
        "OMV.module.admin.service.cups.window.Printer"
    ],

    hideRefreshButton : false,
    reloadOnActivate  : true,
    rememberSelected  : false,

    columns : [{
        header    : _("Printer / Queue Name"),
        dataIndex : "uuid",
        flex      : 1
    },{
        header    : _("Description"),
        dataIndex : "PrinterInfo",
        flex      : 1
    },{
        header    : _("Location"),
        dataIndex : "PrinterLocation",
        flex      : 1
    },{
        header    : _("Make and Model / Driver"),
        dataIndex : "PrinterMakeAndModel",
        flex      : 1
    },{
        header    : _("Status"),
        width     : 300,
        dataIndex : "PrinterState",
        renderer  : function (value, row, record) {
            switch (parseInt(value, 10)) {
                case 3:
                    value = _("Idle");
                    break;
                case 4:
                    value = _("Processing");
                    break;
                case 5:
                    value = _("Paused");
                    break;
                default:
                    value = _("Unknown");
                    break;
            }

            var message = record.get("PrinterStateMessage");

            if (message)
                value += " (" + message + ")";

            return value;
        }
    }],

    store : OMV.module.admin.service.cups.stores.PrinterStore,

    getTopToolbarItems : function() {
        var me = this;
        var items = me.callParent(arguments);

        Ext.Array.push(items, [{
            xtype : "tbseparator"
        },{
            id       : me.getId() + "-resume",
            xtype    : "button",
            text     : _("Resume printing"),
            icon     : "images/play.png",
            iconCls  : Ext.baseCSSPrefix + "btn-icon-16x16",
            handler  : Ext.Function.bind(me.onResumePrintingButton, me, [ me ]),
            scope    : me,
            disabled : true,
            selectionChangeConfig : {
                minSelection : 1,
                maxSelection : 1,
                enableFn     : function(button, records) {
                    var record = records[0];
                    var state = record.get("PrinterState");

                    if (record.get("PrinterState") !== 5) {
                        return false;
                    }

                    return true;
                }
            }
        },{
            id       : me.getId() + "-pause",
            xtype    : "button",
            text     : _("Pause printing"),
            icon     : "images/pause.png",
            iconCls  : Ext.baseCSSPrefix + "btn-icon-16x16",
            handler  : Ext.Function.bind(me.onPausePrintingButton, me, [ me ]),
            scope    : me,
            disabled : true,
            selectionChangeConfig : {
                minSelection : 1,
                maxSelection : 1,
                enableFn     : function(button, records) {
                    var record = records[0];
                    var state = record.get("PrinterState");

                    if (record.get("PrinterState") === 5) {
                        return false;
                    }

                    return true;
                }
            }
        },{
            xtype : "tbseparator"
        },{
            id       : me.getId() + "-test",
            xtype    : "button",
            text     : _("Print test page"),
            icon     : "images/cups.png",
            iconCls  : Ext.baseCSSPrefix + "btn-icon-16x16",
            handler  : Ext.Function.bind(me.onPrintTestPageButton, me, [ me ]),
            scope    : me,
            disabled : true,
            selectionChangeConfig : {
                minSelection : 1,
                maxSelection : 1
            }
        },{
            id       : me.getId() + "-cancel",
            xtype    : "button",
            text     : _("Cancel jobs"),
            icon     : "images/erase.png",
            iconCls  : Ext.baseCSSPrefix + "btn-icon-16x16",
            handler  : Ext.Function.bind(me.onCancelJobsButton, me, [ me ]),
            scope    : me,
            disabled : true,
            selectionChangeConfig : {
                minSelection : 1,
                maxSelection : 1
            }
        },{
            xtype : "tbseparator"
        },{
            text    : _("Advanced management"),
            icon    : "images/preferences.png",
            iconCls : Ext.baseCSSPrefix + "btn-icon-16x16",
            handler : function() {
                var href = Ext.String.format("http://{0}:631", location.hostname);
                window.open(href, "_blank");
            }
        }]);

        return items;
    },

    onAddButton : function() {
        var me = this;

        Ext.create("OMV.module.admin.service.cups.window.PrinterWizard", {
            listeners    : {
                scope  : me,
                submit : function() {
                    me.doReload();
                }
            }
        }).show();
    },

    onEditButton : function() {
        var me = this;
        var record = me.getSelected();

        Ext.create("OMV.module.admin.service.cups.window.Printer", {
            title     : _("Edit printer"),
            uuid      : record.get("uuid"),
            listeners : {
                scope  : me,
                submit : function() {
                    me.doReload();
                }
            }
        }).show();
    },

    doDeletion : function(record) {
        var me = this;

        OMV.Rpc.request({
            scope : me,
            callback : me.onDeletion,
            rpcData : {
                service : "Cups",
                method  : "deletePrinter",
                params  : {
                    pname : record.get("uuid")
                }
            }
        });
    },

    onResumePrintingButton : function() {
        var me = this;
        var record = me.getSelected();

        me.doResumePrinting(record);
    },

    doResumePrinting : function(record) {
        var me = this;

        OMV.MessageBox.wait(null, _("Resuming printer ..."));

        OMV.Rpc.request({
            scope : me,
            callback : me.onDone,
            rpcData : {
                service : "Cups",
                method  : "resumePrinting",
                params  : {
                    pname : record.get("uuid")
                }
            }
        });
    },

    onPausePrintingButton : function() {
        var me     = this,
            record = me.getSelected();

        me.doPausePrinting(record);
    },

    doPausePrinting : function(record) {
        var me = this;

        OMV.MessageBox.wait(null, _("Pausing printer ..."));

        OMV.Rpc.request({
            scope : me,
            callback : me.onDone,
            rpcData : {
                service : "Cups",
                method  : "pausePrinting",
                params  : {
                    pname : record.get("uuid")
                }
            }
        });
    },

    onPrintTestPageButton : function() {
        var me     = this,
            record = me.getSelected();

        me.doPrintTestPage(record);
    },

    doPrintTestPage : function(record) {
        var me = this;

        OMV.MessageBox.wait(null, _("Printing test page ..."));

        OMV.Rpc.request({
            scope : me,
            callback : me.onDone,
            rpcData : {
                service : "Cups",
                method  : "printTestPage",
                params  : {
                    pname : record.get("uuid")
                }
            }
        });
    },

    onCancelJobsButton : function() {
        var me     = this,
            record = me.getSelected();

        me.doCancelJobs(record);
    },

    doCancelJobs : function(record) {
        var me = this;
        var printerName = record.get("uuid");

        Ext.MessageBox.show({
            title   : _("Confirmation"),
            msg     : _("Are you sure you want to cancel all printing jobs on") + " " + printerName + "?",
            buttons : Ext.MessageBox.YESNO,
            fn      : function(answer) {
                if (answer == "no")
                    return;

                OMV.MessageBox.wait(null, _("Cancelling job ..."));

                OMV.Rpc.request({
                    scope : me,
                    callback : me.onDone,
                    rpcData : {
                        service : "Cups",
                        method  : "cancelJobs",
                        params  : {
                            pname : printerName
                        }
                    }
                });
            },
            scope : me,
            icon  : Ext.MessageBox.QUESTION
        });
    },

    onDone : function(id, success, response) {
        var me = this;

        OMV.MessageBox.updateProgress(1);
        OMV.MessageBox.hide();

        if (success) {
            me.doReload();
        } else {
            OMV.MessageBox.error(null, response);
        }
    }
});

OMV.WorkspaceManager.registerPanel({
    id        : "printers",
    path      : "/service/cups",
    text      : _("Printers"),
    position  : 20,
    className : "OMV.module.admin.service.cups.Printers"
});
