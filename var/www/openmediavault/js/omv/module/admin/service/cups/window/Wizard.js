/**
* Copyright (C) 2013-2014 OpenMediaVault Plugin Developers
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
    extend   : "OMV.window.Window",
    requires : [
        "OMV.Rpc"
    ],
    uses : [
        "OMV.window.MessageBox"
    ],

    title     : _("Wizard"),
    itemId    : "wizard",
    layout    : "fit",
    width     : 500,
    height    : 320,
    submitMsg : _("Saving ..."),
    mode      : "remote",

    defaults : {
        border : false
    },

    constructor : function(config) {
        var me = this;

        me.callParent(arguments);
        me.addEvents(
            "beforesubmit",
            "submit",
            "exception"
        );
    },

    initComponent : function() {
        var me = this;

        Ext.apply(me, {
            items : [{
                xtype    : "form",
                itemId   : "wizard-form",
                layout   : "card",
                defaults : {
                    border    : false,
                    bodyStyle : "padding: 10px;",
                    anchor    : "100%"
                },
                bbar  : me.getBbarItems(),
                items : me.getCardItems()
            }]
        });

        me.callParent(arguments);
    },

    navigate : function(button, direction) {
        var form   = button.up("#wizard-form");
        var layout = form.getLayout();

        // Call isValid to validate fields
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

        var prev   = form.down("#wizard-prev");
        var next   = form.down("#wizard-next");
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

    getBbarItems : function() {
        var me = this;

        return [{
            itemId   : "wizard-prev",
            text     : _("Previous"),
            handler  : function(button) {
                me.navigate(button, "prev");
            },
            disabled : true
        }, "->", {
            itemId  : "wizard-next",
            text    : _("Next"),
            handler : function(button) {
                me.navigate(button, "next");
            }
        },{
            itemId  : "wizard-submit",
            text    : _("Finish"),
            handler : function() {
                me.onFinishButton();
            },
            hidden  : true
        },{
            itemId  : "wizard-cancel",
            text    : _("Cancel"),
            handler : function() {
                me.close();
            }
        }];
    },

    getCardItems : function() {
        return [];
    },

    getForm : function() {
        var me = this;
        return me.down("#wizard-form").getForm();
    },

    getFormValues : function() {
        var me = this;

        return me.getForm().getValues();
    },

    findField : function(id) {
        var me = this;
        var basicForm = me.getForm();

        return basicForm.findField(id);
    },

    onFinishButton : function() {
        var me = this;
        var form = me.down("#wizard-form").getForm();

        if (form.isValid()) {
            me.doSubmit();
        }
    },

    doSubmit : function() {
        var me = this;

        if (me.mode === "remote") {
            var rpcOptions = {
                scope       : me,
                callback    : me.onSubmit,
                relayErrors : true,
                rpcData     : {
                    service : me.rpcService,
                    method  : me.rpcSetMethod || "set",
                    params  : me.getFormValues()
                }
            };

            if(me.fireEvent("beforesubmit", me, rpcOptions) === false)
                return;

            // Display waiting dialog.
            OMV.MessageBox.wait(null, me.submitMsg);

            // Execute RPC.
            OMV.Rpc.request(rpcOptions);
        } else {
            me.fireEvent("submit", me. me.getFormValues());
            me.close();
        }
    },

    onSubmit : function(id, success, response) {
        var me = this;

        OMV.MessageBox.updateProgress(1);
        OMV.MessageBox.hide();

        if(success) {
            me.fireEvent("submit", me, me.getFormValues(), response);
            me.close();
        } else {
            me.fireEvent("exception", me, response);
            OMV.MessageBox.error(null, response);
        }
    }
});
