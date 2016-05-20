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

// require("js/omv/PluginManager.js")
// require("js/omv/module/admin/diagnostic/log/plugin/Plugin.js")
// require("js/omv/util/Format.js")

Ext.define('OMV.module.admin.diagnostic.log.plugin.Cups', {
    extend: 'OMV.module.admin.diagnostic.log.plugin.Plugin',
    alias: 'omv.plugin.diagnostic.log.cups.access',

    id: 'cupsaccess',
    text: _('Printing Access Log'),
    stateful: true,
    stateId: '053eba40-6374-11e3-949a-0800200c9a66',
    columns: [{
        text: _('Date & Time'),
        sortable: true,
        dataIndex: 'date',
        stateId: 'date',
        renderer: OMV.util.Format.localeTimeRenderer()
    }, {
        text: _('Host'),
        sortable: true,
        dataIndex: 'host',
        stateId: 'host',
        flex: 1
    }, {
        text: _('User'),
        sortable: true,
        dataIndex: 'user',
        stateId: 'user',
        flex: 1
    }, {
        text: _('Event'),
        sortable: true,
        dataIndex: 'event',
        stateId: 'event',
        flex: 1
    }],
    rpcParams: {
        id: 'cupsaccess'
    },
    rpcFields: [{
        name: 'date',
        type: 'string'
    }, {
        name: 'host',
        type: 'string'
    }, {
        name: 'user',
        type: 'string'
    }, {
        name: 'event',
        type: 'string'
    }]
});
