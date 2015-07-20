/**
 * Copyright (C) 2013-2015 OpenMediaVault Plugin Developers
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// require("js/omv/Rpc.js")
// require("js/omv/window/Window.js")
// require("js/omv/window/MessageBox.js")
// require("js/omv/module/admin/service/cups/window/Wizard.js")

Ext.define("OMV.module.admin.service.cups.window.PrinterWizard", {
    extend: "OMV.module.admin.service.cups.window.Wizard",
    requires: [
        "OMV.Rpc"
    ],

    title: _("Add printer"),
    height: 360,

    rpcService: "Cups",
    rpcSetMethod: "addPrinter",

    getCardItems: function() {
        return [{
            xtype: "panel",
            items: [{
                html: "<h1>" + _("Printer Hardware") + "</h1>",
                border: false
            }, {
                border: false,
                html: "<p>" +
                    _("If your printer is not listed here, try Make: Generic, Model: Generic Postscript Printer. If there is more than one driver for your make / model choose one that is labeled (recommended) if available, or experiment to find the driver that works best for you.") +
                    "</p>"
            }, {
                xtype: "fieldset",
                layout: "fit",
                title: _("Printer"),
                border: false,
                items: [{
                    xtype: "combo",
                    name: "device",
                    hideFieldLabel: "true",
                    valueField: "uuid",
                    displayField: "DeviceInfo",
                    emptyText: _("Select a printer ..."),
                    allowBlank: false,
                    allowNone: false,
                    editable: false,
                    triggerAction: "all",
                    queryMode: "local",
                    store: Ext.create("OMV.data.Store", {
                        autoLoad: true,
                        model: OMV.data.Model.createImplicit({
                            idProperty: "uuid",
                            fields: [{
                                name: "uuid"
                            }, {
                                name: "DeviceInfo"
                            }]
                        }),
                        proxy: {
                            type: "rpc",
                            rpcData: {
                                service: "Cups",
                                method: "findDirectPrinters"
                            },
                            appendSortParams: false
                        },
                        listeners: {
                            beforeload: function() {
                                OMV.MessageBox.wait(null, _("Scanning for attached printers ..."));
                            },
                            load: function(store, records) {
                                OMV.MessageBox.updateProgress(1);
                                OMV.MessageBox.hide();

                                if (!records.length) {
                                    OMV.MessageBox.error(null, _("No printers found."));
                                    return;
                                }
                            },
                            scope: this
                        }
                    }),
                    listeners: {
                        scope: this,
                        select: function(combo, record) {
                            var deviceInfo = record.get("DeviceInfo");
                            var nameField = this.findField("name");
                            var descriptionField = this.findField("description");

                            nameField.setValue(deviceInfo.replace(/[\s|#|\/]/g, "_"));
                            descriptionField.setValue(deviceInfo);

                            var makeCombo = this.findField("make");
                            makeCombo.enable();
                        }
                    }
                }]
            }, {
                xtype: "fieldset",
                layout: "fit",
                title: _("Make"),
                border: false,
                items: [{
                    xtype: "combo",
                    name: "make",
                    hideFieldLabel: "true",
                    valueField: "make",
                    displayField: "make",
                    submitValue: false,
                    emptyText: _("Select a make ..."),
                    allowBlank: false,
                    allowNone: false,
                    editable: false,
                    triggerAction: "all",
                    disabled: true,
                    queryMode: "local",
                    store: Ext.create("OMV.data.Store", {
                        autoLoad: true,
                        model: OMV.data.Model.createImplicit({
                            idProperty: "make",
                            fields: [{
                                name: "make"
                            }, {
                                name: "models"
                            }]
                        }),
                        proxy: {
                            type: "rpc",
                            rpcData: {
                                service: "Cups",
                                method: "getMakesModels"
                            },
                            appendSortParams: false
                        }
                    }),
                    listeners: {
                        scope: this,
                        select: function(combo, record) {
                            var modelCombo = this.findField("ppd");
                            var modelStore = modelCombo.getStore();

                            modelStore.removeAll();

                            Ext.each(record.get("models"), function(model) {
                                modelStore.add(modelStore.model.create(model));
                            });

                            modelCombo.enable();
                            modelCombo.setValue(null);
                        }
                    }
                }]
            }, {
                xtype: "fieldset",
                layout: "fit",
                title: _("Model / Driver"),
                border: false,
                items: [{
                    xtype: "combo",
                    name: "ppd",
                    hideFieldLabel: "true",
                    valueField: "uuid",
                    displayField: "PpdMakeAndModel",
                    emptyText: _("Select a model ..."),
                    allowBlank: false,
                    allowNone: false,
                    editable: false,
                    triggerAction: "all",
                    disabled: true,
                    queryMode: "local",
                    autoLoad: false,
                    store: Ext.create("Ext.data.SimpleStore", {
                        fields: [{
                            name: "uuid"
                        }, {
                            name: "PpdMakeAndModel"
                        }]
                    })
                }]
            }]
        }, {
            xtype: "panel",
            items: [{
                html: "<h1>" + _("Printer Description") + "</h1>",
                border: false
            }, {
                xtype: "fieldset",
                layout: "form",
                border: false,
                defaults: {
                    anchor: "100%"
                },
                items: [{
                    xtype: "textfield",
                    name: "name",
                    fieldLabel: _("Name"),
                    plugins: [{
                        ptype: "fieldinfo",
                        text: _("May contain any printable characters except \"/\", \"#\" and space.")
                    }],
                    vtype: "printername",
                    allowBlank: false
                }, {
                    xtype: "textfield",
                    name: "description",
                    fieldLabel: _("Description"),
                    plugins: [{
                        ptype: "fieldinfo",
                        text: _("Human-readable description such as 'HP LaserJet with Duplexer'.")
                    }],
                    allowBlank: false
                }, {
                    xtype: "textfield",
                    name: "location",
                    fieldLabel: _("Location"),
                    plugins: [{
                        ptype: "fieldinfo",
                        text: _("Human-readable location such as 'Lab 1'.")
                    }]
                }]
            }]
        }];
    }
});

// Printer name validation.
Ext.apply(Ext.form.VTypes, {
    printername: function(value) {
        return (/^[^\s|#|\\]+$/).test(value);
    },
    printernameText: _("Invalid printer name."),
    printernameMask: /[^\s|#|\\]/
});
