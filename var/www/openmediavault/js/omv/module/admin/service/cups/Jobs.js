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
// require("js/omv/data/Store.js")
// require("js/omv/data/Model.js")
// require("js/omv/data/proxy/Rpc.js")

Ext.define("OMV.module.admin.service.cups.Jobs", {
    extend: "OMV.workspace.grid.Panel",
    requires: [
        "OMV.data.Store",
        "OMV.data.Model",
        "OMV.data.proxy.Rpc"
    ],

    hideAddButton: true,
    hideEditButton: true,
    hideDeleteButton: true,
    hideRefreshButton: false,
    hidePagingToolbar: false,
    reloadOnActivate: true,
    rememberSelected: false,

    columns: [{
        header: _("Job Id"),
        sortable: true,
        dataIndex: "JobId",
        width: 60,
        renderer: function(value, metaData, record) {
            return record.get("PrinterUri").replace(/.*\//, "") + " " + value;
        }
    }, {
        header: _("Created"),
        sortable: true,
        dataIndex: "TimeAtCreation",
        flex: 1,
        renderer: function(value) {
            var myTime = new Date();
            myTime.setTime(value * 1000);
            return myTime.toLocaleString();
        }
    }, {
        header: _("Name"),
        sortable: true,
        dataIndex: "JobName",
        flex: 1
    }, {
        header: _("User"),
        sortable: true,
        dataIndex: "JobOriginatingUserName",
        width: 80,
        renderer: function(value, metaData, record) {
            return value + "@" + record.get("JobOriginatingHostName");
        }
    }, {
        header: _("Size"),
        sortable: true,
        dataIndex: "JobKOctets",
        width: 60,
        renderer: function(value) {
            return value + "k";
        }
    }, {
        header: _("Pages"),
        sortable: true,
        dataIndex: "JobMediaSheetsCompleted",
        width: 60,
        renderer: function(value) {
            return (value ? value : "Unknown");
        }
    }, {
        header: _("State"),
        sortable: true,
        dataIndex: "JobState",
        flex: 1,
        renderer: function(value, metaData, record) {
            // IPP_JOB_ABORTED = 8
            // IPP_JOB_CANCELED = 7
            // IPP_JOB_COMPLETED = 9
            // IPP_JOB_HELD = 4
            // IPP_JOB_PENDING = 3
            // IPP_JOB_PROCESSING = 5
            // IPP_JOB_STOPPED = 6
            switch (parseInt(value, 10)) {
                case 8:
                    return _("Aborted");
                case 7:
                    return _("Canceled");
                case 9:
                    var myTime = new Date();
                    myTime.setTime(record.get("TimeAtCompleted") * 1000);
                    return _("Completed") + " " + myTime.toLocaleString();
                case 4:
                    return _("Held");
                case 3:
                    return _("Pending");
                case 5:
                    return _("Processing");
                case 6:
                    return _("Stopped");
            }

            return _("Unknown") + " (" + value + ")";
        }
    }],

    initComponent: function() {
        Ext.apply(this, {
            store: Ext.create("OMV.data.Store", {
                autoLoad: true,
                model: OMV.data.Model.createImplicit({
                    idProperty: "JobId",
                    fields: [{
                        name: "JobId"
                    }, {
                        name: "JobName"
                    }, {
                        name: "JobOriginatingUserName"
                    }, {
                        name: "JobOriginatingHostName"
                    }, {
                        name: "JobKOctets"
                    }, {
                        name: "TimeAtCompleted"
                    }, {
                        name: "TimeAtCreation"
                    }, {
                        name: "JobMediaSheetsCompleted"
                    }, {
                        name: "JobState"
                    }, {
                        name: "PrinterUri"
                    }]
                }),
                proxy: {
                    type: "rpc",
                    rpcData: {
                        service: "Cups",
                        method: "getJobs"
                    },
                    extraParams: {
                        which: "not-completed"
                    }
                },
                remoteSort: true,
                sorters: [{
                    direction: "DESC",
                    property: "JobId"
                }]
            })
        });

        this.callParent(arguments);
    },

    getTopToolbarItems: function() {
        var items = this.callParent(arguments);

        Ext.Array.push(items, [{
            id: this.getId() + "-cancel",
            xtype: "button",
            text: _("Cancel job"),
            icon: "images/erase.png",
            iconCls: Ext.baseCSSPrefix + "btn-icon-16x16",
            handler: Ext.Function.bind(this.onCancelButton, this),
            scope: this,
            disabled: true,
            selectionConfig: {
                minSelections: 1,
                maxSelections: 1,
                enabledFn: function(button, records) {
                    var record = records[0];
                    var state = record.get("JobState");

                    if (state >= 3 && state <= 5) {
                        return true;
                    }

                    return false;
                }
            }
        }, {
            xtype: "tbseparator"
        }, {
            xtype: "tbspacer",
            width: 20
        }, {
            xtype: "label",
            text: _("Show") + ": "
        }, {
            xtype: "tbspacer",
            width: 5
        }, {
            xtype: "combo",
            name: "statusfilter",
            queryMode: "local",
            store: Ext.create("Ext.data.ArrayStore", {
                fields: [
                    "value",
                    "text"
                ],
                data: [
                    ["all", _("All")],
                    ["not-completed", _("Active")],
                    ["completed", _("Completed")]
                ]
            }),
            displayField: "text",
            valueField: "value",
            editable: false,
            triggerAction: "all",
            value: "not-completed",
            listeners: {
                select: function(combo) {
                    var store = this.getStore();
                    var value = combo.getValue();

                    store.setProxy({
                        type: "rpc",
                        rpcData: {
                            service: "Cups",
                            method: "getJobs"
                        },
                        extraParams: {
                            which: value
                        }
                    });

                    this.doReload();
                },
                scope: this
            }
        }]);

        return items;
    },

    onCancelButton: function() {
        var record = this.getSelected();

        this.doCancel(record.get("JobId"));
    },

    doCancel: function(jobId) {
        Ext.MessageBox.show({
            title: _("Confirmation"),
            msg: _("Are you sure you want to cancel the selected printing job?"),
            buttons: Ext.MessageBox.YESNO,
            fn: function(answer) {
                if (answer == "no") {
                    return;
                }

                // Display waiting dialog
                OMV.MessageBox.wait(null, _("Cancelling job ..."));

                OMV.Rpc.request({
                    scope: this,
                    callback: onCancel,
                    rpcData: {
                        service: "Cups",
                        method: "cancelJob",
                        params: {
                            jobid: jobId
                        }
                    }
                });
            },
            scope: this,
            icon: Ext.MessageBox.QUESTION
        });
    },

    onCancel: function(id, success, response) {
        OMV.MessageBox.updateProgress(1);
        OMV.MessageBox.hide();

        if (error === null) {
            this.doReload();
        } else {
            OMV.MessageBox.error(null, error);
        }
    }
});

OMV.WorkspaceManager.registerPanel({
    id: "jobs",
    path: "/service/cups",
    text: _("Jobs"),
    position: 30,
    className: "OMV.module.admin.service.cups.Jobs"
});
