/**
 * This file is part of OpenMediaVault.
 *
 * @license   http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author    Aaron Murray <aaron@omv-extras.org>
 * @copyright Copyright (c) 2013 Aaron Murray
 *
 * OpenMediaVault is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * OpenMediaVault is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with OpenMediaVault. If not, see <http://www.gnu.org/licenses/>.
 */
// require("js/omv/PluginManager.js")
// require("js/omv/module/admin/diagnostic/log/plugin/Plugin.js")
// require("js/omv/util/Format.js"

Ext.define("OMV.module.admin.diagnostic.log.plugin.CUPSerror", {
	extend: "OMV.module.admin.diagnostic.log.plugin.Plugin",

	id: "cupserror",
	text :_("Printing Error Log"),
	stateId: "c9d06952-00da-11e1-aa29-CUPS-error",
	columns: [{
		text: _("Date & Time"),
		sortable: true,
		dataIndex: "date",
		id: "date",
		renderer: OMV.util.Format.localeTimeRenderer()
	},{
		text: _("Severity"),
		sortable: true,
		dataIndex: "severity",
		stateId: "severity",
		flex: 1,
		renderer: function (val) {
			switch (val) {
				case 'E':
					return _('Error');
				case 'W':
					return _('Warning');
				case 'I':
					return _('Info');
				case 'D':
					return _('Debug');
			}
			return val;
		}
	},{
		header: _("Event"),
		sortable: true,
		dataIndex: "event",
		stateId: "event",
		flex: 1
	}],
	rpcParams: {
		id: "cupserror"
	},
	rpcFields: [
		{ name:"date", type: "string" },
		{ name:"severity", type: "string" },
		{ name:"event", type: "string" }
	]
});

OMV.PluginManager.register({
	ptype: "diagnostic",
	id: "log",
	className: "OMV.module.admin.diagnostic.log.plugin.CUPSerror"
});