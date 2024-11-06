var puppeteer = require('puppeteer');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'scrapData');
/*--------------------------------------------------------------------------------------------
		ScrapData
---------------------------------------------------------------------------------------------*/
class ScrapData {
	constructor({ url, extractList }) {
		var caller = 'ScrapData';
        this.pageUrl = url;
		this.extractList = extractList;
		logger.log(caller, 'INFO2', 'ExtractList length: ' + this.extractList.length);
		this.mustStop = false;
	}
	async stop() {
		this.mustStop = true;
		await this.close();
	}
	async getData() {
		var caller = 'getData';
		logger.log(caller, 'INFO0', 'Loading ...');
		try {
        	await this.load();
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: load failed');
			logger.error(caller, error);
			return {ok: false};
		}
		logger.log(caller, 'INFO0', 'Page loaded');
		for(let id=0; id<this.extractList.length; id++) {
			const { maxItems, selector } = this.extractList[id];
			switch(this.extractList[id].type) {
				case 'text':
					try {
						this.extractList[id].value = await this.getText(maxItems, selector);
						logger.log(caller, 'INFO0', 'Text extracted for selector: ' + selector);
					} catch (error) {
						logger.log(caller, 'ERROR', 'ERROR: getText failed');
						logger.error(caller, error);
						return {ok: false};
					}
					break;
				case 'attribute':
					try {
						this.extractList[id].value = await this.getAttribute(maxItems, selector);
						logger.log(caller, 'INFO0', 'Attributes extracted for selector: ' + selector.element);
					} catch (error) {
						logger.log(caller, 'ERROR', 'ERROR: getAttribute failed');
						logger.error(caller, error);
						return {ok: false};
					}
					break;
				case 'imgUrl':
					try {
						this.extractList[id].value = await this.getImgUrl(maxItems, selector);
						logger.log(caller, 'INFO0', 'Image url extracted for selector: ' + selector);
					} catch (error) {
						logger.log(caller, 'ERROR', 'ERROR: getImgUrl failed');
						logger.error(caller, error);
						return {ok: false};
					}
				default: 
					logger.log(caller, 'ERROR', 'ERROR: Bad type: ' + this.extractList[id].type);
					return {ok: false};
					break;
			}
		}
		logger.log(caller, 'INFO0', 'Extraction of data done');
		try {
        	await this.close();
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: close failed');
			logger.error(caller, error);
		}
		return ({ok: true, data: this.extractList});
    }
    async screenShot(selector, imagePath, callback) {
		var caller = 'screenShot';
		var element;
		try {
			await this.load();
			await this.page.waitForSelector(selector);
			// Select the #svg img element and save the screenshot.
			element = await this.page.$(selector);
		} catch(err) {
			logger.log(caller, 'ERROR', 'ERROR load failed: ' + err);
		}
		try {
			await element.screenshot({
				path: imagePath,
				omitBackground: true,
			});
		} catch(err) {
			logger.log(caller, 'ERROR', 'ERROR element.screenshot failed: ' + err);
		}
		await this.close();
		callback();
    }
	async load() {
		var caller = 'load';
		// Set up browser and page.
		this.browser = await puppeteer.launch({headless: true,args: ['--no-sandbox', '--disable-setuid-sandbox']});
		this.page = await this.browser.newPage();
		await this.page.setViewport({ width: 1920, height: 1080});
		await this.page.goto(this.pageUrl);
	}
	async close() {
		var caller = 'close';
		// Close the browser.
		await this.browser.close();
	}
	async getText(maxItems, selector) {
		var caller = 'getText';
		var extractTextFunc = function(selector) {
			const extractedElements = document.querySelectorAll(selector);
			const items = [];
			for (let element of extractedElements) {
				items.push(element.innerText);
            }
			return items;
		}
		logger.log(caller, 'INFO0', 'Getting text for selector: ' + selector);
		const scrollDelay = 1000;
        let items = [];
		try {
			let previousHeight;
			while (!this.mustStop && (items.length < maxItems)) {
				logger.log(caller, 'INFO2', 'Evaluating page');
				items = await this.page.evaluate(extractTextFunc, selector);
				logger.log(caller, 'INFO2', 'items length: ' + items.length);
				if(items.length < maxItems) {
					logger.log(caller, 'INFO2', 'eval previousHeight');
					previousHeight = await this.page.evaluate('document.body.scrollHeight');
					logger.log(caller, 'INFO2', 'eval scroll. previousHeight: ' + previousHeight);
					await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
					const newHeight = await this.page.evaluate('document.body.scrollHeight');
					logger.log(caller, 'INFO2', 'eval scroll. newHeight: ' + newHeight);
					logger.log(caller, 'INFO2', 'waitForFunction');
					//await this.page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
					logger.log(caller, 'INFO2', 'waitFor');
					await this.page.waitFor(scrollDelay);
				} else
					logger.log(caller, 'INFO2', 'max items reached');
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR during text scraping: ' + error); 
			logger.error(caller, error);
		}
		return items;
	}
	async getAttribute(maxItems, selector) {
		var caller = 'getText';
		const extractAttributeFunc = function(selector) {
			const extractedElements = document.querySelectorAll(selector.element);
			const items = [];
			for (let element of extractedElements) {
				items.push(element.getAttribute(selector.attribute));
			}
			return items;
		}
		logger.log(caller, 'INFO0', 'Getting attribute for selector: ' + selector.element + ', and attribute: ' + selector.attribute);
		const scrollDelay = 1000;
        let items = [];
		try {
		  let previousHeight;
		  while (!this.mustStop && (items.length < maxItems)) {
			logger.log(caller, 'INFO2', 'Evaluating page');
			items = await this.page.evaluate(extractAttributeFunc, selector);
			logger.log(caller, 'INFO2', 'items length: ' + items.length);
			if(items.length < maxItems) {
				logger.log(caller, 'INFO2', 'eval previousHeight');
				previousHeight = await this.page.evaluate('document.body.scrollHeight');
				logger.log(caller, 'INFO2', 'eval scroll. previousHeight: ' + previousHeight);
				await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
				const newHeight = await this.page.evaluate('document.body.scrollHeight');
				logger.log(caller, 'INFO2', 'eval scroll. newHeight: ' + newHeight);
				logger.log(caller, 'INFO2', 'waitForFunction');
				//await this.page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
				logger.log(caller, 'INFO2', 'waitFor');
				await this.page.waitFor(scrollDelay);
			} else
				logger.log(caller, 'INFO2', 'max items reached');
		  }
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR during text scraping: ' + error); 
			logger.error(caller, error);
		}
		return items;
	}
	async getImgUrl(maxImg, selector) {
		var caller = 'getImgUrl';
		var extractImgUrlFunc = function(selector) {
			const images = document.querySelectorAll(selector);
			const url = [];
			imageUrl = url.map.call(images, img => img.src);
			return imageUrl;
		}
		const scrollDelay = 1000;
		let url = [];
		try {
		  let previousHeight;
		  await this.page.evaluate('window.scrollTo(0, 0)');
		  await this.page.waitFor(scrollDelay);
		  while (!this.mustStop && (url.length < maxImg)) {
			url = await this.page.evaluate(extractImgUrlFunc, selector);
			logger.log(caller, 'INFO2', 'url length: ' + url.length + ', maxImg: ' + maxImg);
			previousHeight = await this.page.evaluate('document.body.scrollHeight');
			await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
			await this.page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
			await this.page.waitFor(scrollDelay);
		  }
		} catch(error) { console.log('ERROR during image scraping: ' + error); }
		return url;
	}
}
module.exports = ScrapData;