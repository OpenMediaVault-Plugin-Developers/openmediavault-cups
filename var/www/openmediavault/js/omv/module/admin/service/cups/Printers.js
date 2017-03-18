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

// require("js/omv/WorkspaceManager.js")
// require("js/omv/workspace/grid/Panel.js")
// require("js/omv/module/admin/service/cups/stores/PrinterStore.js")
// require("js/omv/module/admin/service/cups/window/PrinterWizard.js")
// require("js/omv/module/admin/service/cups/window/Printer.js")

Ext.define('OMV.module.admin.service.cups.Printers', {
    extend: 'OMV.workspace.grid.Panel',
    requires: [
        'OMV.module.admin.service.cups.stores.PrinterStore',
        'OMV.module.admin.service.cups.window.PrinterWizard',
        'OMV.module.admin.service.cups.window.Printer'
    ],

    hideRefreshButton: false,
    reloadOnActivate: true,
    rememberSelected: false,

    columns: [{
        xtype: "textcolumn",
        header: _('Printer / Queue Name'),
        dataIndex: 'uuid',
        flex: 1
    }, {
        xtype: "textcolumn",
        header: _('Description'),
        dataIndex: 'PrinterInfo',
        flex: 1
    }, {
        xtype: "textcolumn",
        header: _('Location'),
        dataIndex: 'PrinterLocation',
        flex: 1
    }, {
        xtype: "textcolumn",
        header: _('Make and Model / Driver'),
        dataIndex: 'PrinterMakeAndModel',
        flex: 1
    }, {
        xtype: "textcolumn",
        header: _('Status'),
        width: 300,
        dataIndex: 'PrinterState',
        renderer: function(value, row, record) {
            switch (parseInt(value, 10)) {
                case 3:
                    value = _('Idle');
                    break;
                case 4:
                    value = _('Processing');
                    break;
                case 5:
                    value = _('Paused');
                    break;
                default:
                    value = _('Unknown');
                    break;
            }

            var message = record.get('PrinterStateMessage');

            if (message)
                value += ' (' + message + ')';

            return value;
        }
    }],

    store: OMV.module.admin.service.cups.stores.PrinterStore,

    getTopToolbarItems: function() {
        var items = this.callParent(arguments);

        Ext.Array.push(items, [{
            xtype: 'tbseparator'
        }, {
            id: this.getId() + '-resume',
            xtype: 'button',
            text: _('Resume printing'),
            icon: 'images/play.png',
            iconCls: Ext.baseCSSPrefix + 'btn-icon-16x16',
            handler: Ext.Function.bind(this.onResumePrintingButton, this),
            scope: this,
            disabled: true,
            selectionConfig: {
                minSelections: 1,
                maxSelections: 1,
                enabledFn: function(button, records) {
                    var record = records[0];
                    var state = record.get('PrinterState');

                    if (record.get('PrinterState') !== 5) {
                        return false;
                    }

                    return true;
                }
            }
        }, {
            id: this.getId() + '-pause',
            xtype: 'button',
            text: _('Pause printing'),
            icon: 'images/pause.png',
            iconCls: Ext.baseCSSPrefix + 'btn-icon-16x16',
            handler: Ext.Function.bind(this.onPausePrintingButton, this),
            scope: this,
            disabled: true,
            selectionConfig: {
                minSelections: 1,
                maxSelections: 1,
                enabledFn: function(button, records) {
                    var record = records[0];
                    var state = record.get('PrinterState');

                    if (record.get('PrinterState') === 5) {
                        return false;
                    }

                    return true;
                }
            }
        }, {
            xtype: 'tbseparator'
        }, {
            id: this.getId() + '-test',
            xtype: 'button',
            text: _('Print test page'),
            icon: 'images/cups.png',
            iconCls: Ext.baseCSSPrefix + 'btn-icon-16x16',
            handler: Ext.Function.bind(this.onPrintTestPageButton, this),
            scope: this,
            disabled: true,
            selectionConfig: {
                minSelections: 1,
                maxSelections: 1
            }
        }, {
            id: this.getId() + '-cancel',
            xtype: 'button',
            text: _('Cancel jobs'),
            icon: 'images/erase.png',
            iconCls: Ext.baseCSSPrefix + 'btn-icon-16x16',
            handler: Ext.Function.bind(this.onCancelJobsButton, this),
            scope: this,
            disabled: true,
            selectionConfig: {
                minSelections: 1,
                maxSelections: 1
            }
        }, {
            xtype: 'tbseparator'
        }, {
            text: _('Advanced management'),
            icon: 'images/preferences.png',
            iconCls: Ext.baseCSSPrefix + 'btn-icon-16x16',
            handler: function() {
                var href = Ext.String.format('http://{0}:631', location.hostname);
                window.open(href, '_blank');
            }
        }]);

        return items;
    },

    onAddButton: function() {
        Ext.create('OMV.module.admin.service.cups.window.PrinterWizard', {
            listeners: {
                scope: this,
                submit: function() {
                    this.doReload();
                }
            }
        }).show();
    },

    onEditButton: function() {
        var record = this.getSelected();

        Ext.create('OMV.module.admin.service.cups.window.Printer', {
            title: _('Edit printer'),
            uuid: record.get('uuid'),
            listeners: {
                scope: this,
                submit: function() {
                    this.doReload();
                }
            }
        }).show();
    },

    doDeletion: function(record) {
        OMV.Rpc.request({
            scope: this,
            callback: this.onDeletion,
            rpcData: {
                service: 'Cups',
                method: 'deletePrinter',
                params: {
                    pname: record.get('uuid')
                }
            }
        });
    },

    onResumePrintingButton: function() {
        var record = this.getSelected();

        this.doResumePrinting(record);
    },

    doResumePrinting: function(record) {
        OMV.MessageBox.wait(null, _('Resuming printer ...'));

        OMV.Rpc.request({
            scope: this,
            callback: this.onDone,
            rpcData: {
                service: 'Cups',
                method: 'resumePrinting',
                params: {
                    pname: record.get('uuid')
                }
            }
        });
    },

    onPausePrintingButton: function() {
        var record = this.getSelected();

        this.doPausePrinting(record);
    },

    doPausePrinting: function(record) {
        OMV.MessageBox.wait(null, _('Pausing printer ...'));

        OMV.Rpc.request({
            scope: this,
            callback: this.onDone,
            rpcData: {
                service: 'Cups',
                method: 'pausePrinting',
                params: {
                    pname: record.get('uuid')
                }
            }
        });
    },

    onPrintTestPageButton: function() {
        var record = this.getSelected();

        this.doPrintTestPage(record);
    },

    doPrintTestPage: function(record) {
        OMV.MessageBox.wait(null, _('Printing test page ...'));

        OMV.Rpc.request({
            scope: this,
            callback: this.onDone,
            rpcData: {
                service: 'Cups',
                method: 'printTestPage',
                params: {
                    pname: record.get('uuid')
                }
            }
        });
    },

    onCancelJobsButton: function() {
        var record = this.getSelected();

        this.doCancelJobs(record);
    },

    doCancelJobs: function(record) {
        var printerName = record.get('uuid');

        Ext.MessageBox.show({
            title: _('Confirmation'),
            msg: _('Are you sure you want to cancel all printing jobs on') + ' ' + printerName + '?',
            buttons: Ext.MessageBox.YESNO,
            fn: function(answer) {
                if (answer == 'no') {
                    return;
                }

                OMV.MessageBox.wait(null, _('Cancelling job ...'));

                OMV.Rpc.request({
                    scope: this,
                    callback: this.onDone,
                    rpcData: {
                        service: 'Cups',
                        method: 'cancelJobs',
                        params: {
                            pname: printerName
                        }
                    }
                });
            },
            scope: this,
            icon: Ext.MessageBox.QUESTION
        });
    },

    onDone: function(id, success, response) {
        OMV.MessageBox.updateProgress(1);
        OMV.MessageBox.hide();

        if (success) {
            this.doReload();
        } else {
            OMV.MessageBox.error(null, response);
        }
    }
});

OMV.WorkspaceManager.registerPanel({
    id: 'printers',
    path: '/service/cups',
    text: _('Printers'),
    position: 20,
    className: 'OMV.module.admin.service.cups.Printers'
});
