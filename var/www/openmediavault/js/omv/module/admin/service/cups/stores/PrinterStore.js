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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// require("js/omv/WorkspaceManager.js")
// require("js/omv/data/Store.js")
// require("js/omv/data/Model.js")
// require("js/omv/data/proxy/Rpc.js")

Ext.define("OMV.module.admin.service.cups.stores.PrinterStore", {
    extend   : "OMV.data.Store",
    requires : [
        "OMV.data.Model",
        "OMV.data.proxy.Rpc",
    ],

    singleton  : true,
    autoLoad   : true,
    remoteSort : false,
    model      : OMV.data.Model.createImplicit({
        idProperty : "uuid",
        fields     : [
            { name : "uuid" },
            { name : "PrinterInfo" },
            { name : "PrinterLocation" },
            { name : "PrinterMakeAndModel" },
            { name : "PrinterState" },
            { name : "PrinterStateMessage" }
        ]
    }),
    proxy : {
        type    : "rpc",
        rpcData : {
            service : "Cups",
            method  : "getPrinters"
        }
    }
});
