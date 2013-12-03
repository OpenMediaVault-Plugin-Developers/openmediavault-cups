/**
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
// require("js/omv/WorkspaceManager.js")
// require("js/omv/workspace/form/Panel.js")

/**
 * @class OMV.module.admin.service.cups.CUPSInfoPanel
 * @derived OMV.workspace.form.Panel
 */
Ext.define("OMV.module.admin.service.cups.CUPSInfoPanel", {
    extend : "OMV.workspace.form.Panel",

    getFormItems : function() {
        var me = this;
        return [{
            xtype      : "fieldset",
            stateId    : "OMV.module.admin.service.cups.CUPSInfoPanel",
            autoScroll : true,
            frame      : false,
            border     : false,
            disabled   : true,
            listeners  : {
                show : function () {
                    var l = Ext.getCmp("OMV.module.admin.service.cups.CUPSInfoPanel-ipp-list");
                    l.fireEvent("afterrender", l);
                    var l = Ext.getCmp("OMV.module.admin.service.cups.CUPSInfoPanel-smb-list");
                    l.fireEvent("afterrender", l);
                }
            },
            items      : [{
                /** IPP shared printer list **/
                xtype  : "fieldset",
                title  : _("Internet Printing Protocol (IPP) Shared Printer URLs"),
                layout : 'fit',
                items  : [{
                    xtype     : 'box',
                    id        : "OMV.module.admin.service.cups.CUPSInfoPanel-ipp-list",
                    html      : '',
                    listeners : {
                        afterrender:function (t) {
                            try {
                                t.update(Ext.getCmp("OMV.module.admin.service.cups.CupsConfigPanel").ippList.join('<br /><br />'));
                            } catch (err) {
                            }
                        }
                    }
                }]
            },{
                /** SMB shared printer list **/
                xtype  : "fieldset",
                id     : "OMV.module.admin.service.cups.CUPSInfoPanel-smb",
                title  : _("SMB Shared Printer Paths"),
                layout : 'fit',
                items  : [{
                    id        : "OMV.module.admin.service.cups.CUPSInfoPanel-smb-list",
                    xtype     : 'box',
                    html      : '',
                    listeners : {
                        afterrender:function (t) {
                            try {
                                t.update(Ext.getCmp("OMV.module.admin.service.cups.CupsConfigPanel").smbList.join('<br /><br />'));
                            } catch (err) {
                            }
                        }
                    }
                }]
            },{
                /** Windows sharing INFO **/
                xtype  : "fieldset",
                layout : 'fit',
                title  : _("Windows"),
                items  : [{
                    border : false,
                    html   : 'NOTE: The instructions below may vary slightly depending on the version of Windows on which ' +
                             'the steps are being performed. Some logical deduction may be required on your part.<br /><br />' +
                             '<h3>Internet Printing Protocol (IPP)</h3><br />Printers are shared to Windows via the IPP URL http://' + location.hostname + ':631/printers/<i>PRINTER_NAME</i>' +
                             '<br /><br />' +
                             'To add an IPP shared printer in Window\'s <b>Control Panel</b> click on <b>Devices and Printers</b> (or Printers and Faxes), click on <b>Add a Printer</b> ' +
                             'and choose to <B>Add a Network Printer</b>, click on ' +
                             '<b>The printer that I want isn\'t listed</b> (if a button with that label is presented), then select the option ' +
                             'labeled <b>Select a shared printer by name</b>. In the text box, you may enter the printer\'s <b>IPP</b> URL as listed above.' +
                             '<br /><br />' +
                             '<h3>SMB</h3><br />If you have enabled printer sharing over SMB, printers may also be shared to Windows via the SMB path \\\\' + location.hostname + '\\<i>PRINTER_NAME</i>' +
                             '<br /><br />' +
                             'To add an SMB shared printer in Window\'s <b>Control Panel</b> click on <b>Devices and Printers</b> (or Printers and Faxes), click on <b>Add a Printer</b> ' +
                             'and choose to <B>Add a Network Printer</b>, select  <b>Browse for printer</b> (if a button with that label is presented) and select the printer ' +
                             'you would like to add. This may prompt you to select or install the printer\'s driver. After you have connected to a shared printer on the network, ' +
                             'you can use it as if it were attached to your computer. ' +
                             '<br /><br />' +
                             '<h3>Point and Print</h3><br />Drivers can be made available for Windows clients over SMB to enable ' +
                             '"point-and-print" functionality. When a Windows client initially connects to a printer, ' +
                             'if a driver is availble, it will automatically be downloaded and installed. To manage the SMB drivers installed on this server, follow these steps ' +
                             'on a computer running <b>Windows 7 or higher</b>:<br /><br />' +
                             '<ol style="list-style: decimal; list-style-image: none; margin-left: 10px;">' +
                             '<li>Click&nbsp;<b>Start</b>, type <b>\\\\' + location.hostname + '</b>, and press Enter. - If prompted to log in, enter the ' +
                             'user name and password of an OpenMediaVault account that is part of the <b>lpadmin</b> gruop. This will ensure that ' +
                             'you will have administrative access to printers. You may close the resulting window.</li>' +
                             '<li>Click on <b>Start</b>, type <b>printui /s /c\\\\192.168.1.66</b> , then press enter.</li>' +
                             '<li>Click on the <b>Drivers</b> tab, &nbsp;click <b>Add</b>, and then click <b>Next</b>.</li>' +
                             '<li>Click to select the&nbsp;check box&nbsp;for&nbsp;the appropriate processor architecture, and then click <b>Next</b>.</li>' +
                             '<li>Select an in-box driver from the list, and then click <b>Next</b>.&nbsp;&nbsp;&nbsp;-&nbsp;<b>Note</b> ' +
                             'you may also choose <b>Have Disk</b> and select the driver from the installation media that came ' +
                             'with the printer.</li>' +
                             '<li>Click <b>Finish </b>to complete the wizard.</li></ol><br />' +
                             'Subsequent attempts to connect to the printer from a Windows computer should automatically install the appropriate printer driver.' +
                             '<br /><br />'
                }]
            },{
                /** OS X sharing INFO **/
                xtype  : "fieldset",
                layout : 'fit',
                title  : _("Mac OS X"),
                items  : [{
                    border : false,
                    html   : 'Shared printers should automatically be available to add in Mac OS X in <b>System Preferences</b> -&gt; <b>Print & Fax</b>. If not, ' +
                             'you can manually add a printer\'s IPP URL by clicking on <b>IP</b> in the toolbar and selecting the following values:<br /><br /> ' +
                             '<b>Protocol:</b> Internet Printing Protocol - IPP<br />' +
                             '<b>Address:</b> ' + location.hostname + '<br />' +
                             '<b>Queue:</b> printers/PRINTER_NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(be sure to replace <i>PRINTER_NAME</i> with actual name of printer)<br />' +
                             '<br />If you have enabled printer sharing over SMB, the printer may also be available in the Windows section of the <b>Print & Fax</b> dialog.' +
                             '<br /><Br />'
                }]
            },{
                /** Linux sharing INFO **/
                xtype  : "fieldset",
                layout : 'fit',
                title  : _("Linux"),
                items  : [{
                    border : false,
                    html   : 'Consult your window environment\'s (Gnome, KDE, etc..) or distribution\'s documentation on adding a shared printer. Printers shared by this system are discoverable and should<br />'+
                             'appear when Linux searches for networked printers.<br /><Br />'
                }]
            },{
                /** iOS sharing INFO **/
                xtype  : "fieldset",
                layout : 'fit',
                title  : _("AirPrint capable Apple iOS devices"),
                items  : [{
                    border : false,
                    html   : 'If you have enabled AirPrint support, shared printers should be available in the print dialog of the device.<br /><Br />'
                }]
            }]
        }];
    }
});

OMV.WorkspaceManager.registerPanel({
    id        : "cupsinfopanel",
    path      : "/service/cups",
    text      : _("Printer Sharing"),
    position  : 30,
    className : "OMV.module.admin.service.cups.CUPSInfoPanel"
});
