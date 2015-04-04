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

Ext.define("OMV.module.admin.service.cups.window.Wizard", {
    extend: "OMV.window.Window",
    requires: [
        "OMV.Rpc"
    ],
    uses: [
        "OMV.window.MessageBox"
    ],

    title: _("Wizard"),
    itemId: "wizard",
    layout: "fit",
    width: 500,
    height: 320,
    submitMsg: _("Saving ..."),
    mode: "remote",

    defaults: {
        border: false
    },

    constructor: function(config) {
        this.callParent(arguments);
        this.addEvents(
            "beforesubmit",
            "submit",
            "exception"
        );
    },

    initComponent: function() {
        Ext.apply(this, {
            items: [{
                xtype: "form",
                itemId: "wizard-form",
                layout: "card",
                defaults: {
                    border: false,
                    bodyStyle: "padding: 10px;",
                    anchor: "100%"
                },
                bbar: this.getBbarItems(),
                items: this.getCardItems()
            }]
        });

        this.callParent(arguments);
    },

    navigate: function(button, direction) {
        var form = button.up("#wizard-form");
        var layout = form.getLayout();

        // Call isValid to validate fields.
        form.isValid();
        var isValid = true;
        var fields = layout.activeItem.query("field");

        for (var i = 0, j = fields.length; i < j; i++) {
            if (!fields[i].isValid()) {
                isValid = false;
                break;
            }
        }

        if (direction === "prev" || isValid)
            layout[direction]();

        var prev = form.down("#wizard-prev");
        var next = form.down("#wizard-next");
        var submit = form.down("#wizard-submit");

        prev.setDisabled(!layout.getPrev());
        next.setDisabled(!layout.getNext());

        if (!layout.getNext()) {
            next.hide();
            submit.show();
        } else {
            next.show();
            submit.hide();
        }
    },

    getBbarItems: function() {
        return [{
            itemId: "wizard-prev",
            text: _("Previous"),
            handler: function(button) {
                this.navigate(button, "prev");
            },
            scope: this,
            disabled: true
        }, "->", {
            itemId: "wizard-next",
            text: _("Next"),
            handler: function(button) {
                this.navigate(button, "next");
            },
            scope: this
        }, {
            itemId: "wizard-submit",
            text: _("Finish"),
            handler: function() {
                this.onFinishButton();
            },
            scope: this,
            hidden: true
        }, {
            itemId: "wizard-cancel",
            text: _("Cancel"),
            handler: function() {
                this.close();
            },
            scope: this
        }];
    },

    getCardItems: function() {
        return [];
    },

    getForm: function() {
        return this.down("#wizard-form").getForm();
    },

    getFormValues: function() {
        return this.getForm().getValues();
    },

    findField: function(id) {
        return this.getForm().findField(id);
    },

    onFinishButton: function() {
        var form = this.down("#wizard-form").getForm();

        if (form.isValid()) {
            this.doSubmit();
        }
    },

    doSubmit: function() {
        if (this.mode === "remote") {
            var rpcOptions = {
                scope: this,
                callback: this.onSubmit,
                relayErrors: true,
                rpcData: {
                    service: this.rpcService,
                    method: this.rpcSetMethod || "set",
                    params: this.getFormValues()
                }
            };

            if (this.fireEvent("beforesubmit", this, rpcOptions) === false) {
                return;
            }

            // Display waiting dialog.
            OMV.MessageBox.wait(null, this.submitMsg);

            // Execute RPC.
            OMV.Rpc.request(rpcOptions);
        } else {
            this.fireEvent("submit", this.this.getFormValues());
            this.close();
        }
    },

    onSubmit: function(id, success, response) {
        OMV.MessageBox.updateProgress(1);
        OMV.MessageBox.hide();

        if (success) {
            this.fireEvent("submit", this, this.getFormValues(), response);
            this.close();
        } else {
            this.fireEvent("exception", this, response);
            OMV.MessageBox.error(null, response);
        }
    }
});
