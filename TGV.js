/*
	TGV
	---
	Written by Algy Taylor on behalf of Conker Media Ltd, November 2011.
	
	I wrote TGV at the start of November 2011 as a bit of a practical exercise following reading Paul Hammond's article on
	24 ways (see [2] in the Bibliography).
	
	NOTES
	-----
	'LaPoste' refers to the original name of the project. 
	
	BIBLIOGRAPHY
	------------
	[1]	Various. "SNCF TGV La Poste". Accessed 4th November 2011.
		http://en.wikipedia.org/wiki/SNCF_TGV_La_Poste
	[2]	Hammond, Paul. "Speed Up Your Site with Delayed Content". Accessed 4th November 2011.
		http://24ways.org/2010/speed-up-your-site-with-delayed-content
	[3]	Various. "Just in time (business)". Accessed 4th November 2011.
		http://en.wikipedia.org/wiki/Just_in_time_(business)
	[4]	"Tobias". "How to check if an element is really visible with JavaScript". Accessed 4th November 2011.
		http://stackoverflow.com/questions/704758#1542908
	[5]	Morr, Ryan. "OnDOMReady No Browser Sniffing". Accessed 3rd November 2011.
		http://ryanmorr.com/archives/ondomready-no-browser-sniffing
	[6]	Thoughtworks, Inc. "Selenium API". Accessed 4th November 2011.
		http://svn.openqa.org/svn/selenium-on-rails/selenium-on-rails/selenium-core/scripts/selenium-api.js
	[7]	Koch, Peter Paul. "Get Styles". Accessed 4th November 2011.
		http://www.quirksmode.org/dom/getstyles.html
	[8]	Stenström, Emil. "Lazy Loading Asyncronous Javascript". Accessed 7th November 2011.
		http://friendlybit.com/js/lazy-loading-asyncronous-javascript/
	[9]	Edwards, Dean (tip from John Resig). "addEvent() - My Solution". Accessed 7th November 2011. 
		http://dean.edwards.name/weblog/2005/10/add-event/
*/
var TGV;

