# PayLane.js client

This JavaScript library is the official PayLane client for the REST.js credit card tokenization API. This library has been tested to be fully compatible with Internet Explorer 8 and higher, as well as current versions of Firefox, Chrome and Opera.

# Official documentation 

Code snippets, full API documetation, plugins, integration examples and much more can be found in the [PayLane DevZone](http://devzone.paylane.com/api-guide/cards/paylane-js/).

# License

MIT license. See the LICENSE file for more details.

# PayLane REST.js API flow: 

1. HTML markup is presented to the browser
2. The PayLane.js client is initialized and awaits for the payment form to be submitted
3. Once the form is submitted, the PayLane.js client sends all the sensitive credit card information to PayLanes servers. A temporary credit card token (a 64byte long hexadecimal string) is generated, which is then injected back into the merchants payment form as a hidden input.
4. The usual form submission process is resumed, and the merchants servers receive the token along with the other information from the form (except for the sensitive card data).
5. The merchant can issue a sale/authorization/checkCard/checkCard3DSecure request using the secret token (bear in mind that the token is only valid for 15 minutes).

## initialization

Heres the basic HTML markup for a typical payment form: 

```
    <form id="checkout-form" action="" type="">
        <!-- merchant's input elements, as many as required -->
        <input type="text" name="first-name">
        <input type="text" name="last-name">
        <input type="text" name="email">
        <input type="text" name="address">
    
        <!-- card related input elements: -->
        <input type="text" data-paylane="cc-number">
        <input type="text" data-paylane="cc-cvv">
        <input type="text" data-paylane="cc-name-on-card">

        <!-- please note that the expiry month/year elements can be simple inputs -->
            <input type="text" data-paylane="cc-expiry-month">
            <input type="text" data-paylane="cc-expiry-year">
        <!-- or they can be select nodes -->
            <select data-paylane="cc-expiry-month">
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
            </select>

            <select data-paylane="cc-expiry-year">
                <option value="2015">2015</option>
                <option value="2016">2016</option>
                <option value="2017">2017</option>
                <option value="2018">2018</option>
                <option value="2019">2019</option>
                <option value="2019">2020</option>
            </select>
    
        <input type="submit" value="submit">
    </form>
```

While the actual markup of the form can be fully altered to the merchants needs, the following points are crucial: 

1. The card related input elements must have the appropriate data-paylane attributes.
2. The card related input elements must not have any name attributes. This is a security measure which prevents sensitive information from reaching the merchants servers.
3. The payment form must have a unique ID attribute. This value will be referenced by the PayLane.js client lib.

Next, initialize the PayLane.js client: 

```
    <script src="path/to/paylane.js"></script>
    <script>
        try
        {
            var client = new PayLaneClient({
                publicApiKey: 'PUBLIC_API_KEY',
                paymentForm: 'checkout-form'
            });
        }
        catch (e)
        {
            console.log(e); // exceptions are fatal
        }
    </script>
````

The only required values by the PayLane.js client are the merchants public API key and a payment form selector. 

- the API key must be the 40 character string key found in the PayLane Merchant Panel
- the payment form selector can be one of the following:
    - The ID attribute of your payment form
    - A DOM node representing the form (one found by using document.forms[i], for example)
    - A jQuery object, containing only the payment form

## initalization options

Optionally, the following values can also be passed to the PayLane.js client (if they arent provided, the default values are used): 

1. `cardNumberInputName` (default: `cc-number`) – an alternative data-paylane value used to reference the credit card number input element
2. `cardExpiryMonthInputName` (default: `cc-expiry-month`) – an alternative data-paylane value used to reference the credit card expiry month input element
3. `cardExpiryYearInputName` (default: `cc-expiry-year`) – an alternative data-paylane value used to reference the credit card expiry year input element
4. `cardSecurityvarInputName` (default: `cc-cvv`) – an alternative data-paylane value used to reference the credit card CVV/CVV2 input element
5. `cardHolderInputName` (default: `cc-name-on-card`) – an alternative data-paylane value used to reference the cardholder name input element
6. `errorTypeInputName` (default: `paylane_error_type`) – an alternative input name for the error type input element
7. `errorCodeInputName` (default: `paylane_error_code`) – an alternative input name for the error var input element
8. `errorDescriptionInputName` (default: `paylane_error_description`) – an alternative input name for the error description input element
9. `tokenInputId` (default: `paylane-token`) – an alternative ID attribute for the token input element
10. `tokenInputName` (default: `paylane_token`) – an alternative name attribute for the token input element
11. `errorHandler` (default: empty function) – an error handler callback function, must take the following three arguments: type, code, description
12. `callbackHandler` (default: empty function) – an optional form submission callback handler. This callback will be called once the AJAX request containing the temporary token is completed. The token will appear in the form as a hidden input, and will also be passed to the callback function as the only argument. If no callback is specified, the form will simply be resubmitted using the standard form submit event.  

```
        /**
         * Custom token callback handler.
         * 
         * @param  {string} token Temporary credit card token
         * @return {void}
         */
        callbackHandler: function(token){}
```


## Error handling:

Errors triggered by the PayLane.js client are divided into two exceptions and errors.

Exceptions are only thrown during the client initialization, for example when the necessary form or input elements cannot be found, or you pass an empty public key. These exceptions must be caught and handled using a try/catch block, though typically they will not occur if your form is set up correctly.

Errors, on the other hand, are slightly more unexpected as they can be caused by things such as network outages, malformed input data (such as a bad token or credit card number) and so on. The PayLane.js client presents two methods for handling these errors; using an error callback (passed to the client constructor as errorHandler) and as hidden input fields in the payment form (which can be handled server-side).

### 1. Error callback handler:

```
    /**
     * Custom error handler which allows the merchant to
     * handle errors raised by the PayLaneClient class,
     * such as connection errors or erroneous API responses.
     * 
     * @param  {int}    type          Error type from PayLaneClient.errorTypes
     * @param  {int}    [code]        Error code from the API response
     * @param  {string} [description] Error description from the API response
     * @return {void}
     */
    errorHandler: function(type, code, description){}
````

### 2. Hidden input fields:

The following hidden input fields will be appended to the payment form (please remember that their names can be overwritten by passing the necessary error* keys to the client constructor): 

- `paylane_error_type`: type of the error; 1 if its a connection error, or 2 if its an error returned by the PayLane REST.js API
- `paylane_error_code`: present only during API errors, this is the error code returned by the REST.js API
- `paylane_error_description`: present only during API errors, this is the error description returned by the REST.js API