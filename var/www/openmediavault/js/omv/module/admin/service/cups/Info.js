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
// require("js/omv/form/Panel.js")

Ext.define("OMV.module.admin.service.cups.Info", {
    extend : "OMV.workspace.form.Panel",

    autoLoadData    : false,
    mode            : "local",
    hideOkButton    : true,
    hideResetButton : true,

    getFormItems : function() {
        var me = this;

        return [{
            xtype      : "fieldset",
            autoScroll : true,
            frame      : false,
            border     : false,
            disabled   : true,
            items      : [{
                // IPP shared printer list
                xtype  : "fieldset",
                name   : "ipp",
                title  : _("Internet Printing Protocol (IPP) Shared Printer URLs"),
                layout : "fit",
                items  : [{
                    xtype     : "box",
                    html      : "",
                    listeners : {
                        afterrender : function(element) {
                            element.update(me.renderPrinterList(element, true));
                        }
                    }
                }]
            },{
                // SMB shared printer list
                xtype  : "fieldset",
                name   : "smb",
                title  : _("SMB Shared Printer Paths"),
                layout : "fit",
                items  : [{
                    xtype     : "box",
                    html      : "",
                    listeners : {
                        afterrender : function(element) {
                            element.update(me.renderPrinterList(element));
                        }
                    }
                }]
            },{
                /* Windows sharing info */
                xtype  : "fieldset",
                layout : "fit",
                title  : _("Windows"),
                items  : [{
                    border : false,
                    html   : '<p>'
                           + 'NOTE: The instructions below may vary slightly depending on the version of Windows on which '
                           + 'the steps are being performed. Some logical deduction may be required on your part.'
                           + '</p>'
                           + '<h3>Internet Printing Protocol (IPP)</h3>'
                           + '<p>'
                           + 'Printers are shared to Windows via the IPP URL http://' + location.hostname + ':631/printers/<i>PRINTER_NAME</i>. '
                           + 'To add an IPP shared printer in Window\'s <b>Control Panel</b> click on <b>Devices and Printers</b> (or Printers and Faxes), click on <b>Add a Printer</b> '
                           + 'and choose to <b>Add a Network Printer</b>, click on '
                           + '<b>The printer that I want isn\'t listed</b> (if a button with that label is presented), then select the option '
                           + 'labeled <b>Select a shared printer by name</b>. In the text box, you may enter the printer\'s <b>IPP</b> URL as listed above.'
                           + '</p>'
                           + '<h3>SMB</h3>'
                           + '<p>'
                           + 'If you have enabled printer sharing over SMB, printers may also be shared to Windows via the SMB path \\\\' + location.hostname + '\\<i>PRINTER_NAME</i>'
                           + '</p>'
                           + '<p>'
                           + 'To add an SMB shared printer in Window\'s <b>Control Panel</b> click on <b>Devices and Printers</b> (or Printers and Faxes), click on <b>Add a Printer</b> '
                           + 'and choose to <B>Add a Network Printer</b>, select  <b>Browse for printer</b> (if a button with that label is presented) and select the printer '
                           + 'you would like to add. This may prompt you to select or install the printer\'s driver. After you have connected to a shared printer on the network, '
                           + 'you can use it as if it were attached to your computer. '
                           + '</p>'
                           + '<h3>Point and Print</h3>'
                           + '<p>'
                           + 'Drivers can be made available for Windows clients over SMB to enable '
                           + '"point-and-print" functionality. When a Windows client initially connects to a printer, '
                           + 'if a driver is available, it will automatically be downloaded and installed. To manage the SMB drivers installed on this server, follow these steps '
                           + 'on a computer running <b>Windows 7 or higher</b>:'
                           + '</p>'
                           + '<ol style="list-style: decimal; list-style-image: none; margin-left: 10px;">'
                           + '<li>Click&nbsp;<b>Start</b>, type <b>\\\\' + location.hostname + '</b>, and press Enter. - If prompted to log in, enter the '
                           + 'user name and password of an OpenMediaVault account that is part of the <b>lpadmin</b> gruop. This will ensure that '
                           + 'you will have administrative access to printers. You may close the resulting window.</li>'
                           + '<li>Click on <b>Start</b>, type <b>printui /s /c\\\\192.168.1.66</b> , then press enter.</li>'
                           + '<li>Click on the <b>Drivers</b> tab, &nbsp;click <b>Add</b>, and then click <b>Next</b>.</li>'
                           + '<li>Click to select the&nbsp;check box&nbsp;for&nbsp;the appropriate processor architecture, and then click <b>Next</b>.</li>'
                           + '<li>Select an in-box driver from the list, and then click <b>Next</b>.&nbsp;&nbsp;&nbsp;-&nbsp;<b>Note</b> '
                           + 'you may also choose <b>Have Disk</b> and select the driver from the installation media that came '
                           + 'with the printer.</li>'
                           + '<li>Click <b>Finish </b>to complete the wizard.</li>'
                           + '</ol>'
                           + '<p>'
                           + 'Subsequent attempts to connect to the printer from a Windows computer should automatically install the appropriate printer driver.'
                           + '</p>'
                }]
            },{
                // OS X sharing info
                xtype  : "fieldset",
                layout : "fit",
                title  : _("Mac OS X"),
                items  : [{
                    border : false,
                    html   : '<p>'
                           + 'Shared printers should automatically be available to add in Mac OS X in <b>System Preferences</b> -&gt; <b>Print & Fax</b>. If not, '
                           + 'you can manually add a printer\'s IPP URL by clicking on <b>IP</b> in the toolbar and selecting the following values:'
                           + '</p>'
                           + '<ul>'
                           + '<li><b>Protocol:</b> Internet Printing Protocol - IPP</li>'
                           + '<li><b>Address:</b> ' + location.hostname + '</li>'
                           + '<li><b>Queue:</b> printers/PRINTER_NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(be sure to replace <i>PRINTER_NAME</i> with actual name of printer)</li>'
                           + '</ul>'
                           + '<p>'
                           + 'If you have enabled printer sharing over SMB, the printer may also be available in the Windows section of the <b>Print & Fax</b> dialog.'
                           + '</p>'
                }]
            },{
                // Linux sharing info
                xtype  : "fieldset",
                layout : "fit",
                title  : _("Linux"),
                items  : [{
                    border : false,
                    html   : '<p>'
                           + 'Consult your window environment\'s (Gnome, KDE, etc..) or distribution\'s documentation on adding a shared printer. Printers shared by this system are discoverable and should'
                           + 'appear when Linux searches for networked printers.'
                           + '</p>'
                }]
            },{
                // iOS sharing info
                xtype  : "fieldset",
                layout : "fit",
                title  : _("AirPrint capable Apple iOS devices"),
                items  : [{
                    border : false,
                    html   : '<p>'
                           + 'If you have enabled AirPrint support, shared printers should be available in the print dialog of the device.'
                           + '</p>'
               }]
            }]
        }];
    },

    renderPrinterList : function(element, isIppList) {
        var me       = this,
            listHtml = "",
            parent   = me.up('tabpanel');

        if (!parent)
            return;

        var printersPanel = parent.down('panel[title=' + _("Printers") + ']');

        if (printersPanel) {
            var printerStore = printersPanel.getStore();

            printerStore.each(function(item, index, count) {
                var ippLink;

                var uuid = item.get("uuid");

                if (isIppList)
                    ippLink = 'http://' + location.hostname + ':631/printers/' + uuid;
                else
                    ippLink = '\\\\' + location.hostname + '\\' + uuid;

                listHtml = listHtml + me.generateHtmlTagWithText("li", ippLink);
            }, me);

            listHtml = me.generateHtmlTagWithText("ul", listHtml);
        }

        return listHtml;
    },

    generateHtmlTagWithText : function(tag, text) {
        return "<" + tag + ">" + text + "</" + tag + ">";
    }
});

OMV.WorkspaceManager.registerPanel({
    id        : "info",
    path      : "/service/cups",
    text      : _("Printer Sharing"),
    position  : 40,
    className : "OMV.module.admin.service.cups.Info"
});