(function () {
	function LaPoste () {
		var self = this;
		
		this.eventGuid = 1; // event handling
		this.scripts = [];
		this._runOnScriptsLoaded = [];
		
		// once the DOM is ready ...
		this.onDOMReady (function () {
			// do stuff onDOMLoad
			self.loadImages();
		});
	};

	/*
		UTILITY FUNCTIONS
		-----------------
	*/
	// http://dean.edwards.name/weblog/2005/10/add-event/
	LaPoste.prototype.addEvent = function (element, type, handler) {
		var self = this,
			handlers;
		
		if (!handler.$$guid) // assign each event an id number
			handler.$$guid = self.eventGuid++;
		if (!element.events) // create a hash table for the events
			element.events = {};
			
		handlers = element.events[type];
		if (!handlers) {
			handlers = element.events[type] = {};
			
			if (element["on" + type])
				handlers[0] = element["on" + type];
		}
		
		handlers[handler.$$guid] = handler;
		
		element["on" + type] = self.handleEvent;
	};

	LaPoste.prototype.removeEvent = function (element, type, handler) {
		if (element.events && element.events[type])
			delete element.events[type][handler.$$guid];
	}; 

	LaPoste.prototype.handleEvent = function (event) {
		var handlers;
		
		event = event || window.event;
		
		handlers = this.events[event.type];
		
		for (var i in handlers) {
			this.$$handleEvent = handlers[i];
			this.$$handleEvent(event);
		}
	};

	/*
		QUEUEING FUNCTIONS
		------------------
	*/
	// http://ryanmorr.com/archives/ondomready-no-browser-sniffing
	LaPoste.prototype.onDOMReady = function (fn, ctx) {
		var self = this,
			timer, ready,
		
			onChange = function (e) {
				if (e && (e.type === "DOMContentLoaded" || e.type === "load")) {
					fireDOMReady();
				} else if (document.readyState) {
					if ((/loaded|complete/).test(document.readyState)) {
						fireDOMReady();
					} else if (!!document.documentElement.doScroll) {
						try {
							ready || document.documentElement.doScroll('left');
						} catch (ex) {
							return;
						}
						fireDOMReady();
					}
				}				
			},
			
			fireDOMReady = function () {
				if (!ready) {
					ready = true;
					fn.call(ctx || window);
					self.removeEvent(document, "DOMContentLoaded", onChange);
					document.onreadystatechange = null;
					window.onload = null;
					clearInterval(timer);
					timer = null;
				}
			};
			
			this.addEvent(document, "DOMContentLoaded", onChange);
			
			document.onreadystatechange = onChange;
			timer = setInterval(onChange, 5);
			window.onload = onChange;
	};

	/*
		EXTERNAL LOADING FUNCTIONS
		--------------------------
	*/
	LaPoste.prototype.js = function (url) {
		var self = this,
			script = document.createElement("script"),
			id = this.scripts.length;
		
		
		script.type = "text/javascript";
		script.src = url;
		script.async = true;
		script.defer = true;
		
		this.onDOMReady (function () {
			document.getElementsByTagName("head")[0].appendChild(script);
		});
		
		// place everything in the log
		
		this.scripts[id] = false;
		
		// update log when loaded
		this.addEvent(script, "load", function () {
			self.scripts[id] = true;
			self._checkScriptsLoaded();
		});
		
		return script;
	};

	/*
		A NEW ONSCRIPTSLOADED EVENT
		---------------------------
	*/
	LaPoste.prototype._checkScriptsLoaded = function () {
		var i, totalScripts,
			load = true;
		
		for (i = 0, totalScripts = this.scripts.length; i < totalScripts && load; i++)
			load = this.scripts[i];
			
		if (load) {
			this._fireScriptsLoaded();
			return true;
		} else
			return false;
	};
	
	LaPoste.prototype._fireScriptsLoaded = function () {
		var fn;
		
		while (fn = this._runOnScriptsLoaded.shift())
			fn.call();
	};
	
	LaPoste.prototype.onScriptsReady = function (fn) {
		this._runOnScriptsLoaded.push(fn);
	};

	/*
		VISIBILITY FUNCTIONS
		--------------------
	*/
	LaPoste.prototype.getStyle = function (element, property) {
		if (element.currentStyle)
			return element.currentStyle[property];
		else if (window.getComputedStyle)
			return document.defaultView.getComputedStyle(element, null).getPropertyValue(property);
		else
			return null;
	};

	LaPoste.prototype.elementVisible = function (element) {
		var height, rects, onTop,
			i, l,
			r, inViewport; // define vars
		
		// check area > 0
		if (element.offsetWidth === 0 || element.offsetHeight === 0)
			return false;
		
		// check if the document has visibility or display properties set to make it invisible
		if (this.getStyle(element, "visibility") === "hidden" || this.getStyle(element, "display") === "none")
			return false;
		
		height = document.documentElement.clientHeight;
		rects = element.getClientRects();
		onTop = function (r) {
			// check every point ...
			for (var x = Math.floor(r.left), xmax = Math.ceil(r.right); x <= xmax; x++)
				for (var y = Math.floor(r.top), ymax = Math.ceil(r.bottom); y < ymax; y++)
					if (document.elementFromPoint(x, y) === element) // if the top element is this one ,,,
						return true;
			
			// otherwise, this element is not visible.
			return false;
		};
		
		for (i = 0, l = rects.length; i < l; i++) {
			r = rects[i];
			inViewport = r.top > 0 ? r.top <= height : (r.bottom > 0 && r.bottom <= height);
			
			if (inViewport && onTop(r))
				return true;
		}
		
		return false;
	};

	/*
		IMAGE LOADING FUNCTIONS
		-----------------------
	*/
	LaPoste.prototype.loadImages = function () {
		var self = this,
			images = document.images,
			i, lastImage;
		
		for (i = 0, lastImage = images.length; i < lastImage; i++)
			if (this.elementVisible(images[i]) && images[i].getAttribute("data-defer-src"))
				images[i].src = images[i].getAttribute("data-defer-src");
		
		// when all of that's loaded, load the ones that aren't visible
		this.addEvent(window, "load", function () {
			for (i = 0, lastImage = images.length; i < lastImage; i++)
			if (!self.elementVisible(images[i]) && images[i].getAttribute("data-defer-src"))
				images[i].src = images[i].getAttribute("data-defer-src");
		});
	};

	TGV = new LaPoste;
})();