const express = require('express');
const favicon = require('serve-favicon');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'scenario');
const DEFAULT_WAIT_TASK = 0;
const DEFAULT_WAIT_LOOP = 1000;
const MAX_STOP_RETRIES = 10;
/*--------------------------------------------------------------------------------------------
		Scenario
---------------------------------------------------------------------------------------------*/
class Scenario {
	constructor(api, waitLoop, waitTask) {
		var caller = 'Scenario';
		this.api = api;
		if(waitLoop)
			this.waitLoop = waitLoop;
		else
			this.waitLoop = DEFAULT_WAIT_LOOP;
		logger.log(caller, 'DEBUG', 'this.waitLoop: ' + this.waitLoop);
		if(waitTask)
			this.waitTask = waitTask;
		else
			this.waitTask = DEFAULT_WAIT_TASK;
		logger.log(caller, 'DEBUG', 'this.waitTask: ' + this.waitTask);
		this.scenarioList = [];
		this.status = 'idle';
		this.apiFunctList = getApiFunct();
		logger.log(caller, 'DEBUG', 'New RunScenario has been created');
	}
	//add
	add(scenarioToAdd) {
		var caller = 'add';
		var scenario = scenarioToAdd;
		if(scenario.name)
			logger.log(caller, 'INFO1', 'Add scenario to scenario list: ' + scenario.name);
		else
			logger.log(caller, 'WARNING', 'WARNING: Scenario name is undefined');
		scenario.loop = 1;
		scenario.status = 'idle';
		this.scenarioList.push(scenario);
	}
	//start
	async start() {
		var caller = 'start';
		if(!this.scenarioList || (this.scenarioList.length == 0)) {
			logger.log(caller, 'WARNING', 'WARNING: Scenario list is empty');
			return {ok: true, data: {mustStop: true}};
		}
		this.status = 'started';
		this.mustStop = false;
		var scenarioId = 0;
		var allOk = true;
		//Run current scenario from scenarioList
		while(allOk && !this.mustStop && (scenarioId < this.scenarioList.length)) {
			var scenario = this.scenarioList[scenarioId];
			logger.log(caller, 'DEBUG', 'scenario: ' + scenario.name);
			//Start list of tasks for this scenario
			try {
				let result = await this.run(scenario, 1);
				if(!result.ok) {
					logger.log(caller, 'INFO2', 'ERROR: run result is ko');
					allOk = false;
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: run failed');
				logger.error(caller, error);
				logger.log(caller, 'ERROR', '>>>> End: FATAL ERROR');
				return {ok: false};
			}
			//Scenario has completed
			scenarioId++;
		}
		logger.log(caller, 'DEBUG', 'allOk: ' + allOk + ', mustStop: ' + this.mustStop + ', scenarioId: ' + scenarioId + ', scenarioList.length: ' + this.scenarioList.length);
		if(!allOk) {
			this.status = 'error';
			logger.log(caller, 'INFO2', 'ERROR: startScenario result is ko');
			logger.log(caller, 'ERROR', '>>>> SCENARII COMPLETED WITH ERROR');
		} else if(this.mustStop) {
			this.status = 'stopped';
			logger.log(caller, 'INFO0', '>>>> STOPPED BY USER');
		} else {
			this.status = 'completed';
			logger.log(caller, 'INFO0', '>>>> ALL SCENARII COMPLETED SUCCESSFULLY');
		}
		//All scenario have finished. Return final result
		//REquest scenario to be stopped at once except if already stopped by the user
		return {ok: allOk, data: {mustStop: !this.mustStop}};
	}
	//stop
	async stop() {
		var caller = 'stop';
		this.mustStop = true;
		async function wait (timeout) {
			return await new Promise((resolve) => {setTimeout(() => {resolve()}, timeout * 1000);});
		}
		var retry = 0;
		logger.log(caller, 'INFO0', 'Waiting for the scenario to stop ...');
		while((this.status == 'started') && (retry < MAX_STOP_RETRIES)) {
			const timeout = Math.pow(2, retry);
			logger.log(caller, 'INFO2', 'Not stopped yet. Retry check in ' + timeout + 's ...');
			retry++;
			await wait(timeout);
		}
		if(this.status == 'started')
			logger.log(caller, 'ERROR', 'ERROR: Stopping service failed. Current service status: ' + this.status); 
		return {ok: (this.status != 'started')};
	}
	//run
	async run(scenario, nbLoop) {
		var caller = 'run';
		//Run current scenario
		scenario.status = 'started';
		//check nbLoop
		if(typeof(scenario.nbLoop) != 'number') {
			logScenario(scenario.name, caller, 'ERROR', 'ERROR: nbLoop is not properly specified in scenario ' + scenario.name);
			throw new Error('nbLoop not specified properly');
		}
		var allTaskOk = true;
		while((nbLoop <= scenario.nbLoop) && !this.mustStop && allTaskOk && (scenario.status == 'started')) {
			if(scenario.nbLoop != 1)
				logScenario(scenario.name, caller, 'INFO0', '--- Start ' + scenario.name + ', loop: ' +  nbLoop + '/' + scenario.nbLoop + ' ---');
			else
				logScenario(scenario.name, caller, 'INFO0', '--- Start ' + scenario.name + ' ---');
			var taskId = 0;
			while((taskId < scenario.taskList.length) && !this.mustStop && allTaskOk) {
				//Execute task
				var task = scenario.taskList[taskId];
				if(task.action == 'help')
					displayHelp(this.apiFunctList, task.data);
				else {
					try {
						var result = await execTask(this.apiFunctList, this.api, scenario, task, taskId, scenario.taskList.length);
						allTaskOk = result.ok;
						logger.log(caller, 'INFO2', 'allTaskOk: ' + allTaskOk);
					} catch(error) {
						logger.log(caller, 'ERROR', 'ERROR: execTask failed');
						logger.error(caller, error);
						return {ok: false};
					}
				}
				//Task has completed.
				taskId ++;
			}
			//Execution completed. Check scenario status.
			if(!allTaskOk) scenario.status = 'error';
			//Check if we must run it again
			nbLoop ++;
			if((nbLoop <= scenario.nbLoop) && (scenario.status == 'started') && !this.mustStop) {
				logScenario(scenario.name, caller, 'INFO1', 'Start next loop');
				//Start again this scenario
				return new Promise(resolve => setTimeout(() => {return resolve(this.run(scenario, nbLoop));}, this.waitLoop));
			} else 
				logScenario(scenario.name, caller, 'DEBUG', 'We will exit from scenario execution');
		}
		logScenario(scenario.name, caller, 'INF02', 'Scenario status: ' + scenario.status);
		if(scenario.status == 'error') {
			logScenario(scenario.name, caller, 'ERROR', '>>>> End: FAILED');
		} else {
			if(this.mustStop) {
				scenario.status = 'stopped';
				logScenario(scenario.name, caller, 'INFO0', 'Scenario has been stopped');
				logger.log(caller, 'INFO2', 'allTaskOk: ' + allTaskOk);
			} else if(nbLoop > scenario.nbLoop) {
				scenario.status = 'completed';
				if(scenario.nbLoop != 1)
					logScenario(scenario.name, caller, 'INFO0', 'Max loops reached');
				logScenario(scenario.name, caller, 'INFO0', '>>>> End: SUCCESSFUL');
			} else
				throw new Error('Unknown status. Scenario status: ' + scenario.status);
		}	
		//Scenario have finished. Return final result
		return {ok: allTaskOk};
	}
}
/*--------------------------------------------------------------------------------------------
		execTask
---------------------------------------------------------------------------------------------*/
const execTask = async (apiFunctList, api, scenario, task, taskId, length) => {
	var caller = 'execTask';
	if((typeof(task) != 'undefined') && (typeof(task.action) != 'undefined')) {
		var taskInfo = '';
		for(var key in task) {
			if(key == 'action') {
				if(task[key] == 'wait')
					var action = '-> Task[' + (taskId+1) + '/' + length + ']: ' + task[key] + ' ' + task.data.duration + 's';
				else if(task[key] == 'wait_until')
					var action = '-> Task[' + (taskId+1) + '/' + length + ']: ' + task[key] + ' ' + task.data.date;
				else
					var action = '-> Task[' + (taskId+1) + '/' + length + ']: ' + task[key];
			} else
				taskInfo += ', ' + key + ': ' + JSON.stringify(task[key]);
		}
		logScenario(scenario.name, caller, 'INFO0', action);
		logScenario(scenario.name, caller, 'INFO2', taskInfo);
		//Check task action is defined
		if(!apiFunctList[task.action]) {
			logger.log(action, 'ERROR', 'ERROR: apiCall for ' + task.action + ' is undefined');
			return {ok: false};
		}
		//Execute task action
		try {
			let result = await apiFunctList[task.action].apiFunct(api, {...task.data});
			if(!result.ok) {
				logScenario(scenario.name, caller, 'ERROR', 'ERROR: apiFunct result is ko for action: ' + task.action);
				scenario.status = 'error';
				//Stop here then
				return result;
			}
			var serverData = result.data;
		} catch(error) {
			logger.log(action, 'ERROR', 'ERROR: ' + apiFunctList[task.action].apiCall + ' failed');
			logger.error(caller, error);
			return {ok: false};
		}
		logScenario(scenario.name, caller, 'INFO2', 'Action successful: ' + task.action + ', data: ' + JSON.stringify(task.data));
		//Perform post action
		handleData(scenario, task, serverData);
		return({ok: true});
	} else {
		logScenario(scenario.name, caller, 'ERROR', "ERROR: action is undefined in scenario");
		scenario.status = 'error';
		return {ok: false};
	}
}
/*--------------------------------------------------------------------------------------------
		displayHelp
---------------------------------------------------------------------------------------------*/
const displayHelp = (apiFunctList, data) => {
	const caller = 'displayHelp';
	const showName = (data && data.display && typeof(data.display.name) != 'undefined') ? data.display.name : true;
	const showDescription = (data && data.display && typeof(data.display.description) != 'undefined') ? data.display.description : true;
	const showExample = (data && data.display && typeof(data.display.example) != 'undefined') ? data.display.example : false;
	const customList = (data.list && data.list.length > 0);
	for(let key in apiFunctList) {
		if(!customList || (customList && data.list.includes(key))) {
			if(showName) logger.log(caller, 'INFO0', 'Name: ' + key);
			if(showDescription) logger.log(caller, 'INFO0', 'Description: ' + apiFunctList[key].description);
			if(showExample) { 
				for(let id=0; id<apiFunctList[key].examples.length; id++)
					logger.log(caller, 'INFO0', 'Examples: ' + apiFunctList[key].examples[id]);
			}
			logger.log(caller, 'INFO0', '-------------------------------------------------------------------');
		}
	}
}
/*--------------------------------------------------------------------------------------------
		getApiFunct
---------------------------------------------------------------------------------------------*/
getApiFunct = () => {
	const caller = 'getApiFunct';
	const cmdApiList = {
		'channel_associate_device_list': {
			apiCall: 'api.channel.associateDevice',
			description: 'Associate a channel to a list of devices',
			examples: ['{"action": "channel_associate_device_list", "data": {"name": "channel_test", "deviceList":["QA_PLAYER_1", "QA_PLAYER_2"]}}'],
			apiFunct: async(api, data) => {
				return await api.channel.associateDevice(data);
			}
		},
		'channel_check_content_list': {
			apiCall: 'api.channel.checkContentList',
			description: 'Check the content of a channel',
			examples: [{"action": "channel_check_content_list", "data": {"name": "channel_test", "contentList": ["playlist_test", "slide_test", "media_test_image"]}}],
			apiFunct: async(api, data) => {
				return await api.channel.checkContentList(data);
			}
		},
		'channel_check_content_nb': {
			apiCall: 'api.channel.checkContentNb',
			description: 'Check the number of a specific element in a channel',
			examples: ['{"action": "channel_check_content_nb", "data": {"name": "channel_test", "contentName": "slide_test", "nbContent": 1}}'],
			apiFunct: async(api, data) => {
				return await api.channel.checkContentNb(data);
			}
		},
		'channel_check_data': {
			apiCall: 'api.channel.checkData',
			description: 'Check the properties and data of a channel',
			examples: [
				'{"action": "channel_check_data", "data": {"name": "channel_test", "check": {"default_layout_name": "layout_test"}}}',
				'{"action": "channel_check_data", "data": {"name": "channel_test", "check": {"title": "channel_test", "description": "Test channel", "media_nb": 9}}}'
			],
			apiFunct: async(api, data) => {
				return await api.channel.checkData(data);
			}
		},
		'channel_check_element': {
			apiCall: 'api.channel.checkElement',
			description: 'Check the properties of an element contained in a channel',
			examples: ['{"action": "channel_check_element", "data": {"name": "channel_test", "element": "slide_test", "check": {"layout_name": "layout_test"}}}'],
			apiFunct: async(api, data) => {
				return await api.channel.checkElement(data);
			}
		},
		'channel_check_exist': {
			apiCall: 'api.channel.exist',
			description: 'Check that a channel exists',
			examples: ['{"action": "channel_check_exist", "data": {"name": "channel_test"}'],
			apiFunct: async(api, data) => {
				return await api.channel.exist(data);
			}
		},
		'channel_create': {
			apiCall: 'api.channel.create',
			description: 'Create a channel',
			examples: ['{"action": "channel_create", "data": {"name": "channel_test", "description": "Test channel"}}'],
			apiFunct: async(api, data) => {
				return await api.channel.create(data);
			}
		},
		'channel_default_layout': {
			apiCall: 'api.channel.defaultLayout',
			description: 'Set/Unset the default layout to a channel',
			examples: [
				'{"action": "channel_default_layout", "data": {"name": "channel_test", "layout": "layout_test", "value": "set"}}',
				'{"action": "channel_default_layout", "data": {"name": "channel_test", "layout": "layout_test", "value": "unset"}}'
			],
			apiFunct: async(api, data) => {
				return await api.channel.defaultLayout(data);
			}
		},
		'channel_delete': {
			apiCall: 'api.channel.delete',
			description: 'Delete a channel',
			examples: ['{"action": "channel_delete", "data": {"name": "channel_test"}}'],
			apiFunct: async(api, data) => {
				return await api.channel.delete(data);
			}
		},
		'channel_delete_content': {
			apiCall: 'api.channel.deleteContent',
			description: 'Delete a specific content from a channel',
			examples: [
				'{"action": "channel_delete_content", "data": {"name": "channel_test", "contentName": "playlist_1"}}',
				'{"action": "channel_delete_content", "data": {"name": "channel_test", "contentName": "media_test_image"}}'
			],
			apiFunct: async(api, data) => {
				return await api.channel.deleteContent(data);
			}
		},
		'channel_element_layout': {
			apiCall: 'api.channel.elementLayout',
			description: 'Set/Unset the layout of an element of a channel',
			examples: [
				'{"action": "channel_element_layout", "data": {"name": "channel_test", "element": "playlist_test", "layout": "layout_test", "value": "set"}}',
				'{"action": "channel_element_layout", "data": {"name": "channel_test", "element": "playlist_test", "layout": "layout_test", "value": "unset"}}'
			],
			apiFunct: async(api, data) => {
				return await api.channel.elementLayout(data);
			}
		},
		'channel_get_content': {
			apiCall: 'api.channel.getContent',
			description: 'Get the content of a channel',
			examples: [
				'{"action": "channel_get_content", "data": {"name": "channel_test"}}',
				'{"action": "channel_get_content", "data": {"name": "channel_test", "display": ["title"]}}'
			],
			apiFunct: async(api, data) => {
				return await api.channel.getContent(data);
			}
		},
		'channel_get_data': {
			apiCall: 'api.channel.getData',
			description: 'Get channel information',
			examples: ['{"action": "channel_get_data", "data": {"name": "channel_test"}},'],
			apiFunct: async(api, data) => {
				return await api.channel.getData(data);
			}
		},
		'channel_get_list': {
			apiCall: 'api.channel.list',
			description: 'Get the list of channels',
			examples: [
				'{"action": "channel_get_list"}',
				'{"action": "channel_get_list", "data": {"display": ["title", "media_nb"]}}'			
			],
			apiFunct: async(api, data) => {
				return await api.channel.list(data);
			}
		},
		'channel_post_content': {
			apiCall: 'api.channel.postContent',
			description: 'Put content (playlist, media) into a channel',
			examples: [
				'{"action": "channel_post_content", "data": {"name": "channel_test", "contentType": "playlist", "contentName": "playlist_test_api"}}',
				'{"action": "channel_post_content", "data": {"name": "channel_test", "contentType": "slide", "contentName": "slide_test_api"}}',
				'{"action": "channel_post_content", "data": {"name": "channel_test", "contentType": "stream", "contentName": "stream_test_api"}}',
				'{"action": "channel_post_content", "data": {"name": "channel_test", "contentType": "web", "contentName": "web_test_api"}}',
				'{"action": "channel_post_content", "data": {"name": "channel_test", "contentType": "media", "contentName": "video1_testcontent_api", "rank": 1}}'
			],
			apiFunct: async(api, data) => {
				return await api.channel.postContent(data);
			}
		},
		'channel_post_synchro': {
			apiCall: 'api.channel.postSynchro',
			description: 'Create a web page synchro into a channel. You must specify the IP / port of the AS server',
			examples: ['{"action": "channel_post_synchro", "data": {"name": "channel_test", "id": "tmp_channel_id", "rank": 1, "ip": "192.168.1.18", "port": 3100}}'],
			apiFunct: async(api, data) => {
				return await api.channel.postSynchro(data);
			}
		},
		'channel_publish': {
			apiCall: 'api.channel.publish',
			description: 'Publish a channel',
			examples: ['{"action": "channel_publish", "data": {"name": "channel_test"}}'],
			apiFunct: async(api, data) => {
				return await api.channel.publish(data);
			}
		},
		'channel_upload_content': {
			apiCall: 'api.channel.uploadContent',
			description: 'Upload a content from your storage (ex: PC) into a channel',
			examples: [
				'{"action": "channel_upload_content", "data": {"name": "channel_test", "src": "D:/images/img1.jpg", "contentName": "img_test_1"}}',
				'{"action": "channel_upload_content", "data": {"name": "channel_test", "src": "D:/ppts/powerpoint.pptx", "contentName": "media_ppt_1", "description": "Powerpoint file"}}'],
			apiFunct: async(api, data) => {
				return await api.channel.uploadContent(data);
			}
		},
		'check_synchro': {
			apiCall: 'checkSynchro',
			description: 'Check the display of a synchro page by a player',
			examples: [
				'{"action": "check_synchro", "data": {"id": "tmp_channel_synchro", "timeOut": 120}}'
			],
			apiFunct: async(api, data) => {
				return await checkSynchro(data);
			}
		},
		'delete_synchro': {
			apiCall: 'api.web.delete',
			description: 'Delete a synchro page (web)',
			examples: ['{"action": "delete_synchro", "data": {"id": "tmp_channel_id1"}}'],
			apiFunct: async(api, data) => {
				return await api.web.delete({ ...data, name: 'web_synchro_' + data.id });
			}
		},
		'device_check_config': {
			apiCall: 'api.device.checkConfig',
			description: 'Check the configuration of a device',
			examples: [
				'{"action": "device_check_config", "data": {"name": "QA_PLAYER", "check": {"boot_time": "04:00:00","boot_type": "complet", "subtitle_default_lang": "es", "screen_diag_duration": "300"}}}',
				'{"action": "device_check_config", "data": {"name": "QA_PLAYER", "check": {"start_diff": "09:00:00","end_diff": "18:00:00", "hebdo_days": "67"}}}',
				'{"action": "device_check_config", "data": {"name": "QA_PLAYER", "timeOut": 90, "check":  {"browser": "chrome"}}}'
			],
			apiFunct: async(api, data) => {
				return await api.device.checkConfig(data);
			}
		},
		'device_check_content_status': {
			apiCall: 'api.device.checkContentStatus',
			description: 'Check the content status informatiuon of a device',
			examples: [
				'{"action": "device_check_content_status",\n\
					"data": {\n\
						"name": "QA_ERIC",\n\
						"check": {\n\
							"channel": {"display_name": "channel_test_content", "current_version": 5, "version": "ok"},\n\
							"playlist": [\n\
								{"display_name": "playlist_test_content_1", "current_version": 5, "version": "ok", "global_state": "ok", "rights": true, "folder_percent_download": 100, "enabled": true, "isExistDeferredMedia": false},\n\
								{"display_name": "playlist_test_content_2", "version": "ok", "global_state": "ok", "rights": true, "folder_percent_download": 100, "enabled": true, "isExistDeferredMedia": false}\n\
							],\n\
							"playlistList": ["playlist_test_content_1", "playlist_test_content_2"],\n\
							"feed": [{"display_name": "rss_do_not_delete", "rights": true, "global_state": "ok", "version": "ok"}],\n\
                        	"feedList": ["rss_do_not_delete"]\n\
							"contentError": 0,\n\
							"mediaError": 0\n\
						}\n\
					}\n\
				}'
			],
			apiFunct: async(api, data) => {
				return await api.device.checkContentStatus(data);
			}
		},
		'device_check_data': {
			apiCall: 'api.device.checkData',
			description: 'Check the data of a device',
			examples: [
				'{"action": "device_check_data",\n\
					"data": {\n\
						"name": "QA_PLAYER",\n\
						"check": {\n\
							"title": "QA_PLAYER",\n\
							"associated_channel_name": "channel_test",\n\
							"associated_channel_status": "ready",\n\
							"broadcast_message": "broadcast_in_progress",\n\
							"broadcast_status": "ok",\n\
							"channel_name": "channel_test",\n\
							"content_status": "ok",\n\
							"global_status": "ok",\n\
							"hardware_status": "ok",\n\
							"is_enabled": "yes",\n\
							"mac_address": "F4:4D:30:6A:A3:B5",\n\
							"monitor_info": "Controle Basique",\n\
							"main_server": "http://qa-dsapi.piksel.com/",\n\
							"main_server_api": "http://qa-dsapi.piksel.com/",\n\
							"network_status": "ok"\n\
						}\n\
					}\n\
				}'
			],
			apiFunct: async(api, data) => {
				return await api.device.checkData(data);
			}
		},
		'device_check_logs': {
			apiCall: 'api.device.checkLogs',
			description: 'Download and check the logs of a device',
			examples: ['{"action": "device_check_logs", "data": {"name": "QA_PLAYER"}}'],
			apiFunct: async(api, data) => {
				return await api.device.checkLogs(data);
			}
		},
		'device_check_rights_to_list': {
			apiCall: 'api.device.checkRights',
			description: 'Check the rights (set / unset) of a device to a list of element',
			examples: [
				'{"action": "device_check_rights_to_list", "data": {"name": "QA_PLAYER", "type": "playlist", "list": ["playlist_1", "playlist_2"], "value": "set"}}',
				'{"action": "device_check_rights_to_list", "data": {"name": "QA_PLAYER", "type": "playlist", "list": ["playlist_1", "playlist_2"], "value": "unset"}}',
				'{"action": "device_check_rights_to_list", "data": {"name": "QA_PLAYER", "type": "variable", "list": ["var_test"], "value": "set"}}'
			],
			apiFunct: async(api, data) => {
				return await api.device.checkRights(data);
			}
		},
		'device_get_content_status': {
			apiCall: 'api.device.getContentStatus',
			description: 'Get the content status information of a device',
			examples: ['{"action": "device_get_content_status", "data": {"name": "QA_PLAYER", "infos": ["channel", "playlist", "variable", "error"]}}'],
			apiFunct: async(api, data) => {
				return await api.device.getContentStatus(data);
			}
		},
		'device_get_data': {
			apiCall: 'api.device.getData',
			description: 'Get the data of a device',
			examples: ['{"action": "device_get_data", "data": {"name": "QA_PLAYER"}}'],
			apiFunct: async(api, data) => {
				return await api.device.getData(data);
			}
		},
		'device_get_list': {
			apiCall: 'api.device.list',
			description: 'Display the list of devices. You can filter on attributes value and status',
			examples: [
				'{"action": "device_get_list", "data": {"attributes": {"network_status": "error", "alert_status[]": "network"}, "display": ["title", "network_status"]}}',
				'{"action": "device_get_list", "data": {"display": ["title", "content_status", "network_status"], "status": ["enabled", "content_ok", "network_ok"]}}'
			],
			apiFunct: async(api, data) => {
				return await api.device.list(data);
			}
		},
		'device_get_logs': {
			apiCall: 'api.device.getLogs',
			description: 'Download the logs of a device',
			examples: ['{"action": "device_get_logs", "data": {"name": "QA_PLAYER"}}'],
			apiFunct: async(api, data) => {
				return await api.device.getLogs(data);
			}
		},
		'device_request_logs': {
			apiCall: 'api.device.requestLogs',
			description: 'Request the logs of a device',
			examples: ['{"action": "device_request_logs", "data": {"name": "QA_PLAYER"}},'],
			apiFunct: async(api, data) => {
				return await api.device.requestLogs(data);
			}
		},
		'device_rights_to_list': {
			apiCall: 'api.device.setRights',
			description: 'Set / Unset the rights of a device to a list of elements',
			examples: [
				'{"action": "device_rights_to_list", "data": {"name": "QA_PLAYER", "type": "playlist", "list": ["playlist_1", "playlist_2", "value": "set"}}',
				'{"action": "device_rights_to_list", "data": {"name": "QA_PLAYER", "type": "playlist", "list": ["playlist_1", "playlist_2", "value": "unset"}}',
				'{"action": "device_rights_to_list", "data": {"name": "QA_PLAYER", "type": "variable", "list": ["var_api_test"], "value": "set"}}'
			],
			apiFunct: async(api, data) => {
				return await api.device.setRights(data);
			}
		},
		'device_set_config': {
			apiCall: 'api.device.setConfig',
			description: 'Set the configuration of a device',
			examples: [
				'{"action": "device_set_config", "data": {"name": "QA_PLAYER", "config": {"start_diff": "08:00:00", "end_diff": "18:00:00", "hebdo_days": "67"}}}',
				'{"action": "device_set_config", "data": {"name": "QA_PLAYER", "config": {"boot_time": "04:31:00", "boot_type": "complet", "subtitle_default_lang": "es", "screen_diag_duration": "555"}}}'
			],
			apiFunct: async(api, data) => {
				return await api.device.setConfig(data);
			}
		},
		'event_check_data': {
			apiCall: 'api.event.checkData',
			description: 'Check the data of an event',
			examples: ['{"action": "event_check_data", "data": {"name": "event_test", "check": {"type_event": "classic", "channel_title": "channel_event"}}}'],
			apiFunct: async(api, data) => {
				return await api.event.checkData(data);
			}
		},
		'event_check_exist': {
			apiCall: 'api.event.exist',
			description: 'Check an event exists',
			examples: ['{"action": "event_check_exist", "data": {"name": "event_test"}}'],
			apiFunct: async(api, data) => {
				return await api.event.exist(data);
			}
		},
		'event_create': {
			apiCall: 'api.event.create',
			description: 'Create an event',
			examples: [
				'{"action": "event_create", "data": {"name": "event_test", "channel": "channel_event", "type": "classic", "start": "June 19, 2022 15:00:00", "end": "June 19, 2022 16:00:00", "deviceList": ["QA_PLAYER"]}}',
				'{"action": "event_create", "data": {"name": "event_test", "channel": "channel_event", "type": "classic", "startInMin": 5, "endInMin": 10, "deviceList": ["QA_PLAYER"]}}'
			],
			apiFunct: async(api, data) => {
				return await api.event.create(data);
			}
		},
		'event_delete': {
			apiCall: 'api.event.delete',
			description: 'Delete an event',
			examples: ['{"action": "event_delete", "data": {"name": "event_test"}}'],
			apiFunct: async(api, data) => {
				return await api.event.delete(data);
			}
		},
		'event_get_data': {
			apiCall: 'api.event.getData',
			description: 'Get the data of an event',
			examples: ['{"action": "event_get_data", "data": {"name": "event_test"}}'],
			apiFunct: async(api, data) => {
				return await api.event.getData(data);
			}
		},
		'event_get_list': {
			apiCall: 'api.event.getData',
			description: 'Get and display the list of events',
			examples: ['{"action": "event_get_list"}'],
			apiFunct: async(api, data) => {
				return await api.event.list(data);
			}
		},
		'feed_check_content_nb': {
			apiCall: 'api.feed.checkContentNb',
			description: 'Check the number of generated elements in a feed',
			examples: ['{"action": "feed_check_content_nb", "data": {"name": "xml_feed_test", "nbContent": 3}}'],
			apiFunct: async(api, data) => {
				return await api.feed.checkContentNb(data);
			}
		},
		'feed_check_data': {
			apiCall: 'api.feed.checkData',
			description: 'Check data of a feed',
			examples: ['{"action": "feed_check_data", "data": {"name": "rss_feed_test", "check": {"generation_status": "ok"}}},'],
			apiFunct: async(api, data) => {
				return await api.feed.checkData(data);
			}
		},
		'feed_create': {
			apiCall: 'api.feed.create',
			description: 'Create a feed',
			examples: [
				'{"action": "feed_create",\n\
					"data": {\n\
						"name": "xml_mob_api_21",\n\
						"type": "xml",\n\
						"template": "mob_feed",\n\
						"url": "http://ftp.ds-piksel.com/feeds/XML/MOB/ava06.xml",\n\
						"frequency": "3m",\n\
						"nbItem": 3,\n\
						"typeGeneration": "n-1",\n\
						"node": "/data/page",\n\
						"fields": {\n\
							"Ent1_i": "/entete/ent1",\n\
							"Ent2_i": "/entete/ent2",\n\
							"Ent3_i": "/entete/ent3",\n\
							"Ent4_i": "/entete/ent4",\n\
							"Col1_i": "/ligne[i]/col1",\n\
							"Col2_i": "/ligne[i]/col2",\n\
							"Col3_i": "/ligne[i]/col3",\n\
							"Col4_i": "/ligne[i]/col4",\n\
							"Retard_i": "/ligne[i]/retard",\n\
							"Message_i": "/ligne[i]/message",\n\
							"No_voit1_i": "/ligne[i]/no_voit1",\n\
							"No_voit2_i": "/ligne[i]/no_voit2",\n\
							"No_voit3_i": "/ligne[i]/no_voit3",\n\
							"No_voit4_i": "/ligne[i]/no_voit4",\n\
							"No_voit5_i": "/ligne[i]/no_voit5",\n\
							"No_voit6_i": "/ligne[i]/no_voit6",\n\
							"No_voit7_i": "/ligne[i]/no_voit7",\n\
							"No_voit8_i": "/ligne[i]/no_voit8",\n\
							"No_voit9_i": "/ligne[i]/no_voit9",\n\
							"Text_indispo_i": "/text_indispo",\n\
							"Img_secteurs_i": "/ligne[i]/img_secteurs",\n\
							"Img_voit1_i": "/ligne[i]/img_voit1",\n\
							"Img_voit2_i": "/ligne[i]/img_voit2",\n\
							"Img_voit3_i": "/ligne[i]/img_voit3",\n\
							"Img_voit4_i": "/ligne[i]/img_voit4",\n\
							"Img_voit5_i": "/ligne[i]/img_voit5",\n\
							"Img_voit6_i": "/ligne[i]/img_voit6",\n\
							"Img_voit7_i": "/ligne[i]/img_voit7",\n\
							"Img_voit8_i": "/ligne[i]/img_voit8",\n\
							"Img_voit9_i": "/ligne[i]/img_voit9"\n\
						}\n\
					}\n\
				}',
				'{"action": "feed_create",\n\
					"data": {\n\
						"name": "rss_feed_test_api",\n\
						"type": "rss",\n\
						"url": "https://www.nasa.gov/rss/dyn/educationnews.rss",\n\
						"frequency": "15m",\n\
						"nbItem": 2,\n\
						"template": "slideTemplate_rss_test_api"\n\
					}\n\
				}',
				'{"action": "feed_create",\n\
					"data": {\n\
						"name": "ftp_feed_test_api",\n\
						"type": "ftp",\n\
						"url": "ftp://ftp.ds-piksel.com",\n\
						"login":"qa",\n\
						"password": "QA!Ks-player2019",\n\
						"frequency":\n\
						"15m",\n\
						"nbItem": 10,\n\
						"ftpXmlPath": "/feeds/PIKSEL_TEST/index.xml",\n\
						"ftpXmlNodeType": "Info"\n\
					}\n\
				}'
			],
			apiFunct: async(api, data) => {
				return await api.feed.create(data);
			}
		},
		'feed_delete': {
			apiCall: 'api.feed.delete',
			description: 'Delete a feed',
			examples: ['{"action": "feed_delete", "data": {"name": "xml_feed_test"}}'],
			apiFunct: async(api, data) => {
				return await api.feed.delete(data);
			}
		},
		'feed_generate': {
			apiCall: 'api.feed.generate',
			description: 'Generate a new feed content',
			examples: ['{"action": "feed_generate", "data": {"name": "xml_feed_test"}}'],
			apiFunct: async(api, data) => {
				return await api.feed.generate(data);
			}
		},
		'feed_get_content': {
			apiCall: 'api.feed.getContent',
			description: 'Get the content of a feed',
			examples: ['{"action": "feed_get_content", "data": {"name": "xml_feed_test"}}'],
			apiFunct: async(api, data) => {
				return await api.feed.getContent(data);
			}
		},
		'feed_get_data': {
			apiCall: 'api.feed.getData',
			description: 'Get the data of a feed',
			examples: ['{"action": "feed_get_data", "data": {"name": "xml_feed_test"}}'],
			apiFunct: async(api, data) => {
				return await api.feed.getData(data);
			}
		},
		'feed_get_list': {
			apiCall: 'api.feed.list',
			description: 'List and display feeds',
			examples: ['{"action": "feed_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.feed.list(data);
			}
		},
		'layout_create': {
			apiCall: 'api.layout.create',
			description: 'Create a layout from a layout template',
			examples: ['{"action": "layout_create", "data": {"name": "layout_test", "template": "layoutTemplate_test"}}'],
			apiFunct: async(api, data) => {
				return await api.layout.create(data);
			}
		},
		'layout_delete': {
			apiCall: 'api.layout.delete',
			description: 'Delete a layout',
			examples: ['{"action": "layout_delete", "data": {"name": "layout_test"}}'],
			apiFunct: async(api, data) => {
				return await api.layout.delete(data);
			}
		},
		'layout_generate': {
			apiCall: 'api.layout.generate',
			description: 'Generate a layout',
			examples: ['{"action": "layout_generate", "data": {"name": "layout_test", "broadcastAreaList": [{"name": "Insert", "playlist": "playlist_1"}]}}'],
			apiFunct: async(api, data) => {
				return await api.layout.generate(data);
			}
		},
		'layout_generate_all': {
			apiCall: 'api.layout.generateAll',
			description: 'Generate all layouts',
			examples: ['{"action": "layout_generate_all"}'],
			apiFunct: async(api, data) => {
				return await api.layout.generateAll(data);
			}
		},
		'layout_get_content': {
			apiCall: 'api.layout.getContent',
			description: 'Get the content of a layout',
			examples: ['{"action": "layout_get_content", "data": {"name": "layout_test"}}'],
			apiFunct: async(api, data) => {
				return await api.layout.getContent(data);
			}
		},
		'layout_get_data': {
			apiCall: 'api.layout.getData',
			description: 'Get the data of a layout',
			examples: ['{"action": "layout_get_data", "data": {"name": "layout_test"}}'],
			apiFunct: async(api, data) => {
				return await api.layout.getData(data);
			}
		},
		'layout_get_id': {
			apiCall: 'api.layout.getId',
			description: 'Get the id of a layout',
			examples: ['{"action": "layout_get_id", "data": {"name": "layout_test"}}'],
			apiFunct: async(api, data) => {
				return await api.layout.getId(data);
			}
		},
		'layout_get_list': {
			apiCall: 'api.layout.list',
			description: 'Get and display layouts',
			examples: ['{"action": "layout_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.layout.list(data);
			}
		},
		'layoutTemplate_delete': {
			apiCall: 'api.layoutTemplate.delete',
			description: 'Delete a layout template',
			examples: ['{"action": "layoutTemplate_delete", "data": {"name": "layoutTemplate_test"}}'],
			apiFunct: async(api, data) => {
				return await api.layoutTemplate.delete(data);
			}
		},
		'layoutTemplate_get_list': {
			apiCall: 'api.layoutTemplate.list',
			description: 'List and display layout template',
			examples: ['{"action": "layoutTemplate_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.layoutTemplate.list(data);
			}
		},
		'layoutTemplate_upload': {
			apiCall: 'api.layoutTemplate.upload',
			description: 'Upload a layout template',
			examples: ['{"action": "layoutTemplate_upload", "data": {"name": "layoutTemplate_airbox", "src": "D:/layoutTemplates/airbox/airbox"}}'],
			apiFunct: async(api, data) => {
				return await api.layoutTemplate.upload(data);
			}
		},
		'media_check_data': {
			apiCall: 'api.media.checkData',
			description: 'Check data of a media',
			examples: ['{"action": "media_check_data", "data": {"name": "media_test", "description": "Media test"}}'],
			apiFunct: async(api, data) => {
				return await api.media.checkData(data);
			}
		},
		'media_check_exist': {
			apiCall: 'api.media.exist',
			description: 'Check media exists',
			examples: ['{"action": "media_check_exist", "data": {"name": "media_test"}}'],
			apiFunct: async(api, data) => {
				return await api.media.exist(data);
			}
		},
		'media_check_video_encoded': {
			apiCall: 'api.media.checkVideoEncoded',
			description: 'Check media video has been properly encoded',
			examples: [
				'{"action": "media_check_video_encoded", "data": {"name": "media_test"}}',
				'{"action": "media_check_video_encoded", "data": {"name": "media_test_api_video", "timeOut": "180"}}'
			],
			apiFunct: async(api, data) => {
				return await api.media.checkVideoEncoded(data);
			}
		},
		'media_delete': {
			apiCall: 'api.media.delete',
			description: 'Delete a media',
			examples: ['{"action": "media_delete", "data": {"name": "media_test"}}'],
			apiFunct: async(api, data) => {
				return await api.media.delete(data);
			}
		},
		'media_get_data': {
			apiCall: 'api.media.getData',
			description: 'Get the data of a media',
			examples: ['{"action": "media_get_data", "data": {"name": "media_test"}}'],
			apiFunct: async(api, data) => {
				return await api.media.getData(data);
			}
		},
		'media_get_list': {
			apiCall: 'api.media.list',
			description: 'Get and display the list of media',
			examples: ['{"action": "media_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.media.list(data);
			}
		},
		'media_upload': {
			apiCall: 'api.media.upload',
			description: 'Get and display the list of media',
			examples: ['{"action": "media_upload", "data": {"name": "video_test_1", "src": "D:/medias/videos/ways.mp4"}},'],
			apiFunct: async(api, data) => {
				return await api.media.upload(data);
			}
		},
		'playlist_check_content_list': {
			apiCall: 'api.playlist.checkContentList',
			description: 'Check the content of a playlist',
			examples: ['{"action": "playlist_check_content_list", "data": {"name": "do_not_delete", "contentList": ["bg4.jpg", "img_api", "newYear.mp4"]}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.checkContentList(data);
			}
		},
		'playlist_check_content_nb': {
			apiCall: 'api.playlist.checkContentNb',
			description: 'Check the nb of a specific element in a playlist',
			examples: ['{"action": "playlist_check_content_nb", "data": {"name": "playlist_test", "contentName": "slide_test", "nbContent": 1}},'],
			apiFunct: async(api, data) => {
				return await api.playlist.checkContentNb(data);
			}
		},
		'playlist_check_data': {
			apiCall: 'api.playlist.checkData',
			description: 'Check the data of a playlist',
			examples: ['{"action": "playlist_check_data", "data": {"name": "playlist_test", "check": {"title": "playlist_test", "description": "New test playlist", "media_nb": 10}}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.checkData(data);
			}
		},
		'playlist_check_exist': {
			apiCall: 'api.playlist.exist',
			description: 'Check a playlist exists',
			examples: ['{"action": "playlist_check_exist", "data": {"name": "playlist_test"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.exist(data);
			}
		},
		'playlist_check_rights_to_device_list': {
			apiCall: 'api.playlist.checkRights',
			description: 'Check the rights of a playlist is set / unset to a list of devices',
			examples: [
				'{"action": "playlist_check_rights_to_device_list", "data": {"name": "playlist_test", "deviceList": ["QA_PLAYER_1", "QA_PLAYER_2"], "value": "set"}}',
				'{"action": "playlist_check_rights_to_device_list", "data": {"name": "playlist_test", "deviceList": ["QA_PLAYER_1", "QA_PLAYER_2"], "value": "unset"}}'
			],
			apiFunct: async(api, data) => {
				return await api.playlist.checkRights(data);
			}
		},
		'playlist_create': {
			apiCall: 'api.playlist.create',
			description: 'Create a playlist',
			examples: ['{"action": "playlist_create", "data": {"name": "playlist_test", "description": "New test playlist"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.create(data);
			}
		},
		'playlist_delete': {
			apiCall: 'api.playlist.delete',
			description: 'Delete a playlist',
			examples: ['{"action": "playlist_delete", "data": {"name": "playlist_test"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.delete(data);
			}
		},
		'playlist_delete_content': {
			apiCall: 'api.playlist.deleteContent',
			description: 'Delete an element from a playlist content',
			examples: ['{"action": "playlist_delete_content", "data": {"name": "playlist_1", "contentName": "image_1"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.deleteContent(data);
			}
		},
		'playlist_delete_multiContent': {
			apiCall: 'api.playlist.deleteMultiContent',
			description: 'Delete multiple element from a playlist content',
			examples: ['{"action": "playlist_delete_multiContent", "data": {"name": "playlist_test", "mediaList": ["media_test_1", "media_test_2"]}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.deleteMultiContent(data);
			}
		},
		'playlist_get_content': {
			apiCall: 'api.playlist.getContent',
			description: 'Get and display the content of a playlist',
			examples: ['{"action": "playlist_get_content", "data": {"name": "playlist_test", "display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.getContent(data);
			}
		},
		'playlist_get_data': {
			apiCall: 'api.playlist.getData',
			description: 'Get the data of a playlist',
			examples: ['{"action": "playlist_get_data", "data": {"name": "playlist_test"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.getData(data);
			}
		},
		'playlist_get_id': {
			apiCall: 'api.playlist.getId',
			description: 'Get the id of a playlist',
			examples: ['{"action": "playlist_get_id", "data": {"name": "playlist_test"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.getId(data);
			}
		},
		'playlist_get_list': {
			apiCall: 'api.playlist.list',
			description: 'Get and display the list of playlists',
			examples: ['{"action": "playlist_get_list", "data": {"display": ["title", "media_nb"]}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.list(data);
			}
		},
		'playlist_post_content': {
			apiCall: 'api.playlist.postContent',
			description: 'Put content from library into a playlist',
			examples: [
				'{"action": "playlist_post_content", "data": {"name": "playlist_1", "contentType": "slide", "contentName": "slide_1"}}',
				'{"action": "playlist_post_content", "data": {"name": "playlist_1", "contentType": "playlist", "contentName": "playlist_test"}}',
				'{"action": "playlist_post_content", "data": {"name": "playlist_1", "contentType": "stream", "contentName": "stream_test_api"}}',
				'{"action": "playlist_post_content", "data": {"name": "playlist_1", "contentType": "media", "contentName": "video_1"}}',
				'{"action": "playlist_post_content", "data": {"name": "playlist_1", "contentType": "web", "contentName": "web_1"}}'
			],
			apiFunct: async(api, data) => {
				return await api.playlist.postContent(data);
			}
		},
		'playlist_post_synchro': {
			apiCall: 'api.playlist.postSynchro',
			description: 'Put a web page synchro into a playlist. You must specify the IP address and port of the AS server',
			examples: ['{"action": "playlist_post_synchro", "data": {"name": "synchro_1", "id": "synchro_1", "rank": 1, "ip": "192.168.1.18", "port": 3100}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.postSynchro(data);
			}
		},
		'playlist_publish': {
			apiCall: 'api.playlist.publish',
			description: 'Publish a playlist',
			examples: ['{"action": "playlist_publish", "data": {"name": "playlist_test"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.publish(data);
			}
		},
		'playlist_rights_to_device_list': {
			apiCall: 'api.playlist.deviceRights',
			description: 'Set / Unset the rights of a playlist to a list of a devices',
			examples: [
				'{"action": "playlist_rights_to_device_list", "data": {"name": "playlist_test", "deviceList": ["QA_PLAYER_1", "QA_PLAYER_2"], "value": "set"}}',
				'{"action": "playlist_rights_to_device_list", "data": {"name": "playlist_test", "deviceList": ["QA_PLAYER_1", "QA_PLAYER_2"], "value": "unset"}}'
			],
			apiFunct: async(api, data) => {
				return await api.playlist.deviceRights(data);
			}
		},
		'playlist_upload_content': {
			apiCall: 'api.playlist.uploadContent',
			description: 'Upload a content from your storage (ex: image in your PC) into a playlist',
			examples: ['{"action": "playlist_upload_content", "data": {"name": "playlist_test", "src": "D:/medias/images/bg8.jpg", "contentName": "image_8"}}'],
			apiFunct: async(api, data) => {
				return await api.playlist.uploadContent(data);
			}
		},
		'qm_check_exist': {
			apiCall: 'api.qm.check',
			description: 'Check the existence and the status of a quick message for a device',
			examples: [
				'{"action": "qm_check_exist", "data": {"check": {"device": "QA_PLAYER", "title": "channel_update", "type": "command", "status": "end"}}}',
				'{"action": "qm_check_exist", "data": {"check": {"device": "QA_PLAYER", "title": "folder_update", "type": "command", "status": "new", "folder_name": "playlist_test"}}}',
				'{"action": "qm_check_exist", "data": {"maxDelay": 60, "check": {"device": "QA_PLAYER", "title": "config_update", "type": "set", "status": "new"}}}'
			],
			apiFunct: async(api, data) => {
				return await api.qm.check(data);
			}
		},
		'qm_delete_all': {
			apiCall: 'api.qm.deleteAll',
			description: 'Delete all quick message for a device',
			examples: ['{"action": "qm_delete_all", "data": {"device": "QA_PLAYER"}}'],
			apiFunct: async(api, data) => {
				return await api.qm.deleteAll(data);
			}
		},
		'qm_get_list': {
			apiCall: 'api.qm.list',
			description: 'Get and display the list of quick message',
			examples: [
				'{"action": "qm_get_list", "data": {"display": ["device", "title", "type", "status", "date", "params"]}}',
				'{"action": "qm_get_list", "data": {"filter": {"device": "QA_PLAYER"}]}}'
			],
			apiFunct: async(api, data) => {
				return await api.qm.list(data);
			}
		},
		'qrc_check_exist': {
			apiCall: 'api.qrc.exist',
			description: 'Check a QR code exists',
			examples: ['{"action": "qrc_check_exist", "data": {"name": "qrc_test"}}'],
			apiFunct: async(api, data) => {
				return await api.qrc.exist(data);
			}
		},
		'qrc_create': {
			apiCall: 'api.qrc.create',
			description: 'Create a QR code',
			examples: ['{"action": "qrc_create", "data": {"name": "qrc_test", "url": "http://ds.meylan.test"}},'],
			apiFunct: async(api, data) => {
				return await api.qrc.create(data);
			}
		},
		'qrc_delete': {
			apiCall: 'api.qrc.delete',
			description: 'Delete a QR code',
			examples: ['{"action": "qrc_delete", "data": {"name": "qrc_test"}},'],
			apiFunct: async(api, data) => {
				return await api.qrc.delete(data);
			}
		},
		'qrc_get_data': {
			apiCall: 'api.qrc.getData',
			description: '',
			examples: ['{"action": "qrc_get_data", "data": {"name": "qrc_test"}},'],
			apiFunct: async(api, data) => {
				return await api.qrc.getData(data);
			}
		},
		'qrc_get_list': {
			apiCall: 'api.qrc.list',
			description: 'Get and display the list of QR codes',
			examples: ['{"action": "qrc_get_list"}'],
			apiFunct: async(api, data) => {
				return await api.qrc.list(data);
			}
		},
		'role_check_exist': {
			apiCall: 'api.role.exist',
			description: 'Check a role exists',
			examples: ['{"action": "role_check_exist", "data": {"name": "role_test"}}'],
			apiFunct: async(api, data) => {
				return await api.role.exist(data);
			}
		},
		'role_create': {
			apiCall: 'api.role.create',
			description: 'Create a role',
			examples: ['{"action": "role_create", "data": {"name": "role_test"}}'],
			apiFunct: async(api, data) => {
				return await api.role.create(data);
			}
		},
		'role_delete': {
			apiCall: 'api.role.delete',
			description: 'Delete a role',
			examples: ['{"action": "role_delete", "data": {"name": "role_test"}}'],
			apiFunct: async(api, data) => {
				return await api.role.delete(data);
			}
		},
		'role_get_data': {
			apiCall: 'api.role.getData',
			description: 'Get the data of a role',
			examples: ['{"action": "role_get_data", "data": {"name": "role_test"}}'],
			apiFunct: async(api, data) => {
				return await api.role.getData(data);
			}
		},
		'role_get_list': {
			apiCall: 'api.role.list',
			description: 'Get and displa the list of roles',
			examples: ['{"action": "role_get_list"}'],
			apiFunct: async(api, data) => {
				return await api.role.list(data);
			}
		},
		'role_set_actions': {
			apiCall: 'api.role.setActionList',
			description: 'Set list of authorized actions to a role',
			examples: ['{"action": "role_set_actions", "data": {"name": "role_test", "actions":[4,17,46,52,53,62,75,76,77,78]}}'],
			apiFunct: async(api, data) => {
				return await api.role.setActionList(data);
			}
		},
		'room_create': {
			apiCall: 'api.room.create',
			description: 'Create a room',
			examples: [
				'{"action": "room_create",\n\
					"data": {\n\
						"name": "room_1",\n\
						"number": "1234",\n\
						"capacity": "20",\n\
						"building": "133",\n\
						"floor": "1",\n\
						"description": "room API",\n\
						"organization": "API"\n\
					}\n\
				}'
			],
			apiFunct: async(api, data) => {
				return await api.room.create(data);
			}
		},
		'room_create_booking': {
			apiCall: 'api.room.postBooking',
			description: 'Create a booking for a room',
			examples: [
				'{"action": "room_create_booking",\n\
					"data": {\n\
						"name": "booking_1",\n\
						"room": "room_1",\n\
						"startDate": "2022-08-14",\n\
						"startHour": "16",\n\
						"startMin": "30",\n\
						"endDate": "2022-08-14",\n\
						"endHour": "17",\n\
						"endMin": "30"\n\
					}\n\
				}'
			],
			apiFunct: async(api, data) => {
				return await api.room.postBooking(data);
			}
		},
		'room_create_booking_full': {
			apiCall: 'api.room.postBooking',
			description: 'Create a room',
			examples: ['{"action": "room_create_booking_full", "data": {"name": "booking", "room": "room_1", "date": "2022-02-20"}}'],
			apiFunct: async(api, data) => {
				const startHourList = ['00','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22'];
				const endHourList = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
				var bookingFunct = [];
				startHourList.forEach((startHour, index) => {
					var bookingData = {
						name: data.room + '_' + data.name + '_' + startHour,
						room: data.room,
						startDate: data.date,
						startHour: startHour,
						startMin: '30',
						endDate: data.date,
						endHour: endHourList[index],
						endMin: '15'
					}
					bookingFunct.push(api.room.postBooking(bookingData));
				});
				try {
					const resultList = await Promise.all(bookingFunct);
					logger.log(caller, 'INFO1', 'Init resultList length: ' + resultList.length);
					//Now check the status for each service initialization process
					var allOk = true;
					for(let id=0; id<resultList.length; id++)
						if(!resultList[id].ok) {
							logger.log(caller, 'ERROR', 'ERROR: result is ko for id: ' + id + ', result: ' + resultList[id].ok); 
							allOk = false;
						}
					return {ok: allOk};
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for postBooking. ' + error);
					return {ok: false};
				}
			}
		},
		'room_delete': {
			apiCall: 'api.room.delete',
			description: 'Delete a room',
			examples: ['{"action": "room_delete", "data": {"name": ["room_test_1"]}},'],
			apiFunct: async(api, data) => {
				return await api.room.delete(data);
			}
		},
		'room_get_list': {
			apiCall: 'api.room.list',
			description: 'Get and display the list of rooms',
			examples: ['{"action": "room_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.room.list(data);
			}
		},
		'slide_create': {
			apiCall: 'api.slide.createFromFile',
			description: 'Create a slide from a slide template and data from a file (src)',
			examples: ['{"action": "slide_create", "data": {"name": "slide_test", "src": "D:/slideData/airbox/airbox1.json", "template": "slideTemplate_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slide.createFromFile(data);
			}
		},
		'slide_delete': {
			apiCall: 'api.slide.delete',
			description: 'Delete a slide from library',
			examples: ['{"action": "slide_delete", "data": {"name": "slide_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slide.delete(data);
			}
		},
		'slide_download_pgz': {
			apiCall: 'api.slide.downloadPGZ',
			description: 'Download the pgz file of a slide from library. Set the unzip file to unzip it automatically after download',
			examples: ['{"action": "slide_download_pgz", "data": {"name": "slide_test", "unzip": true}}'],
			apiFunct: async(api, data) => {
				return await api.slide.downloadPGZ(data);
			}
		},
		'slide_get_content': {
			apiCall: 'api.slide.getContent',
			description: 'Get the content of a slide',
			examples: ['{"action": "slide_get_content", "data": {"name": "slide_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slide.getContent(data);
			}
		},
		'slide_get_data': {
			apiCall: 'api.slide.getData',
			description: 'Get the data of a slide',
			examples: ['{"action": "slide_get_data", "data": {"name": "slide_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slide.getData(data);
			}
		},
		'slide_get_list': {
			apiCall: 'api.slide.list',
			description: 'Get and display the list of slides',
			examples: ['{"action": "slide_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.slide.list(data);
			}
		},
		'slide_upload_images_from_pgz': {
			apiCall: 'api.slide.uploadImagesFromPgzToLibrary',
			description: 'Upload images contained into a slide. Was used when images were lost in library',
			examples: ['{"action": "slide_upload_images_from_pgz", "data": {"name": "slide_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slide.uploadImagesFromPgzToLibrary(data);
			}
		},
		'slideTemplate_delete': {
			apiCall: 'api.slideTemplate.delete',
			description: 'Delete a slide template',
			examples: ['{"action": "slideTemplate_delete", "data": {"name": "slideTemplate_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slideTemplate.delete(data);
			}
		},
		'slideTemplate_get_data': {
			apiCall: 'api.slideTemplate.getData',
			description: 'Get the data of a slide template',
			examples: ['{"action": "slideTemplate_get_data", "data": {"name": "slideTemplate_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slideTemplate.getData(data);
			}
		},
		'slideTemplate_get_id': {
			apiCall: 'api.slideTemplate.getId',
			description: 'Get the id of a slide template',
			examples: ['{"action": "slideTemplate_get_id", "data": {"name": "slideTemplate_test"}}'],
			apiFunct: async(api, data) => {
				return await api.slideTemplate.getId(data);
			}
		},
		'slideTemplate_get_list': {
			apiCall: 'api.slideTemplate.list',
			description: 'Get and display the list of slide templates',
			examples: ['{"action": "slideTemplate_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.slideTemplate.list(data);
			}
		},
		'slideTemplate_upload': {
			apiCall: 'api.slideTemplate.upload',
			description: 'Upoad a slide template',
			examples: [
				'{"action": "slideTemplate_upload", "data": {"name": "slideTemplate_test", "type": "manual", "src": "D:/slideTemplates/airbox/airbox1"}}',
				'{"action": "slideTemplate_upload", "data": {"name": "slideTemplate_xml_test", "type": "feed", "src": "D:/slideTemplates/mob_feed"}},'
			],
			apiFunct: async(api, data) => {
				return await api.slideTemplate.upload(data);
			}
		},
		'stream_check_exist': {
			apiCall: 'api.stream.exist',
			description: 'Check a stream exists in lbrary',
			examples: ['{"action": "stream_check_exist", "data": {"name": "stream_test"}}'],
			apiFunct: async(api, data) => {
				return await api.stream.exist(data);
			}
		},
		'stream_create': {
			apiCall: 'api.stream.create',
			description: 'Create a stream in library',
			examples: ['{"action": "stream_create", "data": {"name": "stream_test_api", "url": "http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8"}}'],
			apiFunct: async(api, data) => {
				return await api.stream.create(data);
			}
		},
		'stream_delete': {
			apiCall: 'api.stream.delete',
			description: 'Delete a stream from the library',
			examples: ['{"action": "stream_delete", "data": {"name": "stream_test"}}'],
			apiFunct: async(api, data) => {
				return await api.stream.delete(data);
			}
		},
		'stream_get': {
			apiCall: 'api.stream.get',
			description: 'Get stream information',
			examples: ['{"action": "stream_get", "data": {"name": "stream_test"}}'],
			apiFunct: async(api, data) => {
				return await api.stream.get(data);
			}
		},
		'stream_get_list': {
			apiCall: 'api.stream.list',
			description: 'Get and display the list of streams',
			examples: ['{"action": "stream_get_list"}}'],
			apiFunct: async(api, data) => {
				return await api.stream.list(data);
			}
		},
		'variable_check_data': {
			apiCall: 'api.variable.checkData',
			description: 'Check the data of a variable',
			examples: ['{"action": "variable_check_data", "data": {"name": "var_test", "check": {"value": "API variable test"}}},'],
			apiFunct: async(api, data) => {
				return await api.variable.checkData(data);
			}
		},
		'variable_create': {
			apiCall: 'api.variable.create',
			description: 'Create a variable, type text or image',
			examples: [
				'{"action": "variable_create", "data": {"name": "var_test", "type": "text", "value": "API variable test"}}',
				'{"action": "variable_create", "data": {"name": "var_image_1", "type": "image", "imgLibraryName": "image_1"}}'
			],
			apiFunct: async(api, data) => {
				return await api.variable.create(data);
			}
		},
		'variable_delete': {
			apiCall: 'api.variable.delete',
			description: 'Delete a variable',
			examples: ['{"action": "variable_delete", "data": {"name": "var_test"}}'],
			apiFunct: async(api, data) => {
				return await api.variable.delete(data);
			}
		},
		'variable_get_data': {
			apiCall: 'api.variable.getData',
			description: 'Get the data of a variable',
			examples: ['{"action": "variable_get_data", "data": {"name": "var_test"}}'],
			apiFunct: async(api, data) => {
				return await api.variable.getData(data);
			}
		},
		'variable_get_list': {
			apiCall: 'api.variable.list',
			description: 'Get and display the list of variables',
			examples: ['{"action": "variable_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.variable.list(data);
			}
		},
		'variable_modify': {
			apiCall: 'api.variable.modify',
			description: 'Modify the value of a variable',
			examples: [
				'{"action": "variable_modify", "data": {"name": "var_test", "value": "API variable test modified"}}',
				'{"action": "variable_modify", "data": {"name": "var_image_1", "imgLibraryName": "image_2"}},'
			],
			apiFunct: async(api, data) => {
				return await api.variable.modify(data);
			}
		},
		'wait': {
			apiCall: 'wait',
			description: 'Wait a certain amount of time (seconds)',
			examples: ['{"action": "wait", "data": {"duration": 30}}'],
			apiFunct: async(api, data) => {
				return await wait(data);
			}
		},
		'web_check_exist': {
			apiCall: 'api.web.exist',
			description: 'Check a web page exists in library',
			examples: ['{"action": "web_check_exist", "data": {"name": "web_test"}}'],
			apiFunct: async(api, data) => {
				return await api.web.exist(data);
			}
		},
		'web_create': {
			apiCall: 'api.web.create',
			description: 'Create a web page in library',
			examples: ['{"action": "web_create", "data": {"name": "web_test", "url": "https://www.deezer.com"}}'],
			apiFunct: async(api, data) => {
				return await api.web.create(data);
			}
		},
		'web_delete': {
			apiCall: 'api.web.delete',
			description: 'Delete a web page from library',
			examples: ['{"action": "web_delete", "data": {"name": "web_test"}}'],
			apiFunct: async(api, data) => {
				return await api.web.delete(data);
			}
		},
		'web_get': {
			apiCall: 'api.web.get',
			description: 'Get web page information',
			examples: ['{"action": "web_get", "data": {"name": "web_test"}}'],
			apiFunct: async(api, data) => {
				return await api.web.get(data);
			}
		},
		'web_get_list': {
			apiCall: 'api.web.list',
			description: 'Get and display web pages',
			examples: ['{"action": "web_get_list", "data": {"display": ["title"]}}'],
			apiFunct: async(api, data) => {
				return await api.web.list(data);
			}
		}
	}
	return cmdApiList;
}
/*--------------------------------------------------------------------------------------------
		handleData
---------------------------------------------------------------------------------------------*/
const handleData = async (scenario, task, serverData) => {
	var caller = 'handleData';
	//Perform post action if any
	switch(task.action) {
		case 'device_get_list':
			var displayFilter;
			var dataFilter;
			if(task.data) {
				if(task.data.display)
					displayFilter = task.data.display;
				dataFilter = task.data.filter;
				if(task.data.status) {
					for(var i=0; i<task.data.status.length; i++) {
						for(var id=0; id<serverData.length; id++)
							if(!deviceStatusOk(serverData[id], task.data.status[i]))
								serverData.splice(id,1);
					}
				}
			}
			display(scenario, serverData, displayFilter, dataFilter);
			break;
		case 'device_get_logs':
			displayData(scenario, serverData, null, null);
			break;
		case 'channel_get_list':
		case 'role_get_list':
		case 'event_get_list':
		case 'feed_get_list':
		case 'media_get_list':
		case 'playlist_get_list':
		case 'slide_get_list':
		case 'layout_get_list':
		case 'layoutTemplate_get_list':
		case 'qm_get_list':
		case 'slideTemplate_get_list':
		case 'variable_get_list':
		case 'feed_get_content':
		case 'channel_get_content':
		case 'playlist_get_content':
		case 'web_get_list':
		case 'stream_get_list':
		case 'qrc_get_list':
		case 'room_get_list':
			var displayFilter;
			var dataFilter;
			if(task.data) {
				if(task.data.display)
					displayFilter = task.data.display;
				dataFilter = task.data.filter;
			}
			display(scenario, serverData, displayFilter, dataFilter);
			break;
		case 'get_playlist_id':
		case 'slideTemplate_get_id':
			logScenario(scenario.name, caller, 'INFO0', task.data.name + ' id: ' + serverData);
			break;
		case 'channel_get_data':
		case 'role_get_data':
		case 'role_get':
		case 'channel_get':
		case 'playlist_get_data':
		case 'playlist_get':
		case 'media_get_data':
		case 'media_get':
		case 'layout_get_content':
		case 'layout_get_data':
		case 'slideTemplate_get_data':
		case 'slideTemplate_get':
		case 'device_get_data':
		case 'device_get':
		case 'web_get':
		case 'stream_get':
		case 'qrc_get':
		case 'qrc_get_data':
		case 'variable_get_data':
		case 'slide_get_content':
		case 'slide_get_data':
			//for(var key in serverData)
			//	logScenario(scenario.name, caller, 'INFO0', key + ': ' + JSON.stringify(serverData[key]));
			var displayFilter;
			var dataFilter;
			if(task.data) {
				if(task.data.display)
					displayFilter = task.data.display;
				dataFilter = task.data.filter;
			}
			displayData(scenario, serverData, displayFilter, dataFilter);
			break;
		case 'device_get_content_status':
			logScenario(scenario.name, caller, 'DEBUG', 'Content: ' + JSON.stringify(serverData));
			logScenario(scenario.name, caller, 'INFO0', 'Broadcasted channel: ' + serverData.broadcastedChannel.display_name);
			if(task.data.infos) {
				for(var infoId=0; infoId<task.data.infos.length; infoId++) {
					var info = task.data.infos[infoId];
					logScenario(scenario.name, caller, 'DEBUG', 'info: ' + info);
					if(info == 'channel' && serverData.broadcastedChannel) {
						if(serverData.broadcastedChannel) {
							logScenario(scenario.name, caller, 'INFO0', '--- Channel');
							for(var key in serverData.broadcastedChannel)
								logScenario(scenario.name, caller, 'INFO0', key + ': ' + serverData.broadcastedChannel[key]);
						}
					}
					if(info == 'playlist' && serverData.broadcastedContent) {
						for(var id=0; id<serverData.broadcastedContent.length; id++) {
							var playlist = serverData.broadcastedContent[id];
							logScenario(scenario.name, caller, 'INFO0', '--- Playlist');
							for(var key in playlist)
								logScenario(scenario.name, caller, 'INFO0', key + ': ' + playlist[key]);
						}
					}
					if(info == 'variable' && serverData.authorizedVar) {
						for(var id=0; id<serverData.authorizedVar.length; id++) {
							var variable = serverData.authorizedVar[id];
							logScenario(scenario.name, caller, 'INFO0', '--- Variable');
							for(var key in variable)
								logScenario(scenario.name, caller, 'INFO0', key + ': ' + variable[key]);
						}
					}
					if(info == 'error' && serverData.contentError) {
						for(var id=0; id<serverData.contentError.length; id++) {
							var error = serverData.contentError[id];
							logScenario(scenario.name, caller, 'INFO0', '--- Error');
							for(var key in error)
								logScenario(scenario.name, caller, 'INFO0', key + ': ' + error[key]);
						}
					}
					if(info == 'error' && serverData.mediaError) {
						for(var id=0; id<serverData.mediaError.length; id++) {
							var error = serverData.mediaError[id];
							logScenario(scenario.name, caller, 'INFO0', '--- Error');
							for(var key in error)
								logScenario(scenario.name, caller, 'INFO0', key + ': ' + error[key]);
						}
					}
				}
			}
			break;
		default:
			logScenario(scenario.name, caller, 'DEBUG', 'No post action for ' + task.action);
			break;
	}
}
/*--------------------------------------------------------------------------------------------
		checkSynchro
---------------------------------------------------------------------------------------------*/
checkSynchro = async(data) => {
	const caller = 'checkSynchro';
	const port = 3100;
	const timeOut = (data.timeOut) ? data.timeOut : 30;
	return new Promise((resolve, reject) => {
		const checkId = (req, res) => {
			const id = req.params['id'];
			logger.log(caller, 'INFO0', 'Receive synchro with id: ' + id);
			if(id == data.id) {
				logger.log(caller, 'INFO0', 'Synchro ok for id: ' + id);
				res.status(200).send('Synchro ok. Id: ' + id);
				clearTimeout(timer);
				app.close();
				resolve({ok: true});
			} else {
				logger.log(caller, 'WARNING', 'WARNING: Unexpected synchro id: ' + id);
				res.status(200).send('Unexpected synchro id: ' + id);
			}
		}
		//Create app express instance
		var app = express()
			.use(favicon(__dirname + '/../medias/favicon/favicon.ico'))
			.use('/synchro/:id', checkId)
			.listen(port);
		logger.log(caller, 'INFO1', 'Check synchro server has been started ...');
		const timer = setTimeout(() => {
				logger.log(caller, 'ERROR', 'ERROR: Timeout expired for synchro ' + data.id);
				app.close();
				resolve({ok: false});
			}, 
			timeOut * 1000
		);
	});
}
/*--------------------------------------------------------------------------------------------
		wait
---------------------------------------------------------------------------------------------*/
wait = async(data) => {
	return new Promise(resolve => setTimeout(() => {return resolve({ok: true});}, data.duration * 1000));
}
/*--------------------------------------------------------------------------------------------
		waitUntil
---------------------------------------------------------------------------------------------*/
waitUntil = async(data) => {
	var caller = 'waitUntil';
	var date = Date.now();
	var endDate = new Date(data.date);
	var timeMs = endDate - date;
	return new Promise(resolve => setTimeout(() => {return resolve({ok: true});}, timeMs));
}
/*--------------------------------------------------------------------------------------------
		deviceStatusOk
---------------------------------------------------------------------------------------------*/
var deviceStatusOk = (device, status) => {
	var caller = 'deviceStatusOk';
	var isOk = true;
	switch(status) {
		case 'enabled':
			if(device.is_enabled != 'yes')
				isOk = false;
			break;
		case 'disabled':
			if(device.is_enabled == 'yes')
				isOk = false;
			break;
		case 'network_ok':
			if(device.network_status != 'ok')
				isOk = false;
			break;
		case 'network_ko':
			if(device.network_status == 'ok')
				isOk = false;
			break;
		case 'content_ok':
			if(device.content_status != 'ok')
				isOk = false;
			break;
		case 'content_ko':
			if(device.content_status == 'ok')
				isOk = false;
			break;
		case 'hardware_ok':
			if(device.hardware_status != 'ok')
				isOk = false;
			break;
		case 'hardware_ko':
			if(device.hardware_status == 'ok')
				isOk = false;
			break;
		case 'global_ok':
			if(device.global_status != 'ok')
				isOk = false;
			break;
		case 'global_ko':
			if(device.global_status == 'ok')
				isOk = false;
			break;
		default:
			logSystem(caller, GLOB_LOG_ERR, 'ERROR: status unsupported: ' + status);
			break;
	}
	return isOk;
}
/*--------------------------------------------------------------------------------------------
		display
---------------------------------------------------------------------------------------------*/
var display = (scenario, serverData, displayFilter, dataFilter) => {
	var caller = 'display';
	if(!serverData) 
		logScenario(scenario.name, caller, 'ERROR', 'ERROR: serverData is undefined');
	else {
		if(dataFilter) {
			logScenario(scenario.name, caller, 'INFO2', 'Data filter: ' + JSON.stringify(dataFilter));
			for(let key in dataFilter)
				serverData = serverData.filter((data) => data[key] == dataFilter[key]);
		}
		if(displayFilter) {
			logScenario(scenario.name, caller, 'INFO0', 'displayFilter length: ' + displayFilter.length);
			//Only specified characteristics will be displayed
			for(let id=0; id<serverData.length; id++) {
				var data = serverData[id];
				for(let i=0; i<displayFilter.length; i++) {
					logScenario(scenario.name, caller, 'INFO2', 'Display filter: ' + displayFilter[i]);
					var displayData;
					if(data[displayFilter[i]]) {
						//We must display it
						if((displayFilter[i] == 'date') || (displayFilter[i] == 'last_alive_date') || (displayFilter[i] == 'last_update_date')) {
							var date = new Date(data[displayFilter[i]]);
							displayData = displayFilter[i] + ': ' + date.toLocaleString();
						} else
							displayData = displayFilter[i] + ': ' + data[displayFilter[i]];
					} else {
						logScenario(scenario.name, caller, 'ERROR', 'ERROR: Unavailable display data: ' + displayFilter[i]);
						displayData = displayFilter[i] + ': Undefined';
					}
					logScenario(scenario.name, caller, 'INFO0', displayData);
				}
			}
		} else {
			logScenario(scenario.name, caller, 'INFO0', '------ Full data:');
			serverData.forEach(function(data, index) {
				for(var key in data)
					logScenario(scenario.name, caller, 'INFO0', key + ': ' + JSON.stringify(data[key]));
			});		
		}
	}
}
/*--------------------------------------------------------------------------------------------
		displayData
---------------------------------------------------------------------------------------------*/
var displayData = (scenario, serverData, displayFilter, dataFilter) => {
	var caller = 'displayData';
	if(!serverData) 
		logScenario(scenario.name, caller, 'ERROR', 'ERROR: serverData is undefined');
	else {
		if(dataFilter) {
			logScenario(scenario.name, caller, 'INFO2', 'Data filter: ' + JSON.stringify(dataFilter));
			for(let key in dataFilter)
				serverData = serverData.filter((data) => data[key] == dataFilter[key]);
		}
		if(displayFilter) {
			logScenario(scenario.name, caller, 'INFO2', 'displayFilter length: ' + displayFilter.length);
			//Only specified characteristics will be displayed
			for(let i=0; i<displayFilter.length; i++) {
				logScenario(scenario.name, caller, 'INFO2', 'Display filter: ' + displayFilter[i]);
				var displayData;
				var found = false;
				for(let key in serverData) {
					if(key == displayFilter[i]) {
						found = true;
						//We must display it
						if(key == 'broadcast_message_datetime') {
							var date = new Date(serverData[key]);
							displayData = key + ': ' + date.toLocaleString();
						} else
							displayData = key + ': ' + serverData[key];
						break;
					}
				}
				if(!found) {
					logScenario(scenario.name, caller, 'ERROR', 'ERROR: Unavailable display data: ' + displayFilter[i]);
					displayData = displayFilter[i] + ': Undefined';
				}
				logScenario(scenario.name, caller, 'INFO0', displayData);
			}
		} else {
			logScenario(scenario.name, caller, 'INFO0', '------ Full data:');
			for(let key in serverData) {
				if(key == 'date')
					logScenario(scenario.name, caller, 'INFO0', key + ': ' + new Date(serverData[key]).toLocaleString());
				else
					logScenario(scenario.name, caller, 'INFO0', key + ': ' + serverData[key]);
			}
		}
	}
}
/*--------------------------------------------------------------------------------------------
		logScenario
---------------------------------------------------------------------------------------------*/
var logScenario = (name, caller, level, msg) => {
	var scenarioMsg = '[' + name + ']: ' + msg;
	logger.log(caller, level, scenarioMsg);
}
module.exports = Scenario;