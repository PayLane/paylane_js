/**
 * PayLane.js API Client v1.0 - http://paylane.com/
 *
 * Documentation, examples, code snippets available at:
 * http://devzone.paylane.com/
 * 
 * Copyright 2014 PayLane Sp. z o.o.
 * Released under the MIT license
 *
 * Initial release date: 	2014-09-01
 */
;(function()
{
	'use strict';

	/**
	 * PayLane API client exception object (for throwing around).
	 * 
	 * @param {string} 	message 	Exception message
	 */
	function PayLaneError(message)
	{
		this.message = message;
		this.stack = Error().stack;
	};
	PayLaneError.prototype = Object.create(Error.prototype);
	PayLaneError.prototype.name = 'PayLaneError';
		
	/**
	 * Static shared resources used by the PayLaneClient class, for internal use only.
	 * 
	 * @type 	{Object}
	 * @access	private
	 */
	var shared = {
		/**
		 * Shared data, such as common default configuration values.
		 * 
		 * @type {Object}
		 */
		common: {
			customDataAttribute: 'data-paylane',

			apiUrl: 'https://direct.paylane.com/rest.js/cards/generateToken',

			defaultConfig: {
				cardNumberInputName: 'cc-number',
				cardExpiryMonthInputName: 'cc-expiry-month',
				cardExpiryYearInputName: 'cc-expiry-year',
				cardSecurityCodeInputName: 'cc-cvv',
				cardHolderInputName: 'cc-name-on-card',

				errorTypeInputName: 'paylane_error_type',
				errorCodeInputName: 'paylane_error_code',
				errorDescriptionInputName: 'paylane_error_description',

				tokenInputId: 'paylane-token',
				tokenInputName: 'paylane_token',

				/**
				 * Custom error handler which allows the merchant to
				 * handle errors raised by the PayLaneClient class,
				 * such as connection errors or erroneous API responses.
				 * 
				 * @param  {int} 	type          Error type from PayLaneClient.errorTypes
				 * @param  {int} 	[code]        Error code from the API response
				 * @param  {string}	[description] Error description from the API response
				 * @return {void}
				 */
				errorHandler: function(type, code, description){},

				/**
				 * Custom token callback handler.
				 * 
				 * @param  {string} token Temporary credit card token
				 * @return {void}
				 */
				callbackHandler: function(token){}
			}
		},

		/**
		 * General helper methods
		 * 
		 * @type {Object}
		 */
		helpers: {
			/**
			 * Returns the lowercased object type for a given object reference.
			 * 
			 * @param  	{mixed}  thing	Input variable to check
			 * @returns {string}		Lowercase string containing the latter part of the constructor name
			 */
			objectType: function(thing)
			{
				return Object.prototype.toString.call(thing).match(/(\w+)\]/).pop().toLowerCase();
			},

			/**
			 * Checks whether a variable is a string.
			 * 
			 * @param   {mixed}  thing	Input variable to check
			 * @returns {bool}			Result
			 */
			isString: function(thing)
			{
				return 'string' === typeof thing;
			},

			/**
			 * Checks whether a variable is an array.
			 * 
			 * @param   {mixed}  thing	Input variable to check
			 * @returns {bool}			Result
			 */
			isArray: function(thing)
			{
				return 'array' === this.objectType(thing);
			},

			/**
			 * Checks whether a variable is an object.
			 * 
			 * @param   {mixed}  thing	Input variable to check
			 * @returns {bool}			Result
			 */
			isObject: function(thing)
			{
				return typeof thing === 'object' && !this.isArray(thing);
			},

			/**
			 * Attempts to find the needle within the haystack, using a strict search.
			 * 
			 * @param  	{mixed}	needle   	Value to search for
			 * @param  	{array}	Haystack 	Array to search in
			 * @returns {bool}				True if found, false otherwise
			 */
			inArray: function(needle, haystack)
			{
				if (!this.isArray(haystack))
				{
					this.error('Haystack must be an array');
				}

				if (haystack.indexOf)
				{
					return -1 !== haystack.indexOf(needle);
				}

				for (var i = 0; i < haystack.length; i++)
				{
					if (needle === haystack[i])
					{
						return true;
					}
				}

				return false;
			},

			/**
			 * Stringifies a plain object to an HTTP request string,
			 * formatted as key1=val1&key2=val2. All key and value
			 * pairs are URI encoded.
			 * 
			 * @param  	{object} 		requestData	Plain object of key & value pairs
			 * @returns {string|null}             	Null if the input request data is empty, stringified & encoded data otherwise
			 * @throws 	{PayLaneError}				If the requestData argument is not an object, a PayLaneError exception is thrown
			 */
			httpRequestString: function(requestData)
			{
				if (!this.isObject(requestData))
				{
					this.error('HTTP request data must be an object');
				}

				var data = [];

				for (var key in requestData)
				{					
					data.push(encodeURIComponent(key) + '=' + encodeURIComponent(requestData[key]));
				}

				if (data.length)
				{
					return data.join('&');
				}

				return null;
			},

			/**
			 * Performs a shallow merge of an unlimited amount of objects.
			 * The objects are treated in an order of importance from right to left,
			 * meaning that the last object to be passed to this method
			 * will have the greatest priority.
			 *
			 * @param  	{object} 1..n 	Objects to merge together
			 * @returns {object} 		Merged object
			 */
			objectMerge: function()
			{
				var newObject = {},
					arg;

				for (var i = 0, limit = arguments.length; i < limit; i++)
				{
					arg = arguments[i];

					for (var prop in arg)
					{
						newObject[prop] = arg[prop];
					}
				}

				return newObject;
			},

			/**
			 * Sends an AJAX request to a resource URL, with the passed options.
			 * 
			 * @param  	{object} requestOptions	Object with the following options (properties):
			 *                          		     url,
			 *                          		     data,
			 *                          		     type,
			 *                          		     error,
			 *                          		     success
			 * @returns {void}
			 */
			ajax: function(requestOptions)
			{
				var defaults = {
						url: window.location.href,
						data: null,
						type: 'POST',
						error: function(){},
						success: function(){}
					},
					options = this.objectMerge(defaults, requestOptions),
					request = new XMLHttpRequest,
					data = null;

				request.open(options.type.toUpperCase(), options.url);

				// include the request params
				if (options.data)
				{
					// stringify the input data object
					data = JSON.stringify(options.data);
					request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				}

				request.onreadystatechange = function()
				{
					if (request.DONE === request.readyState)
					{
						switch (request.status)
						{
							case 200:
								var data = JSON.parse(request.responseText);
								options.success.call(request, data);
								break;

							default:
								options.error.call(request);
						}
					}
				};

				request.send(data);
			},

			/**
			 * Binds an event listener to a target element.
			 * 
			 * @param 	{HTMLElement}   targetElement 	Event target
			 * @param 	{string}   		type          	Event type
			 * @param 	{function} 		callback      	Callback function
			 * @returns	{void}
			 * @throws 	{PayLaneError} 					Thrown if we can't bind the event listener
			 */
			addEventListener: function(targetElement, type, callback)
			{
				if (!this.isObject(targetElement) || !targetElement instanceof HTMLElement)
				{
					this.error('Event target element must be an HTMLElement instance');
				}

				if (targetElement.addEventListener)
				{
					targetElement.addEventListener(type, callback);
				}
				else if (targetElement.attachEvent)
				{
					targetElement.attachEvent('on' + type, callback);
				}
				else
				{
					this.error('The event target element does not support addEventListener or attachEvent');
				}
			},

			/**
			 * Throws a PayLaneError exception with the specified message.
			 * 
			 * @param  {string} 		errorMessage Exception message
			 * @return {void}
			 * @throws {PayLaneError}
			 */			
			error: function(errorMessage)
			{
				throw new PayLaneError(errorMessage);
			}
		}
	};

	/**
	 * PayLane.js API client class
	 *
	 * @param 		{object} options 	Client config
	 * @constructor
	 * @see 		shared.common.defaultConfig
	 */
	var PayLaneClient = function(options)
	{
		// local copy, needed in case of `this` overwrite
		var self = this;

		// ensure that we have all of the required JS dependency modules
		this.checkDependencies();

		// configuration options
		options = this.checkInitData(options);
		this.config = shared.helpers.objectMerge(shared.common.defaultConfig, options);

		// payment form DOM node
		this.form = options.form;

		// api key
		this.apiKey = options.publicApiKey;

		// credit card related input field nodes
		this.inputFields = this.getInputFields();

		this.config.isCallbackHandlerOverwritten = !!options.callbackHandler;
		this.config.wasResubmitted = false;

		// handle the form submission
		shared.helpers.addEventListener(this.form, 'submit', function(event)
		{
			if (!self.config.isCallbackHandlerOverwritten || !self.config.wasResubmitted)
			{
				event.preventDefault();
				self.handleFormSubmit(this);
			}
		});
	};

	PayLaneClient.prototype = {
		constructor: PayLaneClient,

		/**
		 * Types of errors triggered by this class when something terrible happens.
		 * These should mainly be used for differentiating between an AJAX
		 * connection problem, and an error returned by PayLane's API.
		 * 
		 * @type {Object}
		 */
		errorTypes: {
			connectionError: 1,
			apiError: 2
		},

		/**
		 * Ensures that all the dependencies required by this class are loaded.
		 *
		 * @returns {void}
		 * @throws 	{PayLaneError}	If the required dependency doesn't exist, a PayLaneError exception is thrown
		 */
		checkDependencies: function()
		{
			var dependencyList = {
				'XMLHttpRequest': window.XMLHttpRequest,
				'addEventListener/attachEvent': window.addEventListener || window.attachEvent,
				'JSON': typeof JSON === 'object' && JSON.parse && JSON.stringify
			};

			for (var prop in dependencyList)
			{
				if (!dependencyList[prop])
				{
					shared.helpers.error('This browser does not provide "' + prop + '" support, which is required by this client');
				}
			}
		},

		/**
		 * Checks the init data passed to the PayLane.js client constructor.
		 *
		 * @param  	{object} 	options Init data
		 * @returns {object}      	  	Init data after processing
		 */
		checkInitData: function(options)
		{
			// clone the options object to remove the silly reference
			var data = shared.helpers.objectMerge(options);

			// ensure that the public key was passed in
			if (!data.publicApiKey || !shared.helpers.isString(data.publicApiKey))
			{
				shared.helpers.error('No public API key found');
			}

			// find the payment form based on the specified critera,
			// 		1. if it's a string, assume that that string is an ID of the form
			// 		2. if it's a DOM node, assume that it's a reference to the form
			// 		3. if it's a jQuery object, assume that it holds a reference to the form
			// 		4. fail otherwise
			switch (shared.helpers.objectType(data.paymentForm))
			{
				case 'string':
					if (data.paymentForm.length)
					{
						data.form = document.getElementById(data.paymentForm);
					}
					break;

				case 'object':
					if (data.paymentForm instanceof jQuery && data.paymentForm.length)
					{
						data.form = data.paymentForm[0];
					}
					break;

				case 'htmlformelement':
					data.form = data.paymentForm;
					break;

				default:
					shared.helpers.error('Malformed payment form selector passed');
			}

			if (!shared.helpers.isObject(data.form) || !data.form instanceof HTMLFormElement)
			{
				shared.helpers.error('Unable to find the payment for in the DOM');
			}

			return data;
		},

		/**
		 * Finds the credit card number, expiry date and CVV input fields in the payment form.
		 *
		 * @return 	{object}        Plain object with the CC number + date + CVV input fields
		 * @throws 	{PayLaneError} 	Thrown if the required input fields do not exist
		 */
		getInputFields: function()
		{
			var formInputFields = this.form.getElementsByTagName('input'),
				allFields = {},
				foundFields = {},
				input;

			for (var i = 0; i < formInputFields.length; i++)
			{
				input = formInputFields[i];

				if (input.hasAttribute(shared.common.customDataAttribute))
				{
					allFields[input.getAttribute(shared.common.customDataAttribute)] = input;
				}
			}

			// verify that the CC number input exists
			if (allFields[this.config.cardNumberInputName])
			{
				foundFields[this.config.cardNumberInputName] = allFields[this.config.cardNumberInputName];
			}
			else
			{
				shared.helpers.error('No credit card number input field found');
			}

			// verify that the CC expiry month input exists
			if (allFields[this.config.cardExpiryMonthInputName])
			{
				foundFields[this.config.cardExpiryMonthInputName] = allFields[this.config.cardExpiryMonthInputName];
			}
			else
			{
				shared.helpers.error('No credit card expiry month input field found');
			}

			// verify that the CC expiry year input exists
			if (allFields[this.config.cardExpiryYearInputName])
			{
				foundFields[this.config.cardExpiryYearInputName] = allFields[this.config.cardExpiryYearInputName];
			}
			else
			{
				shared.helpers.error('No credit card expiry year input field found');
			}

			// if the CVV field exists, store it (it can be optional for some merchants)
			if (allFields[this.config.cardSecurityCodeInputName])
			{
				foundFields[this.config.cardSecurityCodeInputName] = allFields[this.config.cardSecurityCodeInputName];
			}

			// verify that the CC cardholder input exists
			if (allFields[this.config.cardHolderInputName])
			{
				foundFields[this.config.cardHolderInputName] = allFields[this.config.cardHolderInputName];
			}
			else
			{
				shared.helpers.error('No credit card cardholder input field found');
			}

			// forcibly remove the name attribute from all of the found input fields
			// so their values never get POSTed to the merchant's servers
			for (var prop in foundFields)
			{
				foundFields[prop].removeAttribute('name');
			}

			return foundFields;
		},

		/**
		 * Handles the payment form submission on the page.
		 * This is an event listener method meant to be called during the form's submit event.
		 *
		 * @return 	{void}
		 * @this 	{HTMLElement}	Payment form
		 */
		handleFormSubmit: function()
		{
			var postData = {
					public_api_key: 	this.apiKey, 
					card_number: 		this.inputFields[this.config.cardNumberInputName].value,
					expiration_month: 	this.inputFields[this.config.cardExpiryMonthInputName].value,
					expiration_year: 	this.inputFields[this.config.cardExpiryYearInputName].value,
					name_on_card: 		this.inputFields[this.config.cardHolderInputName].value
				},
				self = this;

			if (this.inputFields[this.config.cardSecurityCodeInputName])
			{
				postData.card_code = this.inputFields[this.config.cardSecurityCodeInputName].value;
			}

			shared.helpers.ajax({
				url: shared.common.apiUrl,
				type: 'POST',
				data: postData,
				error: function()
				{
					self.triggerErrorEvent(self.errorTypes.connectionError);
				},
				success: function(response)
				{
					if (response.success)
					{
						self.handleFormTokenization(response.token);
					}
					else
					{
						self.triggerErrorEvent(self.errorTypes.apiError, +response.error.error_number, response.error.error_description);
					}
				},
			});
		},

		/**
		 * Triggers errors, so that the merchant can handle them accordingly.
		 *
		 * @param {int} 	type 			Error type (internal const value)
		 * @param {int} 	[code] 			Error code (returned by the server)
		 * @param {string} 	[description] 	Error descrition
		 */
		triggerErrorEvent: function(type, code, description)
		{
			// trigger an OOP style JS error, which the merchant can
			// use to handle errors returned by this class in the frontend
			this.config.errorHandler(type, code, description);

			// append the error information into the form
			this.appendFormInput(this.config.errorTypeInputName, type);
			this.appendFormInput(this.config.errorCodeInputName, code);
			this.appendFormInput(this.config.errorDescriptionInputName, description);
		},

		/**
		 * Appends a hidden input field to the payment form.
		 *
		 * @param 	{string} 		name 	Input name
		 * @param 	{string} 		value 	Input value
		 * @return 	{HTMLElement} 		 	Created node
		 */
		appendFormInput: function(name, value)
		{
			var input = document.createElement('input');

			input.type = 'hidden';
			input.name = name;
			input.value = value;

			this.form.appendChild(input);

			return input;
		},

		/**
		 * Handles the token returned via PayLane's API.
		 * 
		 * @param  	{string} token 	Secret token
		 * @return 	{void}
		 */
		handleFormTokenization: function(token)
		{
			var tokenField = document.getElementById(this.config.tokenInputId);

			if (!tokenField)
			{
				tokenField = this.appendFormInput(this.config.tokenInputName, token);
				tokenField.id = this.config.tokenInputId;
			}

			tokenField.value = token;

			// call the token handler, if one is provided
			if (this.config.isCallbackHandlerOverwritten)
			{
				this.config.callbackHandler(token);
			}
			// otherwise resubmit the form
			// this time without rebinding our internal event handlers
			else
			{
				this.config.wasResubmitted = true;
				this.form.submit();
			}
		}
	};

	// expose the PayLaneClient object to the global namespace
	window.PayLaneClient = PayLaneClient;
})();