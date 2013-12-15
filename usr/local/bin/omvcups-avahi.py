#!/usr/bin/env python
"""
 vim: tabstop=4
 
 @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 @author     Ian Moore <imooreyahoo@gmail.com>
 @copyright  Copyright (c) 2011 Ian Moore

 Based on : https://github.com/tjfontaine/airprint-generate/blob/master/airprint-generate.py
 Copyright (c) 2010 Timothy J Fontaine <tjfontaine@atxconsulting.com>
 
 This file is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 any later version.
 
 This file is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this file. If not, see <http://www.gnu.org/licenses/>.
 
 pycups docs:
 http://packages.python.org/pycups/
 
 Bonjour docs:
 http://devimages.apple.com/opensource/BonjourPrinting.pdf
 
"""

import locale
locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
 
import cups, re, os, sys, pprint, urlparse, glob
import lxml.etree as etree
from lxml.etree import Element, ElementTree, tostring
from StringIO import StringIO

SERVICE_FILENAME_TEMPLATE = "/etc/avahi/services/omvcups-%s.service"

SERVICE_TEMPLATE = """
<service-group>
<name replace-wildcards="yes"></name>
	<service>
		<type>_ipp._tcp</type>
		<port>631</port>
		<!-- Always set to 3 (Idle) since this file is not updated on printer state changes -->
		<txt-record>printer-state=3</txt-record>
		<txt-record>txtvers=1</txt-record>
		<txt-record>qtotal=1</txt-record>
		<txt-record>Transparent=T</txt-record>
		<txt-record>Binary=T</txt-record>
		<txt-record>URF=none</txt-record>
	</service>
</service-group>
"""
 
DOCUMENT_TYPES = {
	
	# These content-types will be at the front of the list
	'application/pdf': True,
	'application/postscript': True,
	'application/vnd.cups-raster': True,
	'application/octet-stream': True,
	'image/urf': True,
	'image/png': True,
	'image/tiff': True,
	'image/png': True,
	'image/jpeg': True,
	'image/gif': True,
	'text/plain': True,
	'text/html': True,

	# These content-types will never be reported to AirPrint
	'image/x-xwindowdump': False,
	'image/x-xpixmap': False,
	'image/x-xbitmap': False,
	'image/x-sun-raster': False,
	'image/x-sgi-rgb': False,
	'image/x-portable-pixmap': False,
	'image/x-portable-graymap': False,
	'image/x-portable-bitmap': False,
	'image/x-portable-anymap': False,
	'application/x-shell': False,
	'application/x-perl': False,
	'application/x-csource': False,
	'application/x-cshell': False,
}

# parse OMV config
doc = etree.parse('/etc/openmediavault/config.xml')
[enabled] = doc.xpath("//services/cups/enable")
[airprint] = doc.xpath("//services/cups/airprint")

# Remove file if not enabled
if not enabled.text == "1":
	for f in glob.glob(SERVICE_FILENAME_TEMPLATE %('*')):
		os.unlink(f)
	sys.exit(0)

airprint = True if airprint.text == "1" else False

