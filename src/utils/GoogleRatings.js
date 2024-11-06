const puppeteer = require('puppeteer');
const fsp = require('fs').promises;
const httpClient = require('./httpClient');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'GoogleRatings');
const SELECTORS = {
	iframe: "div[class='widget-consent-frame-container'] iframe",
	cookie: "div[id='introAgreeButton']",
	ordering: {
		button: "button[data-value='Trier']",
		value: {
			pertinent: "ul[role='menu'] > li:nth-child(1) > div.action-menu-entry-text-container > div.action-menu-entry-text",
			recent: "ul[role='menu'] > li:nth-child(2) > div.action-menu-entry-text-container > div.action-menu-entry-text",
			favorable: "ul[role='menu'] > li:nth-child(3) > div.action-menu-entry-text-container > div.action-menu-entry-text",
			unfavorable: "ul[role='menu'] > li:nth-child(4) > div.action-menu-entry-text-container > div.action-menu-entry-text"
		}
	}
}
const DEFAULT_ORDERING = 'pertinent';
const PATTERNS = {
	itemSelector: "#pane > div > div.widget-pane-content.scrollable-y > div > div > div.section-layout.section-scrollbox.scrollable-y.scrollable-show > div:nth-child(9)",
	offSetSelector: " > div:nth-child",
	offSetStart: 1,
	offSetNumber: 3,
	elementList: [
		{
			"name": "name",
			"type": "text",
			"selector": "div[class='section-review-title']>span"
		},
		{
			"name": "date",
			"type": "text",
			"selector": "span[class='section-review-publish-date']"
		},
		{
			"name": "review",
			"type": "text",
			"selector": "span[class='section-review-text']"
		},
		{
			"name": "rating",
			"type": "attribute",
			"selector": {
				"value": "span[class='section-review-stars']",
				"attribute": "aria-label"
			}
		},
		{
			"name": "photo",
			"type": "photo",
			"selector": {
				"value": "button[class='section-review-photo']",
				"attribute": "style"
			}
		}
	]
}
const SCROLL_DELAY = 1000;
const TMP_DIR = './src/tmp/googleRatings/';
const MEDIA_STARS_DIR = './src/medias/stars/';
/*--------------------------------------------------------------------------------------------
		GoogleRatings
---------------------------------------------------------------------------------------------*/
class GoogleRatings {
	constructor({ url, nbItems, nbPhotos, ordering }) {
		var caller = 'GoogleRatings';
        this.pageUrl = url;
		this.nbItems = nbItems ? nbItems : 1;
		this.nbPhotos = nbPhotos ? nbPhotos : 0;
		this.ordering = ordering ? ordering : DEFAULT_ORDERING;
		this.mustStop = false;
		this.tmpFilePrefix = Math.random().toString(16).substr(2, 8) + '_google_rating_';
		this.tmpFilePath = TMP_DIR + this.tmpFilePrefix;
	}
	async stop() {
		this.mustStop = true;
		await this.close();
	}
	async getRatings() {
		var caller = 'getData';
		this.mustStop = false;
		//Load the page
		logger.log(caller, 'INFO1', 'Loading url ...');
		try {
        	await this.load();
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: load failed');
			logger.error(caller, error);
			return {ok: false};
		}
		logger.log(caller, 'INFO1', 'Page loaded');
		const extractTextFunc = (elementList, currSelector, starsDir, nbPhotos) => {
			//First get current item from the DOM
			const item = document.querySelector(currSelector);
			const entry = {};
			for(let id=0; id<elementList.length; id++) {
				//Get element properties
				const { name, type, selector } = elementList[id];
				switch(type) {
					case 'text':
						//Get text content
						entry[name] = item.querySelector(selector) ? item.querySelector(selector).textContent : '';
						break;
					case 'attribute':
						//Get attribute value
						entry[name] = item.querySelector(selector.value) ? item.querySelector(selector.value).getAttribute(selector.attribute) : 'no data';
						break;
					case 'photo':
						//Extract the requested number of photos if available
						let selectorElement = item.querySelectorAll(selector.value);
						for(let eltId=0 ; eltId<nbPhotos; eltId++) {
							let nameElt = name + (eltId + 1);
							//Get photo url
							if(selectorElement[eltId])
								entry[nameElt] = selectorElement[eltId].getAttribute(selector.attribute).replace('background-image:url(', '').replace(')', '');
							else
								//No photo url available
								entry[nameElt] = null;
						}
						break;
					default:
						console.log('ERROR: bad type: ' + type);
						break;
				}
				//Create stars entry
				if(name == 'rating') {
					//Get the number of stars from ratings text
					let nbStars = entry[name].includes('1') ? 1 : entry[name].includes('2') ? 2 : entry[name].includes('3') ? 3 
						: entry[name].includes('4') ? 4 : entry[name].includes('5') ? 5 : 0;
					entry['stars'] = starsDir + nbStars + '-stars.png';
				}
			}
			return entry;
		}
		logger.log(caller, 'INFO1', 'Getting items list');
        var ratingsData = [];
		//Parse web page till we reach the number of items
		while (!this.mustStop && (ratingsData.length < this.nbItems)) {
			//Set current selector
			const currSelector = PATTERNS.itemSelector + PATTERNS.offSetSelector + '(' + (ratingsData.length*PATTERNS.offSetNumber + PATTERNS.offSetStart) + ')';
			try {
				//Check current selector is reachable
				await this.page.waitForSelector(currSelector, { timeout: 3000 });
				await this.page.focus(currSelector);
			} catch (error) {
				logger.log(caller, 'ERROR', 'ERROR: Timeout for current selector: ' + currSelector);
				this.mustStop = true;
			}
			if(!this.mustStop) {
				try {
					//Click on current value to scroll page accordingly
					const currElement = await this.page.$(currSelector);
					if(currElement) {
						currElement.click();
						//Wait for the data to be displayed
						await this.delay(SCROLL_DELAY);
					} else {
						logger.log(caller, 'ERROR', 'ERROR: Element not found for selector: ' + currSelector);
						this.mustStop = true;
					}
				} catch (error) {
					logger.log(caller, 'ERROR', 'ERROR: page.$ failed');
					logger.error(caller, error);
					this.mustStop = true;
				}
			}
			if(!this.mustStop) {
				try {
					//Get new entry from page
					const newEntry = await this.page.evaluate(extractTextFunc, PATTERNS.elementList, currSelector, MEDIA_STARS_DIR, this.nbPhotos);
					//Push the new entry in ratings table
					ratingsData.push(newEntry);
				} catch (error) {
					logger.log(caller, 'ERROR', 'ERROR: page.evaluate failed');
					logger.error(caller, error);
					this.mustStop = true;
				}
			}
			logger.log(caller, 'INFO1', 'ratingsData length: ' + ratingsData.length);
		}
		//Ratings data have been extracted. Perform post processing job now
		if(!this.mustStop) {
			logger.log(caller, 'INFO2', 'Extraction of data done. Length: ' + ratingsData.length);
			//We are done with the extraction of data.
			//First cleanup existing files in tmp directory
			try {
				//Get file list
				const fileList = await fsp.readdir(TMP_DIR);
				var toDelete = fileList.filter(file => file.includes(this.tmpFilePrefix));
				logger.log(caller, 'INFO2', 'toDelete length: ' + toDelete.length);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: fsp.readDir failed');
				logger.error(caller, error);
				this.mustStop = true;
			}
			//Check if there are some tmp files to delete
			if(toDelete.length > 0) {
				const deleteFile = async(file) => {
					try {
						//Delete file
						await fsp.unlink(TMP_DIR + file);
						return {ok: true};
					} catch(error) {
						logger.log(caller, 'ERROR', 'ERROR: fsp.unlink failed');
						logger.error(caller, error);
						return {ok: false};
					}
				}
				logger.log(caller, 'INFO1', 'Deleting tmp files');
				const deleteFileFunc = toDelete.map(file => {return deleteFile(file);});
				try {
					const resultList = await Promise.all(deleteFileFunc);
					//Now check the global status
					let allOk = resultList.find(result => !result.ok) ? false : true;
					if(!allOk)
						logger.log(caller, 'ERROR', 'ERROR: deleteFileFunc result is ko')
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for deleteFileFunc');
					logger.error(caller, error);
					return {ok: false};
				}
			}
			//Now check if there some images to download
			var allOk = true;
			const ratingsWithPhoto = ratingsData.filter(rating => {
				var haveAtLeastOnePhoto = false;
				for(let photoId=0; photoId<this.nbPhotos; photoId++)
					haveAtLeastOnePhoto |= (rating['photo' + photoId] != null);
				return haveAtLeastOnePhoto;
			});
			logger.log(caller, 'INFO2', 'ratingsWithPhoto length: ' + ratingsWithPhoto.length);
			if(ratingsWithPhoto.length > 0) {
				const downloadPhotos = async(rating) => {
					const downloadPhoto = async(imgUrl) => {
						if(imgUrl != null) {
							//Store the file locally in tmp dir
							let localFile = this.tmpFilePath + Math.random().toString(16).substr(2, 8) + '.jpg';
							try {
								//Download the image
								const result = await httpClient.downloadToFile(imgUrl, localFile);
								if(!result.ok) {
									logger.log(caller, 'ERROR', 'ERROR: httpClient.downloadToFile result is ko');
									return {ok: false};
								}
								//Return uploaded file name
								return ({ok: true, data: localFile});
							} catch(error) {
								logger.log(caller, 'ERROR', 'ERROR: httpClient.downloadToFile failed');
								logger.error(caller, error);
								return {ok: false};
							}
						} else
							return ({ok: true, data: null});
					}
					let urls = [];
					for(let photoId=0; photoId<this.nbPhotos; photoId++)
						urls.push(rating['photo' + (photoId + 1)]);
					const downloadPhotoFunct = urls.map(url => {return downloadPhoto(url);});
					try {
						const resultList = await Promise.all(downloadPhotoFunct);
						//Now check the global status
						for(let photoId=0; photoId<resultList.length; photoId++) {
							if(!resultList[photoId].ok) {
								logger.log(caller, 'ERROR', 'ERROR: downloadPhoto result is ko for photoId ' + photoId);
								rating['photo' + (photoId + 1)] = null;
							} else
								//Set uploaded file name to rating photo entry
								rating['photo' + (photoId + 1)] = resultList[photoId].data;
						}
						return {ok: true};
					} catch(error) {
						logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for downloadPhotosFunct. ' + error);
						logger.error(caller, error);
						return {ok: false};
					}
				};
				//Create array of function for download
				logger.log(caller, 'INFO1', 'We must download images');
				const downloadPhotosFunct = ratingsWithPhoto.map(rating => {return downloadPhotos(rating);});
				try {
					const resultList = await Promise.all(downloadPhotosFunct);
					//Now check the global status
					allOk = resultList.find(result => !result.ok) ? false : true;
					if(!allOk)
						logger.log(caller, 'ERROR', 'ERROR: downloadPhotosFunct result is ko');
					else
						logger.log(caller, 'INFO1', 'Images downloading completed successfully');
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for downloadPhotosFunct. ' + error);
					logger.error(caller, error);
				}
			} else
				logger.log(caller, 'INFO1', 'No image to download');
		} else {
			logger.log(caller, 'WARNING', 'WARNING: We must stop');
			var allOk = false;
		}
		try {
        	await this.close();
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: close failed');
			logger.error(caller, error);
		}
		return ({ok: allOk, data: ratingsData});
    }
	async load() {
		var caller = 'load';
		// Set up browser and page.
		try {
        	this.browser = await puppeteer.launch({headless: true, defaultViewport: null, args:['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']});
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: puppeteer.launch failed');
			logger.error(caller, error);
		}
		try {
        	this.page = await this.browser.newPage();
			await this.page.setViewport({ width: 1920, height: 1080 });
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: browser.newPage failed');
			logger.error(caller, error);
		}
		try {
        	await this.page.goto(this.pageUrl);
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: page.goto failed');
			logger.error(caller, error);
		}
		try {
			//Approve cookies policy if any
			await this.page.waitForSelector(SELECTORS.iframe, { timeout: 5000 });
			try {
				const elementHandle = await this.page.$(SELECTORS.iframe);
				if(elementHandle) {
					logger.log(caller, 'INFO2', 'iframe found');
					const frame = await elementHandle.contentFrame();
					if(frame) {
						logger.log(caller, 'INFO2', 'Got iFrame content');
						await frame.waitForSelector(SELECTORS.cookie);
						const cookieButton = await frame.$(SELECTORS.cookie);
						cookieButton.click();
					} else 
						logger.log(caller, 'ERROR', 'ERROR: Cannot get iFrame content');
				} else
					logger.log(caller, 'WARNING', 'WARNING: No iFrame found');
			} catch (error) {
				logger.log(caller, 'ERROR', 'ERROR: Cookie policy approval failed');
				logger.error(caller, error);
			}
		} catch (error) {
			logger.log(caller, 'WARNING', 'WARNING: waitForSelector timeout: no cookies approval form available');
		}
		try {
			//Ordering ratings
			await this.page.waitForSelector(SELECTORS.ordering.button);
			const orderingMenu = await this.page.$(SELECTORS.ordering.button);
			//Open menu
			orderingMenu.click();
			await this.page.waitForSelector(SELECTORS.ordering.value[this.ordering]);
			//Select ordering mode
			const orderingSelect = await this.page.$(SELECTORS.ordering.value[this.ordering]);
			orderingSelect.click();
			//Wait a while for the new data
			await this.delay(5000);
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: page.evaluate failed');
			logger.error(caller, error);
		}
	}
	delay = (time) => {
		return new Promise(function(resolve) { 
			setTimeout(resolve, time)
		});
	 }
	async close() {
		var caller = 'close';
		// Close the browser if already set
		try {
			if(this.browser)
        		await this.browser.close();
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: browser.close failed');
			logger.error(caller, error);
		}
	}
}
module.exports = GoogleRatings;