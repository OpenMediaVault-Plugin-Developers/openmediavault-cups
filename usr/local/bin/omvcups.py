#!/usr/bin/env python
"""

 vim: tabstop=4

 @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 @author     Ian Moore <imooreyahoo@gmail.com>
 @copyright  Copyright (c) 2011 Ian Moore

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


     See: http://packages.python.org/pycups/ for pycups API documentatino

"""

import locale
locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')

import cups, re, os, sys, pprint, json
from lxml import etree

""" Convert dash-style-props to CamelCaseStyleProps """
def camelCase(d):
	nd = {}
	for k,v in d.items():
		nd[''.join([w.capitalize() for w in k.split('-')])] = v
		
	return nd


""" get password for admin """
def omvGetAdminPw(prompt=''):
	
	# parse config to get user / pass
	doc = etree.parse('/etc/openmediavault/config.xml')
	
	adminpw = doc.xpath("//system/usermanagement/users/user[name='admin']/password")
	
	if len(adminpw) == 0:
		print "Error finding admin user"
		sys.exit(1)

	return adminpw[0].text

""" OMV Cups class """
class OMVCups(object):

	port = 631
	host = '127.0.0.1'
	
	def __init__(self):
				
		cups.setUser('admin')
		cups.setPasswordCB(omvGetAdminPw)
		
		self.conn = cups.Connection()
		
	""" Enable printer sharing on server """
	def enableSharing(self):
		self.conn.adminSetServerSettings({cups.CUPS_SERVER_SHARE_PRINTERS:'1'})


	""" get job list """
	def getJobs(self, args):
		[which] = args;
		jobs = []
		for j in self.conn.getJobs(which,False, -1, -1).keys():
			jobs.append(camelCase(self.conn.getJobAttributes(j,['job-id','job-k-octets','job-name',
													'job-originating-host-name','job-originating-user-name',
													'job-state','job-state-reasons','time-at-creation',
													'time-at-completed','printer-uri','job-media-sheets-completed'])))
			
		print json.dumps(jobs)

		
	""" Set printer description and location """
	def setPrinter(self, args):
		
		[name, info, location] = args
		
		self.conn.setPrinterInfo(name, info)
		self.conn.setPrinterLocation(name, location)
		
		# Always enable and share
		self.conn.setPrinterShared(name, True)
		self.conn.enablePrinter(name)
		
	""" Return a single printer """
	def getPrinter(self, args):
		[name] = args
		print json.dumps(dict(camelCase(self.conn.getPrinters()[name]).items() + {'uuid':name}.items()))
		
	""" Send test page to named printer """
	def printTestPage(self, args):
		[name] = args
		self.conn.printTestPage(name)
	
	""" Cancel all jobs on named printer """
	def cancelAllJobs(self, args):
		[name] = args
		self.conn.cancelAllJobs(name, my_jobs=False, purge_jobs=False)

	""" Cancel a single job """
	def cancelJob(self, args):
		[jobid] = args
		self.conn.cancelJob(int(jobid))
		
	""" Add printer to cups """
	def addPrinter(self, args):
		
		[name, fppdname, finfo, flocation, fdevice] = args
		self.conn.addPrinter(name=name, ppdname=fppdname, info=finfo, location=flocation, device=fdevice)
		
		# All good defaults
		self.conn.enablePrinter(name)
		self.conn.acceptJobs(name)
		self.conn.setPrinterShared(name, True)
	
	""" Delete printer """
	def deletePrinter(self, args):
		
		[name] = args
		
		self.conn.deletePrinter(name)
		
	""" Return a list of makes and models supported by
		this cups installation """
	def getMakesModels(self):
	
		mms = {}
		returnList = []
		
		for k, v in self.conn.getPPDs().items():

			if mms.get(v['ppd-make'], None) is None:
				mms[v['ppd-make']] = []

			v = camelCase(v)
			v['uuid'] = k
			
			mms[v['PpdMake']].append(v)
			
		for k,v in mms.items():
			v.sort(lambda a,b: cups.modelSort(a['PpdMakeAndModel'], b['PpdMakeAndModel']))
			returnList.append({
				'make': k,
				'models': v
			})
		
		returnList.sort(lambda a,b: cups.modelSort(a['make'],b['make'] ))
		
		print json.dumps(returnList)
		

	""" Pause printing on printer """
	def pausePrinter(self, args):
		self.conn.disablePrinter(args[0])
	
	""" Resume printing on printer """
	def resumePrinting(self, args):
		self.conn.enablePrinter(args[0])

	""" Pause printing on printer """
	def pausePrinting(self, args):
		self.conn.disablePrinter(args[0])
		
	""" Get all PPDs """
	def getPPDs(self):
		pprint.pprint(self.conn.getPPDs())
		
	""" find directly attached printers """
	def findDirectPrinters(self, classes=None):

		devList = []
		devs = self.conn.getDevices(include_schemes=['usb','parallel','serial','hp','hpfax'])

		for k,p in devs.items():

			# Skip conceptual printers
			if k.find(':') < 0 or p['device-class'] != 'direct': continue

			p = camelCase(p)
			p['uuid'] = k
			devList.append(p)

		print json.dumps(devList)

	""" get a list of configured printers """
	def getPrinters(self):

		printers = self.conn.getPrinters()

		printerList = []
		for k, p in printers.items():
			p['attrs'] = self.conn.getPrinterAttributes(name=k)
			p = camelCase(p)
			p['uuid'] = k
			printerList.append(p)
			
		print json.dumps(printerList)
		
	""" return PPD of printer """
	def getPPD(self,args):
		
		pprint.pprint(self.conn.getPPD(args[0]))

	""" get attributes """
	def getPrinterAttributes(self,args):
		
		pprint.pprint(self.conn.getPrinterAttributes(uri=args[0]))

if __name__ == '__main__':

	apg = OMVCups()
	
	try:
		if len(sys.argv[2:]):
			getattr(apg, sys.argv[1])(sys.argv[2:])
		else:
			getattr(apg, sys.argv[1])()
	
	except cups.HTTPError, e:
	
		print json.dumps({'error':'CUPS HTTP error status code: %s' % e.args})
		
	except cups.IPPError, e:
		
		print json.dumps({'error':'CUPS IPP error(%s): %s' % e.args})
		