""" Generate and write printer service files """
def genPrinterService(p,v,airprint):

	attrs = conn.getPrinterAttributes(p)
	uri = urlparse.urlparse(v['printer-uri-supported'])
	
	tree = ElementTree()
	tree.parse(StringIO(SERVICE_TEMPLATE.replace('\n', '').replace('\r', '').replace('\t', '')))

	name = tree.find('name')
	name.text = '%s @ %%h' % (p if not airprint else 'AirPrint ' + p)

	service = tree.find('service')
	
	# Add subtype to AirPrint service definitions
	if airprint:
		path = Element('subtype')
		path.text = "_universal._sub._ipp._tcp"
		service.append(path)


	port = service.find('port')
	port_no = None

	if hasattr(uri, 'port'): port_no = uri.port
	if not port_no: port_no = self.port
	if not port_no: port_no = cups.getPort()
	port.text = '%d' % port_no

	if hasattr(uri, 'path'): rp = uri.path
	else: rp = uri[2]
				
	re_match = re.match(r'^//(.*):(\d+)(/.*)', rp)
	if re_match: rp = re_match.group(3)
				
	#Remove leading slashes from path
	#TODO XXX FIXME I'm worried this will match broken urlparse
	#results as well (for instance if they don't include a port)
	#the xml would be malform'd either way
	rp = re.sub(r'^/+', '', rp)
				
	path = Element('txt-record')
	path.text = 'rp=%s' % (rp)
	service.append(path)

	# This is reported to Apple products as the location
	if v['printer-location'] != '':
		desc = Element('txt-record')
		desc.text = 'note=%s' % (v['printer-location'])
		service.append(desc)

	# AirPrint and Non-AirPrint specific
	if airprint:
		
		product = Element('txt-record')
		product.text = 'product=(GPL Ghostscript)'
		service.append(product)
		
	else:

		product = Element('txt-record')
		product.text = 'product=(%s)' %(v['printer-make-and-model'])
		service.append(product)
		
		# Add name
		ptype = Element('txt-record')
		ptype.text = 'ty=%s' %(v['printer-make-and-model'])
		
		# USB manufacturer and model
		if usbdevs.get(v['device-uri'], None) is not None:
		
			usbdev = usbdevs.get(v['device-uri']).get('device-id',None)
			
			if usbdev is not None:

				manuf = None
				model = None
				
				# Tokenize values
				kvs = usbdev.split(';')				
				for kv in kvs:
					if not kv.find(':') > 0: continue
					[k,val] = kv.split(':')
					if k == 'MFG': manuf = val
					elif k == 'MODEL' or k == 'MDL': model = val
				
				if manuf is not None and model is not None:
					man = Element('txt-record')
					man.text = 'usb_MFG=%s' %(manuf)
					service.append(man)
					man = Element('txt-record')
					man.text = 'usb_MDL=%s' %(model)
					service.append(man)
			
	# Color
	if attrs.get('color-supported', True):
		extTag = Element('txt-record')
		extTag.text = 'Color=T'
		service.append(extTag)
	
	# Duplex
	extTag = Element('txt-record')
	if 'sides' in attrs.get('job-creation-attributes-supported'):
		extTag.text = 'Duplex=T'
	else:
		extTag.text = 'Duplex=F'
	service.append(extTag)
	
	# Copies
	if 'copies' in attrs.get('job-creation-attributes-supported'):
		extTag = Element('txt-record')
		extTag.text = 'Copies=T'
		service.append(extTag)
	
	
	# Collate
	if 'separate-documents-collated-copies' in attrs.get('multiple-document-handling-supported'):
		extTag = Element('txt-record')
		extTag.text = 'Collate=T'
		service.append(extTag)
		
	# Printer type
	ptype = Element('txt-record')
	ptype.text = 'printer-type=%s' % (hex(v['printer-type']))
	service.append(ptype)

	# Content types supported
	pdl = Element('txt-record')
	fmts = []
	defer = []

	for a in attrs['document-format-supported']:
		if airprint and a in DOCUMENT_TYPES and DOCUMENT_TYPES[a]:
			fmts.append(a)
		else:
		   defer.append(a)

	fmts = ','.join(fmts+defer)

	dropped = []

	# TODO XXX FIXME all fields should be checked for 255 limit
	while len('pdl=%s' % (fmts)) >= 255:
		(fmts, drop) = fmts.rsplit(',', 1)
		dropped.append(drop)

	pdl.text = 'pdl=%s' % (fmts)
	service.append(pdl)

	if airprint: p = 'AirPrint-' +p	
	filename = SERVICE_FILENAME_TEMPLATE %(p)
	
	f = open(filename, 'w')
	tree.write(f, pretty_print=True, xml_declaration=True, encoding="UTF-8")
	f.close()
	
	return filename


# Connect to CUPS server 
conn = cups.Connection()

# Get a list of connected USB devices
usbdevs = conn.getDevices(include_schemes=['usb'])

# Hold list of generated files
files = []

# Process each printer
for p, v in conn.getPrinters().items():
	
	if not v['printer-is-shared']:
		print p
		continue

	files.append(genPrinterService(p,v,False))
	
	if airprint:
		files.append(genPrinterService(p,v,True))

# Compare generated file list with existing files
# and unlink service definitions for printers that
# no longer exist
for f in glob.glob(SERVICE_FILENAME_TEMPLATE %('*')):
	if not f in files:
		os.unlink(f)
	


